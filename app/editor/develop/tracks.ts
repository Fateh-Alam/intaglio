import { oklchCss } from "../../utils/oklab";

/** Semantic slider tracks: the track itself explains what the slider does. */
export const TRACK = {
  temperature: "linear-gradient(90deg, #3f78ff 0%, #9aa6c4 38%, #c8c8c8 50%, #d8c08e 62%, #ffbe2e 100%)",
  tint: "linear-gradient(90deg, #2fbf5b 0%, #9cc4a5 38%, #c8c8c8 50%, #cfa0cf 62%, #e24be2 100%)",
  exposure: "linear-gradient(90deg, #0d0d0e 0%, #6b6b6f 50%, #f4f4f6 100%)",
  saturation: "linear-gradient(90deg, #7c7c80 0%, #a3a3a8 45%, #e0a640 68%, #e6503c 84%, #c447d8 100%)",
  vibrance: "linear-gradient(90deg, #7c7c80 0%, #a3a3a8 45%, #6fc1b0 68%, #4d8fe0 84%, #b05ce0 100%)",
} as const;

/** OKLCh hue centers (degrees) of the Color Mixer bands; mirrors OklchMixerPass. */
export const MIXER_BANDS = [
  { id: "Red", hue: 25 },
  { id: "Orange", hue: 55 },
  { id: "Yellow", hue: 92 },
  { id: "Green", hue: 145 },
  { id: "Aqua", hue: 195 },
  { id: "Blue", hue: 245 },
  { id: "Purple", hue: 292 },
  { id: "Magenta", hue: 335 },
] as const;

export type MixerBand = (typeof MIXER_BANDS)[number]["id"];

/** Mixer hue sliders move the band by up to ±45° (HUE_SCALE in OklchMixerPass). */
const HUE_RANGE = 45;

export const swatch = (hue: number) => oklchCss(0.7, 0.15, hue);

export const hueTrack = (hue: number) =>
  `linear-gradient(90deg, ${[-1, -0.5, 0, 0.5, 1].map((t, i) => `${oklchCss(0.7, 0.14, hue + t * HUE_RANGE)} ${i * 25}%`).join(", ")})`;

export const satTrack = (hue: number) => `linear-gradient(90deg, ${oklchCss(0.7, 0, hue)} 0%, ${oklchCss(0.7, 0.18, hue)} 100%)`;

export const lumTrack = (hue: number) => `linear-gradient(90deg, ${oklchCss(0.32, 0.1, hue)} 0%, ${oklchCss(0.7, 0.14, hue)} 50%, ${oklchCss(0.93, 0.06, hue)} 100%)`;

export const formatEv = (value: number) => `${value > 0.004 ? "+" : ""}${value.toFixed(2)}`;
export const parseNumber = (text: string) => {
  const parsed = Number.parseFloat(text.replace(/[^\d.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};
export const formatDegrees = (value: number) => `${value > 0.004 ? "+" : ""}${value.toFixed(1)}°`;
export const formatPercent = (value: number) => `${Math.round(value * 100)}`;
