import * as THREE from 'three';
import { dimensionsFromRenderInput, RenderPass } from '../RenderPass';
import { EditorSettings } from '../../../types/editor';
import { PRO_RENDER_TARGET_OPTIONS } from '../PingPongTarget';

const brightPassVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const brightPassFragmentShader = `
uniform sampler2D tDiffuse;
uniform float uThreshold;
varying vec2 vUv;

void main() {
  vec4 texColor = texture2D(tDiffuse, vUv);
  // Halation is characteristically driven by the red channel bleeding
  float weight = smoothstep(uThreshold, uThreshold + 0.1, texColor.r);
  gl_FragColor = vec4(texColor.rgb * weight, texColor.a);
}
`;

const blurVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const blurFragmentShader = `
uniform sampler2D tDiffuse;
uniform vec2 uDirection;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  vec2 texel = 1.0 / uResolution;
  vec4 color = vec4(0.0);
  
  // 9-tap Gaussian
  color += texture2D(tDiffuse, vUv - 4.0 * texel * uDirection) * 0.016216;
  color += texture2D(tDiffuse, vUv - 3.0 * texel * uDirection) * 0.054054;
  color += texture2D(tDiffuse, vUv - 2.0 * texel * uDirection) * 0.1216216;
  color += texture2D(tDiffuse, vUv - 1.0 * texel * uDirection) * 0.1945945;
  color += texture2D(tDiffuse, vUv) * 0.227027;
  color += texture2D(tDiffuse, vUv + 1.0 * texel * uDirection) * 0.1945945;
  color += texture2D(tDiffuse, vUv + 2.0 * texel * uDirection) * 0.1216216;
  color += texture2D(tDiffuse, vUv + 3.0 * texel * uDirection) * 0.054054;
  color += texture2D(tDiffuse, vUv + 4.0 * texel * uDirection) * 0.016216;

  gl_FragColor = color;
}
`;

const compositeFragmentShader = `
uniform sampler2D tDiffuse;
uniform sampler2D tHalation;
uniform float uStrength;
varying vec2 vUv;

void main() {
  vec4 baseColor = texture2D(tDiffuse, vUv);
  vec4 haloColor = texture2D(tHalation, vUv);
  
  // Halation produces an orange/red glow
  vec3 haloTint = vec3(1.0, 0.4, 0.1) * haloColor.r;
  
  // Screen blend mode for the halation
  vec3 finalColor = 1.0 - (1.0 - baseColor.rgb) * (1.0 - haloTint * uStrength);
  
  gl_FragColor = vec4(finalColor, baseColor.a);
}
`;

export class HalationPass extends RenderPass {
  private brightMaterial: THREE.ShaderMaterial;
  private blurMaterial: THREE.ShaderMaterial;
  private compositeMaterial: THREE.ShaderMaterial;
  
  private renderTargetBright: THREE.WebGLRenderTarget;
  private renderTargetBlurH: THREE.WebGLRenderTarget;
  private renderTargetBlurV: THREE.WebGLRenderTarget;

  private strength: number = 0.0;
  private radius: number = 1.0;

  constructor() {
    super();

    this.brightMaterial = new THREE.ShaderMaterial({
      vertexShader: brightPassVertexShader,
      fragmentShader: brightPassFragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uThreshold: { value: 0.7 }
      }
    });

