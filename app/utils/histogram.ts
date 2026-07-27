export type AnalysisQuality =
  | "fast-preview"
  | "balanced-sample"
  | "full-export";

export type HistogramMetrics = {
  rgb: [number[], number[], number[]]; // Arrays of size 256 for R, G, B channels
  luma: number[];                      // Array of size 256 for luminance
  shadowClipPct: number;
  highlightClipPct: number;
  redClipPct: number;
  greenClipPct: number;
  blueClipPct: number;
  meanLuma: number;
  meanRgb: [number, number, number];
  medianLuma: number;
  contrastP95P5: number;
  saturationMean: number;
  skinExposureMean?: number;
  palette?: string[];
};

/**
 * Computes histogram metrics from pixel data (RGBA).
 * @param pixels Flat array of [R, G, B, A, R, G, B, A, ...]
 * @param bins Number of histogram bins (default 256)
 */
export function computeHistogramMetrics(pixels: Uint8Array | Uint8ClampedArray, bins: number = 256): HistogramMetrics {
  const rBins = new Array(bins).fill(0);
  const gBins = new Array(bins).fill(0);
  const bBins = new Array(bins).fill(0);
  const lumaBins = new Array(bins).fill(0);

  let totalLuma = 0;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let totalSaturation = 0;

  const totalPixels = pixels.length / 4;
  if (totalPixels === 0) {
    return createEmptyHistogram();
  }

  // Pre-calculate coefficients for Rec.709 luminance
  const RW = 0.2126;
  const GW = 0.7152;
  const BW = 0.0722;

  let shadowClipCount = 0;
  let highlightClipCount = 0;
  let rClipCount = 0;
  let gClipCount = 0;
  let bClipCount = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    rBins[r]++;
    gBins[g]++;
    bBins[b]++;
    
    totalR += r;
    totalG += g;
    totalB += b;

    // Rec.709 Luma
    const luma = Math.round(r * RW + g * GW + b * BW);
    const clampedLuma = Math.max(0, Math.min(255, luma));
    lumaBins[clampedLuma]++;
    totalLuma += clampedLuma;

    // Clipping counts
    if (clampedLuma <= 2) shadowClipCount++;
    if (clampedLuma >= 253) highlightClipCount++;
    if (r >= 253) rClipCount++;
    if (g >= 253) gClipCount++;
    if (b >= 253) bClipCount++;

    // Saturation (simple approach: max - min / max)
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    if (maxC > 0) {
      totalSaturation += (maxC - minC) / maxC;
    }
  }

  // Find median luma
  let medianLuma = 0;
  let sum = 0;
  const halfTotal = totalPixels / 2;
  for (let i = 0; i < bins; i++) {
    sum += lumaBins[i];
    if (sum >= halfTotal) {
      medianLuma = i;
      break;
    }
  }

  // Find P5 and P95 for contrast
  let p5Luma = 0;
  let p95Luma = 255;
  const p5Threshold = totalPixels * 0.05;
  const p95Threshold = totalPixels * 0.95;
  
  let p5Sum = 0;
  for (let i = 0; i < bins; i++) {
    p5Sum += lumaBins[i];
    if (p5Sum >= p5Threshold) {
      p5Luma = i;
      break;
    }
  }
  
  let p95Sum = 0;
  for (let i = 0; i < bins; i++) {
    p95Sum += lumaBins[i];
    if (p95Sum >= p95Threshold) {
      p95Luma = i;
      break;
    }
  }

  return {
    rgb: [rBins, gBins, bBins],
    luma: lumaBins,
    shadowClipPct: shadowClipCount / totalPixels,
    highlightClipPct: highlightClipCount / totalPixels,
    redClipPct: rClipCount / totalPixels,
    greenClipPct: gClipCount / totalPixels,
    blueClipPct: bClipCount / totalPixels,
    meanLuma: totalLuma / totalPixels,
    meanRgb: [totalR / totalPixels, totalG / totalPixels, totalB / totalPixels],
    medianLuma: medianLuma,
    contrastP95P5: Math.max(0, p95Luma - p5Luma) / 255.0,
    saturationMean: totalSaturation / totalPixels,
  };
}

export function createEmptyHistogram(bins: number = 256): HistogramMetrics {
  return {
    rgb: [new Array(bins).fill(0), new Array(bins).fill(0), new Array(bins).fill(0)],
    luma: new Array(bins).fill(0),
    shadowClipPct: 0,
    highlightClipPct: 0,
    redClipPct: 0,
    greenClipPct: 0,
    blueClipPct: 0,
    meanLuma: 0,
    meanRgb: [0, 0, 0],
    medianLuma: 0,
    contrastP95P5: 0,
    saturationMean: 0,
  };
}
