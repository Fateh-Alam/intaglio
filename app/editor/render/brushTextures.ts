import * as THREE from "three";
import type { BrushMaskLayer, BrushStroke, MaskLayer } from "../../types/editor";
import { paintStroke } from "../../lib/brushMaskRaster";

const LONG_EDGE = 1536;
const liveStrokes = new Map<string, BrushStroke>();
const listeners = new Set<() => void>();

/** Publishes the in-progress stroke or clears it after the gesture ends. */
export function setLiveBrushStroke(maskId: string, stroke: BrushStroke | null) {
  if (stroke) liveStrokes.set(maskId, stroke);
  else if (!liveStrokes.delete(maskId)) return;
  listeners.forEach((listener) => listener());
}

export function getLiveBrushStroke(maskId: string): BrushStroke | undefined {
  return liveStrokes.get(maskId);
}

export function onBrushTexturesChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

interface Entry {
  context: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  strokes: readonly BrushStroke[];
  live: BrushStroke | undefined;
  livePointCount: number;
}

function create(width: number, height: number): Entry {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The browser could not allocate a brush-mask surface.");
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return { context, texture, strokes: [], live: undefined, livePointCount: 0 };
}

/** Each render graph owns its textures. Only the preview can see a live stroke. */
export class BrushTextureCache {
  private entries = new Map<string, Entry>();

  get(mask: BrushMaskLayer, aspect: number, includeLive: boolean): THREE.Texture {
    const width = aspect >= 1 ? LONG_EDGE : Math.max(1, Math.round(LONG_EDGE * aspect));
    const height = aspect >= 1 ? Math.max(1, Math.round(LONG_EDGE / aspect)) : LONG_EDGE;
    let entry = this.entries.get(mask.id);
    if (!entry || entry.context.canvas.width !== width || entry.context.canvas.height !== height) {
      entry?.texture.dispose();
      entry = create(width, height);
      this.entries.set(mask.id, entry);
    }

    const strokes = mask.params.strokes;
    const live = includeLive ? liveStrokes.get(mask.id) : undefined;
    if (entry.strokes === strokes && entry.live === live && entry.livePointCount === (live?.points.length ?? 0)) return entry.texture;

    const appendOnly = entry.strokes.every((stroke, i) => strokes[i] === stroke);
    const committedLive = entry.live && strokes[entry.strokes.length] === entry.live;
    const continuingLive = entry.live === live && entry.strokes.length === strokes.length;
    if (!appendOnly || (entry.live && !committedLive && !continuingLive)) {
      entry.context.clearRect(0, 0, width, height);
      entry.strokes = [];
      entry.live = undefined;
      entry.livePointCount = 0;
    }

    for (let i = entry.strokes.length; i < strokes.length; i += 1) {
      const stroke = strokes[i];
      paintStroke(entry.context, stroke, width, height, stroke === entry.live ? entry.livePointCount : 0);
    }

    if (live) paintStroke(entry.context, live, width, height, live === entry.live ? entry.livePointCount : 0);
    entry.strokes = strokes;
    entry.live = live;
    entry.livePointCount = live?.points.length ?? 0;
    entry.texture.needsUpdate = true;
    return entry.texture;
  }

  retain(masks: readonly MaskLayer[]) {
    const ids = new Set(masks.filter((mask) => mask.type === "brush").map((mask) => mask.id));
    for (const [id, entry] of this.entries) {
      if (ids.has(id)) continue;
      entry.texture.dispose();
      this.entries.delete(id);
    }
  }

  dispose() {
    for (const entry of this.entries.values()) entry.texture.dispose();
    this.entries.clear();
  }
}
