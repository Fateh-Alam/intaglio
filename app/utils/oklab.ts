/** OKLab ↔ sRGB helpers for drawing UI that matches the render engine's color math. */

export function linearToSrgb(value: number): number {
  const v = Math.max(0, Math.min(1, value));
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}

export function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function linearSrgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab → 8-bit sRGB, reducing chroma until the color is in gamut (hue and lightness preserved). */
export function oklabToSrgb8(L: number, a: number, b: number): [number, number, number] {
  let scale = 1;
  let rgb = oklabToLinearSrgb(L, a, b);
  for (let i = 0; i < 12 && rgb.some((channel) => channel < -1e-4 || channel > 1 + 1e-4); i++) {
    scale *= 0.85;
    rgb = oklabToLinearSrgb(L, a * scale, b * scale);
  }
  return [Math.round(linearToSrgb(rgb[0]) * 255), Math.round(linearToSrgb(rgb[1]) * 255), Math.round(linearToSrgb(rgb[2]) * 255)];
}

export function oklchCss(L: number, C: number, hueDegrees: number): string {
  const rad = (hueDegrees * Math.PI) / 180;
  const [r, g, b] = oklabToSrgb8(L, C * Math.cos(rad), C * Math.sin(rad));
  return `rgb(${r} ${g} ${b})`;
}
