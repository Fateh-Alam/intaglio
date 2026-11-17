import type { PhotoCrop } from "../types/editor";

export const FULL_CROP: PhotoCrop = { x: 0, y: 0, width: 1, height: 1 };
export const MIN_CROP = 0.01;

export type CropPoint = { x: number; y: number };
export type CropHandle = "move" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeCrop(value: unknown): PhotoCrop {
  if (!value || typeof value !== "object") return FULL_CROP;
  const { x, y, width, height } = value as Partial<PhotoCrop>;
  if (typeof x !== "number" || typeof y !== "number" || typeof width !== "number" || typeof height !== "number"
      || ![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return FULL_CROP;
  const minimum = 1e-6;
  const left = clamp(x, 0, 1 - minimum);
  const top = clamp(y, 0, 1 - minimum);
  return { x: left, y: top, width: clamp(width, minimum, 1 - left), height: clamp(height, minimum, 1 - top) };
}

export const isFullCrop = (crop: PhotoCrop) => crop.width === 1 && crop.height === 1;

export function sameCrop(a: PhotoCrop, b: PhotoCrop): boolean {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.width - b.width), Math.abs(a.height - b.height)) < 1e-7;
}

export function cropSize(width: number, height: number, crop: PhotoCrop, scale = 1) {
  return {
    width: Math.max(1, Math.round(width * crop.width * scale)),
    height: Math.max(1, Math.round(height * crop.height * scale)),
  };
}

export function fitPhoto(width: number, height: number, aspect: number) {
  const w = Math.min(width, height * aspect);
  return { width: w, height: w / aspect };
}

export const cropCenter = ({ x, y, width, height }: PhotoCrop): CropPoint => ({ x: x + width / 2, y: y + height / 2 });

export function cropWithRatio(crop: PhotoCrop, ratio: number): PhotoCrop {
  const center = cropCenter(crop);
  const width = Math.min(crop.width, crop.height * ratio);
  const height = width / ratio;
  return { x: center.x - width / 2, y: center.y - height / 2, width, height };
}

export function rotatePhotoPoint(point: CropPoint, angle: number, aspect: number): CropPoint {
  const radians = angle * Math.PI / 180;
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  const x = (point.x - 0.5) * aspect;
  const y = point.y - 0.5;
  return { x: 0.5 + (x * c - y * s) / aspect, y: 0.5 + x * s + y * c };
}

/** Preserve the frame ratio while fitting its corners inside the rotated photo. */
export function constrainStraightenedCrop(crop: PhotoCrop, angle: number, aspect: number, zoom: number): PhotoCrop {
  if (angle === 0 && zoom >= 1) return crop;
  const radians = angle * Math.PI / 180;
  const c = Math.abs(Math.cos(radians));
  const s = Math.abs(Math.sin(radians));
  const extentX = (c * crop.width + s * crop.height / aspect) / 2;
  const extentY = (s * crop.width * aspect + c * crop.height) / 2;
  const safeRadius = Math.max(0.01, zoom) / 2;
  const scale = Math.min(1, safeRadius / extentX, safeRadius / extentY);
  const center = cropCenter(crop);
  const rotatedCenter = rotatePhotoPoint(center, -angle, aspect);
  const xTravel = Math.max(0, safeRadius - extentX * scale);
  const yTravel = Math.max(0, safeRadius - extentY * scale);
  const travel = Math.min(
    1,
    xTravel / (Math.abs(rotatedCenter.x - 0.5) || Number.EPSILON),
    yTravel / (Math.abs(rotatedCenter.y - 0.5) || Number.EPSILON),
  );
  const width = crop.width * scale;
  const height = crop.height * scale;
  return {
    x: 0.5 + (center.x - 0.5) * travel - width / 2,
    y: 0.5 + (center.y - 0.5) * travel - height / 2,
    width,
    height,
  };
}

export function dragCrop(crop: PhotoCrop, handle: CropHandle, delta: CropPoint, ratio: number | null): PhotoCrop {
  if (handle === "move") return {
    ...crop, x: clamp(crop.x + delta.x, 0, 1 - crop.width), y: clamp(crop.y + delta.y, 0, 1 - crop.height),
  };

  const horizontal = handle.includes("w") ? -1 : handle.includes("e") ? 1 : 0;
  const vertical = handle.includes("n") ? -1 : handle.includes("s") ? 1 : 0;
  const center = cropCenter(crop);
  const anchorX = horizontal === 0 ? center.x : horizontal === 1 ? crop.x : crop.x + crop.width;
  const anchorY = vertical === 0 ? center.y : vertical === 1 ? crop.y : crop.y + crop.height;
  const maxWidth = horizontal === 0 ? 2 * Math.min(anchorX, 1 - anchorX) : horizontal === 1 ? 1 - anchorX : anchorX;
  const maxHeight = vertical === 0 ? 2 * Math.min(anchorY, 1 - anchorY) : vertical === 1 ? 1 - anchorY : anchorY;
  let width = clamp(crop.width + delta.x * horizontal, MIN_CROP, maxWidth);
  let height = clamp(crop.height + delta.y * vertical, MIN_CROP, maxHeight);
  if (ratio) {
    const drivenByHeight = horizontal === 0 || (vertical !== 0 && Math.abs(delta.y * ratio) > Math.abs(delta.x));
    const maximum = Math.min(maxWidth, maxHeight * ratio);
    width = clamp(drivenByHeight ? height * ratio : width, Math.min(maximum, Math.max(MIN_CROP, MIN_CROP * ratio)), maximum);
    height = width / ratio;
  }
  return {
    x: anchorX - width * (1 - horizontal) / 2,
    y: anchorY - height * (1 - vertical) / 2,
    width,
    height,
  };
}

export function horizonCorrection(dx: number, dy: number) {
  const degrees = Math.atan2(dy, dx) * 180 / Math.PI;
  return degrees - Math.round(degrees / 90) * 90;
}
