//! CPU logical-grid effects from app/editor/render/creative/raster.ts. Rows
//! here are in GL readback order (bottom first), including threshold phases.
use std::sync::OnceLock;

use crate::creative::PreparedCreative;

type Tap = (isize, isize, f64);

fn diffusion(method: &str) -> Option<(f64, &'static [Tap])> {
    Some(match method {
        "floyd" => (16.0, &[(1, 0, 7.0), (-1, 1, 3.0), (0, 1, 5.0), (1, 1, 1.0)]),
        "atkinson" => (
            8.0,
            &[
                (1, 0, 1.0),
                (2, 0, 1.0),
                (-1, 1, 1.0),
                (0, 1, 1.0),
                (1, 1, 1.0),
                (0, 2, 1.0),
            ],
        ),
        "burkes" => (
            32.0,
            &[
                (1, 0, 8.0),
                (2, 0, 4.0),
                (-2, 1, 2.0),
                (-1, 1, 4.0),
                (0, 1, 8.0),
                (1, 1, 4.0),
                (2, 1, 2.0),
            ],
        ),
        "stucki" => (
            42.0,
            &[
                (1, 0, 8.0),
                (2, 0, 4.0),
                (-2, 1, 2.0),
                (-1, 1, 4.0),
                (0, 1, 8.0),
                (1, 1, 4.0),
                (2, 1, 2.0),
                (-2, 2, 1.0),
                (-1, 2, 2.0),
                (0, 2, 4.0),
                (1, 2, 2.0),
                (2, 2, 1.0),
            ],
        ),
        "jarvis" => (
            48.0,
            &[
                (1, 0, 7.0),
                (2, 0, 5.0),
                (-2, 1, 3.0),
                (-1, 1, 5.0),
                (0, 1, 7.0),
                (1, 1, 5.0),
                (2, 1, 3.0),
                (-2, 2, 1.0),
                (-1, 2, 3.0),
                (0, 2, 5.0),
                (1, 2, 3.0),
                (2, 2, 1.0),
            ],
        ),
        "sierra" => (
            32.0,
            &[
                (1, 0, 5.0),
                (2, 0, 3.0),
                (-2, 1, 2.0),
                (-1, 1, 4.0),
                (0, 1, 5.0),
                (1, 1, 4.0),
                (2, 1, 2.0),
                (-1, 2, 2.0),
                (0, 2, 3.0),
                (1, 2, 2.0),
            ],
        ),
        "sierra2" => (
            16.0,
            &[
                (1, 0, 4.0),
                (2, 0, 3.0),
                (-2, 1, 1.0),
                (-1, 1, 2.0),
                (0, 1, 3.0),
                (1, 1, 2.0),
                (2, 1, 1.0),
            ],
        ),
        "sierraLite" => (4.0, &[(1, 0, 2.0), (-1, 1, 1.0), (0, 1, 1.0)]),
        _ => return None,
    })
}

fn bayer_size(method: &str) -> Option<i32> {
    match method {
        "bayer2" => Some(2),
        "bayer4" => Some(4),
        "bayer8" => Some(8),
        "bayer16" => Some(16),
        _ => None,
    }
}

pub(crate) fn known_method(method: &str) -> bool {
    bayer_size(method).is_some()
        || diffusion(method).is_some()
        || matches!(
            method,
            "dots" | "radial" | "horizontal" | "vertical" | "diagonal" | "noise" | "blueNoise"
        )
}

fn fract(value: f64) -> f64 {
    value - value.floor()
}

fn js_round(value: f64) -> f64 {
    (value + 0.5).floor()
}

fn white_noise(x: i32, y: i32) -> f64 {
    let hash = (x as u32)
        .wrapping_mul(374761393)
        .wrapping_add((y as u32).wrapping_mul(668265263));
    f64::from((hash ^ (hash >> 13)).wrapping_mul(1274126177)) / 4294967296.0
}

