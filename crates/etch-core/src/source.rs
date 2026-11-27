//! An oversized photo has a fit proxy and a bounded resident source tile.
//! Geometry determines which original pixels the visible develop tile needs.
use crate::params::DevelopParams;

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct SourceRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

impl SourceRect {
    pub fn contains(self, other: Self) -> bool {
        self.x <= other.x
            && self.y <= other.y
            && self.x + self.width >= other.x + other.width
            && self.y + self.height >= other.y + other.height
    }

    pub fn window(self, width: u32, height: u32) -> [f32; 4] {
        [
            self.x as f32 / width as f32,
            self.y as f32 / height as f32,
            self.width as f32 / width as f32,
            self.height as f32 / height as f32,
        ]
    }

    pub fn padded(self, width: u32, height: u32, max: u32) -> Self {
        let margin_x = (max.saturating_sub(self.width) / 2).min(256);
        let margin_y = (max.saturating_sub(self.height) / 2).min(256);
        let x = self.x.saturating_sub(margin_x);
        let y = self.y.saturating_sub(margin_y);
        let right = (self.x + self.width + margin_x).min(width);
        let bottom = (self.y + self.height + margin_y).min(height);
        Self {
            x,
            y,
            width: right - x,
            height: bottom - y,
        }
    }

    pub fn pixels<T: Copy, const CHANNELS: usize>(self, source: &[T], stride: u32) -> Vec<T> {
        let mut tile = Vec::with_capacity(self.width as usize * self.height as usize * CHANNELS);
        for row in self.y..self.y + self.height {
            let start = (row as usize * stride as usize + self.x as usize) * CHANNELS;
            tile.extend_from_slice(&source[start..start + self.width as usize * CHANNELS]);
        }
        tile
    }
}

#[derive(Clone, Copy)]
struct Interval(f32, f32);

impl Interval {
    fn offset(self, amount: f32) -> Self {
        Self(self.0 + amount, self.1 + amount)
    }

    fn add(self, other: Self) -> Self {
        Self(self.0 + other.0, self.1 + other.1)
    }

    fn scale(self, scale: f32) -> Self {
        let a = self.0 * scale;
        let b = self.1 * scale;
        Self(a.min(b), a.max(b))
    }

    fn product(self, other: Self) -> Self {
        let values = [
            self.0 * other.0,
            self.0 * other.1,
            self.1 * other.0,
            self.1 * other.1,
        ];
        Self(
            values.into_iter().fold(f32::INFINITY, f32::min),
            values.into_iter().fold(f32::NEG_INFINITY, f32::max),
        )
    }

    fn square(self) -> Self {
        let a = self.0 * self.0;
        let b = self.1 * self.1;
        Self(
            if self.0 <= 0.0 && self.1 >= 0.0 {
                0.0
            } else {
                a.min(b)
            },
            a.max(b),
        )
    }

    fn pixels(self, length: u32) -> (u32, u32) {
        let start = (self.0.clamp(0.0, 1.0) * length as f32).floor() as u32;
        let end = (self.1.clamp(0.0, 1.0) * length as f32).ceil() as u32;
        (start.saturating_sub(16), end.saturating_add(16).min(length))
    }
}

