import { DITHER_PALETTES, hexRgb, isDiffusionMethod, type CreativeEffect, type DiffusionMethod, type DitherMethod } from "../../effects/settings";

type Tap = readonly [dx: number, dy: number, weight: number];

// Each matrix lists the neighbors that receive the current pixel's quantization
// error, in left-to-right scan order. Atkinson deliberately propagates 6/8.
const diffusion: Record<DiffusionMethod, { divisor: number; taps: readonly Tap[] }> = {
  floyd: { divisor: 16, taps: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
  atkinson: { divisor: 8, taps: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] },
  burkes: { divisor: 32, taps: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2]] },
  stucki: { divisor: 42, taps: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2],
    [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]] },
  jarvis: { divisor: 48, taps: [[1, 0, 7], [2, 0, 5], [-2, 1, 3], [-1, 1, 5], [0, 1, 7], [1, 1, 5], [2, 1, 3],
    [-2, 2, 1], [-1, 2, 3], [0, 2, 5], [1, 2, 3], [2, 2, 1]] },
  sierra: { divisor: 32, taps: [[1, 0, 5], [2, 0, 3], [-2, 1, 2], [-1, 1, 4], [0, 1, 5], [1, 1, 4], [2, 1, 2],
    [-1, 2, 2], [0, 2, 3], [1, 2, 2]] },
  sierra2: { divisor: 16, taps: [[1, 0, 4], [2, 0, 3], [-2, 1, 1], [-1, 1, 2], [0, 1, 3], [1, 1, 2], [2, 1, 1]] },
  sierraLite: { divisor: 4, taps: [[1, 0, 2], [-1, 1, 1], [0, 1, 1]] },
};

const bayerSizes: Partial<Record<DitherMethod, number>> = { bayer2: 2, bayer4: 4, bayer8: 8, bayer16: 16 };
const bayerQuad = [0, 2, 3, 1];
const fract = (x: number) => x - Math.floor(x);
const posterize = (channel: number) => Math.round(Math.min(255, Math.max(0, channel)) / 51) * 51;
const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function whiteNoise(x: number, y: number): number {
  const hash = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0;
  return (Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0) / 4294967296;
}

// Rank high-pass noise on a torus so the tiled threshold has a uniform density
// and its low-frequency energy is reduced.
const blueNoise = (() => {
  const width = 16;
  const ranks = Array.from({ length: width * width }, (_, index) => {
    const x = index % width, y = Math.floor(index / width);
    const neighborhood = whiteNoise((x - 1) & 15, y) + whiteNoise((x + 1) & 15, y)
      + whiteNoise(x, (y - 1) & 15) + whiteNoise(x, (y + 1) & 15);
    return { index, score: whiteNoise(x, y) - neighborhood * 0.25 };
  }).sort((a, b) => a.score - b.score);
  const matrix = new Float32Array(width * width);
  ranks.forEach(({ index }, rank) => { matrix[index] = (rank + 0.5) / ranks.length; });
  return matrix;
})();

function threshold(method: DitherMethod, x: number, y: number): number {
  const bayerSize = bayerSizes[method];
  if (bayerSize) {
    let rank = 0;
    for (let n = 1; n < bayerSize; n *= 2) rank = rank * 4 + bayerQuad[((x & n) ? 1 : 0) + ((y & n) ? 2 : 0)];
    return (rank + 0.5) / (bayerSize * bayerSize);
  }
  switch (method) {
    case "dots": {
      const a = fract(x / 7) - 0.5;
      const b = fract(y / 7) - 0.5;
      return Math.min(1, (a * a + b * b) * 3.3);
    }
    case "radial": return fract(Math.hypot(x, y) / 6);
    case "horizontal": return fract(y / 4);
    case "vertical": return fract(x / 4);
    case "diagonal": return fract((x + y) / 6);
    case "noise": return whiteNoise(x, y);
    case "blueNoise": return blueNoise[(x & 15) + (y & 15) * 16];
    default: return 0.5;
  }
}

