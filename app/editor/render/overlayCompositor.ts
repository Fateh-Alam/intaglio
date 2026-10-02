import type { TextOverlaySettings } from "../../components/CinematicTextOverlay";
import type { WatermarkSettings } from "../../types/editor";

export interface OverlayRenderInput {
  text: TextOverlaySettings;
  watermark: WatermarkSettings;
}

const overlayLayerCache = new Map<string, HTMLCanvasElement>();
const MAX_OVERLAY_CACHE_ENTRIES = 24;

const anchor = (position: WatermarkSettings["position"], width: number, height: number): { x: number; y: number; align: CanvasTextAlign; baseline: CanvasTextBaseline } => {
  const insetX = width * 0.04;
  const insetY = height * 0.04;
  switch (position) {
    case "top-left": return { x: insetX, y: insetY, align: "left", baseline: "top" };
    case "top-right": return { x: width - insetX, y: insetY, align: "right", baseline: "top" };
    case "bottom-left": return { x: insetX, y: height - insetY, align: "left", baseline: "bottom" };
    case "bottom-right": return { x: width - insetX, y: height - insetY, align: "right", baseline: "bottom" };
    default: return { x: width / 2, y: height / 2, align: "center", baseline: "middle" };
  }
};

function transformedText(text: string, transform: TextOverlaySettings["customTextTransform"]): string {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  if (transform === "capitalize") return text.replace(/\b\p{L}/gu, (character) => character.toUpperCase());
  return text;
}

function drawBlock(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, settings: TextOverlaySettings, meta = false): void {
  if (!value.trim()) return;
  ctx.save();
  ctx.globalAlpha = settings.opacity;
  ctx.fillStyle = meta ? "rgba(255,255,255,0.78)" : "#ffffff";
  ctx.textAlign = settings.textAlign === "justify" ? "left" : settings.textAlign;
  ctx.textBaseline = "middle";
  ctx.shadowColor = settings.shadowColor;
  ctx.shadowBlur = settings.shadowBlur;
  ctx.shadowOffsetY = settings.shadowDistance;
  const family = settings.customFontEnabled && settings.customFontName.trim() ? `"${settings.customFontName.trim()}"` : meta ? "Inter" : "Bebas Neue";
  const style = settings.customFontEnabled ? settings.customFontStyle : "normal";
  const weight = settings.customFontEnabled ? settings.customFontWeight : meta ? "500" : "400";
  ctx.font = `${style} ${weight} ${Math.max(8, size)}px ${family}, sans-serif`;
  const lines = transformedText(value, settings.customTextTransform).split("\n");
  const lineHeight = size * settings.lineHeight;
  lines.forEach((line, index) => ctx.fillText(line, x, y + (index - (lines.length - 1) / 2) * lineHeight));
  ctx.restore();
}

export async function ensureOverlayFonts(input: OverlayRenderInput): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const families = new Set(["Inter", "Bebas Neue"]);
  if (input.text.customFontEnabled && input.text.customFontName.trim()) families.add(input.text.customFontName.trim());
  await Promise.all(Array.from(families, (family) => document.fonts.load(`16px "${family}"`).catch(() => [])));
}

function drawOverlaysDirect(ctx: CanvasRenderingContext2D, width: number, height: number, input: OverlayRenderInput): void {
  const scale = Math.min(width, height);
  const text = input.text;
  if (text.dateEnabled) drawBlock(ctx, [text.dateText, text.locationText].filter(Boolean).join(" · "), width * 0.5 + text.dateX / 100 * width, height * 0.2 + text.dateY / 100 * height, scale * text.fontSize * 0.022, text, true);
  if (text.subtitleEnabled) drawBlock(ctx, text.subtitleText, width * 0.5 + text.subtitleX / 100 * width, height * (1 - text.subtitleY / 100), scale * text.fontSize * 0.055, text);
  if (text.billingBlockEnabled) drawBlock(ctx, text.billingBlockText, width * 0.5 + text.billingX / 100 * width, height * (1 - text.billingY / 100), scale * text.fontSize * 0.018, text, true);

  const watermark = input.watermark;
  if (watermark.enabled && watermark.text.trim()) {
    const point = anchor(watermark.position, width, height);
    ctx.save();
    ctx.globalAlpha = watermark.opacity;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = point.align;
    ctx.textBaseline = point.baseline;
    ctx.shadowColor = "rgba(0,0,0,0.92)";
    ctx.shadowBlur = scale * 0.018;
    ctx.font = `600 ${Math.round(scale * (0.018 + watermark.size * 0.045))}px Inter, sans-serif`;
    ctx.fillText(watermark.text, point.x, point.y);
    ctx.restore();
  }
}

/** Draw a context-independent cached overlay layer to keep glyph edges identical across outputs. */
export function renderOverlays(ctx: CanvasRenderingContext2D, width: number, height: number, input: OverlayRenderInput): void {
  const key = `${width}x${height}:${JSON.stringify(input)}`;
  let layer = overlayLayerCache.get(key);
  if (!layer) {
    layer = document.createElement("canvas");
    layer.width = width;
    layer.height = height;
    const layerContext = layer.getContext("2d");
    if (!layerContext) throw new Error("Overlay layer compositor initialization failed.");
    drawOverlaysDirect(layerContext, width, height, input);
    overlayLayerCache.set(key, layer);
    if (overlayLayerCache.size > MAX_OVERLAY_CACHE_ENTRIES) {
      const oldest = overlayLayerCache.keys().next().value;
      if (oldest) overlayLayerCache.delete(oldest);
    }
  }
  ctx.drawImage(layer, 0, 0, width, height);
}
