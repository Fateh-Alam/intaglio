import * as THREE from 'three';
import { RenderPass } from '../RenderPass';
import { EditorSettings } from '../../../types/editor';
import { OKLAB_GLSL_CHUNK } from '../shaders/oklabChunk';

/**
 * Three-Way Color Wheels Pass
 *
 * Implements shadows/midtones/highlights color grading in OKLAB space.
 * Unlike the old RGB-additive approach, this pushes the a,b axes of OKLAB
 * for perceptually uniform tinting that preserves lightness relationships.
 *
 * Reference: engineering-specs-professional.md §13
 */

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D tDiffuse;

// Per-zone controls: hue direction (radians), saturation amount, luminance offset
uniform float uShadowHue;
uniform float uShadowSat;
uniform float uShadowLuma;

uniform float uMidtoneHue;
uniform float uMidtoneSat;
uniform float uMidtoneLuma;

uniform float uHighlightHue;
uniform float uHighlightSat;
uniform float uHighlightLuma;

uniform float uBalance;

varying vec2 vUv;

${OKLAB_GLSL_CHUNK}

// §13.1 Luminance range weight functions (evaluated in perceptual OKLab L)
// Positive balance moves the split down so highlights cover more of the image.

float shadowWeight(float p, float balance) {
  float b = 0.5 - balance * 0.5;
  float end = mix(0.25, 0.55, b);
  return 1.0 - smoothstep(0.05, end, p);
}

float highlightWeight(float p, float balance) {
  float b = 0.5 - balance * 0.5;
  float start = mix(0.42, 0.72, b);
  return smoothstep(start, 0.95, p);
}

float midtoneWeight(float p, float balance) {
  float s = shadowWeight(p, balance);
  float h = highlightWeight(p, balance);
  return clamp(1.0 - s - h, 0.0, 1.0);
}

vec3 normalizeWeights(float s, float m, float h) {
  float sumW = max(s + m + h, 1e-5);
  return vec3(s, m, h) / sumW;
}

// §13.2 Color wheel offset — converts hue angle + saturation to a,b push
vec2 wheelOffset(float hueRadians, float saturation) {
  return vec2(cos(hueRadians), sin(hueRadians)) * saturation;
}

void main() {
  vec4 texColor = texture2D(tDiffuse, vUv);
  vec3 color = texColor.rgb; // Already linear from previous passes

  // Convert to OKLAB and weight tonal zones by perceptual lightness L
  vec3 lab = linearSrgbToOklab(max(color, vec3(0.0)));
  float p = clamp(lab.x, 0.0, 1.0);

  // Compute zone weights
  float sw = shadowWeight(p, uBalance);
  float mw = midtoneWeight(p, uBalance);
  float hw = highlightWeight(p, uBalance);
  vec3 w = normalizeWeights(sw, mw, hw);

  // Compute and apply weighted a,b offsets from each zone
  // Scale factor of 0.12 maps UI saturation range to reasonable OKLAB a,b offset
  vec2 offS = wheelOffset(uShadowHue, uShadowSat * 0.12) * w.x;
  vec2 offM = wheelOffset(uMidtoneHue, uMidtoneSat * 0.12) * w.y;
  vec2 offH = wheelOffset(uHighlightHue, uHighlightSat * 0.12) * w.z;

  lab.yz += offS + offM + offH;

  // Apply per-zone luminance adjustments
  // Scale factor of 0.15 maps UI luma range to reasonable OKLAB L offset
  lab.x += uShadowLuma * 0.15 * w.x + uMidtoneLuma * 0.15 * w.y + uHighlightLuma * 0.15 * w.z;

  // Safety: clamp lightness
  lab.x = clamp(lab.x, 0.0, 1.2);

  // Convert back to linear RGB
  color = oklabToLinearSrgb(lab);
  color = max(color, vec3(0.0));

  gl_FragColor = vec4(color, texColor.a);
}
`;

export class ColorWheelsPass extends RenderPass {
  private material: THREE.ShaderMaterial;
  private copyMaterial: THREE.ShaderMaterial;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uShadowHue: { value: 0.0 },
        uShadowSat: { value: 0.0 },
        uShadowLuma: { value: 0.0 },
        uMidtoneHue: { value: 0.0 },
        uMidtoneSat: { value: 0.0 },
        uMidtoneLuma: { value: 0.0 },
        uHighlightHue: { value: 0.0 },
        uHighlightSat: { value: 0.0 },
        uHighlightLuma: { value: 0.0 },
        uBalance: { value: 0.0 },
      }
    });
    this.fsQuad.material = this.material;

    this.copyMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() { gl_FragColor = texture2D(tDiffuse, vUv); }
      `,
      uniforms: { tDiffuse: { value: null } }
    });
  }

  public setup() {}

  public updateUniforms(settings: EditorSettings) {
    const cg = settings.colorGrading;

    // The color grading UI stores h (hue angle), s (saturation strength), l (luminance offset)
    // h is expected to be in radians for the OKLAB a,b plane direction
    // s is the intensity of the color push (0 = none, positive = stronger)
    // l is a luminance offset (-1 to +1 range)

    this.material.uniforms.uShadowHue.value = (cg.shadows.h || 0.0) * Math.PI * 2.0;
    this.material.uniforms.uShadowSat.value = (cg.shadows.s || 0.0);
    this.material.uniforms.uShadowLuma.value = (cg.shadows.l || 0.0);

    this.material.uniforms.uMidtoneHue.value = (cg.midtones.h || 0.0) * Math.PI * 2.0;
    this.material.uniforms.uMidtoneSat.value = (cg.midtones.s || 0.0);
    this.material.uniforms.uMidtoneLuma.value = (cg.midtones.l || 0.0);

    this.material.uniforms.uHighlightHue.value = (cg.highlights.h || 0.0) * Math.PI * 2.0;
    this.material.uniforms.uHighlightSat.value = (cg.highlights.s || 0.0);
    this.material.uniforms.uHighlightLuma.value = (cg.highlights.l || 0.0);

    this.material.uniforms.uBalance.value = (cg.balance || 0.0);

    // Performance: disable if no color grading active
    const hasGrading =
      (cg.shadows.s || 0) !== 0 || (cg.shadows.l || 0) !== 0 ||
      (cg.midtones.s || 0) !== 0 || (cg.midtones.l || 0) !== 0 ||
      (cg.highlights.s || 0) !== 0 || (cg.highlights.l || 0) !== 0;

    this.enabled = hasGrading;
  }

  public render(
    renderer: THREE.WebGLRenderer,
    readBuffer: THREE.WebGLRenderTarget | THREE.Texture,
    writeBuffer: THREE.WebGLRenderTarget | null
  ) {
    const inputTexture = (readBuffer as THREE.WebGLRenderTarget).texture ?? readBuffer;

    if (!this.enabled) {
      this.copyMaterial.uniforms.tDiffuse.value = inputTexture;
      this.fsQuad.material = this.copyMaterial;
      if (writeBuffer) renderer.setRenderTarget(writeBuffer);
      else renderer.setRenderTarget(null);
      renderer.clear();
      this.fsQuad.render(renderer);
      this.fsQuad.material = this.material;
      return;
    }

    this.material.uniforms.tDiffuse.value = inputTexture;
    this.fsQuad.material = this.material;

    if (writeBuffer) renderer.setRenderTarget(writeBuffer);
    else renderer.setRenderTarget(null);

    renderer.clear();
    this.fsQuad.render(renderer);
  }

  public dispose() {
    super.dispose();
    this.material.dispose();
    this.copyMaterial.dispose();
  }
}
