//! CPU twin of `develop.wgsl`, for parity tests. Slow on purpose: one pixel at a time, f32.

use crate::params::DevelopParams;

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

/// Develops one linear-light pixel exactly as `develop.wgsl` does.
pub fn develop(original: V3, p: &DevelopParams) -> V3 {
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
