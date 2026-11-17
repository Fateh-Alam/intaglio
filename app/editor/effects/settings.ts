import { EFFECT_BY_ID, type EffectId } from "./catalog";

export const DITHER_METHODS = {
  floyd: "Floyd–Steinberg", atkinson: "Atkinson", burkes: "Burkes",
  stucki: "Stucki", jarvis: "Jarvis–Judice–Ninke", sierra: "Sierra",
  sierra2: "Two-row Sierra", sierraLite: "Sierra Lite",
  bayer2: "Bayer 2×2", bayer4: "Bayer 4×4", bayer8: "Bayer 8×8", bayer16: "Bayer 16×16",
  dots: "Halftone dots", radial: "Radial screen", horizontal: "Horizontal lines",
  vertical: "Vertical lines", diagonal: "Diagonal lines", noise: "White noise", blueNoise: "Blue noise",
} as const;

export const DITHER_PALETTES = {
  mono: { name: "1-bit monochrome", colors: ["#000000", "#ffffff"] },
  gray4: { name: "4-level gray", colors: ["#000000", "#555555", "#aaaaaa", "#ffffff"] },
  gray8: { name: "8-level gray", colors: ["#000000", "#242424", "#494949", "#6d6d6d", "#929292", "#b6b6b6", "#dbdbdb", "#ffffff"] },
  gameboy: { name: "Game Boy", colors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"] },
  cga0: { name: "CGA · green, red, yellow", colors: ["#000000", "#55ff55", "#ff5555", "#ffff55"] },
  cga1: { name: "CGA · cyan, magenta, white", colors: ["#000000", "#55ffff", "#ff55ff", "#ffffff"] },
  rgb: { name: "3-bit RGB", colors: ["#000000", "#0000ff", "#00ff00", "#00ffff", "#ff0000", "#ff00ff", "#ffff00", "#ffffff"] },
  c64: { name: "Commodore 64", colors: ["#000000", "#ffffff", "#813338", "#75cec8", "#8e3c97", "#56ac4d", "#2e2c9b", "#edf171", "#8e5029", "#553800", "#c46c71", "#4a4a4a", "#7b7b7b", "#a9ff9f", "#706deb", "#b2b2b2"] },
  pico8: { name: "PICO-8", colors: ["#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8", "#ff004d", "#ffa300", "#ffec27", "#00e436", "#29adff", "#83769c", "#ff77a8", "#ffccaa"] },
  nes: { name: "NES · 16 colors", colors: ["#000000", "#7c7c7c", "#0000fc", "#0000bc", "#4428bc", "#940084", "#a80020", "#a81000", "#881400", "#503000", "#007800", "#006800", "#005800", "#004058", "#fcfcfc", "#f8b800"] },
  pastel: { name: "Pastel", colors: ["#2b2d42", "#8d99ae", "#ef8354", "#f6bd60", "#f7ede2", "#84a59d"] },
  original: { name: "Image colors", colors: [] },
  amber: { name: "Amber terminal", colors: ["#160e06", "#683108", "#d87717", "#ffd38c"] },
  sepia: { name: "Sepia", colors: ["#241712", "#76513b", "#b68660", "#f2dec0"] },
  blueprint: { name: "Blueprint", colors: ["#092144", "#134772", "#3786b3", "#bee9f5"] },
  riso: { name: "Risograph", colors: ["#211d32", "#2ca1b2", "#e73478", "#f2c75d", "#f7ebce"] },
  cyberpunk: { name: "Cyberpunk", colors: ["#120f28", "#342279", "#a72483", "#ff5285", "#34c3d7", "#f8eea8"] },
  rust: { name: "Rust & teal", colors: ["#182a2a", "#537870", "#b05136", "#e09866", "#efdeaf"] },
  custom: { name: "Custom", colors: ["#000000", "#ffffff"] },
} as const;

export type DitherMethod = keyof typeof DITHER_METHODS;
export const DIFFUSION_METHODS = ["floyd", "atkinson", "burkes", "stucki", "jarvis", "sierra", "sierra2", "sierraLite"] as const satisfies readonly DitherMethod[];
export type DiffusionMethod = (typeof DIFFUSION_METHODS)[number];
export const isDiffusionMethod = (method: DitherMethod): method is DiffusionMethod =>
  (DIFFUSION_METHODS as readonly DitherMethod[]).includes(method);
export type DitherPalette = keyof typeof DITHER_PALETTES;

export interface CreativeEffect {
  id: string;
  effect: EffectId;
  enabled: boolean;
  opacity: number;
  size: number;
  detail: number;
  angle: number;
  phase: number;
  shadow: string;
  light: string;
  glyphs: string;
  invert: boolean;
  dither: DitherMethod;
  palette: DitherPalette;
  customPalette: string[];
}

export function createEffect(effect: EffectId, id: string = crypto.randomUUID()): CreativeEffect {
  const definition = EFFECT_BY_ID.get(effect)!;
  const settings: CreativeEffect = {
    id, effect, enabled: true, opacity: 1, size: 12, detail: 0.5, angle: 0, phase: 0,
    shadow: definition.colors?.[0] ?? "#181820", light: definition.colors?.[1] ?? "#f4ead8",
    glyphs: definition.glyphs ?? "", invert: false, dither: "bayer8", palette: "mono",
    customPalette: ["#000000", "#ffffff"],
  };
  for (const control of definition.controls) settings[control.key] = control.initial;
  return settings;
}

const hex = /^#[0-9a-f]{6}$/i;
const number = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function normalizeCreativeEffects(value: unknown): CreativeEffect[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap((entry: Partial<CreativeEffect> | null, index) => {
    if (!entry || !entry.effect || !EFFECT_BY_ID.has(entry.effect)) return [];
    let id = typeof entry.id === "string" && entry.id.length > 0 ? entry.id : `effect-${index}`;
    while (ids.has(id)) id += "-copy";
    ids.add(id);
    const defaults = createEffect(entry.effect, id);
    const palette = Array.isArray(entry.customPalette)
      ? entry.customPalette.filter((color) => typeof color === "string" && hex.test(color)).slice(0, 16)
      : [];
    return [{
      ...defaults,
      enabled: entry.enabled !== false,
      opacity: number(entry.opacity, 1, 0, 1),
      size: number(entry.size, defaults.size, 1, 120),
      detail: number(entry.detail, defaults.detail, 0, 1),
      angle: number(entry.angle, defaults.angle, -180, 180),
      phase: number(entry.phase, defaults.phase, 0, 1),
      shadow: typeof entry.shadow === "string" && hex.test(entry.shadow) ? entry.shadow : defaults.shadow,
      light: typeof entry.light === "string" && hex.test(entry.light) ? entry.light : defaults.light,
      glyphs: typeof entry.glyphs === "string" ? Array.from(entry.glyphs).slice(0, 64).join("") : defaults.glyphs,
      invert: entry.invert === true,
      dither: entry.dither && Object.hasOwn(DITHER_METHODS, entry.dither) ? entry.dither : defaults.dither,
      palette: entry.palette && Object.hasOwn(DITHER_PALETTES, entry.palette) ? entry.palette : defaults.palette,
      customPalette: palette.length >= 2 ? palette : defaults.customPalette,
    }];
  });
}

export function hexRgb(hex: string): [number, number, number] {
  const packed = Number.parseInt(hex.slice(1), 16);
  return [(packed >> 16) / 255, ((packed >> 8) & 255) / 255, (packed & 255) / 255];
}

export function hasCreativeEffects(effects?: readonly CreativeEffect[]): boolean {
  return effects?.some((effect) => effect.enabled && effect.opacity > 0) ?? false;
}
