// Etch's per-pixel edit pipeline, fused into one pass. Ported from
// app/editor/render/passes: GeometryPass (where to read) → BaseDevelopPass →
// ToneCurvePass → OklchMixerPass → ColorWheelsPass → LutPass, in that order. Keep them in step: same order, same
// constants, same identity at defaults. `reference.rs` is the CPU twin.

struct Params {
  exposure: f32,
  contrast: f32,
  highlights: f32,
  shadows: f32,
  whites: f32,
  blacks: f32,
  temperature: f32,
  tint: f32,
  protect_highlights: f32,
  vibrance: f32,
  saturation: f32,
  dehaze: f32,
  toe_strength: f32,
  toe_length: f32,
  shoulder_strength: f32,
  shoulder_length: f32,
  film_gamma: f32,
  color_crossover: f32,
  luma_desat: f32,
  _pad: f32,
  // Where the photo lands in the target, in clip space: left, bottom, right, top.
  rect: vec4<f32>,
  // Per mixer band: hue shift (radians), chroma offset, lightness offset.
  mixer: array<vec4<f32>, 8>,
  // Shadows, midtones, highlights: hue (radians), saturation, luminance.
  grading: array<vec4<f32>, 3>,
  // Grading balance, skin protection, tone curve on, mixer on.
  switches: vec4<f32>,
  // Grading on.
  switches2: vec4<f32>,
  // Creative LUT: strength, size, on.
  lut: vec4<f32>,
  lut_domain_min: vec4<f32>,
  lut_domain_max: vec4<f32>,
  // Crop x, y (top-left origin), width, height.
  crop: vec4<f32>,
  // Rotation (radians), zoom, lens distortion, anamorphic.
  geometry: vec4<f32>,
  // Keystone H, keystone V, photo aspect, geometry on.
  geometry2: vec4<f32>,
  output_window: vec4<f32>,
  source_window: vec4<f32>,
  viewport_background: vec4<f32>,
  viewport_image: vec4<f32>,
  viewport_visible: vec4<f32>,
  leading_grade: array<vec4<f32>, 2>,
};

@group(0) @binding(0) var<uniform> p: Params;
@group(0) @binding(1) var source: texture_2d<f32>;
@group(0) @binding(2) var source_sampler: sampler;
// 1024×1 RGBA float: red, green, blue channel curves; alpha the master curve.
@group(0) @binding(3) var curve_table: texture_2d<f32>;
// Creative LUT: half-float RGBA, red fastest, sampled trilinearly like the web's.
@group(0) @binding(4) var lut: texture_3d<f32>;

struct VsOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) index: u32) -> VsOut {
  var corners = array<vec2<f32>, 6>(
    vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0),
    vec2(0.0, 1.0), vec2(1.0, 0.0), vec2(1.0, 1.0),
  );
  let c = corners[index];
  var out: VsOut;
  out.position = vec4(mix(p.rect.x, p.rect.z, c.x), mix(p.rect.y, p.rect.w, c.y), 0.0, 1.0);
  out.uv = vec2(c.x, 1.0 - c.y);
  return out;
}

// ---- OKLab (Björn Ottosson), linear sRGB in and out ----

fn luma709(c: vec3<f32>) -> f32 {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

fn linear_srgb_to_oklab(c: vec3<f32>) -> vec3<f32> {
  let l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  let m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  let s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  let lms = sign(vec3(l, m, s)) * pow(abs(vec3(l, m, s)), vec3(1.0 / 3.0));
  return vec3(
    0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
    1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
    0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z,
  );
}

fn oklab_to_linear_srgb(lab: vec3<f32>) -> vec3<f32> {
  let l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  let m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  let s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  let l = l_ * l_ * l_;
  let m = m_ * m_ * m_;
  let s = s_ * s_ * s_;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  );
}

// ---- Transfer and tone helpers ----

