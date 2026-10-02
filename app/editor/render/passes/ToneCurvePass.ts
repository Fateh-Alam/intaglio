import * as THREE from 'three';
import { RenderPass, type RenderInput, textureFromRenderInput } from '../RenderPass';
import type { CurvePoints, EditorSettings } from '../../../types/editor';
import { TRANSFER_GLSL_CHUNK } from '../shaders/transferChunk';
import { TONE_CURVE_RESOLUTION, buildToneCurveTable, isIdentityCurveSet } from '../../../utils/spline';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Curves are authored against display-encoded values, so the pass encodes the
// linear working image, applies master then per-channel curves from a 32-bit
// float table (manually interpolated; float textures are not filterable
// everywhere), and decodes back. Values outside [0, 1] continue with unit slope
// so exposure headroom is not clipped by the curve.
const fragmentShader = `
uniform sampler2D tDiffuse;
uniform sampler2D tToneCurve;
uniform float uCurveSize;

varying vec2 vUv;

${TRANSFER_GLSL_CHUNK}

vec4 curveAt(float x) {
  float position = clamp(x, 0.0, 1.0) * (uCurveSize - 1.0);
  float lower = floor(position);
  float upper = min(lower + 1.0, uCurveSize - 1.0);
  vec4 a = texture2D(tToneCurve, vec2((lower + 0.5) / uCurveSize, 0.5));
  vec4 b = texture2D(tToneCurve, vec2((upper + 0.5) / uCurveSize, 0.5));
  return mix(a, b, position - lower);
}

float extend(float x, float curved, float atZero, float atOne) {
  if (x > 1.0) return atOne + (x - 1.0);
  if (x < 0.0) return atZero + x;
  return curved;
}

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  vec3 encoded = srgbEncodeExtended(color.rgb);
  vec4 ends0 = curveAt(0.0);
  vec4 ends1 = curveAt(1.0);

  vec3 master = vec3(
    extend(encoded.r, curveAt(encoded.r).a, ends0.a, ends1.a),
    extend(encoded.g, curveAt(encoded.g).a, ends0.a, ends1.a),
    extend(encoded.b, curveAt(encoded.b).a, ends0.a, ends1.a)
  );
  vec3 graded = vec3(
    extend(master.r, curveAt(master.r).r, ends0.r, ends1.r),
    extend(master.g, curveAt(master.g).g, ends0.g, ends1.g),
    extend(master.b, curveAt(master.b).b, ends0.b, ends1.b)
  );

  gl_FragColor = vec4(srgbDecodeExtended(graded), color.a);
}
`;

const MAX_CACHED_CURVES = 8;

export class ToneCurvePass extends RenderPass {
  private material: THREE.ShaderMaterial;
  // Plates alternate between curve sets within one frame, so keep a small cache
  // keyed by curve content instead of rebuilding a texture per plate per frame.
  private readonly textures = new Map<string, THREE.DataTexture>();

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        tToneCurve: { value: null },
        uCurveSize: { value: TONE_CURVE_RESOLUTION },
      }
    });
    this.fsQuad.material = this.material;
  }

  public setup() {
    // Shaders already provided inline
  }

  public updateUniforms(settings: EditorSettings) {
    const curves = settings.curvePoints;
    this.enabled = Boolean(curves) && !isIdentityCurveSet(curves);
    this.material.uniforms.tToneCurve.value = this.enabled ? this.textureFor(curves) : null;
  }

  private textureFor(curves: CurvePoints): THREE.DataTexture {
    const key = JSON.stringify(curves);
    const cached = this.textures.get(key);
    if (cached) {
      this.textures.delete(key);
      this.textures.set(key, cached);
      return cached;
    }
    const texture = new THREE.DataTexture(buildToneCurveTable(curves), TONE_CURVE_RESOLUTION, 1, THREE.RGBAFormat, THREE.FloatType);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    this.textures.set(key, texture);
    if (this.textures.size > MAX_CACHED_CURVES) {
      const [oldestKey, oldest] = this.textures.entries().next().value as [string, THREE.DataTexture];
      oldest.dispose();
      this.textures.delete(oldestKey);
    }
    return texture;
  }

  public render(renderer: THREE.WebGLRenderer, readBuffer: RenderInput, writeBuffer: THREE.WebGLRenderTarget | null) {
    this.material.uniforms.tDiffuse.value = textureFromRenderInput(readBuffer);
    renderer.setRenderTarget(writeBuffer);
    renderer.clear();
    this.fsQuad.render(renderer);
  }

  override dispose(): void {
    this.textures.forEach((texture) => texture.dispose());
    this.textures.clear();
    this.material.dispose();
    super.dispose();
  }
}