fn blue_noise() -> &'static [f64; 256] {
    static MATRIX: OnceLock<[f64; 256]> = OnceLock::new();
    MATRIX.get_or_init(|| {
        let score = |index: usize| {
            let x = (index % 16) as i32;
            let y = (index / 16) as i32;
            let neighbors = white_noise((x - 1) & 15, y)
                + white_noise((x + 1) & 15, y)
                + white_noise(x, (y - 1) & 15)
                + white_noise(x, (y + 1) & 15);
            white_noise(x, y) - neighbors * 0.25
        };
        let mut ranks: Vec<_> = (0..256).collect();
        ranks.sort_by(|&a, &b| score(a).total_cmp(&score(b)));
        let mut matrix = [0.0; 256];
        for (rank, index) in ranks.into_iter().enumerate() {
            matrix[index] = (rank as f64 + 0.5) / 256.0;
        }
        matrix
    })
}

fn threshold(method: &str, x: i32, y: i32) -> f64 {
    if let Some(size) = bayer_size(method) {
        let quad = [0, 2, 3, 1];
        let mut rank = 0;
        let mut n = 1;
        while n < size {
            rank = rank * 4 + quad[usize::from(x & n != 0) + 2 * usize::from(y & n != 0)];
            n *= 2;
        }
        return (f64::from(rank) + 0.5) / f64::from(size * size);
    }
    match method {
        "dots" => {
            let a = fract(f64::from(x) / 7.0) - 0.5;
            let b = fract(f64::from(y) / 7.0) - 0.5;
            ((a * a + b * b) * 3.3).min(1.0)
        }
        "radial" => fract(f64::from(x).hypot(f64::from(y)) / 6.0),
        "horizontal" => fract(f64::from(y) / 4.0),
        "vertical" => fract(f64::from(x) / 4.0),
        "diagonal" => fract(f64::from(x + y) / 6.0),
        "noise" => white_noise(x, y),
        "blueNoise" => blue_noise()[((x & 15) + (y & 15) * 16) as usize],
        _ => 0.5,
    }
}

fn luma([r, g, b]: [f64; 3]) -> f64 {
    0.2126 * r + 0.7152 * g + 0.0722 * b
}

pub(crate) fn grid_size((width, height): (u32, u32), layer: &PreparedCreative) -> (u32, u32) {
    let (w, h) = (f64::from(width), f64::from(height));
    let logical = if layer.effect == "dither" {
        layer.size * w.min(h) / 720.0
    } else {
        w.max(h) / 1024.0
    };
    let cell = 1.0_f64.max(logical).max((w * h).sqrt() / 1024.0);
    (
        (w / cell).round().max(1.0) as u32,
        (h / cell).round().max(1.0) as u32,
    )
}

pub(crate) fn apply(pixels: &mut [u8], (width, height): (u32, u32), layer: &PreparedCreative) {
    if layer.effect == "dither" {
        dither(pixels, width as usize, height as usize, layer);
    } else {
        sort(pixels, width as usize, height as usize, layer);
    }
}