fn linear_to_srgb_scalar(x: f32) -> f32 {
  let c = max(x, 0.0);
  if (c <= 0.0031308) { return c * 12.92; }
  return 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

fn srgb_to_linear_scalar(x: f32) -> f32 {
  let c = max(x, 0.0);
  if (c <= 0.04045) { return c / 12.92; }
  return pow((c + 0.055) / 1.055, 2.4);
}

fn perceptual_luma(c: vec3<f32>) -> f32 {
  return linear_to_srgb_scalar(max(luma709(c), 0.0));
}

fn apply_log_contrast(color: vec3<f32>, contrast: f32, pivot: f32) -> vec3<f32> {
  if (contrast == 0.0) { return color; }
  let log_color = log2(max(color, vec3(1e-6)));
  let log_pivot = log2(pivot);
  return exp2((log_color - log_pivot) * (1.0 + contrast) + log_pivot);
}

fn apply_highlights(color: vec3<f32>, amount: f32) -> vec3<f32> {
  if (amount == 0.0) { return color; }
  let w = smoothstep(0.45, 0.95, perceptual_luma(color));
  return color * exp2(amount * 1.35 * w);
}

fn protect_highlights(original: vec3<f32>, adjusted: vec3<f32>, strength: f32) -> vec3<f32> {
  if (strength == 0.0) { return adjusted; }
  let y_orig = max(luma709(original), 0.0);
  let y_adj = max(luma709(adjusted), 0.0);
  if (y_adj <= y_orig) { return adjusted; }
  let knee = 0.50;
  if (y_adj <= knee) { return adjusted; }
  let excess = y_adj - knee;
  let headroom = max(1.0 - knee, 0.01);
  let rolled_y = knee + headroom * (excess / (excess + headroom));
  let target_y = mix(y_adj, max(y_orig, rolled_y), strength);
  return adjusted * (target_y / max(y_adj, 1e-6));
}

fn apply_shadows(color: vec3<f32>, amount: f32) -> vec3<f32> {
  if (amount == 0.0) { return color; }
  let w = 1.0 - smoothstep(0.05, 0.55, perceptual_luma(color));
  if (amount > 0.0) {
    return color * exp2(amount * 1.2 * w) + vec3(amount * 0.025) * w * (1.0 - clamp(color, vec3(0.0), vec3(1.0)));
  }
  return color * exp2(amount * 1.4 * w);
}

fn apply_whites(color: vec3<f32>, whites: f32) -> vec3<f32> {
  if (whites == 0.0) { return color; }
  let w = smoothstep(0.60, 0.98, perceptual_luma(color));
  return color * exp2(whites * 1.75 * w);
}

fn apply_blacks(color: vec3<f32>, blacks: f32) -> vec3<f32> {
  if (blacks == 0.0) { return color; }
  let w = 1.0 - smoothstep(0.0, 0.32, perceptual_luma(color));
  if (blacks > 0.0) {
    return color * exp2(blacks * 0.8 * w) + vec3(blacks * 0.04) * w * (1.0 - clamp(color, vec3(0.0), vec3(1.0)));
  }
  return color * exp2(blacks * 2.0 * w);
}

fn apply_vibrance(color: vec3<f32>, amount: f32) -> vec3<f32> {
  if (amount == 0.0) { return color; }
  let lab = linear_srgb_to_oklab(max(color, vec3(0.0)));
  let chroma = length(lab.yz);
  let hue = atan2(lab.z, lab.y);
  let weight = 1.0 - smoothstep(0.02, 0.22, chroma);
  let new_chroma = chroma * max(0.0, 1.0 + amount * weight);
  return oklab_to_linear_srgb(vec3(lab.x, new_chroma * cos(hue), new_chroma * sin(hue)));
}

fn apply_saturation(color: vec3<f32>, amount: f32) -> vec3<f32> {
  if (amount == 0.0) { return color; }
  let lab = linear_srgb_to_oklab(max(color, vec3(0.0)));
  return oklab_to_linear_srgb(vec3(lab.x, lab.yz * max(0.0, 1.0 + amount)));
}

fn apply_dehaze(color: vec3<f32>, amount: f32) -> vec3<f32> {
  if (amount == 0.0) { return color; }
  let y = luma709(color);
  let haze_mask = smoothstep(0.08, 0.80, perceptual_luma(color));
  let contrast_color = apply_log_contrast(color, amount * 0.45, 0.18);
  let sat_color = mix(vec3(y), color, 1.0 + amount * 0.25);
  let dehazed = mix(contrast_color, sat_color, 0.35);
  let atmospheric = vec3(y) + vec3(0.08, 0.09, 0.1);
  if (amount >= 0.0) { return mix(color, dehazed, amount * haze_mask); }
  return mix(color, atmospheric, -amount * 0.35);
}

fn apply_tint(color: vec3<f32>, tint: f32) -> vec3<f32> {
  if (tint == 0.0) { return color; }
  let gain = exp2(vec3(tint * 0.15, -tint * 0.25, tint * 0.15));
  let luma_gain = dot(gain, vec3(0.2126, 0.7152, 0.0722));
  return color * (gain / max(luma_gain, 1e-5));
}

fn apply_film_toe(x: f32, strength: f32, length_param: f32) -> f32 {
  if (strength <= 0.0) { return x; }
  let clamped = max(x, 0.0);
  if (clamped >= 1.0) { return clamped; }
  let s = linear_to_srgb_scalar(clamped);
  let scale = clamp(length_param * 10.0, 0.25, 2.0);
  let s_toe = s + 0.14 * strength * scale * pow(1.0 - s, 2.5);
  return srgb_to_linear_scalar(clamp(s_toe, 0.0, 1.0));
}

fn apply_film_shoulder(x: f32, strength: f32, length_param: f32) -> f32 {
  if (strength <= 0.0 || x <= 0.18) { return x; }
  let k = strength * clamp(length_param, 0.2, 2.0) * 1.25;
  let excess = x - 0.18;
  return 0.18 + excess / (1.0 + k * excess);
}

fn apply_film_density(x: f32) -> f32 {
  var v = max(x, 0.0);
  v = apply_film_toe(v, p.toe_strength, p.toe_length);
  v = apply_film_shoulder(v, p.shoulder_strength, p.shoulder_length);
  if (p.film_gamma != 1.0) { v = pow(max(v, 0.0), p.film_gamma); }
  return v;
}

fn film_saturation_by_luma(pl: f32, base_sat: f32) -> f32 {
  let shadow_desat = smoothstep(0.0, 0.30, pl);
  let highlight_desat = 1.0 - smoothstep(0.70, 1.0, pl) * 0.45;
  return base_sat * shadow_desat * highlight_desat;
}

fn apply_color_crossover(color: vec3<f32>, strength: f32) -> vec3<f32> {
  if (strength == 0.0) { return color; }
  let shift = mix(vec3(-0.02, 0.01, 0.04), vec3(0.04, 0.01, -0.02), smoothstep(0.15, 0.85, perceptual_luma(color)));
  return max(color + shift * strength, vec3(0.0));
}

fn kelvin_to_rgb(kelvin: f32) -> vec3<f32> {
  let t = kelvin / 100.0;
  var rgb: vec3<f32>;
  if (t <= 66.0) {
    rgb.r = 255.0;
    rgb.g = 99.4708025861 * log(t) - 161.1195681661;
    if (t <= 19.0) {
      rgb.b = 0.0;
    } else {
      rgb.b = 138.5177312231 * log(t - 10.0) - 305.0447927307;
    }
  } else {
    rgb.r = 329.698727446 * pow(t - 60.0, -0.1332047592);
    rgb.g = 288.1221695283 * pow(t - 60.0, -0.0755148492);
    rgb.b = 255.0;
  }
  return clamp(rgb / 255.0, vec3(0.0), vec3(1.0));
}

fn develop(original: vec3<f32>) -> vec3<f32> {
  var color = original;

  if (p.temperature != 6500.0) {
    let wb = kelvin_to_rgb(6500.0) / max(kelvin_to_rgb(p.temperature), vec3(1e-5));
    color = color * (wb / max(luma709(wb), 1e-5));
  }
  color = apply_tint(color, p.tint);

  color = color * exp2(p.exposure);
  color = apply_log_contrast(color, p.contrast, 0.18);
  color = apply_highlights(color, p.highlights);
  color = apply_shadows(color, p.shadows);
  color = apply_whites(color, p.whites);
  color = apply_blacks(color, p.blacks);
  color = apply_vibrance(color, p.vibrance);
  color = apply_saturation(color, p.saturation);
  color = apply_dehaze(color, p.dehaze);
  color = apply_color_crossover(color, p.color_crossover);

  if (p.luma_desat > 0.0) {
    let y = luma709(color);
    let sat_mod = film_saturation_by_luma(perceptual_luma(color), 1.0);
    color = mix(color, mix(vec3(y), color, sat_mod), p.luma_desat);
  }

  if (p.toe_strength > 0.0 || p.shoulder_strength > 0.0 || p.film_gamma != 1.0) {
    color = vec3(apply_film_density(color.r), apply_film_density(color.g), apply_film_density(color.b));
  }

  return protect_highlights(original, color, p.protect_highlights);
}

// ---- Tone curve (ToneCurvePass) ----
// Curves are authored on display-encoded values: encode, apply master then
// per-channel curves, decode. Outside 0–1 they continue with unit slope.

fn srgb_decode_extended(c: vec3<f32>) -> vec3<f32> {
  let a = abs(c);
  return sign(c) * select(pow((a + 0.055) / 1.055, vec3(2.4)), a / 12.92, a <= vec3(0.04045));
}

fn srgb_encode_extended(c: vec3<f32>) -> vec3<f32> {
  let a = abs(c);
  return sign(c) * select(1.055 * pow(a, vec3(1.0 / 2.4)) - 0.055, a * 12.92, a <= vec3(0.0031308));
}

fn curve_at(x: f32) -> vec4<f32> {
  let size = f32(textureDimensions(curve_table).x);
  let position = clamp(x, 0.0, 1.0) * (size - 1.0);
  let lower = floor(position);
  let upper = min(lower + 1.0, size - 1.0);
  let a = textureLoad(curve_table, vec2<i32>(i32(lower), 0), 0);
  let b = textureLoad(curve_table, vec2<i32>(i32(upper), 0), 0);
  return mix(a, b, position - lower);
}

fn extend(x: f32, curved: f32, at_zero: f32, at_one: f32) -> f32 {
  if (x > 1.0) { return at_one + (x - 1.0); }
  if (x < 0.0) { return at_zero + x; }
  return curved;
}

fn apply_curves(color: vec3<f32>) -> vec3<f32> {
  if (p.switches.z == 0.0) { return color; }
  let e = srgb_encode_extended(color);
  let ends0 = curve_at(0.0);
  let ends1 = curve_at(1.0);
  let master = vec3(
    extend(e.r, curve_at(e.r).a, ends0.a, ends1.a),
    extend(e.g, curve_at(e.g).a, ends0.a, ends1.a),
    extend(e.b, curve_at(e.b).a, ends0.a, ends1.a),
  );
  let graded = vec3(
    extend(master.r, curve_at(master.r).r, ends0.r, ends1.r),
    extend(master.g, curve_at(master.g).g, ends0.g, ends1.g),
    extend(master.b, curve_at(master.b).b, ends0.b, ends1.b),
  );
  return srgb_decode_extended(graded);
}

// ---- Color mixer (OklchMixerPass) ----

const TAU: f32 = 6.28318530718;

fn circular_distance(a: f32, b: f32) -> f32 {
  let d = abs(a - b);
  return min(d, TAU - d);
}

fn hue_weight(hue: f32, center: f32, width: f32) -> f32 {
  return 1.0 - smoothstep(width * 0.5, width, circular_distance(hue, center));
}

fn mixer_band(color: vec3<f32>, center: f32, width: f32, band: vec4<f32>) -> vec3<f32> {
  if (abs(band.x) < 0.001 && abs(band.y) < 0.001 && abs(band.z) < 0.001) { return color; }
  let lab = linear_srgb_to_oklab(max(color, vec3(0.0)));
  var l = lab.x;
  var chroma = length(lab.yz);
  var hue = atan2(lab.z, lab.y);
  if (hue < 0.0) { hue = hue + TAU; }
  // Greys have no hue (OKLab gives rounding noise), so bands fade in with chroma.
  let w = hue_weight(hue, center, width) * smoothstep(0.0, 0.02, chroma);
  if (w < 0.001) { return color; }
  hue = hue + band.x * w;
  chroma = chroma * (1.0 + band.y * w);
  l = l + band.z * w;
  l = clamp(l, 0.0, 1.2);
  chroma = max(chroma, 0.0);
  return oklab_to_linear_srgb(vec3(l, chroma * cos(hue), chroma * sin(hue)));
}

fn linear_to_srgb_vec(c: vec3<f32>) -> vec3<f32> {
  return vec3(linear_to_srgb_scalar(c.r), linear_to_srgb_scalar(c.g), linear_to_srgb_scalar(c.b));
}

fn skin_mask(linear_rgb: vec3<f32>) -> f32 {
  let lab = linear_srgb_to_oklab(max(linear_rgb, vec3(0.0)));
  let chroma = length(lab.yz);
  var hue = atan2(lab.z, lab.y);
  if (hue < 0.0) { hue = hue + TAU; }
  let h = hue_weight(hue, 0.95993, 0.95993);
  let chroma_mask = smoothstep(0.025, 0.08, chroma) * (1.0 - smoothstep(0.32, 0.46, chroma));
  let light_mask = smoothstep(0.18, 0.38, lab.x) * (1.0 - smoothstep(0.95, 1.1, lab.x));
  let m1 = h * chroma_mask * light_mask;
  let rgb = linear_to_srgb_vec(max(linear_rgb, vec3(0.0)));
  let rg = smoothstep(0.02, 0.18, rgb.r - rgb.g);
  let gb = smoothstep(-0.05, 0.12, rgb.g - rgb.b);
  let rb = smoothstep(0.06, 0.28, rgb.r - rgb.b);
  let brightness = smoothstep(0.08, 0.22, max(max(rgb.r, rgb.g), rgb.b));
  let m2 = rg * gb * rb * brightness;
  return clamp(max(m1, m2) * 1.15, 0.0, 1.0);
}

fn protect_skin_color(original: vec3<f32>, adjusted: vec3<f32>, strength: f32) -> vec3<f32> {
  let m = skin_mask(original) * strength;
  let lab_orig = linear_srgb_to_oklab(max(original, vec3(0.0)));
  let lab_adj = linear_srgb_to_oklab(max(adjusted, vec3(0.0)));
  return oklab_to_linear_srgb(vec3(lab_adj.x, mix(lab_adj.yz, lab_orig.yz, vec2(m))));
}

fn apply_mixer(input: vec3<f32>) -> vec3<f32> {
  if (p.switches.w == 0.0) { return input; }
  var color = input;
  color = mixer_band(color, 0.4363, 0.6632, p.mixer[0]);
  color = mixer_band(color, 0.9599, 0.5585, p.mixer[1]);
  color = mixer_band(color, 1.6057, 0.6283, p.mixer[2]);
  color = mixer_band(color, 2.5307, 0.8378, p.mixer[3]);
  color = mixer_band(color, 3.4034, 0.7330, p.mixer[4]);
  color = mixer_band(color, 4.2761, 0.8029, p.mixer[5]);
  color = mixer_band(color, 5.0952, 0.7330, p.mixer[6]);
  color = mixer_band(color, 5.8468, 0.6632, p.mixer[7]);
  if (p.switches.y > 0.0) { color = protect_skin_color(input, color, p.switches.y); }
  return max(color, vec3(0.0));
}

// ---- Three-way color grading (ColorWheelsPass) ----

fn apply_grading(color: vec3<f32>) -> vec3<f32> {
  if (p.switches2.x == 0.0) { return color; }
  var lab = linear_srgb_to_oklab(max(color, vec3(0.0)));
  let pl = clamp(lab.x, 0.0, 1.0);
  let b = 0.5 - p.switches.x * 0.5;
  let sw = 1.0 - smoothstep(0.05, mix(0.25, 0.55, b), pl);
  let hw = smoothstep(mix(0.42, 0.72, b), 0.95, pl);
  let mw = clamp(1.0 - sw - hw, 0.0, 1.0);
  let w = vec3(sw, mw, hw) / max(sw + mw + hw, 1e-5);
  let s = p.grading[0];
  let m = p.grading[1];
  let h = p.grading[2];
  let push = vec2(cos(s.x), sin(s.x)) * (s.y * 0.12) * w.x
    + vec2(cos(m.x), sin(m.x)) * (m.y * 0.12) * w.y
    + vec2(cos(h.x), sin(h.x)) * (h.y * 0.12) * w.z;
  lab = vec3(lab.x, lab.yz + push);
  lab.x = lab.x + s.z * 0.15 * w.x + m.z * 0.15 * w.y + h.z * 0.15 * w.z;
  lab.x = clamp(lab.x, 0.0, 1.2);
  return max(oklab_to_linear_srgb(lab), vec3(0.0));
}

// ---- Creative LUT (LutPass) ----
// .cube LUTs are authored for display-encoded input: encode, look up, decode, blend.

fn apply_lut(color: vec3<f32>) -> vec3<f32> {
  if (p.lut.z == 0.0) { return color; }
  let encoded = srgb_encode_extended(color);
  let range = max(p.lut_domain_max.xyz - p.lut_domain_min.xyz, vec3(0.000001));
  let unit = clamp((encoded - p.lut_domain_min.xyz) / range, vec3(0.0), vec3(1.0));
  let size = max(p.lut.y, 2.0);
  let coord = (unit * (size - 1.0) + 0.5) / size;
  let graded = srgb_decode_extended(textureSampleLevel(lut, source_sampler, coord, 0.0).rgb);
  return mix(color, graded, clamp(p.lut.x, 0.0, 1.0));
}

// ---- Geometry (GeometryPass) ----
// Works in the web's y-up texture space; `uv` here is y-down, so it flips in and out.

fn source_uv(full_uv: vec2<f32>) -> vec2<f32> {
  let aspect = p.geometry2.z;
  let scale = vec2(aspect, 1.0);
  var q = (full_uv - 0.5) * scale;
  let c = cos(-p.geometry.x);
  let s = sin(-p.geometry.x);
  q = vec2(c * q.x + s * q.y, -s * q.x + c * q.y);
  q = q / max(p.geometry.y, 0.01);
  q.x = q.x / max(1.0 + p.geometry.w, 0.05);
  q.x = q.x + p.geometry2.x * q.y;
  q.y = q.y + p.geometry2.y * q.x;
  let radius2 = dot(q, q) / max(dot(scale * 0.5, scale * 0.5), 1e-6) * 0.5;
  q = q * (1.0 + p.geometry.z * radius2);
  return q / scale + 0.5;
}

struct SourceSample {
  texel: vec4<f32>,
  outside: bool,
};

fn sample_source(output_uv: vec2<f32>) -> SourceSample {
  var uv = output_uv;
  var outside = false;
  if (p.geometry2.w != 0.0) {
    let up = vec2(output_uv.x, 1.0 - output_uv.y);
    let full = vec2(p.crop.x, 1.0 - p.crop.y - p.crop.w) + up * p.crop.zw;
    let source_up = source_uv(full);
    outside = any(source_up < vec2(0.0)) || any(source_up > vec2(1.0));
    uv = vec2(source_up.x, 1.0 - source_up.y);
  }
  // Sampled unconditionally so mip selection keeps working; outside pixels are cleared below.
  let texel = textureSample(source, source_sampler, (uv - p.source_window.xy) / p.source_window.zw);
  return SourceSample(texel, outside);
}

// The source texture is sRGB-encoded, so sampling returns linear light; the
// target is an sRGB format, so the store encodes back for display.
@fragment
fn fs_main(in: VsOut) -> @location(0) vec4<f32> {
  let sampled = sample_source(p.output_window.xy + in.uv * p.output_window.zw);
  let texel = sampled.texel;
  var color = develop(texel.rgb);
  color = apply_curves(color);
  color = apply_mixer(color);
  color = apply_grading(color);
  color = apply_lut(color);
  if (sampled.outside) { return vec4(0.0); }
  return vec4(color, texel.a);
}

@fragment
fn fs_source(in: VsOut) -> @location(0) vec4<f32> {
  let sampled = sample_source(p.output_window.xy + in.uv * p.output_window.zw);
  return select(sampled.texel, vec4(0.0), sampled.outside);
}

fn round_working(color: vec3<f32>) -> vec3<f32> {
  return vec3(quantizeToF16(color.r), quantizeToF16(color.g), quantizeToF16(color.b));
}

@fragment
fn fs_leading_grade(in: VsOut) -> @location(0) vec4<f32> {
  let sampled = sample_source(p.output_window.xy + in.uv * p.output_window.zw);
  let texel = select(sampled.texel, vec4(0.0), sampled.outside);
  var color = round_working(texel.rgb);
  // Each stage still observes the same half-float boundary as a separate pass.
  for (var i = 0u; i < 8u; i++) {
    let code = u32(p.leading_grade[i / 4u][i % 4u]);
    if (code == 0u) { break; }
    switch (code) {
      case 1u: { color = develop(color); }
      case 2u: { color = apply_curves(color); }
      case 3u: { color = apply_mixer(color); }
      case 4u: { color = apply_grading(color); }
      case 5u: { color = apply_lut(color); }
      default: {}
    }
    color = round_working(color);
  }
  return vec4(color, texel.a);
}

fn grade_input(in: VsOut) -> vec4<f32> {
  return textureSampleLevel(source, source_sampler, in.uv, 0.0);
}

@fragment
fn fs_node_develop(in: VsOut) -> @location(0) vec4<f32> {
  let c = grade_input(in);
  return vec4(develop(c.rgb), c.a);
}

@fragment
fn fs_node_curve(in: VsOut) -> @location(0) vec4<f32> {
  let c = grade_input(in);
  return vec4(apply_curves(c.rgb), c.a);
}

@fragment
fn fs_node_mixer(in: VsOut) -> @location(0) vec4<f32> {
  let c = grade_input(in);
  return vec4(apply_mixer(c.rgb), c.a);
}

@fragment
fn fs_node_wheels(in: VsOut) -> @location(0) vec4<f32> {
  let c = grade_input(in);
  return vec4(apply_grading(c.rgb), c.a);
}

@fragment
fn fs_node_lut(in: VsOut) -> @location(0) vec4<f32> {
  let c = grade_input(in);
  return vec4(apply_lut(c.rgb), c.a);
}

@fragment
fn fs_comparison(in: VsOut) -> @location(0) vec4<f32> {
  let uv = p.output_window.xy + in.uv * p.output_window.zw;
  let sampled = sample_source(uv);
  let texel = select(sampled.texel, vec4(0.0), sampled.outside);
  var color = texel.rgb;
  if (p.viewport_image.z >= 4.0) {
    let f = fract(uv * p.viewport_image.xy);
    let edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * p.viewport_image.z;
    let encoded = mix(srgb_encode_extended(color), vec3(0.5), (1.0 - smoothstep(0.0, 1.0, edge)) * 0.22);
    color = srgb_decode_extended(encoded);
  }
  return vec4(mix(p.viewport_background.rgb, color, texel.a), 1.0);
}

// ---- Adjustment layers (plate passes + MaskBlendPass, fused) ----
// Reads the image so far, grades it with the layer's settings (develop →
// curves → mixer → grading; no geometry, no LUT), evaluates the layer's mask
// stack on the *ungraded* pixel, and blends.

struct MaskRecord {
  kind: vec4<f32>,     // type, blend, invert, brush slot
  shape: vec4<f32>,    // opacity, feather, angle, target
  range: vec4<f32>,    // range, chroma target, chroma range
  ellipse: vec4<f32>,  // centre x, y, radius x, y
  line: vec4<f32>,     // start x, y, end x, y
};

struct MaskBlock {
  header: vec4<f32>,   // count, photo aspect, layer opacity
  crop: vec4<f32>,
  records: array<MaskRecord, 32>,
};

@group(1) @binding(0) var<uniform> masks: MaskBlock;
@group(1) @binding(1) var brush0: texture_2d<f32>;
@group(1) @binding(2) var brush1: texture_2d<f32>;
@group(1) @binding(3) var brush2: texture_2d<f32>;
@group(1) @binding(4) var brush3: texture_2d<f32>;

fn hue_and_saturation(c: vec3<f32>) -> vec2<f32> {
  let k = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  let q1 = mix(vec4(c.bg, k.wz), vec4(c.gb, k.xy), step(c.b, c.g));
  let q = mix(vec4(q1.xyw, c.r), vec4(c.r, q1.yzx), step(q1.x, c.r));
  let d = q.x - min(q.w, q.y);
  return vec2(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10));
}

