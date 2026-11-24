/**
 * Titles and captions: the document model.
 *
 * Every size and effect is relative to the image's shorter edge, so a title
 * looks identical on screen, in a 1080 px proof and in a 60 MP export.
 */

export type FontKey = "condensed" | "sans" | "serif" | "mono" | `custom:${string}`;
export type TextCase = "none" | "upper" | "title";
export type TitleKind = "title" | "caption" | "dateline" | "credits" | "text";
export type TitleAlign = "left" | "center" | "right";

/** A complete typographic treatment. Layers start from a look and may override any field. */
export interface TitleLook {
  id: string;
  name: string;
  /** Short description in plain words. */
  mood: string;
  font: FontKey;
  weight: number;
  italic: boolean;
  textCase: TextCase;
  /** Extra space between letters, in em. */
  tracking: number;
  /** Line height as a multiple of the font size. */
  leading: number;
  color: string;
  /** Secondary color for datelines and role words in credits. */
  accent: string;
  /** Soft drop shadow: strength 0…1, blur and drop in em. */
  shadow: number;
  shadowColor: string;
  /** Halo around the letters: strength 0…1, color. */
  glow: number;
  glowColor: string;
  /** Stroke width in em (0 = none). */
  outline: number;
  outlineColor: string;
  /** Box behind each line (captions): opacity 0…1. */
  plate: number;
  plateColor: string;
  /** Gradient that darkens the bottom of the frame behind titles. */
  scrimColor: string;
}

export interface LayerOverrides {
  font?: FontKey;
  weight?: number;
  italic?: boolean;
  textCase?: TextCase;
  tracking?: number;
  leading?: number;
  color?: string;
  shadow?: number;
  glow?: number;
  outline?: number;
  plate?: number;
}

export interface TitleLayer {
  id: string;
  kind: TitleKind;
  enabled: boolean;
  text: string;
  /** Look id from TITLE_LOOKS or CAPTION_LOOKS. */
  look: string;
  /** Font size as a fraction of the image's shorter edge. */
  size: number;
  /** Center of the text block, 0…1 across and down the image. */
  x: number;
  y: number;
  align: TitleAlign;
  /** Wrap width as a fraction of the image width. */
  maxWidth: number;
  opacity: number;
  overrides: LayerOverrides;
}

export type MatteRatio = 0 | 1.85 | 2 | 2.39;

export interface TitleDocument {
  version: 1;
  layers: TitleLayer[];
  /** Cinema letterbox bars. 0 = off. */
  matte: { ratio: MatteRatio; color: string; opacity: number };
  /** Darken the bottom of the frame behind titles, using the title look's scrim color. */
  scrim: number;
}

const look = (value: Omit<TitleLook, "accent" | "shadowColor" | "glowColor" | "outlineColor" | "plateColor" | "scrimColor" | "plate" | "outline" | "leading"> & Partial<TitleLook>): TitleLook => ({
  accent: "rgba(255,255,255,0.72)",
  shadowColor: "rgba(0,0,0,0.85)",
  glowColor: "rgba(255,255,255,0.5)",
  outline: 0,
  outlineColor: "#000000",
  plate: 0,
  plateColor: "#000000",
  scrimColor: "#000000",
  leading: 1.12,
  ...value,
});

/**
 * Title looks. Internal ids are stable because saved projects reference them;
 * the visible names are original.
 */
