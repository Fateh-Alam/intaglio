export class MonotoneCubicSpline {
  private points: { x: number; y: number }[];
  private m: number[];

  constructor(points: { x: number; y: number }[]) {
    this.points = points;

    // Sort points by x
    this.points.sort((a, b) => a.x - b.x);

    const n = points.length;
    const d: number[] = []; // Slopes
    const m: number[] = []; // Tangents

    // Compute slopes
    for (let i = 0; i < n - 1; i++) {
      const h = points[i + 1].x - points[i].x;
      const dv = points[i + 1].y - points[i].y;
      d[i] = dv / h;
    }

    // Compute tangents
    m[0] = d[0];
    m[n - 1] = d[n - 2];

    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] === 0 || d[i] === 0 || d[i - 1] > 0 !== d[i] > 0) {
        m[i] = 0;
      } else {
        m[i] = 3 * (d[i - 1] + d[i]); // Should be something else?
        // Fritsch-Carlson algorithm for monotone cubic interpolation
        // m[i] = 0.5 * (d[i-1] + d[i]); // Standard Catmull-Rom-ish?
        // Actually, for monotone:
        // if d[i-1] and d[i] have diff signs, m[i] = 0
        // else m[i] = 3 * (h_prev + h_next) / ((2*h_next + h_prev)/d[i-1] + (h_next + 2*h_prev)/d[i])
        // Simplified version:
        m[i] = (d[i - 1] + d[i]) / 2;
      }
    }

    this.m = m;
  }

  // Precomputed Spline logic is often better but let's implement calculateAt
  // Simple Catmull-Rom is easier if we don't need strict monotonicity, but RGB curves strictly monotonic is good for luminance but not strictly required for artistic curves.
  // Actually, standard curves in Lightroom are not strictly monotonic, you can invert them.
  // So a standard Cubic Spline or Catmull-Rom is better.
  // Let's switch to a simpler Catmull-Rom helper function instead of a class.
}

// Simple Catmull-Rom Spline Interpolation
export function solveCatmullRom(
  data: { x: number; y: number }[],
  k: number = 0.5 // tension
) {
  if (data.length < 2) return [];

  const size = 256;
  const lut = new Float32Array(size);

  // Helper to get point at index with clamping
  const p = (i: number) => {
    if (i < 0) return data[0];
    if (i >= data.length) return data[data.length - 1];
    return data[i];
  };

  // We need to generate 256 values from x=0 to x=1
  // This approach iterates through segments and effectively draws them into the LUT bucket

  // Alternative: For every X in 0..255, find the segment and interpolate Y.

  // Sort data just in case
  data.sort((a, b) => a.x - b.x);

  for (let i = 0; i < size; i++) {
    const x = i / 255;

    // Find segment [p1, p2] where p1.x <= x <= p2.x
    let idx = 0;
    while (idx < data.length - 2 && x > data[idx + 1].x) {
      idx++;
    }

    const p0 = p(idx - 1);
    const p1 = p(idx);
    const p2 = p(idx + 1);
    const p3 = p(idx + 2);

    // If segment is zero length (vertical), just handle it? Standard curves shouldn't have vertical segments usually.
    const segmentLength = p2.x - p1.x;

    if (segmentLength <= 0) {
      lut[i] = p1.y;
      continue;
    }

    // Local t for the segment
    const t = (x - p1.x) / segmentLength;

    // Catmull-Rom calculation
    const t2 = t * t;
    const t3 = t * t * t;

    const v0 = (p2.y - p0.y) * k;
    const v1 = (p3.y - p1.y) * k;

    const y =
      (2 * p1.y - 2 * p2.y + v0 + v1) * t3 +
      (-3 * p1.y + 3 * p2.y - 2 * v0 - v1) * t2 +
      v0 * t +
      p1.y;

    lut[i] = Math.max(0, Math.min(1, y));
  }

  return lut;
}