fn sample_brush(slot: f32, uv: vec2<f32>) -> f32 {
  if (slot == 0.0) { return textureSampleLevel(brush0, source_sampler, uv, 0.0).a; }
  if (slot == 1.0) { return textureSampleLevel(brush1, source_sampler, uv, 0.0).a; }
  if (slot == 2.0) { return textureSampleLevel(brush2, source_sampler, uv, 0.0).a; }
  if (slot == 3.0) { return textureSampleLevel(brush3, source_sampler, uv, 0.0).a; }
  return 0.0;
}

// `pos` is image space on the uncropped photo, top-left origin.
fn evaluate_mask(r: MaskRecord, base: vec3<f32>, pos: vec2<f32>) -> f32 {
  let kind = r.kind.x;
  let aspect = masks.header.y;
  var m = 0.0;
  if (kind == 1.0) {
    let d = (pos - r.ellipse.xy) * vec2(aspect, 1.0);
    let c = cos(-r.shape.z);
    let s = sin(-r.shape.z);
    let rotated = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
    let distance = length(rotated / max(r.ellipse.zw, vec2(1e-4)));
    m = 1.0 - smoothstep(1.0 - max(1e-5, r.shape.y), 1.0, distance);
  } else if (kind == 2.0) {
    let axis = (r.line.zw - r.line.xy) * vec2(aspect, 1.0);
    let offset = (pos - r.line.xy) * vec2(aspect, 1.0);
    let t = dot(offset, axis) / max(dot(axis, axis), 1e-6);
    m = 1.0 - smoothstep(0.0, 1.0, t);
  } else if (kind == 3.0) {
    let lightness = linear_srgb_to_oklab(max(base, vec3(0.0))).x;
    let distance = abs(lightness - r.shape.w);
    m = 1.0 - smoothstep(r.range.x, r.range.x + max(r.shape.y, 1e-4), distance);
  } else if (kind == 4.0) {
    // Brush coverage is stored y-down like the photo.
    m = sample_brush(r.kind.w, pos);
  } else if (kind == 5.0) {
    let lab = linear_srgb_to_oklab(max(base, vec3(0.0)));
    let chroma = length(lab.yz);
    let hue = fract(atan2(lab.z, lab.y) / TAU);
    var distance = abs(hue - r.shape.w);
    distance = min(distance, 1.0 - distance);
    let width = max(r.range.x, 1e-4);
    m = (1.0 - smoothstep(width * 0.5, width, distance)) * smoothstep(0.012, 0.045, chroma);
    if (r.range.y > 0.0) {
      m = m * (1.0 - smoothstep(r.range.z, r.range.z + 0.04, abs(chroma - r.range.y)));
    }
  } else if (kind == 6.0) {
    let lightness = dot(base, vec3(0.2126, 0.7152, 0.0722));
    let distance = abs(lightness - r.shape.w);
    let range = r.range.x;
    m = 1.0 - smoothstep(min(range - 1e-5, max(0.0, range - r.shape.y)), range, distance);
  } else if (kind == 7.0) {
    let hs = hue_and_saturation(max(base, vec3(0.0)));
    var distance = abs(hs.x - r.shape.w);
    distance = min(distance, 1.0 - distance);
    let width = max(r.range.x, 1e-4);
    let saturation_range = max(r.range.z, 1e-4);
    m = (1.0 - smoothstep(width * 0.75, width, distance))
      * (1.0 - smoothstep(saturation_range * 0.75, saturation_range, abs(hs.y - r.range.y)));
  }
  if (r.kind.z == 1.0) { m = 1.0 - m; }
  return clamp(m * r.shape.x, 0.0, 1.0);
}

