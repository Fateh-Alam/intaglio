import * as THREE from 'three';
import { RenderPass } from '../RenderPass';
import { EditorSettings } from '../../../types/editor';
import { OKLAB_GLSL_CHUNK } from '../shaders/oklabChunk';

/**
 * OKLCH Channel Mixer Pass
 *
 * Replaces the old HSL-based channel mixer with perceptually uniform
 * OKLCH hue/chroma/lightness adjustments across 8 color channels.
 * Includes combined OKLCH + RGB skin protection.
 *
 * Reference: engineering-specs-professional.md §11, §12
 */

// OKLCH channel centers and widths (from spec §11.1, converted to radians)
// These define where each color "bucket" sits on the OKLCH hue circle
// and how wide its influence zone is.
const CHANNEL_CENTERS_RAD = {
  red:     0.4363, // 25°
  orange:  0.9599, // 55°
  yellow:  1.6057, // 92°
  green:   2.5307, // 145°
  aqua:    3.4034, // 195°
  blue:    4.2761, // 245°
  purple:  5.0952, // 292°
  magenta: 5.8468, // 335°
} as const;

const CHANNEL_WIDTHS_RAD = {
  red:     0.6632, // 38°
  orange:  0.5585, // 32°
  yellow:  0.6283, // 36°
  green:   0.8378, // 48°
  aqua:    0.7330, // 42°
  blue:    0.8029, // 46°
  purple:  0.7330, // 42°
  magenta: 0.6632, // 38°
} as const;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D tDiffuse;

// 8 OKLCH channel adjustments (hue shift in radians, chroma multiplier offset, lightness offset)
uniform float uRedHue;
uniform float uRedChroma;
uniform float uRedLightness;
uniform float uOrangeHue;
uniform float uOrangeChroma;
uniform float uOrangeLightness;
uniform float uYellowHue;
uniform float uYellowChroma;
uniform float uYellowLightness;
uniform float uGreenHue;
uniform float uGreenChroma;
uniform float uGreenLightness;
uniform float uAquaHue;
uniform float uAquaChroma;
uniform float uAquaLightness;
uniform float uBlueHue;
uniform float uBlueChroma;
uniform float uBlueLightness;
uniform float uPurpleHue;
uniform float uPurpleChroma;
uniform float uPurpleLightness;
uniform float uMagentaHue;
uniform float uMagentaChroma;
uniform float uMagentaLightness;

uniform float uSkinProtect;

varying vec2 vUv;

${OKLAB_GLSL_CHUNK}

// §11.4 Apply a single OKLCH channel adjustment
vec3 applyOklchChannel(
  vec3 color,
  float center,
  float width,
  float hueShift,
  float chromaShift,
  float lightnessShift
) {
  // Early exit if no adjustment needed
  if (abs(hueShift) < 0.001 && abs(chromaShift) < 0.001 && abs(lightnessShift) < 0.001) {
    return color;
  }

  vec3 lab = linearSrgbToOklab(max(color, vec3(0.0)));
  vec3 lch = oklabToOklch(lab);

  // Wrap negative hue to [0, 2π] for consistent weight calculation
  float hue = lch.z;
  if (hue < 0.0) hue += 6.28318530718;

  // A grey has no hue: OKLab returns rounding noise there, so without this
  // guard a band could brighten or darken neutrals at random (and differently
  // per GPU). Bands fade in with colorfulness, reaching full strength at C=0.02.
  float w = hueWeight(hue, center, width) * smoothstep(0.0, 0.02, lch.y);

  // Skip if this pixel's hue is outside the channel's influence zone
  if (w < 0.001) return color;

  lch.z += hueShift * w;
  lch.y *= 1.0 + chromaShift * w;
  lch.x += lightnessShift * w;

  // Safety clamps (spec §11.5)
  lch.x = clamp(lch.x, 0.0, 1.2);
  lch.y = max(lch.y, 0.0); // Soft clamp chroma — never negative

  return oklabToLinearSrgb(oklchToOklab(lch));
}

// ============================================
// SKIN PROTECTION ENGINE (spec §12)
// ============================================

