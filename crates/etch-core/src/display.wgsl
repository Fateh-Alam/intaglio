// Shared display math for the viewport compositor and fused final plate pass.
fn linear_to_srgb1(x: f32) -> f32 {
  let c = max(x, 0.0);
  if (c <= 0.0031308) { return c * 12.92; }
  return 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

// Integer hash (PCG) of a pixel, as the web's grainNoise: the same on every GPU.
fn pcg_hash(v: u32) -> u32 {
  let state = v * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn grain_noise(pixel: vec2<f32>) -> f32 {
  let p = vec2<u32>(max(pixel, vec2(0.0)));
  return f32(pcg_hash(p.x + pcg_hash(p.y)) >> 8u) / 16777216.0;
}

fn srgb_to_linear1(c: f32) -> f32 {
  if (c <= 0.04045) { return c / 12.92; }
  return pow((c + 0.055) / 1.055, 2.4);
}

fn present(c: vec4<f32>) -> vec4<f32> {
  return vec4(srgb_to_linear1(c.r), srgb_to_linear1(c.g), srgb_to_linear1(c.b), c.a);
}

fn encode_display(color: vec3<f32>, pixel: vec2<f32>, dither: f32) -> vec3<f32> {
  let encoded = vec3(linear_to_srgb1(color.r), linear_to_srgb1(color.g), linear_to_srgb1(color.b));
  let noise = (grain_noise(pixel) - grain_noise(pixel + vec2(19.0))) * (dither / 255.0);
  let dithered = select(encoded, encoded + noise, (encoded > vec3(0.0)) & (encoded < vec3(1.0)));
  return clamp(dithered, vec3(0.0), vec3(1.0));
}

fn tint_display(encoded: vec3<f32>, clipping: bool, coverage: f32) -> vec3<f32> {
  var color = encoded;
  if (clipping) {
    let high = max(color.r, max(color.g, color.b));
    if (high >= 0.994) { color = vec3(1.0, 0.2, 0.16); }
    else if (high <= 0.006) { color = vec3(0.12, 0.38, 1.0); }
  }
  return mix(color, vec3(1.0, 0.16, 0.19), coverage * 0.56);
}

fn composite_display(encoded: vec4<f32>, background: vec3<f32>) -> vec4<f32> {
  let linear = present(encoded);
  return vec4(mix(background, linear.rgb, linear.a), 1.0);
}
