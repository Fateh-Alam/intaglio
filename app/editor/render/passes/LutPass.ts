import * as THREE from "three";
import type { EditorSettings, LutUserData } from "../../../types/editor";
import { RenderPass, type RenderInput, textureFromRenderInput } from "../RenderPass";
import { TRANSFER_GLSL_CHUNK } from "../shaders/transferChunk";

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// .cube creative LUTs are authored for display-encoded input, so the linear
// working image is sRGB-encoded before lookup and decoded afterwards.
const fragmentShader = `
precision highp sampler3D;
uniform sampler2D tDiffuse;
uniform sampler3D tLut;
uniform float uLutSize;
uniform float uStrength;
uniform vec3 uDomainMin;
uniform vec3 uDomainMax;
varying vec2 vUv;

${TRANSFER_GLSL_CHUNK}

vec3 sampleLut(vec3 encoded) {
  vec3 unit = clamp((encoded - uDomainMin) / max(uDomainMax - uDomainMin, vec3(0.000001)), 0.0, 1.0);
  float size = max(uLutSize, 2.0);
  vec3 coord = (unit * (size - 1.0) + 0.5) / size;
  return texture(tLut, coord).rgb;
}

void main() {
  vec4 source = texture2D(tDiffuse, vUv);
  vec3 graded = srgbDecodeExtended(sampleLut(srgbEncodeExtended(source.rgb)));
  gl_FragColor = vec4(mix(source.rgb, graded, clamp(uStrength, 0.0, 1.0)), source.a);
}`;

export class LutPass extends RenderPass {
  private readonly material: THREE.ShaderMaterial;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        tLut: { value: null },
        uLutSize: { value: 2 },
        uStrength: { value: 0 },
        uDomainMin: { value: new THREE.Vector3(0, 0, 0) },
        uDomainMax: { value: new THREE.Vector3(1, 1, 1) },
      },
    });
    this.fsQuad.material = this.material;
  }

  setup(): void {}

  updateUniforms(settings: EditorSettings): void {
    const texture = settings.lutTexture;
    const size = (texture?.userData as LutUserData | undefined)?.lutSize;
    this.enabled = Boolean(texture && size && size >= 2 && settings.lutStrength > 0);
    this.material.uniforms.tLut.value = texture;
    this.material.uniforms.uLutSize.value = size ?? 2;
    this.material.uniforms.uStrength.value = settings.lutStrength;
    this.material.uniforms.uDomainMin.value.fromArray((texture?.userData as LutUserData | undefined)?.domainMin ?? [0, 0, 0]);
    this.material.uniforms.uDomainMax.value.fromArray((texture?.userData as LutUserData | undefined)?.domainMax ?? [1, 1, 1]);
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