// §12.2 Skin mask in OKLCH space
float skinMaskOklch(vec3 linearRgb) {
  vec3 lab = linearSrgbToOklab(max(linearRgb, vec3(0.0)));
  vec3 lch = oklabToOklch(lab);

  float hue = lch.z;
  if (hue < 0.0) hue += 6.28318530718;

  // Skin occupies warm red-orange hues (~55° center, ~55° width)
  float skinCenter = 0.95993; // radians(55.0)
  float skinWidth = 0.95993;  // radians(55.0)
  float h = hueWeight(hue, skinCenter, skinWidth);

  // Chroma guard: skin has moderate chroma
  float chromaMask = smoothstep(0.025, 0.08, lch.y) * (1.0 - smoothstep(0.32, 0.46, lch.y));
  // Lightness guard: skin is in mid-range lightness
  float lightMask = smoothstep(0.18, 0.38, lch.x) * (1.0 - smoothstep(0.95, 1.1, lch.x));

  return h * chromaMask * lightMask;
}

// §12.3 RGB relationship skin guard (operates on sRGB values)
float skinMaskRgb(vec3 rgb) {
  float r = rgb.r;
  float g = rgb.g;
  float b = rgb.b;

  // Skin always has R > G > B with specific minimum differences
  float rg = smoothstep(0.02, 0.18, r - g);
  float gb = smoothstep(-0.05, 0.12, g - b);
  float rb = smoothstep(0.06, 0.28, r - b);
  float brightness = smoothstep(0.08, 0.22, max(max(r, g), b));

  return rg * gb * rb * brightness;
}

// §12.4 Combined skin mask (OKLCH + RGB for maximum reliability)
float skinMask(vec3 linearRgb) {
  vec3 srgb = linearToSrgb(max(linearRgb, vec3(0.0)));
  float m1 = skinMaskOklch(linearRgb);
  float m2 = skinMaskRgb(srgb);
  return clamp(max(m1, m2) * 1.15, 0.0, 1.0);
}

// §12.5 Skin protection (better version): preserve skin hue/chroma,
// allow luminance edits to pass through
vec3 protectSkinColorOnly(vec3 original, vec3 adjusted, float strength) {
  float m = skinMask(original) * strength;

  vec3 labOrig = linearSrgbToOklab(max(original, vec3(0.0)));
  vec3 labAdj = linearSrgbToOklab(max(adjusted, vec3(0.0)));

  // Keep adjusted lightness, restore original a/b (hue+chroma) partially
  vec3 labProtected = vec3(labAdj.x, mix(labAdj.yz, labOrig.yz, vec2(m)));
  return oklabToLinearSrgb(labProtected);
}