export const TITLE_LOOKS: readonly TitleLook[] = [
  look({ id: "blade_runner", name: "Neon 2049", mood: "Wide condensed caps in amber haze", font: "condensed", weight: 400, italic: false, textCase: "upper", tracking: 0.25, color: "#ffffff", accent: "rgba(255,200,110,0.92)", shadow: 0.8, glow: 0.35, glowColor: "rgba(255,150,50,0.55)" }),
  look({ id: "interstellar", name: "Orbit", mood: "Hairline sans, vast spacing", font: "sans", weight: 200, italic: false, textCase: "upper", tracking: 0.32, color: "#ffffff", accent: "rgba(255,255,255,0.6)", shadow: 0.9, glow: 0 }),
  look({ id: "sicario", name: "Frontier", mood: "Hard condensed caps, gold meta", font: "condensed", weight: 400, italic: false, textCase: "upper", tracking: 0.15, color: "#f5f5f5", accent: "#d4a855", shadow: 0.9, glow: 0 }),
  look({ id: "dune", name: "Sands", mood: "Tall serif caps, warm parchment", font: "serif", weight: 400, italic: false, textCase: "upper", tracking: 0.36, color: "#f4e4c9", accent: "rgba(244,228,201,0.72)", shadow: 0.85, glow: 0.18, glowColor: "rgba(244,180,100,0.45)", scrimColor: "#140f0a" }),
  look({ id: "arrival", name: "Monolith", mood: "Light sans, quiet and open", font: "sans", weight: 300, italic: false, textCase: "none", tracking: 0.18, color: "#ffffff", accent: "rgba(255,255,255,0.55)", shadow: 0.8, glow: 0 }),
  look({ id: "revenant", name: "Wilderness", mood: "Cold serif, natural case", font: "serif", weight: 400, italic: false, textCase: "none", tracking: 0.04, color: "#e8e0d5", accent: "rgba(232,224,213,0.62)", shadow: 0.9, glow: 0, scrimColor: "#0f140f" }),
  look({ id: "oppenheimer", name: "Atomic", mood: "Tight caps, deep shadow", font: "condensed", weight: 400, italic: false, textCase: "upper", tracking: 0.08, color: "#ffffff", accent: "rgba(255,255,255,0.55)", shadow: 1, glow: 0 }),
  look({ id: "the_batman", name: "Crimson", mood: "Blood-red condensed caps", font: "condensed", weight: 400, italic: false, textCase: "upper", tracking: 0.15, color: "#dc2626", accent: "rgba(220,38,38,0.75)", shadow: 0.95, glow: 0.4, glowColor: "rgba(220,38,38,0.6)", scrimColor: "#0a0000" }),
  look({ id: "joker", name: "Acid Serif", mood: "Heavy italic serif, sickly green", font: "serif", weight: 400, italic: true, textCase: "none", tracking: 0.01, color: "#a3e635", accent: "rgba(250,204,21,0.85)", shadow: 0.95, glow: 0.3, glowColor: "rgba(132,204,22,0.5)", scrimColor: "#050a05" }),
  look({ id: "nineteen17", name: "Trench", mood: "Faded khaki stencil caps", font: "condensed", weight: 400, italic: false, textCase: "upper", tracking: 0.2, color: "#d4c5a9", accent: "rgba(180,160,120,0.85)", shadow: 0.9, glow: 0.1, glowColor: "rgba(120,96,60,0.5)", scrimColor: "#1e1c14" }),
  look({ id: "mad_max", name: "Fury", mood: "Burning orange caps", font: "condensed", weight: 400, italic: false, textCase: "upper", tracking: 0.12, color: "#f97316", accent: "rgba(251,191,36,0.9)", shadow: 0.95, glow: 0.4, glowColor: "rgba(249,115,22,0.6)", scrimColor: "#140800" }),
  look({ id: "her", name: "Blush", mood: "Soft light sans in rose", font: "sans", weight: 300, italic: false, textCase: "none", tracking: 0.04, color: "#fecdd3", accent: "rgba(253,164,175,0.8)", shadow: 0.55, glow: 0.2, glowColor: "rgba(251,113,133,0.4)", scrimColor: "#1a0a0c" }),
  look({ id: "matrix", name: "Phosphor", mood: "Green monospace terminal", font: "mono", weight: 400, italic: false, textCase: "upper", tracking: 0.12, color: "#4ade80", accent: "rgba(74,222,128,0.7)", shadow: 0.7, glow: 0.55, glowColor: "rgba(34,197,94,0.65)", scrimColor: "#000a02" }),
  look({ id: "fight_club", name: "Rebel", mood: "Raw condensed caps, tight", font: "condensed", weight: 400, italic: false, textCase: "upper", tracking: 0.04, color: "#fafafa", accent: "rgba(244,114,182,0.85)", shadow: 1, glow: 0 }),
  look({ id: "pulp_fiction", name: "Pulp", mood: "Bold sans in mustard", font: "sans", weight: 800, italic: false, textCase: "upper", tracking: 0.02, color: "#facc15", accent: "rgba(250,204,21,0.8)", shadow: 0.9, glow: 0, outline: 0.03, outlineColor: "#1a0f00" }),
  look({ id: "lost_in_translation", name: "Midnight", mood: "Delicate italic serif", font: "serif", weight: 400, italic: true, textCase: "none", tracking: 0.02, color: "#f0f4ff", accent: "rgba(196,210,255,0.72)", shadow: 0.7, glow: 0.18, glowColor: "rgba(150,170,255,0.4)", scrimColor: "#05060f" }),
  look({ id: "barbie", name: "Pop Pink", mood: "Heavy sans in candy pink", font: "sans", weight: 900, italic: true, textCase: "none", tracking: -0.01, color: "#ff4fa3", accent: "rgba(255,180,220,0.9)", shadow: 0.6, glow: 0.25, glowColor: "rgba(255,79,163,0.5)" }),
  look({ id: "drive", name: "Nightrun", mood: "Hot-pink italic script energy", font: "serif", weight: 400, italic: true, textCase: "none", tracking: 0.02, color: "#ff3fa4", accent: "rgba(255,120,200,0.85)", shadow: 0.85, glow: 0.6, glowColor: "rgba(255,63,164,0.65)", scrimColor: "#14000a" }),
];

