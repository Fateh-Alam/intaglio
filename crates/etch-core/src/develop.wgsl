// Etch base develop pass, ported from app/editor/render/passes/BaseDevelopPass.ts.
// Keep the two in step: same order, same constants, same identity at defaults.
// `reference.rs` is the CPU twin used by the parity tests.

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
};

@group(0) @binding(0) var<uniform> p: Params;
@group(0) @binding(1) var source: texture_2d<f32>;
@group(0) @binding(2) var source_sampler: sampler;

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

  let wb = kelvin_to_rgb(6500.0) / max(kelvin_to_rgb(p.temperature), vec3(1e-5));
  color = color * (wb / max(luma709(wb), 1e-5));
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

// The source texture is sRGB-encoded, so sampling returns linear light; the
// target is an sRGB format, so the store encodes back for display.
@fragment
fn fs_main(in: VsOut) -> @location(0) vec4<f32> {
  let texel = textureSample(source, source_sampler, in.uv);
  return vec4(develop(texel.rgb), texel.a);
}