export function ditherRgba(pixels: Uint8Array, width: number, height: number, layer: CreativeEffect): void {
  const palette = (layer.palette === "custom" ? layer.customPalette : DITHER_PALETTES[layer.palette].colors)
    .map((color) => {
      const [r, g, b] = hexRgb(color).map((channel) => channel * 255);
      return { r, g, b, luma: luma(r, g, b) };
    });
  const luminanceOnly = ["mono", "gray4", "gray8", "gameboy", "amber", "sepia", "blueprint"].includes(layer.palette);
  const kernel = isDiffusionMethod(layer.dither) ? diffusion[layer.dither] : null;
  const working = kernel ? new Float32Array(width * height * 3) : null;
  const theta = layer.angle * Math.PI / 180;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const amplitude = layer.palette === "original" ? 51 : 255;
  for (let y = height - 1; y >= 0; y--) {
    const direction = (height - 1 - y) % 2 === 0 ? 1 : -1;
    for (let column = 0; column < width; column++) {
      const x = direction === 1 ? column : width - 1 - column;
      const index = y * width + x;
      const i = index * 4;
      if (pixels[i + 3] === 0) continue;
      const v = luma(pixels[i], pixels[i + 1], pixels[i + 2]);
      const workingIndex = index * 3;
      const bias = working ? 0 : (0.5 - threshold(layer.dither, Math.round(x*c-y*s+layer.phase*16), Math.round(x*s+y*c))) * amplitude * layer.detail;
      let r = (luminanceOnly ? v : pixels[i]) + bias;
      let g = (luminanceOnly ? v : pixels[i + 1]) + bias;
      let b = (luminanceOnly ? v : pixels[i + 2]) + bias;
      if (layer.invert) { r = 255 - r; g = 255 - g; b = 255 - b; }
      if (working) { r += working[workingIndex]; g += working[workingIndex + 1]; b += working[workingIndex + 2]; }
      const lightness = luma(r, g, b);
      let closest = palette[0];
      let distance = Number.POSITIVE_INFINITY;
      for (const color of palette) {
        const d = luminanceOnly
          ? (lightness - color.luma) ** 2
          : (r - color.r) ** 2 * 0.24 + (g - color.g) ** 2 * 0.62 + (b - color.b) ** 2 * 0.14;
        if (d < distance) { closest = color; distance = d; }
      }
      const qr = closest?.r ?? posterize(r), qg = closest?.g ?? posterize(g), qb = closest?.b ?? posterize(b);
      pixels[i] = Math.round(qr);
      pixels[i + 1] = Math.round(qg);
      pixels[i + 2] = Math.round(qb);
      if (!working || !kernel) continue;
      const weight = layer.detail / kernel.divisor;
      const dr = (r - qr) * weight, dg = (g - qg) * weight, db = (b - qb) * weight;
      for (const [dx, dy, w] of kernel.taps) {
        const destX = x + dx * direction, destY = y - dy;
        if (destX < 0 || destX >= width || destY < 0) continue;
        const dest = (destY * width + destX) * 3;
        working[dest] += dr * w;
        working[dest + 1] += dg * w;
        working[dest + 2] += db * w;
      }
    }
  }
}

export function sortRgba(pixels: Uint8Array, width: number, height: number, layer: CreativeEffect): void {
  const vertical = Math.abs(layer.angle) > 45 && Math.abs(layer.angle) < 135;
  const descending = layer.angle < -45 || layer.angle >= 135;
  const lines = vertical ? width : height;
  const length = vertical ? height : width;
  const runLimit = Math.max(2, Math.round(layer.size * Math.min(width, height) / 190));
  const threshold = layer.detail * 255;
  for (let line = 0; line < lines; line++) {
    const at = (offset: number) => (vertical ? (height - 1 - offset) * width + line : line * width + offset) * 4;
    let start = 0;
    let run: Array<{ value: number; rgb: [number, number, number] }> = [];
    const flush = () => {
      run.sort((a, b) => descending ? b.value - a.value : a.value - b.value);
      run.forEach(({ rgb }, index) => pixels.set(rgb, at(start + index)));
      run = [];
    };
    for (let x = 0; x < length; x++) {
      const i = at(x);
      const value = luma(pixels[i], pixels[i + 1], pixels[i + 2]);
      if (value < threshold || pixels[i + 3] === 0) { if (run.length) flush(); continue; }
      if (!run.length) start = x;
      run.push({ value, rgb: [pixels[i], pixels[i + 1], pixels[i + 2]] });
      if (run.length === runLimit) flush();
    }
    if (run.length) flush();
  }
}
