/**
 * Extended-range sRGB transfer functions. They are sign-preserving and do not
 * clamp, so scene-referred values above 1.0 survive encode/decode round trips
 * (needed when curves and LUTs operate in display-encoded space).
 */
export const TRANSFER_GLSL_CHUNK = `
vec3 srgbDecodeExtended(vec3 c) {
  vec3 a = abs(c);
  vec3 lower = a / 12.92;
  vec3 higher = pow((a + 0.055) / 1.055, vec3(2.4));
  return sign(c) * mix(higher, lower, vec3(lessThanEqual(a, vec3(0.04045))));
}

vec3 srgbEncodeExtended(vec3 c) {
  vec3 a = abs(c);
  vec3 lower = a * 12.92;
  vec3 higher = 1.055 * pow(a, vec3(1.0 / 2.4)) - 0.055;
  return sign(c) * mix(higher, lower, vec3(lessThanEqual(a, vec3(0.0031308))));
}
`;
