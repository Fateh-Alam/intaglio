import type { CubeLutData } from "./lutParser";

// Helper to get image data from a URL with optional ROI (normalized 0-1)
interface ROI {
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

async function getImageData(
  url: string,
  roi?: ROI
): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No context");
      ctx.drawImage(img, 0, 0);

      let x = 0,
        y = 0,
        w = img.width,
        h = img.height;

      if (roi) {
        x = clamp(Math.floor(roi.x * img.width), 0, img.width - 1);
        y = clamp(Math.floor(roi.y * img.height), 0, img.height - 1);
        w = clamp(Math.floor(roi.w * img.width), 1, img.width - x);
        h = clamp(Math.floor(roi.h * img.height), 1, img.height - y);
      }

      resolve(ctx.getImageData(x, y, w, h).data);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Calculate CDF for a channel
function getCDF(data: Uint8ClampedArray, channelOffset: number): number[] {
  const histogram = new Array(256).fill(0);
  for (let i = channelOffset; i < data.length; i += 4) {
    histogram[data[i]]++;
  }

  const cdf = new Array(256).fill(0);
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += histogram[i];
    cdf[i] = sum;
  }

  // Normalize
  const total = cdf[255];
  // Avoid division by zero if roi is empty
  if (total === 0) return cdf;

  for (let i = 0; i < 256; i++) {
    cdf[i] /= total;
  }

  return cdf;
}

// Create mapping from source CDF to reference CDF
function createMapping(sourceCDF: number[], refCDF: number[]): number[] {
  const mapping = new Array(256).fill(0);
  for (let i = 0; i < 256; i++) {
    const val = sourceCDF[i];
    // Find closest value in refCDF
    let j = 0;
    while (j < 255 && refCDF[j] < val) {
      j++;
    }
    mapping[i] = j / 255.0; // Normalize to 0-1
  }
  return mapping;
}

const PALETTE_MATCH_LUT_SIZE = 33;

const sampleMapping = (mapping: number[], unit: number): number => {
  const position = unit * 255;
  const lower = Math.floor(position);
  const upper = Math.min(255, lower + 1);
  return mapping[lower] + (mapping[upper] - mapping[lower]) * (position - lower);
};

// Histogram-match each channel of the source to the reference and bake the
// result into a display-encoded 3D LUT, the same form as an imported .cube.
export async function generatePaletteMatchLut(
  sourceUrl: string,
  refUrl: string,
  sourceROI?: ROI,
  refROI?: ROI
): Promise<CubeLutData> {
  const [sourceData, refData] = await Promise.all([
    getImageData(sourceUrl, sourceROI),
    getImageData(refUrl, refROI),
  ]);

  const mapR = createMapping(getCDF(sourceData, 0), getCDF(refData, 0));
  const mapG = createMapping(getCDF(sourceData, 1), getCDF(refData, 1));
  const mapB = createMapping(getCDF(sourceData, 2), getCDF(refData, 2));

  const size = PALETTE_MATCH_LUT_SIZE;
  const values = new Float32Array(size * size * size * 3);
  let index = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        values[index++] = sampleMapping(mapR, r / (size - 1));
        values[index++] = sampleMapping(mapG, g / (size - 1));
        values[index++] = sampleMapping(mapB, b / (size - 1));
      }
    }
  }
  return { size, values, domainMin: [0, 0, 0], domainMax: [1, 1, 1], title: "Palette Match" };
}
