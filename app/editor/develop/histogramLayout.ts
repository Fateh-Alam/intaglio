export interface HistogramPosition {
  x: number;
  y: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export const FLOATING_HISTOGRAM_WIDTH = 296;
export const FLOATING_HISTOGRAM_FALLBACK_HEIGHT = 172;
export const HISTOGRAM_MARGIN = 12;
export const TOP_BAR_HEIGHT = 48;
export const RIGHT_PANEL_WIDTH = 328;
export const DESKTOP_BREAKPOINT = 768;

export function isHistogramPosition(value: unknown): value is HistogramPosition | null {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.x === "number" &&
    Number.isFinite(candidate.x) &&
    typeof candidate.y === "number" &&
    Number.isFinite(candidate.y)
  );
}

/** Keeps the floating histogram wholly inside the visible workspace area. */
export function clampHistogramPosition(
  position: HistogramPosition,
  viewport: ViewportSize,
  panelSize: ViewportSize,
  topInset = TOP_BAR_HEIGHT,
): HistogramPosition {
  const minX = HISTOGRAM_MARGIN;
  const maxX = Math.max(minX, viewport.width - panelSize.width - HISTOGRAM_MARGIN);
  const minY = topInset + HISTOGRAM_MARGIN;
  const maxY = Math.max(minY, viewport.height - panelSize.height - HISTOGRAM_MARGIN);
  return {
    x: Math.round(Math.min(maxX, Math.max(minX, position.x))),
    y: Math.round(Math.min(maxY, Math.max(minY, position.y))),
  };
}

/** Initial anchor when detached: sits cleanly beside the right Edit panel on desktop, or top-right on narrow screens. */
export function defaultHistogramPosition(
  viewport: ViewportSize,
  panelSize: ViewportSize,
  topInset = TOP_BAR_HEIGHT,
): HistogramPosition {
  const rightInset = viewport.width >= DESKTOP_BREAKPOINT ? RIGHT_PANEL_WIDTH + 16 : HISTOGRAM_MARGIN;
  return clampHistogramPosition(
    {
      x: viewport.width - rightInset - panelSize.width,
      y: topInset + 16,
    },
    viewport,
    panelSize,
    topInset,
  );
}

/** Formats camera EXIF metadata or image pixel dimensions beneath the histogram. */
export function formatHistogramCaption(
  metadata: Record<string, string | number | null>,
  size: { width: number; height: number } | null,
): string {
  const parts: string[] = [];
  if (typeof metadata.iso === "number") parts.push(`ISO ${metadata.iso}`);
  if (typeof metadata.focalLengthMm === "number") parts.push(`${Math.round(metadata.focalLengthMm)} mm`);
  if (typeof metadata.aperture === "number") parts.push(`ƒ/${metadata.aperture.toFixed(1).replace(/\.0$/, "")}`);
  if (typeof metadata.shutterSeconds === "number" && metadata.shutterSeconds > 0) {
    const seconds = metadata.shutterSeconds;
    parts.push(seconds >= 1 ? `${seconds.toFixed(1).replace(/\.0$/, "")} s` : `1/${Math.round(1 / seconds)} s`);
  }
  if (parts.length > 0) return parts.join("  ·  ");
  return size ? `${size.width} × ${size.height}` : "";
}
