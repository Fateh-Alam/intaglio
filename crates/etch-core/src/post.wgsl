// Etch's global passes, ported from app/editor/render/passes in the web's
// order: FilmEmulationPass → HalationPass → BloomPass → OpticalFXPass →
// SharpenPass. Film looks themselves come from film.wgsl (generated from the
// web's GLSL). Texture coordinates here are y-down; where the web's maths
// depends on direction, it is done in the web's y-up space (`up`).

struct Post {
  // Working image: width, height, 1/width, 1/height.
  size: vec4<f32>,
  // Unscaled cropped document dimensions, in photo pixels.
  effect_size: vec4<f32>,
  // Film type (index), strength.
  film: vec4<f32>,
  // Sharpness, structure.
  sharpen: vec4<f32>,
  // Bright pass: threshold, mode (0 bloom, 1 halation).
  threshold: vec4<f32>,
  // Blur: direction in texels (x, y), blur image width, height.
  blur: vec4<f32>,
  // Composite: strength, mode (0 bloom, 1 halation).
  composite: vec4<f32>,
  // God light: strength, x, y (web y-up), specular.
  god: vec4<f32>,
  // God light rim, falloff; vignette, aberration.
  optical: vec4<f32>,
  // Film border, anamorphic streaks, grain, time.
  optical2: vec4<f32>,
  god_color: vec4<f32>,
  // Placement in the target, clip space: left, bottom, right, top.
  rect: vec4<f32>,
  // Dither strength, preview coverage flag, device pixels per native texel.
  display: vec4<f32>,
  // Origin and extent of the working tile, and visible region inside it.
  window: vec4<f32>,
  visible: vec4<f32>,
  // Linear surround, plus the clipping warning switch in alpha.
  preview_background: vec4<f32>,
};

@group(0) @binding(0) var<uniform> post: Post;
@group(0) @binding(1) var image: texture_2d<f32>;
@group(0) @binding(2) var extra: texture_2d<f32>;
@group(0) @binding(3) var linear_clamp: sampler;

struct VsOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_post(@builtin(vertex_index) index: u32) -> VsOut {
  var corners = array<vec2<f32>, 6>(
    vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0),
    vec2(0.0, 1.0), vec2(1.0, 0.0), vec2(1.0, 1.0),
  );
  let c = corners[index];
  var out: VsOut;
  out.position = vec4(mix(post.rect.x, post.rect.z, c.x), mix(post.rect.y, post.rect.w, c.y), 0.0, 1.0);
  out.uv = vec2(c.x, 1.0 - c.y);
  return out;
}

fn at(uv: vec2<f32>) -> vec4<f32> {
  return textureSampleLevel(image, linear_clamp, uv, 0.0);
}

fn full_uv(uv: vec2<f32>) -> vec2<f32> {
  return post.window.xy + uv * post.window.zw;
}

fn at_full(uv: vec2<f32>) -> vec4<f32> {
  return at((clamp(uv, vec2(0.0), vec2(1.0)) - post.window.xy) / post.window.zw);
}

// Samples at an image-space offset given in the web's y-up direction.
fn at_up(uv: vec2<f32>, offset_up: vec2<f32>) -> vec4<f32> {
  return at_full(full_uv(uv) + vec2(offset_up.x, -offset_up.y));
}

