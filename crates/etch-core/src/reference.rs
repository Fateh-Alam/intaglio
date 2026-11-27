//! CPU twin of `develop.wgsl`, for parity tests. Slow on purpose: one pixel at a time, f32.

// The color-science constants are copied digit for digit from the shaders so
// the two can be compared side by side; f32 rounds them identically on both.
#![allow(clippy::excessive_precision)]

use crate::lut::CubeLut;
use crate::params::{DevelopParams, PreparedEdit};

type V3 = [f32; 3];

fn map(v: V3, f: impl Fn(f32) -> f32) -> V3 {
    [f(v[0]), f(v[1]), f(v[2])]
}
fn zip(a: V3, b: V3, f: impl Fn(f32, f32) -> f32) -> V3 {
    [f(a[0], b[0]), f(a[1], b[1]), f(a[2], b[2])]
}
fn scale(v: V3, k: f32) -> V3 {
    map(v, |x| x * k)
}
fn mix(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}
fn mix3(a: V3, b: V3, t: f32) -> V3 {
    zip(a, b, |x, y| mix(x, y, t))
}
fn smoothstep(e0: f32, e1: f32, x: f32) -> f32 {
    let t = ((x - e0) / (e1 - e0)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}
fn luma709(c: V3) -> f32 {
    0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

pub fn linear_to_srgb(x: f32) -> f32 {
    let c = x.max(0.0);
    if c <= 0.0031308 { c * 12.92 } else { 1.055 * c.powf(1.0 / 2.4) - 0.055 }
}
pub fn srgb_to_linear(x: f32) -> f32 {
    let c = x.max(0.0);
    if c <= 0.04045 { c / 12.92 } else { ((c + 0.055) / 1.055).powf(2.4) }
}
fn perceptual_luma(c: V3) -> f32 {
    linear_to_srgb(luma709(c).max(0.0))
}

fn to_oklab(c: V3) -> V3 {
    let l = 0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2];
    let m = 0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2];
    let s = 0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2];
    let [l, m, s] = map([l, m, s], f32::cbrt);
    [
        0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    ]
}
fn from_oklab(lab: V3) -> V3 {
    let l = lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2];
    let m = lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2];
    let s = lab[0] - 0.0894841775 * lab[1] - 1.2914855480 * lab[2];
    let [l, m, s] = map([l, m, s], |x| x * x * x);
    [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ]
}

fn log_contrast(c: V3, contrast: f32, pivot: f32) -> V3 {
    if contrast == 0.0 {
        return c;
    }
    let lp = pivot.log2();
    map(c, |x| ((x.max(1e-6).log2() - lp) * (1.0 + contrast) + lp).exp2())
}

fn kelvin_to_rgb(kelvin: f32) -> V3 {
    let t = kelvin / 100.0;
    let rgb = if t <= 66.0 {
        let b = if t <= 19.0 { 0.0 } else { 138.5177312231 * (t - 10.0).ln() - 305.0447927307 };
        [255.0, 99.4708025861 * t.ln() - 161.1195681661, b]
    } else {
        [329.698727446 * (t - 60.0).powf(-0.1332047592), 288.1221695283 * (t - 60.0).powf(-0.0755148492), 255.0]
    };
    map(rgb, |x| (x / 255.0).clamp(0.0, 1.0))
}

fn film_density(x: f32, p: &DevelopParams) -> f32 {
    let mut v = x.max(0.0);
    if p.toe_strength > 0.0 && v < 1.0 {
        let s = linear_to_srgb(v);
        let k = (p.toe_length * 10.0).clamp(0.25, 2.0);
        v = srgb_to_linear((s + 0.14 * p.toe_strength * k * (1.0 - s).powf(2.5)).clamp(0.0, 1.0));
    }
    if p.shoulder_strength > 0.0 && v > 0.18 {
        let k = p.shoulder_strength * p.shoulder_length.clamp(0.2, 2.0) * 1.25;
        let e = v - 0.18;
        v = 0.18 + e / (1.0 + k * e);
    }
    if p.film_gamma != 1.0 {
        v = v.max(0.0).powf(p.film_gamma);
    }
    v
}

/// Runs one linear-light pixel through the whole pipeline, as `develop.wgsl` does.
pub fn develop(original: V3, edit: &PreparedEdit) -> V3 {
    develop_with_lut(original, edit, None)
}