/** Caption looks follow subtitle conventions: legible first, style second. */
export const CAPTION_LOOKS: readonly TitleLook[] = [
  look({ id: "caption_cinema", name: "Cinema", mood: "White, soft shadow", font: "sans", weight: 500, italic: false, textCase: "none", tracking: 0, leading: 1.22, color: "#ffffff", shadow: 0.9, glow: 0 }),
  look({ id: "caption_broadcast", name: "Broadcast box", mood: "White on a dark box", font: "sans", weight: 500, italic: false, textCase: "none", tracking: 0, leading: 1.3, color: "#ffffff", shadow: 0, glow: 0, plate: 0.72 }),
  look({ id: "caption_classic", name: "Classic yellow", mood: "Yellow with black edge", font: "sans", weight: 600, italic: false, textCase: "none", tracking: 0, leading: 1.22, color: "#ffe14d", shadow: 0.5, glow: 0, outline: 0.06, outlineColor: "#000000" }),
  look({ id: "caption_minimal", name: "Minimal", mood: "Light, no effects", font: "sans", weight: 400, italic: false, textCase: "none", tracking: 0.01, leading: 1.22, color: "#ffffff", shadow: 0.35, glow: 0 }),
];

const LOOKS_BY_ID = new Map([...TITLE_LOOKS, ...CAPTION_LOOKS].map((item) => [item.id, item]));

export function looksFor(kind: TitleKind): readonly TitleLook[] {
  return kind === "caption" ? CAPTION_LOOKS : TITLE_LOOKS;
}

export function findLook(id: string, kind: TitleKind): TitleLook {
  return LOOKS_BY_ID.get(id) ?? looksFor(kind)[0];
}

export interface ResolvedStyle {
  font: FontKey;
  weight: number;
  italic: boolean;
  textCase: TextCase;
  tracking: number;
  leading: number;
  color: string;
  accent: string;
  shadow: number;
  shadowColor: string;
  glow: number;
  glowColor: string;
  outline: number;
  outlineColor: string;
  plate: number;
  plateColor: string;
}

