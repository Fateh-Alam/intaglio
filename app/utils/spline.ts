import type { CurvePoints } from "../types/editor";

export interface CurveControlPoint {
  x: number;
  y: number;
}

export const TONE_CURVE_RESOLUTION = 1024;

/**
 * Samples a piecewise cubic Hermite (PCHIP, Fritsch–Carlson) curve through the
 * control points. PCHIP never overshoots between points, so curves cannot ring
 * or posterize, and non-monotone (inverting) curves remain shape-preserving.
 * The input array is not mutated.
 */
export function sampleMonotoneCurve(data: readonly CurveControlPoint[], size = 256): Float32Array {
  const lut = new Float32Array(size);
  const points = [...data]
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => a.x - b.x)
    .filter((point, index, sorted) => index === 0 || point.x > sorted[index - 1].x);

  if (points.length === 0) {
    for (let i = 0; i < size; i++) lut[i] = i / (size - 1);
    return lut;
  }
  if (points.length === 1) return lut.fill(points[0].y);

  const n = points.length;
  const h: number[] = [];
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h[i] = points[i + 1].x - points[i].x;
    delta[i] = (points[i + 1].y - points[i].y) / h[i];
  }

  const tangents = new Array<number>(n).fill(0);
  if (n === 2) {
    tangents[0] = delta[0];
    tangents[1] = delta[0];
  } else {
    for (let i = 1; i < n - 1; i++) {
      if (delta[i - 1] * delta[i] <= 0) continue;
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      tangents[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
    }
    tangents[0] = endpointTangent(h[0], h[1], delta[0], delta[1]);
    tangents[n - 1] = endpointTangent(h[n - 2], h[n - 3], delta[n - 2], delta[n - 3]);
  }

  let segment = 0;
  for (let i = 0; i < size; i++) {
    const x = i / (size - 1);
    if (x <= points[0].x) { lut[i] = points[0].y; continue; }
    if (x >= points[n - 1].x) { lut[i] = points[n - 1].y; continue; }
    while (segment < n - 2 && x > points[segment + 1].x) segment++;
    const t = (x - points[segment].x) / h[segment];
    const t2 = t * t;
    const t3 = t2 * t;
    lut[i] =
      (2 * t3 - 3 * t2 + 1) * points[segment].y +
      (t3 - 2 * t2 + t) * h[segment] * tangents[segment] +
      (-2 * t3 + 3 * t2) * points[segment + 1].y +
      (t3 - t2) * h[segment] * tangents[segment + 1];
  }
  return lut;
}

function endpointTangent(h0: number, h1: number, d0: number, d1: number): number {
  const tangent = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
  if (Math.sign(tangent) !== Math.sign(d0)) return 0;
  if (Math.sign(d0) !== Math.sign(d1) && Math.abs(tangent) > Math.abs(3 * d0)) return 3 * d0;
  return tangent;
}

const isIdentityCurve = (points: readonly CurveControlPoint[]): boolean =>
  points.length === 0 || points.every((point) => Math.abs(point.x - point.y) < 1e-6);

export function isIdentityCurveSet(curves: CurvePoints): boolean {
  return isIdentityCurve(curves.master) && isIdentityCurve(curves.red) && isIdentityCurve(curves.green) && isIdentityCurve(curves.blue);
}

/**
 * Builds the RGBA float table consumed by ToneCurvePass: red, green, and blue
 * hold per-channel curves, alpha holds the master curve. Values are in
 * display-encoded (sRGB transfer) space.
 */
export function buildToneCurveTable(curves: CurvePoints, size = TONE_CURVE_RESOLUTION): Float32Array {
  const master = sampleMonotoneCurve(curves.master, size);
  const red = sampleMonotoneCurve(curves.red, size);
  const green = sampleMonotoneCurve(curves.green, size);
  const blue = sampleMonotoneCurve(curves.blue, size);
  const table = new Float32Array(size * 4);
  for (let i = 0; i < size; i++) {
    table[i * 4] = red[i];
    table[i * 4 + 1] = green[i];
    table[i * 4 + 2] = blue[i];
    table[i * 4 + 3] = master[i];
  }
  return table;
}
