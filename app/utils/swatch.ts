// K-Means clustering to find dominant colors in an image buffer

export type ColorRGB = [number, number, number];

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.round(c).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function colorDistance(c1: ColorRGB, c2: ColorRGB): number {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

export function extractDominantColors(
  pixels: Uint8Array | Uint8ClampedArray,
  k: number = 5,
  maxIterations: number = 10
): string[] {
  // 1. Subsample pixels for speed (take every 4th pixel if large)
  const samples: ColorRGB[] = [];
  const step = Math.max(4, Math.floor(pixels.length / 4 / 2000) * 4);
  
  for (let i = 0; i < pixels.length; i += step) {
    samples.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  }

  if (samples.length === 0) return ["#000000"];

  // 2. Initialize k centroids randomly from samples
  const centroids: ColorRGB[] = [];
  for (let i = 0; i < k; i++) {
    const randomIdx = Math.floor(Math.random() * samples.length);
    centroids.push([...samples[randomIdx]] as ColorRGB);
  }

  // 3. K-Means iterations
  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters: ColorRGB[][] = Array.from({ length: k }, () => []);

    // Assign to closest centroid
    for (const color of samples) {
      let minDist = Infinity;
      let clusterIdx = 0;
      for (let i = 0; i < k; i++) {
        const dist = colorDistance(color, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          clusterIdx = i;
        }
      }
      clusters[clusterIdx].push(color);
    }

    // Update centroids
    let changed = false;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;
      
      let sumR = 0, sumG = 0, sumB = 0;
      for (const color of clusters[i]) {
        sumR += color[0];
        sumG += color[1];
        sumB += color[2];
      }
      const newCentroid: ColorRGB = [
        sumR / clusters[i].length,
        sumG / clusters[i].length,
        sumB / clusters[i].length,
      ];

      if (colorDistance(centroids[i], newCentroid) > 1) {
        changed = true;
      }
      centroids[i] = newCentroid;
    }

    if (!changed) break;
  }

  // 4. Sort centroids by luminance (dark to light)
  centroids.sort((a, b) => {
    const lumaA = a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    const lumaB = b[0] * 0.2126 + b[1] * 0.7152 + b[2] * 0.0722;
    return lumaA - lumaB;
  });

  return centroids.map(c => rgbToHex(c[0], c[1], c[2]));
}
