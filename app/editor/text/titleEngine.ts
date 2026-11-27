/**
 * Titles and captions: layout and rendering.
 *
 * One function draws titles for the on-screen preview, proofs, batch and
 * export, so what you see is what you save. Layout depends only on a text
 * measurer, which keeps line breaking testable without a browser.
 */
import { resolveStyle, findLook, type FontKey, type ResolvedStyle, type TextCase, type TitleDocument, type TitleLayer } from "./titleModel";

/** Width of `text` in pixels when drawn with the CSS `font`. */
export type Measure = (text: string, font: string) => number;

export const FONT_FAMILIES: Record<Exclude<FontKey, `custom:${string}`>, string> = {
  condensed: '"Bebas Neue"',
  sans: "Inter",
  serif: '"Instrument Serif"',
  mono: '"Geist Mono"',
};

/** Bundled single-weight faces: requesting other weights would make the browser fake bold. */
const SINGLE_WEIGHT = new Set<FontKey>(["condensed", "serif"]);

export function familyFor(font: FontKey): string {
  if (font.startsWith("custom:")) return `"${font.slice(7).replace(/"/g, "")}"`;
  return FONT_FAMILIES[font as keyof typeof FONT_FAMILIES] ?? "Inter";
}

export function fontString(style: Pick<ResolvedStyle, "font" | "weight" | "italic">, px: number): string {
  const weight = SINGLE_WEIGHT.has(style.font) ? 400 : Math.round(style.weight);
  return `${style.italic ? "italic " : ""}${weight} ${Math.max(1, px).toFixed(2)}px ${familyFor(style.font)}, Inter, sans-serif`;
}

