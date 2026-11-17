import type { LinearMaskParams, MaskLayer, RadialMaskParams } from "../types/editor";

/**
 * Canonical mask geometry shared by the shader uniforms and the on-canvas
 * handles. Coordinates are image space with a top-left origin; x is scaled by
 * the image aspect so circles stay circles on any photo.
 */
export interface RadialGeometry {
  cx: number;
  cy: number;
  /** Half-width / half-height in units of image height. */
  rx: number;
  ry: number;
  /** Radians. */
  angle: number;
  /** 0…1 fraction of the radius that fades. */
  feather: number;
  invert: boolean;
}

export interface LinearGeometry {
  start: { x: number; y: number };
  end: { x: number; y: number };
  invert: boolean;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function radialGeometry(params: RadialMaskParams, aspect: number): RadialGeometry {
  if (params.radiusX !== undefined && params.radiusY !== undefined) {
    return {
      cx: params.center.x,
      cy: params.center.y,
      rx: Math.max(1e-4, params.radiusX),
      ry: Math.max(1e-4, params.radiusY),
      angle: ((params.angle ?? 0) * Math.PI) / 180,
      feather: clamp01(params.feather),
      invert: params.invert,
    };
  }
  // Legacy: radius in normalized UV (stretched with the image), absolute feather, y-up center.
  const radius = Math.max(1e-4, params.radius);
  return {
    cx: params.center.x,
    cy: 1 - params.center.y,
    rx: radius * aspect,
    ry: radius,
    angle: 0,
    feather: clamp01(params.feather / radius),
    invert: params.invert,
  };
}

export function linearGeometry(params: LinearMaskParams, aspect: number): LinearGeometry {
  if (params.start && params.end) return { start: params.start, end: params.end, invert: params.invert };
  // Legacy: mask = smoothstep(pos − f, pos + f, projection onto an angle in y-up UV).
  const angle = params.angle * Math.PI * 2;
  const x = Math.cos(angle);
  const y = -Math.sin(angle);
  // Preserve the legacy UV projection using the new aspect-correct metric.
  const stretch = Math.max(1e-4, aspect) ** 2;
  const length = x * x / stretch + y * y;
  const dir = { x: x / stretch / length, y: y / length };
  const full = params.position + params.feather - 0.5;
  const none = params.position - params.feather - 0.5;
  return {
    start: { x: 0.5 + dir.x * full, y: 0.5 + dir.y * full },
    end: { x: 0.5 + dir.x * none, y: 0.5 + dir.y * none },
    invert: params.invert,
  };
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1e-6));
  return t * t * (3 - 2 * t);
};

/** Reference implementations of the shader math (used by tests and handles). */
export function radialMaskValue(geometry: RadialGeometry, x: number, y: number, aspect: number): number {
  const dx = (x - geometry.cx) * aspect;
  const dy = y - geometry.cy;
  const c = Math.cos(-geometry.angle);
  const s = Math.sin(-geometry.angle);
  const rx = dx * c - dy * s;
  const ry = dx * s + dy * c;
  const distance = Math.hypot(rx / geometry.rx, ry / geometry.ry);
  const value = 1 - smoothstep(1 - geometry.feather, 1, distance);
  return geometry.invert ? 1 - value : value;
}

export function linearMaskValue(geometry: LinearGeometry, x: number, y: number, aspect: number): number {
  const ex = (geometry.end.x - geometry.start.x) * aspect;
  const ey = geometry.end.y - geometry.start.y;
  const length2 = ex * ex + ey * ey || 1e-6;
  const t = (((x - geometry.start.x) * aspect) * ex + (y - geometry.start.y) * ey) / length2;
  const value = 1 - smoothstep(0, 1, t);
  return geometry.invert ? 1 - value : value;
}

let counter = 0;
const nextId = () => `mask-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export type MaskKind = MaskLayer["type"];

export const MAX_MASK_PARTS = 32;
export const MAX_BRUSH_PARTS = 4;

export type MaskColorSampler = (x: number, y: number) => Promise<[number, number, number] | null>;

export const MASK_KIND_LABEL: Record<MaskKind, string> = {
  brush: "Brush",
  linear: "Linear gradient",
  radial: "Radial gradient",
  luminosity: "Luminance range",
  colorRange: "Color range",
};

/** New mask components with v2 geometry centred on the photo. */
export function createMaskComponent(kind: MaskKind, mode: MaskLayer["blendMode"] = "ADD"): MaskLayer {
  const base = { id: nextId(), name: MASK_KIND_LABEL[kind], blendMode: mode, opacity: 1 };
  switch (kind) {
    case "radial":
      return { ...base, type: "radial", params: { center: { x: 0.5, y: 0.5 }, radius: 0.3, radiusX: 0.3, radiusY: 0.3, angle: 0, feather: 0.5, invert: false } };
    case "linear":
      return { ...base, type: "linear", params: { angle: 0, position: 0.5, feather: 0.2, invert: false, start: { x: 0.5, y: 0.2 }, end: { x: 0.5, y: 0.55 } } };
    case "luminosity":
      return { ...base, type: "luminosity", params: { colorSpace: "oklab", target: 0.75, range: 0.2, feather: 0.12 } };
    case "colorRange":
      return { ...base, type: "colorRange", params: { colorSpace: "oklch", targetHue: 0.68, hueWidth: 0.08, targetChroma: 0, chromaRange: 0.1 } };
    case "brush":
      return { ...base, type: "brush", params: { strokes: [] } };
  }
}
