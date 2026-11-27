//! Brush-mask coverage, ported from app/lib/brushMaskRaster.ts and the canvas
//! sizing in app/editor/render/brushTextures.ts.

use crate::masks::{BrushParams, BrushStroke};

/// Long edge of a brush coverage image, as `LONG_EDGE`.
pub const LONG_EDGE: u32 = 1536;

/// Coverage size for a photo of `aspect` (width / height).
pub fn coverage_size(aspect: f32) -> (u32, u32) {
    if aspect >= 1.0 {
        (LONG_EDGE, ((LONG_EDGE as f32 / aspect).round() as u32).max(1))
    } else {
        (((LONG_EDGE as f32 * aspect).round() as u32).max(1), LONG_EDGE)
    }
}

fn radius(stroke: &BrushStroke, pressure: f32, width: u32, height: u32) -> f32 {
    (stroke.size * width.min(height) as f32 * 0.1 * pressure).max(0.5)
}

/// One soft dab: opaque to (1 − feather) of the radius, then a linear fade.
fn stamp(alpha: &mut [f32], width: u32, height: u32, stroke: &BrushStroke, x: f32, y: f32, pressure: f32) {
    let r = radius(stroke, pressure, width, height);
    let strength = stroke.opacity * stroke.flow;
    let solid = (1.0 - stroke.feather).clamp(0.0, 1.0);
    let erase = stroke.mode == "erase";
    let (x0, x1) = (((x - r).floor().max(0.0)) as u32, ((x + r).ceil().min(width as f32)) as u32);
    let (y0, y1) = (((y - r).floor().max(0.0)) as u32, ((y + r).ceil().min(height as f32)) as u32);
    for py in y0..y1 {
        for px in x0..x1 {
            let d = ((px as f32 + 0.5 - x).powi(2) + (py as f32 + 0.5 - y).powi(2)).sqrt() / r;
            if d >= 1.0 {
                continue;
            }
            let gradient = if d <= solid { 1.0 } else { (1.0 - d) / (1.0 - solid).max(1e-6) };
            let source = gradient * strength;
            let index = (py * width + px) as usize;
            alpha[index] = if erase { alpha[index] * (1.0 - source) } else { source + alpha[index] * (1.0 - source) };
        }
    }
}

fn paint(alpha: &mut [f32], width: u32, height: u32, stroke: &BrushStroke) {
    let pressure = |point: &crate::masks::StrokePoint| point.pressure.unwrap_or(1.0);
    for (index, point) in stroke.points.iter().enumerate() {
        let (x, y) = (point.x * width as f32, point.y * height as f32);
        let Some(previous) = index.checked_sub(1).map(|i| &stroke.points[i]) else {
            stamp(alpha, width, height, stroke, x, y, pressure(point));
            continue;
        };
        let (px, py) = (previous.x * width as f32, previous.y * height as f32);
        let distance = (x - px).hypot(y - py);
        let spacing = (radius(stroke, pressure(previous).min(pressure(point)), width, height) * 0.3).max(0.5);
        let steps = ((distance / spacing).ceil() as u32).max(1);
        for step in 1..=steps {
            let t = step as f32 / steps as f32;
            let p = pressure(previous) + (pressure(point) - pressure(previous)) * t;
            stamp(alpha, width, height, stroke, px + (x - px) * t, py + (y - py) * t, p);
        }
    }
}

/// RGBA8 coverage (white, alpha = coverage), row 0 at the top of the photo.
pub fn rasterize(brush: &BrushParams, aspect: f32) -> (u32, u32, Vec<u8>) {
    let (width, height) = coverage_size(aspect);
    let mut alpha = vec![0.0f32; (width * height) as usize];
    for stroke in &brush.strokes {
        paint(&mut alpha, width, height, stroke);
    }
    let rgba = alpha.iter().flat_map(|a| [255, 255, 255, (a.clamp(0.0, 1.0) * 255.0).round() as u8]).collect();
    (width, height, rgba)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::masks::StrokePoint;

    fn stroke(points: &[(f32, f32)], mode: &str) -> BrushStroke {
        BrushStroke { points: points.iter().map(|&(x, y)| StrokePoint { x, y, pressure: None }).collect(), size: 0.2, feather: 0.5, flow: 1.0, opacity: 1.0, mode: mode.into() }
    }

    fn coverage(raster: &(u32, u32, Vec<u8>), x: f32, y: f32) -> u8 {
        let (w, h, data) = raster;
        let (px, py) = ((x * *w as f32) as u32, (y * *h as f32) as u32);
        data[((py * w + px) * 4 + 3) as usize]
    }

    #[test]
    fn strokes_cover_their_path_and_erasing_removes_it() {
        let painted = rasterize(&BrushParams { strokes: vec![stroke(&[(0.2, 0.5), (0.8, 0.5)], "paint")] }, 1.5);
        assert_eq!((painted.0, painted.1), (1536, 1024));
        assert_eq!(coverage(&painted, 0.5, 0.5), 255, "the middle of the stroke is fully covered");
        assert_eq!(coverage(&painted, 0.5, 0.1), 0, "far from the stroke is untouched");
        let erased = rasterize(&BrushParams { strokes: vec![stroke(&[(0.2, 0.5), (0.8, 0.5)], "paint"), stroke(&[(0.5, 0.5)], "erase")] }, 1.5);
        assert_eq!(coverage(&erased, 0.5, 0.5), 0, "erasing over the stroke removes it");
        assert_eq!(coverage(&erased, 0.3, 0.5), 255, "the rest of the stroke stays");
    }
}