fn mask_coverage(uv: vec2<f32>, base: vec3<f32>) -> f32 {
  let crop = masks.crop;
  let output_uv = p.output_window.xy + uv * p.output_window.zw;
  let pos = crop.xy + output_uv * crop.zw;
  let count = i32(masks.header.x);
  var coverage = 1.0;
  if (count > 0) {
    coverage = 0.0;
    for (var i = 0; i < count; i = i + 1) {
      let r = masks.records[i];
      let m = evaluate_mask(r, base, pos);
      let blend = r.kind.y;
      if (i == 0) {
        coverage = select(m, 1.0 - m, blend == 1.0);
      } else if (blend == 0.0) {
        coverage = clamp(coverage + m, 0.0, 1.0);
      } else if (blend == 1.0) {
        coverage = clamp(coverage - m, 0.0, 1.0);
      } else {
        coverage = coverage * m;
      }
    }
  }
  return coverage;
}

fn plate_color(base: vec4<f32>, coverage: f32) -> vec4<f32> {
  if (coverage <= 0.0 || masks.header.z == 0.0) { return base; }
  var color = develop(base.rgb);
  color = apply_curves(color);
  color = apply_mixer(color);
  color = apply_grading(color);
  return vec4(mix(base.rgb, color, coverage * masks.header.z), base.a);
}