    this.blurMaterial = new THREE.ShaderMaterial({
      vertexShader: blurVertexShader,
      fragmentShader: blurFragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uDirection: { value: new THREE.Vector2(1, 0) },
        uResolution: { value: new THREE.Vector2(1, 1) }
      }
    });

    this.compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: brightPassVertexShader,
      fragmentShader: compositeFragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        tHalation: { value: null },
        uStrength: { value: 0.0 }
      }
    });

    // Halation can be lower resolution than bloom because it's soft diffusion
    this.renderTargetBright = new THREE.WebGLRenderTarget(256, 256, PRO_RENDER_TARGET_OPTIONS);
    this.renderTargetBlurH = new THREE.WebGLRenderTarget(256, 256, PRO_RENDER_TARGET_OPTIONS);
    this.renderTargetBlurV = new THREE.WebGLRenderTarget(256, 256, PRO_RENDER_TARGET_OPTIONS);
  }

  public setup() {}

  public updateUniforms(settings: EditorSettings) {
    this.strength = settings.halation || 0.0;
    this.radius = settings.halationRadius || 1.0;
    this.enabled = this.strength > 0.0;
    
    this.brightMaterial.uniforms.uThreshold.value = settings.halationThreshold || 0.7;
    this.compositeMaterial.uniforms.uStrength.value = this.strength;
  }

  public render(
    renderer: THREE.WebGLRenderer,
    readBuffer: THREE.WebGLRenderTarget | THREE.Texture,
    writeBuffer: THREE.WebGLRenderTarget | null
  ) {
    if (!this.enabled) {
      this.compositeMaterial.uniforms.tDiffuse.value = (readBuffer as THREE.WebGLRenderTarget).texture ?? readBuffer;
      this.compositeMaterial.uniforms.tHalation.value = null;
      this.compositeMaterial.uniforms.uStrength.value = 0.0;
      this.fsQuad.material = this.compositeMaterial;
      renderer.setRenderTarget(writeBuffer);
      this.fsQuad.render(renderer);
      return;
    }

    const inputTexture = (readBuffer as THREE.WebGLRenderTarget).texture ?? readBuffer;

    let width = 256;
    let height = 256;
    if ((readBuffer as THREE.WebGLRenderTarget).width !== undefined) {
      width = Math.max(1, Math.floor((readBuffer as THREE.WebGLRenderTarget).width / 4));
      height = Math.max(1, Math.floor((readBuffer as THREE.WebGLRenderTarget).height / 4));
    } else {
      const dimensions = dimensionsFromRenderInput(readBuffer);
      width = Math.max(1, Math.floor(dimensions.width / 4));
      height = Math.max(1, Math.floor(dimensions.height / 4));
    }
    
    if (this.renderTargetBright.width !== width || this.renderTargetBright.height !== height) {
      this.renderTargetBright.setSize(width, height);
      this.renderTargetBlurH.setSize(width, height);
      this.renderTargetBlurV.setSize(width, height);
      this.blurMaterial.uniforms.uResolution.value.set(width, height);
    }

    // 1. Extract Bright Areas (Red Channel)
    this.brightMaterial.uniforms.tDiffuse.value = inputTexture;
    this.fsQuad.material = this.brightMaterial;
    renderer.setRenderTarget(this.renderTargetBright);
    renderer.clear();
    this.fsQuad.render(renderer);

    // 2. Horizontal Blur
    this.blurMaterial.uniforms.tDiffuse.value = this.renderTargetBright.texture;
    this.blurMaterial.uniforms.uDirection.value.set(this.radius * 2.0, 0.0);
    this.fsQuad.material = this.blurMaterial;
    renderer.setRenderTarget(this.renderTargetBlurH);
    renderer.clear();
    this.fsQuad.render(renderer);

    // 3. Vertical Blur
    this.blurMaterial.uniforms.tDiffuse.value = this.renderTargetBlurH.texture;
    this.blurMaterial.uniforms.uDirection.value.set(0.0, this.radius * 2.0);
    this.fsQuad.material = this.blurMaterial;
    renderer.setRenderTarget(this.renderTargetBlurV);
    renderer.clear();
    this.fsQuad.render(renderer);

    // 4. Composite
    this.compositeMaterial.uniforms.tDiffuse.value = inputTexture;
    this.compositeMaterial.uniforms.tHalation.value = this.renderTargetBlurV.texture;
    this.fsQuad.material = this.compositeMaterial;
    renderer.setRenderTarget(writeBuffer);
    renderer.clear();
    this.fsQuad.render(renderer);
  }

  public dispose() {
    super.dispose();
    this.brightMaterial.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
    this.renderTargetBright.dispose();
    this.renderTargetBlurH.dispose();
    this.renderTargetBlurV.dispose();
  }
}