/** The look's values with the layer's overrides applied. Datelines draw in the look's accent color. */
export function resolveStyle(layer: TitleLayer): ResolvedStyle {
  const base = findLook(layer.look, layer.kind);
  const resolved: ResolvedStyle = {
    font: base.font, weight: base.weight, italic: base.italic, textCase: base.textCase, tracking: base.tracking,
    leading: base.leading, color: layer.kind === "dateline" ? base.accent : base.color, accent: base.accent,
    shadow: base.shadow, shadowColor: base.shadowColor, glow: base.glow, glowColor: base.glowColor,
    outline: base.outline, outlineColor: base.outlineColor, plate: base.plate, plateColor: base.plateColor,
  };
  // Datelines are small, wide-tracked supporting type in a neutral sans.
  if (layer.kind === "dateline") {
    resolved.font = base.font === "mono" ? "mono" : "sans";
    resolved.weight = 500;
    resolved.italic = false;
    resolved.textCase = "upper";
    resolved.tracking = Math.max(0.3, base.tracking + 0.12);
    resolved.glow = Math.min(base.glow, 0.25);
  }
  return { ...resolved, ...definedOnly(layer.overrides) };
}

function definedOnly<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}

export const DEFAULT_LAYERS: readonly TitleLayer[] = [
  { id: "title", kind: "title", enabled: false, text: "The Long Way Home", look: "blade_runner", size: 0.075, x: 0.5, y: 0.62, align: "center", maxWidth: 0.86, opacity: 1, overrides: {} },
  { id: "caption", kind: "caption", enabled: false, text: "I kept the car. I never could let it go.", look: "caption_cinema", size: 0.036, x: 0.5, y: 0.88, align: "center", maxWidth: 0.8, opacity: 1, overrides: {} },
  { id: "dateline", kind: "dateline", enabled: false, text: "Copenhagen · October 2026", look: "blade_runner", size: 0.022, x: 0.5, y: 0.1, align: "center", maxWidth: 0.86, opacity: 1, overrides: {} },
  { id: "credits", kind: "credits", enabled: false, text: "a film by YOUR NAME\nphotography by YOUR NAME  graded in ETCH", look: "blade_runner", size: 0.026, x: 0.5, y: 0.93, align: "center", maxWidth: 0.9, opacity: 1, overrides: {} },
];

export const DEFAULT_TITLES: TitleDocument = {
  version: 1,
  layers: DEFAULT_LAYERS.map((layer) => ({ ...layer, overrides: {} })),
  matte: { ratio: 0, color: "#000000", opacity: 1 },
  scrim: 0,
};

export function hasVisibleTitles(document: TitleDocument): boolean {
  return document.matte.ratio > 0 || document.layers.some((layer) => layer.enabled && layer.text.trim().length > 0);
}

/** Minimal shape of the legacy single-style text settings, for migration. */
export interface LegacyTextSettings {
  subtitleEnabled: boolean;
  subtitleText: string;
  subtitleStyle: string;
  dateEnabled: boolean;
  dateText: string;
  locationText: string;
  billingBlockEnabled: boolean;
  billingBlockText: string;
  subtitleX: number;
  subtitleY: number;
  dateX: number;
  dateY: number;
  billingX: number;
  billingY: number;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  opacity: number;
  textAlign: string;
  customFontEnabled: boolean;
  customFontName: string;
  customFontWeight: string;
  customFontStyle: "normal" | "italic";
  customTextTransform: string;
  titles?: TitleDocument;
}

const clamp01 = (value: number, fallback: number) => (Number.isFinite(value) ? Math.min(0.98, Math.max(0.02, value)) : fallback);

