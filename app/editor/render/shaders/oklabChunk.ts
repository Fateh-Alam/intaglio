/**
 * Shared OKLAB / OKLCH GLSL functions for the Intaglio render pipeline.
 * Based on Bjorn Ottosson's OKLAB perceptually uniform color space.
 *
 * These functions operate in LINEAR sRGB space. Ensure your shader input
 * is linearized before calling any OKLAB function.
 *
 * Reference: engineering-specs-professional.md §10, §11.2–11.3
 */
export const OKLAB_GLSL_CHUNK = `
// ============================================
// OKLAB / OKLCH PERCEPTUAL COLOR SCIENCE
// Bjorn Ottosson's OKLAB — perceptually uniform color space
// ============================================

float luma709(vec3 linearRgb) {
  return dot(linearRgb, vec3(0.2126, 0.7152, 0.0722));
}

// Linear to sRGB (IEC 61966-2-1 standard) — needed by skin mask RGB guard
vec3 linearToSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  bvec3 cutoff = lessThanEqual(c, vec3(0.0031308));
  vec3 lower = c * 12.92;
  vec3 higher = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(higher, lower, vec3(cutoff));
}

// §10.2 Linear sRGB → OKLAB
vec3 linearSrgbToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;

  vec3 lms = sign(vec3(l, m, s)) * pow(abs(vec3(l, m, s)), vec3(1.0 / 3.0));

  return vec3(
    0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
    1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
    0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z
  );
}

// §10.3 OKLAB → Linear sRGB
vec3 oklabToLinearSrgb(vec3 lab) {
  float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;

  float l = l_ * l_ * l_;
  float m = m_ * m_ * m_;
  float s = s_ * s_ * s_;

  return vec3(
     4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

// §10.4 OKLAB → OKLCH (Lightness, Chroma, Hue)
vec3 oklabToOklch(vec3 lab) {
  float C = length(lab.yz);
  float h = atan(lab.z, lab.y); // radians, range [-π, π]
  return vec3(lab.x, C, h);
}

// §10.5 OKLCH → OKLAB
vec3 oklchToOklab(vec3 lch) {
  return vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
}

// §11.2 Circular hue distance (wraps at 2π)
float circularDistance(float a, float b) {
  float d = abs(a - b);
  return min(d, 6.28318530718 - d);
}

// §11.3 Smooth channel weight — bell curve centered on target hue
float hueWeight(float hue, float center, float width) {
  float d = circularDistance(hue, center);
  return 1.0 - smoothstep(width * 0.5, width, d);
}
`;
