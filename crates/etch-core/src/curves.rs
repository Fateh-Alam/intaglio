//! Tone curves, ported from app/utils/spline.ts so both engines build the same table.

use serde::Deserialize;

pub const TONE_CURVE_RESOLUTION: usize = 1024;

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct CurvePoint {
    pub x: f64,
    pub y: f64,
}

/// Master and per-channel curves, as in `EditorSettings.curvePoints`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(default)]
pub struct CurvePoints {
    pub master: Vec<CurvePoint>,
    pub red: Vec<CurvePoint>,
    pub green: Vec<CurvePoint>,
    pub blue: Vec<CurvePoint>,
}

impl Default for CurvePoints {
    fn default() -> Self {
        let line = vec![CurvePoint { x: 0.0, y: 0.0 }, CurvePoint { x: 1.0, y: 1.0 }];
        Self { master: line.clone(), red: line.clone(), green: line.clone(), blue: line }
    }
}

fn is_identity(points: &[CurvePoint]) -> bool {
    points.iter().all(|point| (point.x - point.y).abs() < 1e-6)
}

impl CurvePoints {
    pub fn is_identity(&self) -> bool {
        is_identity(&self.master) && is_identity(&self.red) && is_identity(&self.green) && is_identity(&self.blue)
    }

    /// RGBA float table: red, green, blue hold the channel curves, alpha the master.
    /// Values are display-encoded (sRGB transfer), like `buildToneCurveTable`.
    pub fn table(&self) -> Vec<f32> {
        let size = TONE_CURVE_RESOLUTION;
        let [master, red, green, blue] = [&self.master, &self.red, &self.green, &self.blue].map(|points| sample_monotone_curve(points, size));
        (0..size).flat_map(|i| [red[i], green[i], blue[i], master[i]]).collect()
    }
}

fn sign(x: f64) -> f64 {
    if x > 0.0 { 1.0 } else if x < 0.0 { -1.0 } else { 0.0 }
}

fn endpoint_tangent(h0: f64, h1: f64, d0: f64, d1: f64) -> f64 {
    let tangent = ((2.0 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if sign(tangent) != sign(d0) {
        return 0.0;
    }
    if sign(d0) != sign(d1) && tangent.abs() > (3.0 * d0).abs() {
        return 3.0 * d0;
    }
    tangent
}

/// Monotone piecewise cubic Hermite (Fritsch–Carlson PCHIP), as `sampleMonotoneCurve`.
pub fn sample_monotone_curve(data: &[CurvePoint], size: usize) -> Vec<f32> {
    let mut points: Vec<CurvePoint> = data.iter().copied().filter(|point| point.x.is_finite() && point.y.is_finite()).collect();
    points.sort_by(|a, b| a.x.total_cmp(&b.x));
    let mut unique: Vec<CurvePoint> = Vec::with_capacity(points.len());
    for point in points {
        if unique.last().is_none_or(|last| point.x > last.x) {
            unique.push(point);
        }
    }
    let points = unique;
    let step = |i: usize| i as f64 / (size - 1) as f64;
    if points.is_empty() {
        return (0..size).map(|i| step(i) as f32).collect();
    }
    if points.len() == 1 {
        return vec![points[0].y as f32; size];
    }

    let n = points.len();
    let h: Vec<f64> = (0..n - 1).map(|i| points[i + 1].x - points[i].x).collect();
    let delta: Vec<f64> = (0..n - 1).map(|i| (points[i + 1].y - points[i].y) / h[i]).collect();
    let mut tangents = vec![0.0; n];
    if n == 2 {
        tangents[0] = delta[0];
        tangents[1] = delta[0];
    } else {
        for i in 1..n - 1 {
            if delta[i - 1] * delta[i] <= 0.0 {
                continue;
            }
            let w1 = 2.0 * h[i] + h[i - 1];
            let w2 = h[i] + 2.0 * h[i - 1];
            tangents[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
        }
        tangents[0] = endpoint_tangent(h[0], h[1], delta[0], delta[1]);
        tangents[n - 1] = endpoint_tangent(h[n - 2], h[n - 3], delta[n - 2], delta[n - 3]);
    }

    let mut segment = 0;
    (0..size)
        .map(|i| {
            let x = step(i);
            if x <= points[0].x {
                return points[0].y as f32;
            }
            if x >= points[n - 1].x {
                return points[n - 1].y as f32;
            }
            while segment < n - 2 && x > points[segment + 1].x {
                segment += 1;
            }
            let t = (x - points[segment].x) / h[segment];
            let (t2, t3) = (t * t, t * t * t);
            ((2.0 * t3 - 3.0 * t2 + 1.0) * points[segment].y
                + (t3 - 2.0 * t2 + t) * h[segment] * tangents[segment]
                + (-2.0 * t3 + 3.0 * t2) * points[segment + 1].y
                + (t3 - t2) * h[segment] * tangents[segment + 1]) as f32
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn p(x: f64, y: f64) -> CurvePoint {
        CurvePoint { x, y }
    }

    #[test]
    fn straight_line_is_identity_and_passes_through_points() {
        let line = sample_monotone_curve(&[p(0.0, 0.0), p(1.0, 1.0)], 5);
        assert_eq!(line, vec![0.0, 0.25, 0.5, 0.75, 1.0]);
        let s = sample_monotone_curve(&[p(0.0, 0.0), p(0.25, 0.15), p(0.75, 0.85), p(1.0, 1.0)], 1025);
        assert!((s[256] - 0.15).abs() < 1e-6 && (s[768] - 0.85).abs() < 1e-6);
    }

    #[test]
    fn never_overshoots_between_points() {
        let curve = sample_monotone_curve(&[p(0.0, 0.0), p(0.4, 0.9), p(0.5, 0.9), p(1.0, 1.0)], 1024);
        assert!(curve.iter().all(|&y| (0.0..=1.0).contains(&y)));
        assert!(curve.windows(2).all(|pair| pair[1] >= pair[0] - 1e-6), "monotone data stays monotone");
    }
}