@fragment
fn fs_plate(in: VsOut) -> @location(0) vec4<f32> {
  let base = textureSampleLevel(source, source_sampler, in.uv, 0.0);
  return plate_color(base, mask_coverage(in.uv, base.rgb));
}

struct PlateAndCoverage {
  @location(0) color: vec4<f32>,
  @location(1) coverage: f32,
}

@fragment
fn fs_plate_with_coverage(in: VsOut) -> PlateAndCoverage {
  let base = textureSampleLevel(source, source_sampler, in.uv, 0.0);
  let coverage = mask_coverage(in.uv, base.rgb);
  return PlateAndCoverage(plate_color(base, coverage), coverage * base.a);
}

struct PlateAndSample {
  @location(0) color: vec4<f32>,
  @location(1) sample: vec4<f32>,
}

@fragment
fn fs_plate_with_sample(in: VsOut) -> PlateAndSample {
  let base = textureSampleLevel(source, source_sampler, in.uv, 0.0);
  let coverage = mask_coverage(in.uv, base.rgb);
  return PlateAndSample(plate_color(base, coverage), vec4(base.rgb, coverage * base.a));
}

// At 1:1 the last layer's display pixel reads exactly one working texel.
// Finish directly on the surface and preserve the normal half-float color
// and 8-bit mask rounding without writing and rereading both textures.
@fragment
fn fs_plate_preview(in: VsOut) -> @location(0) vec4<f32> {
  let size = vec2<f32>(textureDimensions(source));
  let visible = p.viewport_visible.xy + in.uv * p.viewport_visible.zw;
  let uv = (floor(visible * size) + 0.5) / size;
  let base = textureSampleLevel(source, source_sampler, uv, 0.0);
  let coverage = mask_coverage(uv, base.rgb);
  let graded = plate_color(base, coverage);
  let global = p.output_window.xy + uv * p.output_window.zw;
  let pixel = floor(vec2(global.x, 1.0 - global.y) * p.viewport_image.xy);
  let rounded = round_working(graded.rgb);
  let encoded = encode_display(rounded, pixel, 1.0);
  let tint = select(0.0, round(coverage * base.a * 255.0) / 255.0, p.viewport_background.a > 0.5);
  let shown = tint_display(encoded, p.viewport_image.w > 0.5, tint);
  return composite_display(vec4(shown, graded.a), p.viewport_background.rgb);
}
