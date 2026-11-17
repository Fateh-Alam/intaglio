export const CROP_GLSL = `
vec2 uncropUv(vec2 uv, vec4 crop) {
  return vec2(crop.x, 1.0 - crop.y - crop.w) + uv * crop.zw;
}
`;

export const GEOMETRY_GLSL = `
vec2 sourceUv(vec2 fullUv, float aspect, float rotation, float zoom,
              float anamorphic, float keystoneH, float keystoneV, float distortion) {
  vec2 scale = vec2(aspect, 1.0);
  vec2 p = (fullUv - 0.5) * scale;
  float c = cos(-rotation);
  float s = sin(-rotation);
  p = mat2(c, -s, s, c) * p;
  p /= max(zoom, 0.01);
  p.x /= max(1.0 + anamorphic, 0.05);
  p.x += keystoneH * p.y;
  p.y += keystoneV * p.x;
  float radius2 = dot(p, p) / max(dot(scale * 0.5, scale * 0.5), 1e-6) * 0.5;
  p *= 1.0 + distortion * radius2;
  return p / scale + 0.5;
}
`;
