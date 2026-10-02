export interface ParityMetrics {
  ssim: number;
  meanDeltaE: number;
  p99DeltaE: number;
}

const srgbToLinear = (value: number): number => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175;
  const z = (lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041) / 1.08883;
  const f = (value: number) => value > 216 / 24389 ? Math.cbrt(value) : (24389 / 27 * value + 16) / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const degrees = (radians: number): number => radians * 180 / Math.PI;
const radians = (angle: number): number => angle * Math.PI / 180;
const hueDegrees = (a: number, b: number): number => {
  if (a === 0 && b === 0) return 0;
  const angle = degrees(Math.atan2(b, a));
  return angle >= 0 ? angle : angle + 360;
};

/** CIEDE2000, with the reference weighting factors kL=kC=kH=1. */
export function deltaE2000(lab1: [number, number, number], lab2: [number, number, number]): number {
  const [l1, a1, b1] = lab1, [l2, a2, b2] = lab2;
  const c1 = Math.hypot(a1, b1), c2 = Math.hypot(a2, b2);
  const meanC = (c1 + c2) / 2;
  const g = 0.5 * (1 - Math.sqrt(meanC ** 7 / (meanC ** 7 + 25 ** 7)));
  const a1Prime = (1 + g) * a1, a2Prime = (1 + g) * a2;
  const c1Prime = Math.hypot(a1Prime, b1), c2Prime = Math.hypot(a2Prime, b2);
  const h1Prime = hueDegrees(a1Prime, b1), h2Prime = hueDegrees(a2Prime, b2);
  const deltaLPrime = l2 - l1;
  const deltaCPrime = c2Prime - c1Prime;
  const hueDifference = h2Prime - h1Prime;
  const deltaHuePrime = c1Prime * c2Prime === 0 ? 0
    : Math.abs(hueDifference) <= 180 ? hueDifference
      : hueDifference > 180 ? hueDifference - 360 : hueDifference + 360;
  const deltaHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(radians(deltaHuePrime / 2));
  const meanLPrime = (l1 + l2) / 2;
  const meanCPrime = (c1Prime + c2Prime) / 2;
  const meanHPrime = c1Prime * c2Prime === 0 ? h1Prime + h2Prime
    : Math.abs(h1Prime - h2Prime) <= 180 ? (h1Prime + h2Prime) / 2
      : h1Prime + h2Prime < 360 ? (h1Prime + h2Prime + 360) / 2 : (h1Prime + h2Prime - 360) / 2;
  const t = 1
    - 0.17 * Math.cos(radians(meanHPrime - 30))
    + 0.24 * Math.cos(radians(2 * meanHPrime))
    + 0.32 * Math.cos(radians(3 * meanHPrime + 6))
    - 0.20 * Math.cos(radians(4 * meanHPrime - 63));
  const deltaTheta = 30 * Math.exp(-(((meanHPrime - 275) / 25) ** 2));
  const rC = 2 * Math.sqrt(meanCPrime ** 7 / (meanCPrime ** 7 + 25 ** 7));
  const sL = 1 + 0.015 * (meanLPrime - 50) ** 2 / Math.sqrt(20 + (meanLPrime - 50) ** 2);
  const sC = 1 + 0.045 * meanCPrime;
  const sH = 1 + 0.015 * meanCPrime * t;
  const rT = -Math.sin(radians(2 * deltaTheta)) * rC;
  const lTerm = deltaLPrime / sL, cTerm = deltaCPrime / sC, hTerm = deltaHPrime / sH;
  return Math.sqrt(lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + rT * cTerm * hTerm);
}

export function measureParity(reference: Uint8ClampedArray, candidate: Uint8ClampedArray): ParityMetrics {
  if (reference.length !== candidate.length || reference.length % 4 !== 0) throw new Error("Parity inputs must be equal-sized RGBA buffers.");
  const count = reference.length / 4;
  let meanA = 0, meanB = 0;
  const lumaA = new Float64Array(count), lumaB = new Float64Array(count), errors: number[] = [];
  for (let pixel = 0; pixel < count; pixel += 1) {
    const index = pixel * 4;
    lumaA[pixel] = reference[index] * 0.2126 + reference[index + 1] * 0.7152 + reference[index + 2] * 0.0722;
    lumaB[pixel] = candidate[index] * 0.2126 + candidate[index + 1] * 0.7152 + candidate[index + 2] * 0.0722;
    meanA += lumaA[pixel]; meanB += lumaB[pixel];
    errors.push(deltaE2000(rgbToLab(reference[index], reference[index + 1], reference[index + 2]), rgbToLab(candidate[index], candidate[index + 1], candidate[index + 2])));
  }
  meanA /= count; meanB /= count;
  let varianceA = 0, varianceB = 0, covariance = 0;
  for (let pixel = 0; pixel < count; pixel += 1) {
    const da = lumaA[pixel] - meanA, db = lumaB[pixel] - meanB;
    varianceA += da * da; varianceB += db * db; covariance += da * db;
  }
  const denominator = Math.max(1, count - 1);
  varianceA /= denominator; varianceB /= denominator; covariance /= denominator;
  const c1 = (0.01 * 255) ** 2, c2 = (0.03 * 255) ** 2;
  const ssim = ((2 * meanA * meanB + c1) * (2 * covariance + c2)) / ((meanA * meanA + meanB * meanB + c1) * (varianceA + varianceB + c2));
  errors.sort((a, b) => a - b);
  return { ssim, meanDeltaE: errors.reduce((sum, value) => sum + value, 0) / count, p99DeltaE: errors[Math.min(errors.length - 1, Math.floor(errors.length * 0.99))] };
}

export interface Landmark { name: string; x: number; y: number }
export function assertLandmarkParity(reference: readonly Landmark[], candidate: readonly Landmark[], tolerance = 0.5): void {
  if (reference.length !== candidate.length) throw new Error("Landmark parity failed: landmark counts differ.");
  const byName = new Map(candidate.map((landmark) => [landmark.name, landmark]));
  for (const expected of reference) {
    const actual = byName.get(expected.name);
    if (!actual) throw new Error(`Landmark parity failed: missing ${expected.name}.`);
    const distance = Math.hypot(actual.x - expected.x, actual.y - expected.y);
    if (distance > tolerance) throw new Error(`Landmark parity failed: ${expected.name} differs by ${distance.toFixed(3)} px.`);
  }
}

export function assertLosslessParity(metrics: ParityMetrics): void {
  if (metrics.ssim < 0.9995 || metrics.meanDeltaE > 0.25 || metrics.p99DeltaE > 0.75) throw new Error(`Lossless parity failed: SSIM ${metrics.ssim.toFixed(6)}, mean ΔE ${metrics.meanDeltaE.toFixed(3)}, p99 ΔE ${metrics.p99DeltaE.toFixed(3)}.`);
}

export function assertLossyParity(metrics: ParityMetrics): void {
  if (metrics.ssim < 0.995 || metrics.meanDeltaE > 1) throw new Error(`Lossy parity failed: SSIM ${metrics.ssim.toFixed(6)}, mean ΔE ${metrics.meanDeltaE.toFixed(3)}.`);
}
