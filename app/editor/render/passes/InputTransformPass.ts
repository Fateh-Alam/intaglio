import * as THREE from "three";
import { RenderPass, type RenderInput, sourceEncodingOf, textureFromRenderInput } from "../RenderPass";
import { TRANSFER_GLSL_CHUNK } from "../shaders/transferChunk";

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
uniform sampler2D tDiffuse;
varying vec2 vUv;

${TRANSFER_GLSL_CHUNK}

void main() {
  vec4 source = texture2D(tDiffuse, vUv);
  gl_FragColor = vec4(srgbDecodeExtended(source.rgb), source.a);
}`;

/**
 * Converts the source into the linear working space exactly once, ahead of
 * every plate. Linear sources (16-bit RAW) pass through untouched.
 */
export class InputTransformPass extends RenderPass {
  private readonly material: THREE.ShaderMaterial;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { tDiffuse: { value: null } } });
    this.fsQuad.material = this.material;
  }

  setup(): void {}

  updateUniforms(): void {}

  override setSource(texture: THREE.Texture): void {
    this.enabled = sourceEncodingOf(texture) === "srgb";
  }

  render(renderer: THREE.WebGLRenderer, readBuffer: RenderInput, writeBuffer: THREE.WebGLRenderTarget | null): void {
    this.material.uniforms.tDiffuse.value = textureFromRenderInput(readBuffer);
    renderer.setRenderTarget(writeBuffer);
    renderer.clear();
    this.fsQuad.render(renderer);
  }

  override dispose(): void {
    this.material.dispose();
    super.dispose();
  }
}
