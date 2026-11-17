/**
 * Loupe geometry. One image pixel per device pixel is 100%, as in Lightroom.
 *
 * Coordinates:
 * - "image" space is the cropped output, normalized 0…1 with a top-left origin.
 * - "view" space is CSS pixels inside the photo viewport.
 */

/** Device pixels per image pixel for the zoom menu and keyboard steps. */
export const ZOOM_STOPS = [0.25, 0.5, 1, 2, 4, 8] as const;
export const MAX_SCALE = 16;
/** Above this, the display draws a pixel grid. */
export const PIXEL_GRID_SCALE = 4;

/** `scale` is device pixels per image pixel; null means Fit. */
export interface LoupeState {
  scale: number | null;
  /** Image-space point at the viewport center. */
  cx: number;
  cy: number;
}

export const FIT_LOUPE: LoupeState = { scale: null, cx: 0.5, cy: 0.5 };

export interface Size { width: number; height: number }

/** Device pixels per image pixel when the photo is fitted. */
export function fitScale(fitCss: Size, output: Size, dpr: number): number {
  return output.width > 0 ? (fitCss.width * dpr) / output.width : 1;
}

/** Magnification relative to Fit; never below Fit. */
export function magnification(state: LoupeState, fit: number): number {
  return state.scale === null ? 1 : Math.max(1, state.scale / fit);
}

const clampAxis = (center: number, photo: number, view: number) =>
  photo <= view ? 0.5 : Math.min(1 - view / (2 * photo), Math.max(view / (2 * photo), center));

/** Keep the photo covering the viewport on any axis where it is larger. */
export function clampCenter(cx: number, cy: number, photo: Size, view: Size): { cx: number; cy: number } {
  return { cx: clampAxis(cx, photo.width, view.width), cy: clampAxis(cy, photo.height, view.height) };
}

export interface LoupeLayout {
  /** Zoomed photo rectangle in view space. */
  photo: { left: number; top: number; width: number; height: number };
  /** Visible part of the photo in view space. */
  visible: { left: number; top: number; width: number; height: number };
  /** Visible part of the photo in image space. */
  window: { x0: number; y0: number; x1: number; y1: number };
  cx: number;
  cy: number;
  /** CSS translation for DOM overlays scaled about the viewport center. */
  pan: { x: number; y: number };
}

export function loupeLayout(view: Size, fitCss: Size, zoom: number, cx: number, cy: number): LoupeLayout {
  const photoSize = { width: fitCss.width * zoom, height: fitCss.height * zoom };
  const center = clampCenter(cx, cy, photoSize, view);
  const left = view.width / 2 - center.cx * photoSize.width;
  const top = view.height / 2 - center.cy * photoSize.height;
  const vl = Math.max(0, left);
  const vt = Math.max(0, top);
  const vr = Math.min(view.width, left + photoSize.width);
  const vb = Math.min(view.height, top + photoSize.height);
  return {
    photo: { left, top, ...photoSize },
    visible: { left: vl, top: vt, width: Math.max(0, vr - vl), height: Math.max(0, vb - vt) },
    window: {
      x0: (vl - left) / photoSize.width, y0: (vt - top) / photoSize.height,
      x1: (vr - left) / photoSize.width, y1: (vb - top) / photoSize.height,
    },
    cx: center.cx,
    cy: center.cy,
    pan: { x: (0.5 - center.cx) * photoSize.width, y: (0.5 - center.cy) * photoSize.height },
  };
}

/** Next zoom stop above (+1) or below (−1) the current scale; null is Fit. */
export function stepScale(current: number, fit: number, direction: 1 | -1): number | null {
  if (direction > 0) {
    const next = ZOOM_STOPS.find((stop) => stop > current * 1.001 && stop > fit * 1.001);
    return next ?? Math.min(MAX_SCALE, current * 2);
  }
  const lower = [...ZOOM_STOPS].reverse().find((stop) => stop < current * 0.999);
  return lower === undefined || lower <= fit * 1.001 ? null : lower;
}

export function formatScale(scale: number | null): string {
  if (scale === null) return "Fit";
  const percent = scale * 100;
  return `${percent >= 10 ? Math.round(percent) : Number(percent.toFixed(1))}%`;
}

export type LoupeRenderPlan =
  | {
    mode: "tile";
    width: number;
    height: number;
    tile: { fullWidth: number; fullHeight: number; offsetX: number; offsetY: number; width: number; height: number };
    /** Image-space region held by the render target. */
    window: { x0: number; y0: number; x1: number; y1: number };
    /** Render pixels per image pixel. */
    resolution: number;
  }
  | { mode: "full"; width: number; height: number; window: { x0: number; y0: number; x1: number; y1: number }; resolution: number };

/** Margin in render pixels so blur, bloom and sharpening are seamless at the viewport edge. */
const TILE_MARGIN = 64;

/**
 * Plan the render behind the loupe. Pixel-local and neighborhood stages render
 * only the visible tile at device resolution, capped at one image pixel.
 * Creative Effects can read anywhere in the frame, so they render the whole
 * frame at the needed resolution instead of a tile.
 */
export function planLoupeRender(layout: LoupeLayout, output: Size, dpr: number, creative: boolean, maxSize: number): LoupeRenderPlan {
  const { window } = layout;
  const neededResolution = Math.min(1, (layout.visible.width * dpr) / Math.max(1e-6, (window.x1 - window.x0) * output.width));
  if (creative) {
    // Quantize so a wheel zoom does not reallocate the frame on every tick.
    const stepped = Math.min(1, 2 ** Math.ceil(Math.log2(Math.max(neededResolution, 1e-3))));
    const resolution = Math.min(stepped, maxSize / Math.max(output.width, output.height));
    return {
      mode: "full",
      width: Math.max(1, Math.round(output.width * resolution)),
      height: Math.max(1, Math.round(output.height * resolution)),
      window: { x0: 0, y0: 0, x1: 1, y1: 1 },
      resolution,
    };
  }
  const resolution = neededResolution;
  const fullWidth = Math.max(1, Math.round(output.width * resolution));
  const fullHeight = Math.max(1, Math.round(output.height * resolution));
  const left = Math.max(0, Math.floor(window.x0 * fullWidth) - TILE_MARGIN);
  const top = Math.max(0, Math.floor(window.y0 * fullHeight) - TILE_MARGIN);
  const right = Math.min(fullWidth, Math.ceil(window.x1 * fullWidth) + TILE_MARGIN);
  const bottom = Math.min(fullHeight, Math.ceil(window.y1 * fullHeight) + TILE_MARGIN);
  const width = Math.max(1, Math.min(maxSize, right - left));
  const height = Math.max(1, Math.min(maxSize, bottom - top));
  return {
    mode: "tile",
    width,
    height,
    tile: { fullWidth, fullHeight, offsetX: left, offsetY: top, width, height },
    window: { x0: left / fullWidth, y0: top / fullHeight, x1: (left + width) / fullWidth, y1: (top + height) / fullHeight },
    resolution,
  };
}