fn luma709(c: vec3<f32>) -> f32 {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// ---- Film emulation helpers (FilmEmulationPass) ----

fn film_luma(c: vec3<f32>) -> f32 {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

// GLSL's smoothstep formula, written out so reversed edges behave the same.
fn film_smoothstep(e0: f32, e1: f32, x: f32) -> f32 {
  let t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

fn film_smoothstep3(e0: f32, e1: f32, x: vec3<f32>) -> vec3<f32> {
  return vec3(film_smoothstep(e0, e1, x.r), film_smoothstep(e0, e1, x.g), film_smoothstep(e0, e1, x.b));
}

fn rgb_to_hsl(color: vec3<f32>) -> vec3<f32> {
  let max_c = max(max(color.r, color.g), color.b);
  let min_c = min(min(color.r, color.g), color.b);
  var hsl = vec3(0.0, 0.0, (max_c + min_c) / 2.0);
  if (max_c != min_c) {
    let d = max_c - min_c;
    // Bounded so channels above 1 can't divide by zero (NaN spreads through the glows).
    hsl.y = clamp(select(d / max(max_c + min_c, 1e-6), d / max(2.0 - max_c - min_c, 1e-6), hsl.z > 0.5), 0.0, 1.0);
    if (max_c == color.r) {
      hsl.x = (color.g - color.b) / d + select(0.0, 6.0, color.g < color.b);
    } else if (max_c == color.g) {
      hsl.x = (color.b - color.r) / d + 2.0;
    } else {
      hsl.x = (color.r - color.g) / d + 4.0;
    }
    hsl.x = hsl.x / 6.0;
  }
  return hsl;
}

fn hue_to_rgb(f1: f32, f2: f32, hue_in: f32) -> f32 {
  var hue = hue_in;
  if (hue < 0.0) { hue = hue + 1.0; } else if (hue > 1.0) { hue = hue - 1.0; }
  if ((6.0 * hue) < 1.0) { return f1 + (f2 - f1) * 6.0 * hue; }
  if ((2.0 * hue) < 1.0) { return f2; }
  if ((3.0 * hue) < 2.0) { return f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0; }
  return f1;
}

fn hsl_to_rgb(hsl: vec3<f32>) -> vec3<f32> {
  if (hsl.y == 0.0) { return vec3(hsl.z); }
  var f2: f32;
  if (hsl.z < 0.5) { f2 = hsl.z * (1.0 + hsl.y); } else { f2 = (hsl.z + hsl.y) - (hsl.y * hsl.z); }
  let f1 = 2.0 * hsl.z - f2;
  return vec3(hue_to_rgb(f1, f2, hsl.x + (1.0 / 3.0)), hue_to_rgb(f1, f2, hsl.x), hue_to_rgb(f1, f2, hsl.x - (1.0 / 3.0)));
}

@fragment
fn fs_film(in: VsOut) -> @location(0) vec4<f32> {
  var texel = at(in.uv);
  let film_type = i32(post.film.x);
  if (film_type > 0 && post.film.y > 0.0) {
    texel = vec4(apply_film_emulation(texel.rgb, film_type, post.film.y), texel.a);
  }
  return texel;
}

// ---- Bloom and halation (BloomPass, HalationPass) ----

@fragment
fn fs_threshold(in: VsOut) -> @location(0) vec4<f32> {
  let c = at(in.uv);
  let t = post.threshold.x;
  var weight: f32;
  if (post.threshold.y == 1.0) {
    // Halation: bright highlights bleeding through the red layer.
    weight = smoothstep(max(0.0, t - 0.08), t + 0.10, linear_to_srgb1(c.r));
  } else {
    weight = smoothstep(max(0.0, t - 0.12), t + 0.08, linear_to_srgb1(luma709(max(c.rgb, vec3(0.0)))));
  }
  return vec4(c.rgb * weight, c.a);
}

@fragment
fn fs_blur(in: VsOut) -> @location(0) vec4<f32> {
  let texel = 1.0 / post.blur.zw;
  // The web's direction is y-up; blur is symmetric, so only the axis matters.
  let step = texel * post.blur.xy;
  var c = at(in.uv - 4.0 * step) * 0.016216;
  c += at(in.uv - 3.0 * step) * 0.054054;
  c += at(in.uv - 2.0 * step) * 0.1216216;
  c += at(in.uv - 1.0 * step) * 0.1945945;
  c += at(in.uv) * 0.227027;
  c += at(in.uv + 1.0 * step) * 0.1945945;
  c += at(in.uv + 2.0 * step) * 0.1216216;
  c += at(in.uv + 3.0 * step) * 0.054054;
  c += at(in.uv + 4.0 * step) * 0.016216;
  return c;
}

@fragment
fn fs_composite(in: VsOut) -> @location(0) vec4<f32> {
  let base = at(in.uv);
  let glow = textureSampleLevel(extra, linear_clamp, in.uv, 0.0);
  if (post.composite.y == 1.0) {
    let tint = vec3(1.0, 0.36, 0.08) * glow.r;
    let clamped = clamp(base.rgb, vec3(0.0), vec3(1.0));
    return vec4(base.rgb + tint * post.composite.x * (1.0 - clamped), base.a);
  }
  return vec4(base.rgb + glow.rgb * post.composite.x, base.a);
}

// ---- Optical effects and grain (OpticalFXPass) ----

fn filtered_grain(center: vec2<f32>, footprint: vec2<f32>, time: f32) -> f32 {
  let scale = max(footprint.x, footprint.y);
  if (scale <= 1.001) { return grain_noise(floor(center) + time); }
  if (scale >= 3.0) { return 0.5; }
  let first = center - footprint * 0.5;
  let last = center + footprint * 0.5;
  let start = floor(first);
  var sum = 0.0;
  for (var y = 0; y < 4; y++) {
    for (var x = 0; x < 4; x++) {
      let cell = start + vec2(f32(x), f32(y));
      let coverage = max(vec2(0.0), min(last, cell + 1.0) - max(first, cell));
      sum += coverage.x * coverage.y * (grain_noise(cell + time) - 0.5);
    }
  }
  return 0.5 + (1.0 - smoothstep(2.0, 3.0, scale)) * sum / (footprint.x * footprint.y);
}

@fragment
fn fs_optical(in: VsOut) -> @location(0) vec4<f32> {
  let uv = in.uv;
  let image_uv = full_uv(uv);
  let up = vec2(image_uv.x, 1.0 - image_uv.y);
  let full = post.size.xy;
  let aberration = post.optical.w;
  var color = vec3(at_up(uv, vec2(aberration, 0.0)).r, at(uv).g, at_up(uv, vec2(-aberration, 0.0)).b);

  let streaks = post.optical2.y;
  if (streaks > 0.0) {
    var streak = vec3(0.0);
    for (var i = -20; i <= 20; i = i + 1) {
      let offset = f32(i) * 0.005;
      let s = at_up(uv, vec2(offset, 0.0)).rgb;
      let brightness = linear_to_srgb1(max(s.r, max(s.g, s.b)));
      let weight = smoothstep(0.66, 0.84, brightness);
      if (weight > 0.0) {
        streak += s * weight * (1.0 - abs(offset * 9.5));
      }
    }
    streak = streak / 14.0 * vec3(0.45, 0.78, 1.0);
    color += streak * streaks;
  }

  let god = post.god.x;
  if (god > 0.0) {
    let tap_scale = max(1.0, min(full.x, full.y) / 480.0);
    let step = tap_scale * post.size.zw;
    let t = linear_to_srgb1(luma709(at_up(uv, vec2(0.0, step.y)).rgb));
    let bot = linear_to_srgb1(luma709(at_up(uv, vec2(0.0, -step.y)).rgb));
    let l = linear_to_srgb1(luma709(at_up(uv, vec2(-step.x, 0.0)).rgb));
    let r = linear_to_srgb1(luma709(at_up(uv, vec2(step.x, 0.0)).rgb));
    let normal = normalize(vec3((r - l) * 4.0, (t - bot) * 4.0, 1.0));
    let light_pos = post.god.yz;
    let light_dir = normalize(vec3(light_pos - up, 0.5));
    let dist = length(light_pos - up);
    let falloff = 1.0 / (1.0 + dist * dist * post.optical.y * 5.0);
    let diffuse = max(dot(normal, light_dir), 0.0);
    let light = post.god_color.rgb;
    let diffuse_light = light * diffuse * god * falloff;
    let reflect_dir = reflect(-light_dir, normal);
    let spec = pow(max(dot(vec3(0.0, 0.0, 1.0), reflect_dir), 0.0), 32.0);
    let specular = light * spec * post.god.w * falloff;
    let gradient = vec2(r - l, t - bot);
    let edge = length(gradient);
    let facing = 0.35 + 0.65 * max(dot(normalize(gradient + vec2(1e-5)), normalize(light_pos - up + vec2(1e-5))), 0.0);
    let rim = smoothstep(0.02, 0.22, edge) * facing * falloff;
    let rim_light = light * rim * post.optical.x * god;
    color += color * diffuse_light * 0.5;
    color += specular * 0.3;
    color += rim_light * 0.65;
  }

  let grain = post.optical2.z;
  if (grain > 0.0) {
    let noise = filtered_grain(up * post.effect_size.xy, post.effect_size.xy / full, post.optical2.w);
    let luma = luma709(color);
    let weight = (1.0 - smoothstep(0.7, 1.0, luma)) * (smoothstep(0.0, 0.1, luma) * 0.5 + 0.5);
    color += (noise - 0.5) * grain * weight;
  }

  let vignette = post.optical.z;
  if (vignette > 0.0) {
    color *= smoothstep(0.8, 0.25 * (1.0 - vignette), length(up - 0.5));
  }

  if (post.optical2.x > 0.5) {
    let border = step(vec2(0.02), up) * step(up, vec2(0.98));
    color *= border.x * border.y;
  }
  return vec4(color, at(uv).a);
}

// ---- Sharpen and structure (SharpenPass) ----

@fragment
fn fs_sharpen(in: VsOut) -> @location(0) vec4<f32> {
  let uv = in.uv;
  let c = at(uv);
  var color = c.rgb;
  let sharpness = post.sharpen.x;
  if (sharpness != 0.0) {
    let step = post.size.zw;
    let around = at_up(uv, vec2(0.0, step.y)).rgb + at_up(uv, vec2(0.0, -step.y)).rgb + at_up(uv, vec2(-step.x, 0.0)).rgb + at_up(uv, vec2(step.x, 0.0)).rgb;
    color += (c.rgb * 4.0 - around) * sharpness * 0.5;
  }
  let structure = post.sharpen.y;
  if (structure != 0.0) {
    let blur = (at_up(uv, vec2(0.005, 0.0)).rgb + at_up(uv, vec2(-0.005, 0.0)).rgb + at_up(uv, vec2(0.0, 0.005)).rgb + at_up(uv, vec2(0.0, -0.005)).rgb) / 4.0;
    color += (c.rgb - blur) * structure * 2.0;
  }
  return vec4(color, c.a);
}

// The creative stack consumes encoded sRGB, like WebGL. An sRGB window or
// readback attachment encodes on write, so decode only when presenting to it.
fn display_color(uv: vec2<f32>) -> vec4<f32> {
  let c = at(uv);
  let global = full_uv(uv);
  let pixel = floor(vec2(global.x, 1.0 - global.y) * post.size.xy);
  return vec4(encode_display(c.rgb, pixel, post.display.x), c.a);
}

@fragment
fn fs_display_encoded(in: VsOut) -> @location(0) vec4<f32> {
  return display_color(in.uv);
}

@fragment
fn fs_display_srgb(in: VsOut) -> @location(0) vec4<f32> {
  return present(display_color(in.uv));
}

@fragment
fn fs_present_srgb(in: VsOut) -> @location(0) vec4<f32> {
  return present(at(in.uv));
}

@fragment
fn fs_copy(in: VsOut) -> @location(0) vec4<f32> {
  return at(in.uv);
}

@fragment
fn fs_node_opacity(in: VsOut) -> @location(0) vec4<f32> {
  return mix(textureSampleLevel(extra, linear_clamp, in.uv, 0.0), at(in.uv), post.composite.w);
}

fn preview_uv(in: VsOut) -> vec2<f32> {
  return post.visible.xy + in.uv * post.visible.zw;
}

fn preview_sample(uv: vec2<f32>) -> vec2<f32> {
  let size = vec2<f32>(textureDimensions(image));
  if (post.display.z >= 0.999) { return (floor(uv * size) + 0.5) / size; }
  return uv;
}

fn preview_tint(encoded: vec4<f32>, sampled: vec2<f32>, visible: vec2<f32>) -> vec4<f32> {
  var coverage = 0.0;
  if (post.display.y > 0.5) {
    let mask = textureSampleLevel(extra, linear_clamp, sampled, 0.0);
    coverage = select(mask.r, mask.a, post.display.w > 0.5);
  }
  var color = tint_display(encoded.rgb, post.preview_background.w > 0.5, coverage);
  if (post.display.z >= 4.0) {
    let f = fract(visible * vec2<f32>(textureDimensions(image)));
    let edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * post.display.z;
    color = mix(color, vec3(0.5), (1.0 - smoothstep(0.0, 1.0, edge)) * 0.22);
  }
  return vec4(color, encoded.a);
}

@fragment
fn fs_preview_linear(in: VsOut) -> @location(0) vec4<f32> {
  let uv = preview_uv(in);
  let sampled = preview_sample(uv);
  return composite_display(preview_tint(display_color(sampled), sampled, uv), post.preview_background.rgb);
}

@fragment
fn fs_preview_encoded(in: VsOut) -> @location(0) vec4<f32> {
  let uv = preview_uv(in);
  let sampled = preview_sample(uv);
  return composite_display(preview_tint(at(sampled), sampled, uv), post.preview_background.rgb);
}