export function applyCase(text: string, textCase: TextCase): string {
  if (textCase === "upper") return text.toLocaleUpperCase();
  if (textCase === "title") return text.replace(/(^|[\s\-–—(“"'])(\p{L})/gu, (_, lead: string, letter: string) => lead + letter.toLocaleUpperCase());
  return text;
}

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
export const graphemes = (text: string): string[] => (segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text));

/** Width including tracking between graphemes (none after the last one). */
export function trackedWidth(text: string, font: string, trackingPx: number, measure: Measure): number {
  if (!text) return 0;
  return measure(text, font) + trackingPx * Math.max(0, graphemes(text).length - 1);
}

export interface Run {
  text: string;
  font: string;
  px: number;
  tracking: number;
  /** Role words in credits ("directed by"): smaller and in the accent color. */
  role: boolean;
  /** Starts a new credit (typed after two or more spaces), so it gets a wider gap. */
  groupStart: boolean;
  width: number;
}

/** Space before a run in a credit line: wide between credits, tight between a role and its name. */
export function gapBefore(run: Run, index: number, px: number): number {
  if (index === 0) return 0;
  return run.groupStart ? px * 1.15 : px * 0.34;
}

export interface Line {
  runs: Run[];
  width: number;
  /** Characters on the line, for caption reading-speed rules. */
  chars: number;
}

export interface LayerLayout {
  id: string;
  lines: Line[];
  /** Font size used after fitting, in pixels. */
  px: number;
  lineHeight: number;
  /** Block bounds in pixels. */
  box: { x: number; y: number; width: number; height: number };
  /** Bounds normalized to the image, for hit testing and guides. */
  bounds: { x0: number; y0: number; x1: number; y1: number };
  style: ResolvedStyle;
}

/** Caption reading rules (common subtitle guidelines). */
export const CAPTION_MAX_CHARS = 42;
export const CAPTION_MAX_LINES = 2;

function makeRun(text: string, style: ResolvedStyle, px: number, role: boolean, measure: Measure): Run {
  const runPx = role ? px * 0.52 : px;
  const font = fontString(style, runPx);
  const tracking = (role ? Math.max(style.tracking, 0.18) : style.tracking) * runPx;
  return { text, font, px: runPx, tracking, role, groupStart: false, width: trackedWidth(text, font, tracking, measure) };
}

/** Greedy word wrap for one paragraph. */
function wrapParagraph(paragraph: string, style: ResolvedStyle, px: number, maxWidth: number, measure: Measure): Line[] {
  const words = paragraph.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [{ runs: [], width: 0, chars: 0 }];
  const font = fontString(style, px);
  const tracking = style.tracking * px;
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && trackedWidth(candidate, font, tracking, measure) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  return lines.map((text) => {
    const run = makeRun(text, style, px, false, measure);
    return { runs: [run], width: run.width, chars: graphemes(text).length };
  });
}

/** Wrap, then narrow the measure as far as possible without adding lines, so lines come out even. */
function balancedParagraph(paragraph: string, style: ResolvedStyle, px: number, maxWidth: number, measure: Measure): Line[] {
  const greedy = wrapParagraph(paragraph, style, px, maxWidth, measure);
  if (greedy.length < 2) return greedy;
  let low = maxWidth * 0.3;
  let high = maxWidth;
  let best = greedy;
  for (let i = 0; i < 14; i++) {
    const mid = (low + high) / 2;
    const attempt = wrapParagraph(paragraph, style, px, mid, measure);
    if (attempt.length <= greedy.length && attempt.every((line) => line.width <= mid + 0.5)) {
      best = attempt;
      high = mid;
    } else {
      low = mid;
    }
  }
  return best;
}

/** Credits: lowercase words are roles ("directed by"), everything else is a name. Each line fits the measure. */
function creditLines(text: string, style: ResolvedStyle, px: number, measure: Measure): Line[] {
  return text.split("\n").map((raw) => {
    const runs: Run[] = [];
    let chars = 0;
    // Group consecutive words of the same kind so spacing stays even inside a role or a name.
    const tokens = raw.split(/(\s+)/).filter((token) => token.length > 0);
    let buffer = "";
    let bufferRole: boolean | null = null;
    let newGroup = false;
    const flush = () => {
      const trimmed = buffer.trim();
      if (trimmed && bufferRole !== null) {
        const run = makeRun(trimmed.toLocaleUpperCase(), style, px, bufferRole, measure);
        run.groupStart = newGroup && runs.length > 0;
        newGroup = false;
        runs.push(run);
        chars += graphemes(trimmed).length;
      }
      buffer = "";
    };
    for (const token of tokens) {
      if (/^\s+$/.test(token)) {
        // Two or more spaces separate credits; keep a visible gap between groups.
        if (token.length > 1) { flush(); bufferRole = null; newGroup = true; } else buffer += token;
        continue;
      }
      const role = /\p{Ll}/u.test(token) && !/\p{Lu}/u.test(token);
      if (bufferRole !== null && role !== bufferRole) flush();
      bufferRole = role;
      buffer += token;
    }
    flush();
    const width = runs.reduce((sum, run, index) => sum + run.width + gapBefore(run, index, px), 0);
    return { runs, width, chars };
  });
}

export function layoutLayer(layer: TitleLayer, imageWidth: number, imageHeight: number, measure: Measure): LayerLayout {
  const style = resolveStyle(layer);
  const shortEdge = Math.min(imageWidth, imageHeight);
  const maxWidth = Math.max(10, layer.maxWidth * imageWidth);
  let px = Math.max(1, layer.size * shortEdge);
  const text = applyCase(layer.text, layer.kind === "credits" ? "none" : style.textCase);

  let lines: Line[];
  if (layer.kind === "credits") {
    lines = creditLines(text, style, px, measure);
    // Billing blocks are fitted to the measure rather than wrapped.
    const widest = Math.max(1, ...lines.map((line) => line.width));
    if (widest > maxWidth) {
      px *= (maxWidth / widest) * 0.998;
      lines = creditLines(text, style, px, measure);
    }
  } else {
    const paragraphs = text.split("\n");
    // Balanced breaks everywhere: no lone word left on the last line.
    lines = paragraphs.flatMap((paragraph) => balancedParagraph(paragraph, style, px, maxWidth, measure));
  }

  const lineHeight = px * style.leading;
  const width = Math.max(0, ...lines.map((line) => line.width));
  const height = lines.length * lineHeight;
  const x = layer.x * imageWidth - width / 2;
  const y = layer.y * imageHeight - height / 2;
  return {
    id: layer.id, lines, px, lineHeight, style,
    box: { x, y, width, height },
    bounds: { x0: x / imageWidth, y0: y / imageHeight, x1: (x + width) / imageWidth, y1: (y + height) / imageHeight },
  };
}

/** Caption rule check: characters per line and line count. */
export function captionReport(layout: LayerLayout): { lines: number; longest: number; ok: boolean } {
  const longest = Math.max(0, ...layout.lines.map((line) => line.chars));
  return { lines: layout.lines.length, longest, ok: longest <= CAPTION_MAX_CHARS && layout.lines.length <= CAPTION_MAX_LINES };
}

/* ── Drawing ─────────────────────────────────────────────────────────── */

function withAlpha(color: string, alpha: number): string {
  const value = color.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16));
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgba) {
    const parts = rgba[1].split(",").map((part) => part.trim());
    const base = parts.length > 3 ? Number(parts[3]) : 1;
    return `rgba(${parts[0]},${parts[1]},${parts[2]},${Math.max(0, Math.min(1, base * alpha))})`;
  }
  return value;
}