/** Convert the old three-block settings into layers. Old drags were stored inconsistently, so positions are clamped onto the frame. */
export function titlesFromLegacy(text: LegacyTextSettings): TitleDocument {
  const lookId = LOOKS_BY_ID.has(text.subtitleStyle) ? text.subtitleStyle : TITLE_LOOKS[0].id;
  const scale = Number.isFinite(text.fontSize) && text.fontSize > 0 ? text.fontSize : 1;
  const overrides: LayerOverrides = {};
  if (text.customFontEnabled && text.customFontName.trim()) {
    overrides.font = `custom:${text.customFontName.trim()}`;
    overrides.weight = Number(text.customFontWeight) || 400;
    overrides.italic = text.customFontStyle === "italic";
    if (text.customTextTransform === "uppercase") overrides.textCase = "upper";
    else if (text.customTextTransform === "capitalize") overrides.textCase = "title";
    else if (text.customTextTransform === "none" || text.customTextTransform === "lowercase") overrides.textCase = "none";
  }
  if (text.letterSpacing) overrides.tracking = text.letterSpacing;
  const align: TitleAlign = text.textAlign === "left" || text.textAlign === "right" ? text.textAlign : "center";
  const base = DEFAULT_TITLES.layers;
  const pick = (id: string) => base.find((layer) => layer.id === id)!;
  return {
    ...DEFAULT_TITLES,
    layers: [
      { ...pick("title"), enabled: text.subtitleEnabled, text: text.subtitleText || pick("title").text, look: lookId, size: 0.055 * scale, x: clamp01(0.5 + text.subtitleX / 100, 0.5), y: clamp01(1 - text.subtitleY / 100, 0.7), align, opacity: text.opacity, overrides: { ...overrides } },
      { ...pick("caption") },
      { ...pick("dateline"), enabled: text.dateEnabled, text: [text.dateText, text.locationText].filter(Boolean).join(" · ") || pick("dateline").text, look: lookId, size: 0.022 * scale, x: clamp01(0.5 + text.dateX / 100, 0.5), y: clamp01(0.2 + text.dateY / 100, 0.2), align, opacity: text.opacity, overrides: {} },
      { ...pick("credits"), enabled: text.billingBlockEnabled, text: text.billingBlockText || pick("credits").text, look: lookId, size: 0.02 * scale, x: clamp01(0.5 + text.billingX / 100, 0.5), y: clamp01(1 - text.billingY / 100, 0.93), align, opacity: text.opacity, overrides: {} },
    ],
  };
}

/** The titles to render: the saved document, or a conversion of legacy settings. */
export function resolveTitles(text: LegacyTextSettings | undefined | null): TitleDocument {
  if (!text) return DEFAULT_TITLES;
  if (text.titles && text.titles.version === 1) return text.titles;
  // Only convert settings someone actually used; untouched legacy defaults start fresh.
  if (!text.subtitleEnabled && !text.dateEnabled && !text.billingBlockEnabled) return DEFAULT_TITLES;
  return titlesFromLegacy(text);
}

/* ── Title cards: complete one-tap designs ─────────────────────────────── */

/** Average brightness (0…1) of the top and bottom thirds of the graded frame. */
export interface FrameTone { top: number; bottom: number }

export interface TitleCard {
  id: string;
  name: string;
  description: string;
  apply: (document: TitleDocument, aspect: number, tone?: FrameTone) => TitleDocument;
}

/** Bright backgrounds get dark ink so the words stay readable. */
const BRIGHT = 0.55;
const darkInk: LayerOverrides = { color: "#17130f", shadow: 0.12, glow: 0 };