/// A conservative bound for the matching geometry transform in develop.wgsl.
pub(crate) fn needed_source(p: &DevelopParams, width: u32, height: u32) -> SourceRect {
    let [left, top, w, h] = p.output_window;
    let mut x = Interval(left, left + w);
    let mut y = Interval(top, top + h);
    if p.geometry2[3] != 0.0 {
        let [crop_x, crop_y, crop_w, crop_h] = p.crop;
        let [angle, zoom, distortion, anamorphic] = p.geometry;
        let [keystone_h, keystone_v, aspect, _] = p.geometry2;
        let (s, c) = (-angle).sin_cos();
        x = x.scale(crop_w).offset(crop_x - 0.5).scale(aspect);
        y = y.scale(-crop_h).offset(0.5 - crop_y);
        let rotated_x = x
            .scale(c)
            .add(y.scale(s))
            .scale(1.0 / (zoom.max(0.01) * (1.0 + anamorphic).max(0.05)));
        y = x.scale(-s).add(y.scale(c)).scale(1.0 / zoom.max(0.01));
        x = rotated_x.add(y.scale(keystone_h));
        y = y.add(x.scale(keystone_v));
        let radial = x
            .square()
            .add(y.square())
            .scale(distortion * 2.0 / (aspect * aspect + 1.0))
            .offset(1.0);
        x = x.product(radial).scale(1.0 / aspect).offset(0.5);
        y = y.product(radial).scale(-1.0).offset(0.5);
    }
    let (x, right) = x.pixels(width);
    let (y, bottom) = y.pixels(height);
    SourceRect {
        x,
        y,
        width: right - x,
        height: bottom - y,
    }
}

/// Integer box filtering in linear light. It preserves fine alternating
/// detail when the oversized photo first appears at Fit.
pub(crate) fn proxy(width: u32, height: u32, rgba: &[u8], max: u32) -> (u32, u32, Vec<u8>) {
    let factor = width.max(height).div_ceil(max).max(1);
    let (w, h) = (width.div_ceil(factor), height.div_ceil(factor));
    let to_linear = |code: usize| {
        let value = code as f32 / 255.0;
        if value <= 0.04045 {
            value / 12.92
        } else {
            ((value + 0.055) / 1.055).powf(2.4)
        }
    };
    let table: [f32; 256] = std::array::from_fn(to_linear);
    let mut pixels = Vec::with_capacity(w as usize * h as usize * 4);
    for y in 0..h {
        for x in 0..w {
            let bottom = ((y + 1) * factor).min(height);
            let right = ((x + 1) * factor).min(width);
            let count = ((bottom - y * factor) * (right - x * factor)) as f32;
            let mut sum = [0.0; 4];
            for sy in y * factor..bottom {
                for sx in x * factor..right {
                    let pixel = (sy as usize * width as usize + sx as usize) * 4;
                    for channel in 0..3 {
                        sum[channel] += table[rgba[pixel + channel] as usize];
                    }
                    sum[3] += f32::from(rgba[pixel + 3]);
                }
            }
            for channel in &sum[..3] {
                let mean = *channel / count;
                let srgb = if mean <= 0.0031308 {
                    mean * 12.92
                } else {
                    1.055 * mean.powf(1.0 / 2.4) - 0.055
                };
                pixels.push((srgb * 255.0).round() as u8);
            }
            pixels.push((sum[3] / count).round() as u8);
        }
    }
    (w, h, pixels)
}

pub(crate) fn linear_proxy(width: u32, height: u32, rgb: &[u16], max: u32) -> (u32, u32, Vec<u16>) {
    let factor = width.max(height).div_ceil(max).max(1);
    let (w, h) = (width.div_ceil(factor), height.div_ceil(factor));
    let mut pixels = Vec::with_capacity(w as usize * h as usize * 3);
    for y in 0..h {
        for x in 0..w {
            let [left, top] = [x * factor, y * factor];
            let right = (left + factor).min(width);
            let bottom = (top + factor).min(height);
            let count = u64::from(right - left) * u64::from(bottom - top);
            let mut sum = [0u64; 3];
            for row in top..bottom {
                let start = (row as usize * width as usize + left as usize) * 3;
                let stop = start + (right - left) as usize * 3;
                for pixel in rgb[start..stop].as_chunks::<3>().0 {
                    for (total, channel) in sum.iter_mut().zip(pixel) {
                        *total += u64::from(*channel);
                    }
                }
            }
            pixels.extend(sum.map(|total| ((total + count / 2) / count) as u16));
        }
    }
    (w, h, pixels)
}