void main() {
  vec4 texColor = texture2D(tDiffuse, vUv);
  vec3 color = texColor.rgb; // Already linear from BaseDevelopPass
  vec3 originalColor = color; // Snapshot for skin protection

  // Apply 8 OKLCH channel adjustments sequentially
  // Channel centers/widths are hardcoded from spec §11.1 (in radians)
  color = applyOklchChannel(color, ${CHANNEL_CENTERS_RAD.red.toFixed(4)}, ${CHANNEL_WIDTHS_RAD.red.toFixed(4)}, uRedHue, uRedChroma, uRedLightness);
  color = applyOklchChannel(color, ${CHANNEL_CENTERS_RAD.orange.toFixed(4)}, ${CHANNEL_WIDTHS_RAD.orange.toFixed(4)}, uOrangeHue, uOrangeChroma, uOrangeLightness);
  color = applyOklchChannel(color, ${CHANNEL_CENTERS_RAD.yellow.toFixed(4)}, ${CHANNEL_WIDTHS_RAD.yellow.toFixed(4)}, uYellowHue, uYellowChroma, uYellowLightness);
  color = applyOklchChannel(color, ${CHANNEL_CENTERS_RAD.green.toFixed(4)}, ${CHANNEL_WIDTHS_RAD.green.toFixed(4)}, uGreenHue, uGreenChroma, uGreenLightness);
  color = applyOklchChannel(color, ${CHANNEL_CENTERS_RAD.aqua.toFixed(4)}, ${CHANNEL_WIDTHS_RAD.aqua.toFixed(4)}, uAquaHue, uAquaChroma, uAquaLightness);
  color = applyOklchChannel(color, ${CHANNEL_CENTERS_RAD.blue.toFixed(4)}, ${CHANNEL_WIDTHS_RAD.blue.toFixed(4)}, uBlueHue, uBlueChroma, uBlueLightness);
  color = applyOklchChannel(color, ${CHANNEL_CENTERS_RAD.purple.toFixed(4)}, ${CHANNEL_WIDTHS_RAD.purple.toFixed(4)}, uPurpleHue, uPurpleChroma, uPurpleLightness);
  color = applyOklchChannel(color, ${CHANNEL_CENTERS_RAD.magenta.toFixed(4)}, ${CHANNEL_WIDTHS_RAD.magenta.toFixed(4)}, uMagentaHue, uMagentaChroma, uMagentaLightness);

  // Skin protection: preserve skin hue/chroma while allowing luminance changes
  if (uSkinProtect > 0.0) {
    color = protectSkinColorOnly(originalColor, color, uSkinProtect);
  }

  // Final safety: prevent negative RGB values
  color = max(color, vec3(0.0));

  gl_FragColor = vec4(color, texColor.a);
}
`;

export class OklchMixerPass extends RenderPass {
  private material: THREE.ShaderMaterial;
  // Simple copy material for when the pass is disabled
  private copyMaterial: THREE.ShaderMaterial;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uRedHue: { value: 0.0 },
        uRedChroma: { value: 0.0 },
        uRedLightness: { value: 0.0 },
        uOrangeHue: { value: 0.0 },
        uOrangeChroma: { value: 0.0 },
        uOrangeLightness: { value: 0.0 },
        uYellowHue: { value: 0.0 },
        uYellowChroma: { value: 0.0 },
        uYellowLightness: { value: 0.0 },
        uGreenHue: { value: 0.0 },
        uGreenChroma: { value: 0.0 },
        uGreenLightness: { value: 0.0 },
        uAquaHue: { value: 0.0 },
        uAquaChroma: { value: 0.0 },
        uAquaLightness: { value: 0.0 },
        uBlueHue: { value: 0.0 },
        uBlueChroma: { value: 0.0 },
        uBlueLightness: { value: 0.0 },
        uPurpleHue: { value: 0.0 },
        uPurpleChroma: { value: 0.0 },
        uPurpleLightness: { value: 0.0 },
        uMagentaHue: { value: 0.0 },
        uMagentaChroma: { value: 0.0 },
        uMagentaLightness: { value: 0.0 },
        uSkinProtect: { value: 0.0 },
      }
    });
    this.fsQuad.material = this.material;

    // Simple passthrough shader for when the pass is completely inactive
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
    // Map EditorSettings hsl* values to OKLCH uniforms
    // Hue shift: slider -1..+1 → ±0.785 rad (±45°) per spec §11.5
    const HUE_SCALE = 0.785;
    // Lightness shift: slider -1..+1 → ±0.15 OKLAB L units
    const L_SCALE = 0.15;

    this.material.uniforms.uRedHue.value = (settings.hslRedHue || 0.0) * HUE_SCALE;
    this.material.uniforms.uRedChroma.value = (settings.hslRedSat || 0.0);
    this.material.uniforms.uRedLightness.value = (settings.hslRedLum || 0.0) * L_SCALE;

    this.material.uniforms.uOrangeHue.value = (settings.hslOrangeHue || 0.0) * HUE_SCALE;
    this.material.uniforms.uOrangeChroma.value = (settings.hslOrangeSat || 0.0);
    this.material.uniforms.uOrangeLightness.value = (settings.hslOrangeLum || 0.0) * L_SCALE;

    this.material.uniforms.uYellowHue.value = (settings.hslYellowHue || 0.0) * HUE_SCALE;
    this.material.uniforms.uYellowChroma.value = (settings.hslYellowSat || 0.0);
    this.material.uniforms.uYellowLightness.value = (settings.hslYellowLum || 0.0) * L_SCALE;

    this.material.uniforms.uGreenHue.value = (settings.hslGreenHue || 0.0) * HUE_SCALE;
    this.material.uniforms.uGreenChroma.value = (settings.hslGreenSat || 0.0);
    this.material.uniforms.uGreenLightness.value = (settings.hslGreenLum || 0.0) * L_SCALE;

    this.material.uniforms.uAquaHue.value = (settings.hslAquaHue || 0.0) * HUE_SCALE;
    this.material.uniforms.uAquaChroma.value = (settings.hslAquaSat || 0.0);
    this.material.uniforms.uAquaLightness.value = (settings.hslAquaLum || 0.0) * L_SCALE;

    this.material.uniforms.uBlueHue.value = (settings.hslBlueHue || 0.0) * HUE_SCALE;
    this.material.uniforms.uBlueChroma.value = (settings.hslBlueSat || 0.0);
    this.material.uniforms.uBlueLightness.value = (settings.hslBlueLum || 0.0) * L_SCALE;

    this.material.uniforms.uPurpleHue.value = (settings.hslPurpleHue || 0.0) * HUE_SCALE;
    this.material.uniforms.uPurpleChroma.value = (settings.hslPurpleSat || 0.0);
    this.material.uniforms.uPurpleLightness.value = (settings.hslPurpleLum || 0.0) * L_SCALE;

    this.material.uniforms.uMagentaHue.value = (settings.hslMagentaHue || 0.0) * HUE_SCALE;
    this.material.uniforms.uMagentaChroma.value = (settings.hslMagentaSat || 0.0);
    this.material.uniforms.uMagentaLightness.value = (settings.hslMagentaLum || 0.0) * L_SCALE;

    this.material.uniforms.uSkinProtect.value = settings.safeSkinEnabled ? 1.0 : (settings.skinProtect || 0.0);

    // Performance: disable pass if no channel has adjustments and no skin protection
    const hasAdjustments =
      (settings.hslRedHue || 0) !== 0 || (settings.hslRedSat || 0) !== 0 || (settings.hslRedLum || 0) !== 0 ||
      (settings.hslOrangeHue || 0) !== 0 || (settings.hslOrangeSat || 0) !== 0 || (settings.hslOrangeLum || 0) !== 0 ||
      (settings.hslYellowHue || 0) !== 0 || (settings.hslYellowSat || 0) !== 0 || (settings.hslYellowLum || 0) !== 0 ||
      (settings.hslGreenHue || 0) !== 0 || (settings.hslGreenSat || 0) !== 0 || (settings.hslGreenLum || 0) !== 0 ||
      (settings.hslAquaHue || 0) !== 0 || (settings.hslAquaSat || 0) !== 0 || (settings.hslAquaLum || 0) !== 0 ||
      (settings.hslBlueHue || 0) !== 0 || (settings.hslBlueSat || 0) !== 0 || (settings.hslBlueLum || 0) !== 0 ||
      (settings.hslPurpleHue || 0) !== 0 || (settings.hslPurpleSat || 0) !== 0 || (settings.hslPurpleLum || 0) !== 0 ||
      (settings.hslMagentaHue || 0) !== 0 || (settings.hslMagentaSat || 0) !== 0 || (settings.hslMagentaLum || 0) !== 0 ||
      (settings.skinProtect || 0) !== 0 || settings.safeSkinEnabled;

    this.enabled = hasAdjustments;
  }

  public render(
    renderer: THREE.WebGLRenderer,
    readBuffer: THREE.WebGLRenderTarget | THREE.Texture,
    writeBuffer: THREE.WebGLRenderTarget | null
  ) {
    const inputTexture = (readBuffer as THREE.WebGLRenderTarget).texture ?? readBuffer;

    if (!this.enabled) {
      // Pass-through copy when disabled
      this.copyMaterial.uniforms.tDiffuse.value = inputTexture;
      this.fsQuad.material = this.copyMaterial;
      if (writeBuffer) renderer.setRenderTarget(writeBuffer);
      else renderer.setRenderTarget(null);
      renderer.clear();
      this.fsQuad.render(renderer);
      this.fsQuad.material = this.material; // Restore for next frame
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