/** Mean luma of the top and bottom thirds of an RGBA readback (rows bottom-up, as WebGL returns them). */
export function frameTone(pixels: Uint8Array, width: number, height: number): FrameTone {
  const band = Math.max(1, Math.floor(height / 3));
  const mean = (fromRow: number) => {
    let sum = 0;
    let count = 0;
    for (let row = fromRow; row < fromRow + band; row++) {
      for (let x = 0; x < width; x += 2) {
        const i = (row * width + x) * 4;
        sum += (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255;
        count++;
      }
    }
    return count ? sum / count : 0.3;
  };
  return { bottom: mean(0), top: mean(height - band) };
}

/** Height of one letterbox bar as a fraction of the image height, or 0 if the frame is already that wide. */
export function matteFraction(aspect: number, ratio: number): number {
  return ratio > 0 && aspect < ratio ? (1 - aspect / ratio) / 2 : 0;
}

/** Cinema bars suit landscape frames; on portraits they would swallow the photo. */
const cinemaRatio = (aspect: number): MatteRatio => (aspect >= 1.3 ? 2.39 : 0);

type LayerPlan = Partial<Omit<TitleLayer, "id" | "kind" | "text">>;

/** Turn on the planned layers, turn off the rest, and keep whatever the person typed. */
function plan(document: TitleDocument, layers: Record<string, LayerPlan>, frame: Pick<TitleDocument, "matte" | "scrim">): TitleDocument {
  const lead = document.layers.find((layer) => layer.kind === "title")?.look ?? TITLE_LOOKS[0].id;
  return {
    ...document,
    ...frame,
    layers: document.layers.map((layer) => {
      const change = layers[layer.id];
      if (!change) return layer.kind === "text" ? layer : { ...layer, enabled: false };
      const look = layer.kind === "caption" ? (change.look ?? layer.look) : (change.look ?? lead);
      return { ...layer, ...change, look, enabled: true, overrides: change.overrides ?? {} };
    }),
  };
}

export const TITLE_CARDS: readonly TitleCard[] = [
  {
    id: "opening",
    name: "Opening title",
    description: "A film's first frame",
    apply: (document, aspect) => {
      const ratio = cinemaRatio(aspect);
      const bar = matteFraction(aspect, ratio);
      // Portraits: the dateline sits under the title, over the scrim, rather than on an unknown top edge.
      return plan(document, {
        title: { size: 0.07, x: 0.5, y: ratio ? 0.5 + (0.5 - bar) * 0.55 : 0.76, align: "center", maxWidth: 0.86 },
        dateline: { size: 0.02, x: 0.5, y: ratio ? bar / 2 : 0.845, align: "center" },
      }, { matte: { ratio, color: "#000000", opacity: 1 }, scrim: ratio ? 0.35 : 0.65 });
    },
  },
  {
    id: "subtitled",
    name: "Subtitled frame",
    description: "A line of dialogue",
    apply: (document, aspect) => {
      const ratio = cinemaRatio(aspect);
      const bar = matteFraction(aspect, ratio);
      return plan(document, {
        caption: { size: ratio ? Math.min(0.04, bar * 0.5) : 0.036, x: 0.5, y: ratio ? 1 - bar / 2 : 0.9, align: "center", maxWidth: 0.82, look: "caption_cinema" },
      }, { matte: { ratio, color: "#000000", opacity: 1 }, scrim: ratio ? 0 : 0.35 });
    },
  },
  {
    id: "location",
    name: "Location card",
    description: "Where and when",
    apply: (document) => plan(document, {
      dateline: { size: 0.028, x: 0.5, y: 0.86, align: "center" },
    }, { matte: { ratio: 0, color: "#000000", opacity: 1 }, scrim: 0.5 }),
  },
  {
    id: "credits",
    name: "End credits",
    description: "Title over a billing block",
    apply: (document) => plan(document, {
      title: { size: 0.06, x: 0.5, y: 0.7, align: "center", maxWidth: 0.86 },
      credits: { size: 0.026, x: 0.5, y: 0.83, align: "center", maxWidth: 0.82 },
    }, { matte: { ratio: 0, color: "#000000", opacity: 1 }, scrim: 0.85 }),
  },
  {
    id: "poster",
    name: "Poster",
    description: "Big serif title, credits below",
    apply: (document, _aspect, tone) => plan(document, {
      title: { size: 0.11, x: 0.5, y: 0.15, align: "center", maxWidth: 0.9, look: "dune", overrides: { tracking: 0.14, ...(tone && tone.top > BRIGHT ? darkInk : {}) } },
      credits: { size: 0.022, x: 0.5, y: 0.93, align: "center", maxWidth: 0.86, look: "dune", overrides: tone && tone.bottom > BRIGHT ? darkInk : {} },
    }, { matte: { ratio: 0, color: "#000000", opacity: 1 }, scrim: tone && tone.bottom > BRIGHT ? 0 : 0.55 }),
  },
];