/// As [`develop`], with a creative LUT loaded on the engine.
pub fn develop_with_lut(original: V3, edit: &PreparedEdit, lut: Option<&CubeLut>) -> V3 {
    let p = &edit.params;
    let c = develop_base(original, p);
    let c = apply_curves(c, p, edit.curve_table.as_deref());
    let c = apply_mixer(c, p);
    let c = apply_grading(c, p);
    match lut {
        Some(lut) if p.lut[0] > 0.0 => apply_lut(c, lut, p.lut[0]),
        _ => c,
    }
}

/// Trilinear lookup over the half-float texels, as the GPU's filtering does.
fn apply_lut(c: V3, lut: &CubeLut, strength: f32) -> V3 {
    let texels: Vec<f32> = lut.half_texels().iter().map(|value| value.to_f32()).collect();
    let n = lut.size;
    let encoded = map(c, srgb_encode_extended);
    let unit = [0, 1, 2].map(|k| ((encoded[k] - lut.domain_min[k]) / (lut.domain_max[k] - lut.domain_min[k]).max(0.000001)).clamp(0.0, 1.0));
    // Texel-space position; the +0.5/size of the shader cancels the half-texel offset of filtering.
    let position = unit.map(|u| u * (n as f32 - 1.0));
    let base = position.map(|x| (x.floor() as usize).min(n - 2));
    let t = [0, 1, 2].map(|k| position[k] - base[k] as f32);
    let at = |r: usize, g: usize, b: usize, k: usize| texels[((b * n + g) * n + r) * 4 + k];
    let looked_up = [0, 1, 2].map(|k| {
        let mut value = 0.0;
        for (dr, wr) in [(0, 1.0 - t[0]), (1, t[0])] {
            for (dg, wg) in [(0, 1.0 - t[1]), (1, t[1])] {
                for (db, wb) in [(0, 1.0 - t[2]), (1, t[2])] {
                    value += wr * wg * wb * at(base[0] + dr, base[1] + dg, base[2] + db, k);
                }
            }
        }
        value
    });
    let graded = map(looked_up, srgb_decode_extended);
    let s = strength.clamp(0.0, 1.0);
    zip(c, graded, |a, b| mix(a, b, s))
}

/// The base develop stage (BaseDevelopPass).
pub fn develop_base(original: V3, p: &DevelopParams) -> V3 {
    let wb = zip(kelvin_to_rgb(6500.0), kelvin_to_rgb(p.temperature), |a, b| a / b.max(1e-5));
    let mut c = zip(original, wb, |x, w| x * w);
    c = scale(c, 1.0 / luma709(wb).max(1e-5));
    if p.tint != 0.0 {
        let gain = [(p.tint * 0.15).exp2(), (-p.tint * 0.25).exp2(), (p.tint * 0.15).exp2()];
        let lg = luma709(gain).max(1e-5);
        c = zip(c, gain, |x, g| x * g / lg);
    }
    c = scale(c, p.exposure.exp2());
    c = log_contrast(c, p.contrast, 0.18);
    if p.highlights != 0.0 {
        c = scale(c, (p.highlights * 1.35 * smoothstep(0.45, 0.95, perceptual_luma(c))).exp2());
    }
    if p.shadows != 0.0 {
        let w = 1.0 - smoothstep(0.05, 0.55, perceptual_luma(c));
        c = if p.shadows > 0.0 {
            let g = (p.shadows * 1.2 * w).exp2();
            map(c, |x| x * g + p.shadows * 0.025 * w * (1.0 - x.clamp(0.0, 1.0)))
        } else {
            scale(c, (p.shadows * 1.4 * w).exp2())
        };
    }
    if p.whites != 0.0 {
        c = scale(c, (p.whites * 1.75 * smoothstep(0.60, 0.98, perceptual_luma(c))).exp2());
    }
    if p.blacks != 0.0 {
        let w = 1.0 - smoothstep(0.0, 0.32, perceptual_luma(c));
        c = if p.blacks > 0.0 {
            let g = (p.blacks * 0.8 * w).exp2();
            map(c, |x| x * g + p.blacks * 0.04 * w * (1.0 - x.clamp(0.0, 1.0)))
        } else {
            scale(c, (p.blacks * 2.0 * w).exp2())
        };
    }
    if p.vibrance != 0.0 {
        let lab = to_oklab(map(c, |x| x.max(0.0)));
        let chroma = lab[1].hypot(lab[2]);
        let hue = lab[2].atan2(lab[1]);
        let new_chroma = chroma * (1.0 + p.vibrance * (1.0 - smoothstep(0.02, 0.22, chroma))).max(0.0);
        c = from_oklab([lab[0], new_chroma * hue.cos(), new_chroma * hue.sin()]);
    }
    if p.saturation != 0.0 {
        let lab = to_oklab(map(c, |x| x.max(0.0)));
        let k = (1.0 + p.saturation).max(0.0);
        c = from_oklab([lab[0], lab[1] * k, lab[2] * k]);
    }
    if p.dehaze != 0.0 {
        let y = luma709(c);
        let haze = smoothstep(0.08, 0.80, perceptual_luma(c));
        let contrasty = log_contrast(c, p.dehaze * 0.45, 0.18);
        let saturated = mix3([y; 3], c, 1.0 + p.dehaze * 0.25);
        let dehazed = mix3(contrasty, saturated, 0.35);
        c = if p.dehaze >= 0.0 {
            mix3(c, dehazed, p.dehaze * haze)
        } else {
            mix3(c, zip([y; 3], [0.08, 0.09, 0.1], |a, b| a + b), -p.dehaze * 0.35)
        };
    }
    if p.color_crossover != 0.0 {
        let shift = mix3([-0.02, 0.01, 0.04], [0.04, 0.01, -0.02], smoothstep(0.15, 0.85, perceptual_luma(c)));
        c = zip(c, shift, |x, s| (x + s * p.color_crossover).max(0.0));
    }
    if p.luma_desat > 0.0 {
        let y = luma709(c);
        let pl = perceptual_luma(c);
        let sat = smoothstep(0.0, 0.30, pl) * (1.0 - smoothstep(0.70, 1.0, pl) * 0.45);
        c = mix3(c, mix3([y; 3], c, sat), p.luma_desat);
    }
    if p.toe_strength > 0.0 || p.shoulder_strength > 0.0 || p.film_gamma != 1.0 {
        c = map(c, |x| film_density(x, p));
    }
    if p.protect_highlights != 0.0 {
        let y_orig = luma709(original).max(0.0);
        let y_adj = luma709(c).max(0.0);
        if y_adj > y_orig && y_adj > 0.5 {
            let excess = y_adj - 0.5;
            let rolled = 0.5 + 0.5 * (excess / (excess + 0.5));
            let target = mix(y_adj, y_orig.max(rolled), p.protect_highlights);
            c = scale(c, target / y_adj.max(1e-6));
        }
    }
    c
}