fn dither(pixels: &mut [u8], width: usize, height: usize, layer: &PreparedCreative) {
    let mono = matches!(
        layer.palette.as_str(),
        "mono" | "gray4" | "gray8" | "gameboy" | "amber" | "sepia" | "blueprint"
    );
    let palette: Vec<_> = layer
        .colors
        .iter()
        .map(|rgb| {
            let color = rgb.map(f64::from);
            (color, luma(color))
        })
        .collect();
    let kernel = diffusion(&layer.dither);
    let mut errors = kernel.map(|_| vec![[0_f32; 3]; width * height]);
    let (sin, cos) = layer.angle.to_radians().sin_cos();
    let amplitude = if layer.palette == "original" {
        51.0
    } else {
        255.0
    };
    let phase = layer.phase * f64::from(bayer_size(&layer.dither).unwrap_or(16));
    for y in (0..height).rev() {
        let forward = (height - 1 - y).is_multiple_of(2);
        let direction = if forward { 1 } else { -1 };
        for column in 0..width {
            let x = if forward { column } else { width - 1 - column };
            let index = y * width + x;
            let pixel = &mut pixels[index * 4..][..4];
            if pixel[3] == 0 {
                continue;
            }
            let mut value = [
                f64::from(pixel[0]),
                f64::from(pixel[1]),
                f64::from(pixel[2]),
            ];
            if mono {
                value = [luma(value); 3];
            }
            let bias = if errors.is_some() {
                0.0
            } else {
                let (x, y) = (x as f64, y as f64);
                (0.5 - threshold(
                    &layer.dither,
                    js_round(x * cos - y * sin + phase) as i32,
                    js_round(x * sin + y * cos) as i32,
                )) * amplitude
                    * layer.detail
            };
            for channel in 0..3 {
                value[channel] += bias;
                if layer.invert {
                    value[channel] = 255.0 - value[channel];
                }
                if let Some(errors) = &errors {
                    value[channel] += f64::from(errors[index][channel]);
                }
            }
            let lightness = luma(value);
            let mut closest =
                value.map(|channel| (channel.clamp(0.0, 255.0) / 51.0).round() * 51.0);
            let mut least = f64::INFINITY;
            for &(color, luminance) in &palette {
                let [r, g, b] = std::array::from_fn(|channel| value[channel] - color[channel]);
                let distance = if mono {
                    (lightness - luminance).powi(2)
                } else {
                    r * r * 0.24 + g * g * 0.62 + b * b * 0.14
                };
                if distance < least {
                    least = distance;
                    closest = color;
                }
            }
            for (out, channel) in pixel.iter_mut().zip(closest) {
                *out = channel as u8;
            }
            if let (Some(errors), Some((divisor, taps))) = (&mut errors, kernel) {
                let weight = layer.detail / divisor;
                for &(dx, dy, tap) in taps {
                    let tx = x as isize + dx * direction;
                    let ty = y as isize - dy;
                    if tx < 0 || tx >= width as isize || ty < 0 {
                        continue;
                    }
                    let dest = &mut errors[ty as usize * width + tx as usize];
                    for channel in 0..3 {
                        dest[channel] = (f64::from(dest[channel])
                            + (value[channel] - closest[channel]) * weight * tap)
                            as f32;
                    }
                }
            }
        }
    }
}

fn sort(pixels: &mut [u8], width: usize, height: usize, layer: &PreparedCreative) {
    let magnitude = layer.angle.abs();
    let vertical = magnitude > 45.0 && magnitude < 135.0;
    let descending = layer.angle < -45.0 || layer.angle >= 135.0;
    let (lines, length) = if vertical {
        (width, height)
    } else {
        (height, width)
    };
    let limit = (layer.size * width.min(height) as f64 / 190.0)
        .round()
        .max(2.0) as usize;
    let threshold = layer.detail * 255.0;
    let mut run: Vec<(f64, [u8; 3])> = Vec::new();
    for line in 0..lines {
        let at = |offset| {
            (if vertical {
                (height - 1 - offset) * width + line
            } else {
                line * width + offset
            }) * 4
        };
        let mut start = 0;
        for offset in 0..=length {
            if offset < length {
                let i = at(offset);
                let color = [pixels[i], pixels[i + 1], pixels[i + 2]];
                let value = luma(color.map(f64::from));
                if value >= threshold && pixels[i + 3] != 0 {
                    if run.is_empty() {
                        start = offset;
                    }
                    run.push((value, color));
                    if run.len() < limit {
                        continue;
                    }
                }
            }
            run.sort_by(|a, b| {
                if descending {
                    b.0.total_cmp(&a.0)
                } else {
                    a.0.total_cmp(&b.0)
                }
            });
            for (index, (_, color)) in run.drain(..).enumerate() {
                let i = at(start + index);
                pixels[i..i + 3].copy_from_slice(&color);
            }
        }
    }
}
