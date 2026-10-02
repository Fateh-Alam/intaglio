import * as THREE from 'three';
import { dimensionsFromRenderInput, RenderPass } from '../RenderPass';
import { EditorSettings } from '../../../types/editor';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uSharpness;
uniform float uStructure;

varying vec2 vUv;

void main() {
  vec4 texColor = texture2D(tDiffuse, vUv);
  vec3 color = texColor.rgb;
  
  if (uSharpness > 0.0 || uSharpness < 0.0) {
    vec2 step = 1.0 / uResolution;
    vec4 top = texture2D(tDiffuse, vUv + vec2(0.0, step.y));
    vec4 bottom = texture2D(tDiffuse, vUv + vec2(0.0, -step.y));
    vec4 left = texture2D(tDiffuse, vUv + vec2(-step.x, 0.0));
    vec4 right = texture2D(tDiffuse, vUv + vec2(step.x, 0.0));
    
    vec3 highPass = texColor.rgb * 4.0 - (top.rgb + bottom.rgb + left.rgb + right.rgb);
    color += highPass * uSharpness * 0.5;
  }
  
  if (uStructure > 0.0 || uStructure < 0.0) {
    vec3 blur = texture2D(tDiffuse, vUv + vec2(0.005, 0.0)).rgb;
    blur += texture2D(tDiffuse, vUv + vec2(-0.005, 0.0)).rgb;
    blur += texture2D(tDiffuse, vUv + vec2(0.0, 0.005)).rgb;
    blur += texture2D(tDiffuse, vUv + vec2(0.0, -0.005)).rgb;
    blur /= 4.0;
    vec3 detail = texColor.rgb - blur;
    color += detail * uStructure * 2.0;
  }

  gl_FragColor = vec4(color, texColor.a);
}
`;

export class SharpenPass extends RenderPass {
  private material: THREE.ShaderMaterial;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uSharpness: { value: 0.0 },
        uStructure: { value: 0.0 }
      }
    });
    this.fsQuad.material = this.material;
  }

  public setup() {}

  public updateUniforms(settings: EditorSettings) {
    this.material.uniforms.uSharpness.value = settings.sharpness || 0.0;
    this.material.uniforms.uStructure.value = settings.structure || 0.0;
    
    // Disable pass if not in use
    this.enabled = Math.abs(settings.sharpness || 0.0) > 0.001 || Math.abs(settings.structure || 0.0) > 0.001;
  }

  public render(
    renderer: THREE.WebGLRenderer,
    readBuffer: THREE.WebGLRenderTarget | THREE.Texture,
    writeBuffer: THREE.WebGLRenderTarget | null
  ) {
    if (!this.enabled) {
      this.material.uniforms.tDiffuse.value = (readBuffer as THREE.WebGLRenderTarget).texture ?? readBuffer;
      this.material.uniforms.uSharpness.value = 0.0;
      this.material.uniforms.uStructure.value = 0.0;
      this.fsQuad.material = this.material;
      if (writeBuffer) renderer.setRenderTarget(writeBuffer);
      else renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
      return;
    }

    const inputTexture = (readBuffer as THREE.WebGLRenderTarget).texture ?? readBuffer;
    this.material.uniforms.tDiffuse.value = inputTexture;
    
    const dimensions = dimensionsFromRenderInput(readBuffer);
    this.material.uniforms.uResolution.value.set(dimensions.width, dimensions.height);

    if (writeBuffer) renderer.setRenderTarget(writeBuffer);
    else renderer.setRenderTarget(null);
    
    renderer.clear();
    this.fsQuad.render(renderer);
  }
}
