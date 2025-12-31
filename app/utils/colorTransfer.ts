import * as THREE from "three";

// Helper to get image data from a URL with optional ROI (normalized 0-1)
interface ROI {
  x: number;
  y: number;
  w: number;
  h: number;
}

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
        x = class Clamp {
          static val(v: number, min: number, max: number) {
            return Math.min(Math.max(v, min), max);
          }
        }.val(Math.floor(roi.x * img.width), 0, img.width - 1);

        y = Math.floor(roi.y * img.height);
        w = Math.floor(roi.w * img.width);
        h = Math.floor(roi.h * img.height);

        // Safety clamps
        if (x + w > img.width) w = img.width - x;
        if (y + h > img.height) h = img.height - y;
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

// Generate a 2D LUT texture (WebGL 1 compatible)
export async function generatePaletteHeist2DLUT(
  sourceUrl: string,
  refUrl: string,
  sourceROI?: ROI,
  refROI?: ROI
): Promise<THREE.DataTexture> {
  const [sourceData, refData] = await Promise.all([
    getImageData(sourceUrl, sourceROI),
    getImageData(refUrl, refROI),
  ]);

  const sourceR = getCDF(sourceData, 0);
  const sourceG = getCDF(sourceData, 1);
  const sourceB = getCDF(sourceData, 2);

  const refR = getCDF(refData, 0);
  const refG = getCDF(refData, 1);
  const refB = getCDF(refData, 2);

  const mapR = createMapping(sourceR, refR);
  const mapG = createMapping(sourceG, refG);
  const mapB = createMapping(sourceB, refB);

  // Create a 2D LUT texture (256x256)
  // We'll store R in the red channel, G in green, B in blue
  const size = 256;
  const data = new Uint8Array(size * size * 4);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const index = (i * size + j) * 4;
      data[index] = Math.floor(mapR[i] * 255); // R
      data[index + 1] = Math.floor(mapG[i] * 255); // G
      data[index + 2] = Math.floor(mapB[i] * 255); // B
      data[index + 3] = 255; // A
    }
  }

  const texture = new THREE.DataTexture(data, size, size);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}
