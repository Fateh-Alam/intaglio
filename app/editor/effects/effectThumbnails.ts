/**
 * Thumbnails of Creative Effects on the person's own photo.
 *
 * Each thumbnail is a small render by the same graph the editor and export use,
 * so it shows what the effect will actually do. Renders run one at a time and
 * yield between them so scrolling the library stays smooth.
 */
import * as THREE from "three";
import type { EditorSettings } from "../../types/editor";
import type { GradeGraph } from "../../types/document";
import type { CreativeEffect } from "./settings";
import { IntaglioRenderer } from "../render/IntaglioRenderer";
import { createLinearSourceTexture, loadImageTexture, type LinearSourceBuffer } from "../render/sourceTexture";
import { cropWithRatio } from "../../lib/cropGeometry";

/** Square render size in device pixels. */
const THUMB_EDGE = 192;
// Keep the thumbnail context from uploading a second full-resolution photo.
const THUMB_SOURCE_EDGE = 1024;

type Job = { layers: () => CreativeEffect[]; resolve: (url: string | null) => void };

export class EffectThumbnailRenderer {
  private readonly cache = new Map<string, Promise<string | null>>();
  private readonly queue: Job[] = [];
  private running = false;
  private disposed = false;
  private renderer: THREE.WebGLRenderer | null = null;
  private graph: IntaglioRenderer | null = null;
  private texture: Promise<THREE.Texture> | null = null;
  private readonly canvas = document.createElement("canvas");

  constructor(
    private readonly imageSrc: string,
    private readonly rawSource: LinearSourceBuffer | null,
    /** The photo's edit without any Creative Effects; each thumbnail adds its own. */
    private readonly base: EditorSettings,
    private readonly gradeGraph: GradeGraph | undefined,
  ) {}

  /** A data URL of `layers` on this photo, or null if rendering failed. Cached per key. */
  get(key: string, layers: () => CreativeEffect[]): Promise<string | null> {
    if (this.disposed) return Promise.resolve(null);
    const existing = this.cache.get(key);
    if (existing) return existing;
    const promise = new Promise<string | null>((resolve) => {
      this.queue.push({ layers, resolve });
      void this.pump();
    });
    this.cache.set(key, promise);
    return promise;
  }

  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length && !this.disposed) {
        const job = this.queue.shift()!;
        job.resolve(await this.render(job.layers).catch(() => null));
        // Yield so input and scrolling stay responsive between renders.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } finally {
      this.running = false;
    }
  }

  private async render(layers: () => CreativeEffect[]): Promise<string | null> {
    if (this.disposed) return null;
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.setSize(THUMB_EDGE, THUMB_EDGE, false);
      this.graph = new IntaglioRenderer();
    }
    this.texture ??= this.loadTexture();
    const texture = await this.texture;
    if (this.disposed) return null;
    const image = texture.image as { width: number; height: number };
    // Crop the photo before running the effects so frames and other edge treatments
    // extend to the edges of the tile.
    const crop = cropWithRatio(this.base.crop, image.height / image.width);
    this.graph!.render({
      renderer: this.renderer,
      sourceTexture: texture,
      settings: { ...this.base, crop, creativeEffects: layers() },
      gradeGraph: this.gradeGraph,
      target: null,
      width: THUMB_EDGE,
      height: THUMB_EDGE,
    });
    return this.canvas.toDataURL("image/jpeg", 0.82);
  }

  private async loadTexture(): Promise<THREE.Texture> {
    if (this.rawSource) return createLinearSourceTexture(this.rawSource, THUMB_SOURCE_EDGE);
    const texture = await loadImageTexture(this.imageSrc);
    if (this.disposed) return texture;
    const image = texture.image as HTMLImageElement;
    const scale = THUMB_SOURCE_EDGE / Math.max(image.width, image.height);
    if (scale < 1) {
      const proxy = document.createElement("canvas");
      proxy.width = Math.max(1, Math.round(image.width * scale));
      proxy.height = Math.max(1, Math.round(image.height * scale));
      const context = proxy.getContext("2d");
      if (context) {
        context.drawImage(image, 0, 0, proxy.width, proxy.height);
        texture.image = proxy;
      }
    }
    return texture;
  }

  dispose(): void {
    this.disposed = true;
    this.queue.splice(0).forEach((job) => job.resolve(null));
    this.graph?.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    void this.texture?.then((texture) => texture.dispose()).catch(() => undefined);
  }
}
