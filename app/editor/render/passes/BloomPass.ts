import * as THREE from 'three';
import { RenderPass } from '../RenderPass';
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
  float luma = dot(texColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float weight = smoothstep(uThreshold, uThreshold + 0.1, luma);
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

// 9-tap Gaussian blur
void main() {
  vec2 texel = 1.0 / uResolution;
  vec4 color = vec4(0.0);
  
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
uniform sampler2D tBloom;
uniform float uStrength;
varying vec2 vUv;

void main() {
  vec4 baseColor = texture2D(tDiffuse, vUv);
  vec4 bloomColor = texture2D(tBloom, vUv);
  
  // Additive blending for bloom
  gl_FragColor = vec4(baseColor.rgb + bloomColor.rgb * uStrength, baseColor.a);
}
`;

export class BloomPass extends RenderPass {
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
        uThreshold: { value: 0.8 }
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
      vertexShader: brightPassVertexShader, // reuse basic vertex shader
      fragmentShader: compositeFragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        uStrength: { value: 0.0 }
      }
    });

    // We use a downsampled resolution for the bloom targets to increase performance and blur spread
    this.renderTargetBright = new THREE.WebGLRenderTarget(256, 256, PRO_RENDER_TARGET_OPTIONS);
    this.renderTargetBlurH = new THREE.WebGLRenderTarget(256, 256, PRO_RENDER_TARGET_OPTIONS);
    this.renderTargetBlurV = new THREE.WebGLRenderTarget(256, 256, PRO_RENDER_TARGET_OPTIONS);
  }

  public setup() {
    // No-op
  }

  public updateUniforms(settings: EditorSettings) {
    this.strength = settings.bloom || 0.0;
    this.radius = settings.bloomRadius || 1.0;
    
    // Disable pass if strength is 0 to save performance
    this.enabled = this.strength > 0.0;
    
    this.brightMaterial.uniforms.uThreshold.value = settings.bloomThreshold || 0.8;
    this.compositeMaterial.uniforms.uStrength.value = this.strength;
  }

  public render(
    renderer: THREE.WebGLRenderer,
    readBuffer: THREE.WebGLRenderTarget | THREE.Texture,
    writeBuffer: THREE.WebGLRenderTarget | null
  ) {
    if (!this.enabled) {
      // If disabled, we still need to copy readBuffer to writeBuffer to not break the chain!
      // But wait, the RenderGraph assumes the pass handles rendering.
      // So we render a basic copy pass.
      this.compositeMaterial.uniforms.tDiffuse.value = (readBuffer as THREE.WebGLRenderTarget).texture ?? readBuffer;
      this.compositeMaterial.uniforms.tBloom.value = null;
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
      const img = inputTexture.image as any;
      width = img && img.width ? Math.max(1, Math.floor(img.width / 4)) : 256;
      height = img && img.height ? Math.max(1, Math.floor(img.height / 4)) : 256;
    }
    
    if (this.renderTargetBright.width !== width || this.renderTargetBright.height !== height) {
      this.renderTargetBright.setSize(width, height);
      this.renderTargetBlurH.setSize(width, height);
      this.renderTargetBlurV.setSize(width, height);
      this.blurMaterial.uniforms.uResolution.value.set(width, height);
    }

    // 1. Extract Bright Areas
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

    // 4. Composite (Add bloom to original image)
    this.compositeMaterial.uniforms.tDiffuse.value = inputTexture;
    this.compositeMaterial.uniforms.tBloom.value = this.renderTargetBlurV.texture;
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
