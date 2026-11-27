import type { TextOverlaySettings } from "../../components/CinematicTextOverlay";
import type { WatermarkSettings } from "../../types/editor";
import { drawTitles, requiredFonts } from "../text/titleEngine";
import { resolveTitles } from "../text/titleModel";

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

export async function ensureOverlayFonts(input: OverlayRenderInput): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const fonts = new Set(["600 16px Inter", ...requiredFonts(resolveTitles(input.text))]);
  await Promise.all(Array.from(fonts, (font) => document.fonts.load(font).catch(() => [])));
}

function drawOverlaysDirect(ctx: CanvasRenderingContext2D, width: number, height: number, input: OverlayRenderInput): void {
  const scale = Math.min(width, height);
  drawTitles(ctx, resolveTitles(input.text), width, height);

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