// ---- Tone curve ----

fn srgb_decode_extended(x: f32) -> f32 {
    let a = x.abs();
    let v = if a <= 0.04045 { a / 12.92 } else { ((a + 0.055) / 1.055).powf(2.4) };
    v.copysign(x) * if x == 0.0 { 0.0 } else { 1.0 }
}
fn srgb_encode_extended(x: f32) -> f32 {
    let a = x.abs();
    let v = if a <= 0.0031308 { a * 12.92 } else { 1.055 * a.powf(1.0 / 2.4) - 0.055 };
    v.copysign(x) * if x == 0.0 { 0.0 } else { 1.0 }
}

fn curve_at(table: &[f32], x: f32) -> [f32; 4] {
    let size = (table.len() / 4) as f32;
    let position = x.clamp(0.0, 1.0) * (size - 1.0);
    let lower = position.floor();
    let upper = (lower + 1.0).min(size - 1.0);
    let t = position - lower;
    let at = |i: f32| -> [f32; 4] {
        let i = i as usize * 4;
        [table[i], table[i + 1], table[i + 2], table[i + 3]]
    };
    let (a, b) = (at(lower), at(upper));
    [0, 1, 2, 3].map(|k| mix(a[k], b[k], t))
}

fn extend(x: f32, curved: f32, at_zero: f32, at_one: f32) -> f32 {
    if x > 1.0 {
        at_one + (x - 1.0)
    } else if x < 0.0 {
        at_zero + x
    } else {
        curved
    }
}

fn apply_curves(c: V3, p: &DevelopParams, table: Option<&[f32]>) -> V3 {
    let (true, Some(table)) = (p.switches[2] != 0.0, table) else { return c };
    let e = map(c, srgb_encode_extended);
    let (ends0, ends1) = (curve_at(table, 0.0), curve_at(table, 1.0));
    let master = map(e, |x| extend(x, curve_at(table, x)[3], ends0[3], ends1[3]));
    let graded = [0, 1, 2].map(|k| extend(master[k], curve_at(table, master[k])[k], ends0[k], ends1[k]));
    map(graded, srgb_decode_extended)
}

// ---- Color mixer ----