/** Draw a run with tracking. Positions come from prefix widths, so kerning is preserved. */
function drawRun(ctx: CanvasRenderingContext2D, run: Run, x: number, baseline: number, mode: "fill" | "stroke"): void {
  ctx.font = run.font;
  if (run.tracking === 0) {
    if (mode === "fill") ctx.fillText(run.text, x, baseline);
    else ctx.strokeText(run.text, x, baseline);
    return;
  }
  const parts = graphemes(run.text);
  let prefix = "";
  parts.forEach((part, index) => {
    const offset = (prefix ? ctx.measureText(prefix).width : 0) + run.tracking * index;
    if (mode === "fill") ctx.fillText(part, x + offset, baseline);
    else ctx.strokeText(part, x + offset, baseline);
    prefix += part;
  });
}

interface PlacedRun { run: Run; x: number; baseline: number }

function placeRuns(layout: LayerLayout, align: TitleLayer["align"]): PlacedRun[] {
  const placed: PlacedRun[] = [];
  const { box, lineHeight, px } = layout;
  layout.lines.forEach((line, index) => {
    const left = align === "left" ? box.x : align === "right" ? box.x + box.width - line.width : box.x + (box.width - line.width) / 2;
    // Baseline sits so cap height is optically centered in the line box.
    const baseline = box.y + index * lineHeight + lineHeight / 2 + px * 0.35;
    let cursor = left;
    line.runs.forEach((run, runIndex) => {
      cursor += gapBefore(run, runIndex, px);
      // Role words center on the names' cap height.
      const runBaseline = run.role ? baseline - (px - run.px) * 0.35 : baseline;
      placed.push({ run, x: cursor, baseline: runBaseline });
      cursor += run.width;
    });
  });
  return placed;
}