// Same f32 as the shaders' 6.28318530718.
use std::f32::consts::TAU;
const BANDS: [(f32, f32); 8] = [(0.4363, 0.6632), (0.9599, 0.5585), (1.6057, 0.6283), (2.5307, 0.8378), (3.4034, 0.7330), (4.2761, 0.8029), (5.0952, 0.7330), (5.8468, 0.6632)];

fn hue_weight(hue: f32, center: f32, width: f32) -> f32 {
    let d = (hue - center).abs();
    1.0 - smoothstep(width * 0.5, width, d.min(TAU - d))
}

fn hue_of(lab: V3) -> f32 {
    let hue = lab[2].atan2(lab[1]);
    if hue < 0.0 { hue + TAU } else { hue }
}

fn mixer_band(c: V3, center: f32, width: f32, band: [f32; 4]) -> V3 {
    if band[0].abs() < 0.001 && band[1].abs() < 0.001 && band[2].abs() < 0.001 {
        return c;
    }
    let lab = to_oklab(map(c, |x| x.max(0.0)));
    let w = hue_weight(hue_of(lab), center, width) * smoothstep(0.0, 0.02, lab[1].hypot(lab[2]));
    if w < 0.001 {
        return c;
    }
    let hue = hue_of(lab) + band[0] * w;
    let chroma = (lab[1].hypot(lab[2]) * (1.0 + band[1] * w)).max(0.0);
    let l = (lab[0] + band[2] * w).clamp(0.0, 1.2);
    from_oklab([l, chroma * hue.cos(), chroma * hue.sin()])
}

fn skin_mask(c: V3) -> f32 {
    let lab = to_oklab(map(c, |x| x.max(0.0)));
    let chroma = lab[1].hypot(lab[2]);
    let h = hue_weight(hue_of(lab), 0.95993, 0.95993);
    let chroma_mask = smoothstep(0.025, 0.08, chroma) * (1.0 - smoothstep(0.32, 0.46, chroma));
    let light_mask = smoothstep(0.18, 0.38, lab[0]) * (1.0 - smoothstep(0.95, 1.1, lab[0]));
    let m1 = h * chroma_mask * light_mask;
    let [r, g, b] = map(c, |x| linear_to_srgb(x.max(0.0)));
    let m2 = smoothstep(0.02, 0.18, r - g) * smoothstep(-0.05, 0.12, g - b) * smoothstep(0.06, 0.28, r - b) * smoothstep(0.08, 0.22, r.max(g).max(b));
    (m1.max(m2) * 1.15).clamp(0.0, 1.0)
}

fn apply_mixer(input: V3, p: &DevelopParams) -> V3 {
    if p.switches[3] == 0.0 {
        return input;
    }
    let mut c = input;
    for (band, (center, width)) in p.mixer.iter().zip(BANDS) {
        c = mixer_band(c, center, width, *band);
    }
    let strength = p.switches[1];
    if strength > 0.0 {
        let m = skin_mask(input) * strength;
        let (orig, adj) = (to_oklab(map(input, |x| x.max(0.0))), to_oklab(map(c, |x| x.max(0.0))));
        c = from_oklab([adj[0], mix(adj[1], orig[1], m), mix(adj[2], orig[2], m)]);
    }
    map(c, |x| x.max(0.0))
}

// ---- Three-way color grading ----

fn apply_grading(c: V3, p: &DevelopParams) -> V3 {
    if p.switches2[0] == 0.0 {
        return c;
    }
    let mut lab = to_oklab(map(c, |x| x.max(0.0)));
    let pl = lab[0].clamp(0.0, 1.0);
    let b = 0.5 - p.switches[0] * 0.5;
    let sw = 1.0 - smoothstep(0.05, mix(0.25, 0.55, b), pl);
    let hw = smoothstep(mix(0.42, 0.72, b), 0.95, pl);
    let mw = (1.0 - sw - hw).clamp(0.0, 1.0);
    let sum = (sw + mw + hw).max(1e-5);
    let w = [sw / sum, mw / sum, hw / sum];
    for (zone, weight) in p.grading.iter().zip(w) {
        lab[1] += zone[0].cos() * zone[1] * 0.12 * weight;
        lab[2] += zone[0].sin() * zone[1] * 0.12 * weight;
    }
    lab[0] += p.grading.iter().zip(w).map(|(zone, weight)| zone[2] * 0.15 * weight).sum::<f32>();
    lab[0] = lab[0].clamp(0.0, 1.2);
    map(from_oklab(lab), |x| x.max(0.0))
}