export function drawLayer(ctx: CanvasRenderingContext2D, layer: TitleLayer, layout: LayerLayout): void {
  const { style, px } = layout;
  const placed = placeRuns(layout, layer.align);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  // 1. Caption box behind each line.
  if (style.plate > 0) {
    ctx.fillStyle = withAlpha(style.plateColor, style.plate);
    const padX = px * 0.38;
    const padY = px * 0.16;
    layout.lines.forEach((line, index) => {
      if (line.width <= 0) return;
      const left = layer.align === "left" ? layout.box.x : layer.align === "right" ? layout.box.x + layout.box.width - line.width : layout.box.x + (layout.box.width - line.width) / 2;
      const top = layout.box.y + index * layout.lineHeight - padY + (layout.lineHeight - px * 1.12) / 2;
      roundRect(ctx, left - padX, top, line.width + padX * 2, px * 1.12 + padY * 2, px * 0.12);
      ctx.fill();
    });
  }

  const fillColor = (run: Run) => (run.role ? style.accent : style.color);

  // 2. Glow: blurred copies in the glow color.
  if (style.glow > 0) {
    ctx.save();
    ctx.shadowColor = withAlpha(style.glowColor, Math.min(1, 0.4 + style.glow * 0.6));
    ctx.shadowBlur = px * (0.35 + style.glow * 0.9);
    ctx.fillStyle = withAlpha(style.glowColor, style.glow * 0.5);
    const passes = style.glow > 0.5 ? 2 : 1;
    for (let pass = 0; pass < passes; pass++) placed.forEach(({ run, x, baseline }) => drawRun(ctx, run, x, baseline, "fill"));
    ctx.restore();
  }

  const applyShadow = () => {
    if (style.shadow <= 0) return;
    ctx.shadowColor = withAlpha(style.shadowColor, Math.min(1, style.shadow));
    ctx.shadowBlur = px * 0.32 * (0.5 + style.shadow * 0.5);
    ctx.shadowOffsetY = px * 0.05 * style.shadow;
  };

  // 3. Outline (carries the shadow), then fill on top without it.
  if (style.outline > 0) {
    ctx.save();
    applyShadow();
    ctx.strokeStyle = style.outlineColor;
    ctx.lineWidth = Math.max(0.5, style.outline * px * 2);
    placed.forEach(({ run, x, baseline }) => drawRun(ctx, run, x, baseline, "stroke"));
    ctx.restore();
    placed.forEach(({ run, x, baseline }) => { ctx.fillStyle = fillColor(run); drawRun(ctx, run, x, baseline, "fill"); });
  } else {
    ctx.save();
    applyShadow();
    placed.forEach(({ run, x, baseline }) => { ctx.fillStyle = fillColor(run); drawRun(ctx, run, x, baseline, "fill"); });
    ctx.restore();
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/** Letterbox bar height in pixels for a cinema ratio, or 0 when the frame is already that wide. */
export function matteBar(width: number, height: number, ratio: number): number {
  if (ratio <= 0 || width / height >= ratio) return 0;
  return (height - width / ratio) / 2;
}

/** Draw the whole title document: scrim, cinema matte, then layers in order. Returns layouts for hit testing. */
export function drawTitles(ctx: CanvasRenderingContext2D, document: TitleDocument, width: number, height: number): LayerLayout[] {
  const measure: Measure = (text, font) => { ctx.font = font; return ctx.measureText(text).width; };
  const visible = document.layers.filter((layer) => layer.enabled && layer.text.trim());

  if (document.scrim > 0) {
    const lead = visible.find((layer) => layer.kind === "title") ?? visible[0];
    const color = lead ? findLook(lead.look, lead.kind).scrimColor : "#000000";
    const gradient = ctx.createLinearGradient(0, height, 0, height * 0.45);
    gradient.addColorStop(0, withAlpha(color, Math.min(0.92, document.scrim * 0.9)));
    gradient.addColorStop(0.55, withAlpha(color, document.scrim * 0.35));
    gradient.addColorStop(1, withAlpha(color, 0));
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height * 0.45, width, height * 0.55);
    ctx.restore();
  }

  const bar = matteBar(width, height, document.matte.ratio);
  if (bar > 0) {
    ctx.save();
    ctx.fillStyle = withAlpha(document.matte.color, document.matte.opacity);
    ctx.fillRect(0, 0, width, bar);
    ctx.fillRect(0, height - bar, width, bar);
    ctx.restore();
  }

  return visible.map((layer) => {
    const layout = layoutLayer(layer, width, height, measure);
    drawLayer(ctx, layer, layout);
    return layout;
  });
}

/** Layout without drawing, for hit testing and on-photo handles. */
export function layoutTitles(document: TitleDocument, width: number, height: number, measure: Measure): LayerLayout[] {
  return document.layers.filter((layer) => layer.enabled && layer.text.trim()).map((layer) => layoutLayer(layer, width, height, measure));
}

/** Font faces a document needs, as CSS font shorthands for `document.fonts.load`. */
export function requiredFonts(document: TitleDocument): string[] {
  const fonts = new Set<string>();
  for (const layer of document.layers) {
    if (!layer.enabled) continue;
    const style = resolveStyle(layer);
    fonts.add(fontString(style, 32));
  }
  return [...fonts];
}
