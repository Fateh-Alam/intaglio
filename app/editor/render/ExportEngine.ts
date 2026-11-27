import * as THREE from 'three';
import { IntaglioRenderer } from './IntaglioRenderer';
import { EditorSettings } from '../../types/editor';
import type { TextOverlaySettings } from '../../components/CinematicTextOverlay';
import type { WatermarkSettings } from '../../types/editor';
import { ensureOverlayFonts, renderOverlays } from './overlayCompositor';
import { encodeCanvasWasm } from './wasmCodecs';
import { hasCreativeEffects } from '../effects/settings';
import { cropSize } from '../../lib/cropGeometry';
import { glowPadding } from './glowLayout';
import { dimensionsFromRenderInput } from './RenderPass';

export interface ExportOptions {
  gradeGraph?: import("../../types/document").GradeGraph;
  format: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number; // 0 to 1
  scale?: number;   // multiplier relative to original image size
  width?: number;   // explicit target width
  height?: number;  // explicit target height
  /** Test/qualification hook; production defaults to the GPU texture limit. */
  maxTileSize?: number;
  signal?: AbortSignal;
  overlays?: { text: TextOverlaySettings; watermark: WatermarkSettings };
  tileInfo?: {
    fullWidth: number;
    fullHeight: number;
    offsetX: number;
    offsetY: number;
    tileWidth: number;
    tileHeight: number;
  };
}

export class ExportEngine {
  private renderer: THREE.WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor() {
    // Lazy initialize offscreen renderer when needed
  }

  private getRenderer(width: number, height: number): THREE.WebGLRenderer {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }
    this.canvas.width = width;
    this.canvas.height = height;

    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: false,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else {
      this.renderer.setSize(width, height, false);
    }

    return this.renderer;
  }

  /**
   * Render settings onto source image texture at full resolution and export as a Blob
   */
  public async exportImage(
    sourceTexture: THREE.Texture,
    settings: EditorSettings,
    options: ExportOptions
  ): Promise<Blob> {
    throwIfCancelled(options.signal);
    const img = sourceTexture.image as HTMLImageElement | undefined;
    const imgWidth = img?.width || 1920;
    const imgHeight = img?.height || 1080;

    const cropped = cropSize(imgWidth, imgHeight, settings.crop, options.scale || 1.0);
    const targetWidth = options.width || cropped.width;
    const targetHeight = options.height || cropped.height;

    const renderer = this.getRenderer(targetWidth, targetHeight);
    const hardwareLimit = renderer.capabilities.maxTextureSize || 4096;
    const creative = hasCreativeEffects(settings.creativeEffects);
    // Refraction, mirror effects and sorting can read anywhere in the frame.
    // Rendering those against independent tiles would introduce visible cuts.
    if (creative && (targetWidth > hardwareLimit || targetHeight > hardwareLimit)) {
      throw new Error(`Creative effects require a full-frame render. Choose an export with a longest edge of ${hardwareLimit}px or less.`);
    }
    const maxTextureSize = creative ? hardwareLimit : Math.min(hardwareLimit, options.maxTileSize ?? Number.POSITIVE_INFINITY);

    // Check if tiling is needed
    if (targetWidth > maxTextureSize || targetHeight > maxTextureSize) {
      return this.exportTiled(sourceTexture, settings, options, targetWidth, targetHeight, maxTextureSize);
    }

    const intaglioRenderer = new IntaglioRenderer();
    try {
      // The graph already encodes sRGB. Draw directly to the canvas to avoid
      // the implicit second transfer curve of a Three.js built-in material.
      intaglioRenderer.render({
        renderer,
        sourceTexture,
        settings,
        gradeGraph: options.gradeGraph,
        target: null,
        width: targetWidth,
        height: targetHeight,
        tile: options.tileInfo ? {
          fullWidth: options.tileInfo.fullWidth,
          fullHeight: options.tileInfo.fullHeight,
          offsetX: options.tileInfo.offsetX,
          offsetY: options.tileInfo.offsetY,
          width: options.tileInfo.tileWidth,
          height: options.tileInfo.tileHeight,
        } : undefined,
      });
    } finally {
      intaglioRenderer.dispose();
    }
    throwIfCancelled(options.signal);

    if (!this.canvas) throw new Error('Export canvas initialization failed');
    const renderCanvas = this.canvas;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetWidth;
    exportCanvas.height = targetHeight;
    const exportContext = exportCanvas.getContext('2d', { willReadFrequently: true });
    if (!exportContext) throw new Error('Output staging canvas initialization failed');
    exportContext.drawImage(renderCanvas, 0, 0, targetWidth, targetHeight);
    if (options.overlays) {
      await ensureOverlayFonts(options.overlays);
      throwIfCancelled(options.signal);
      renderOverlays(exportContext, targetWidth, targetHeight, options.overlays);
    }

    const quality = options.quality ?? 0.92;
    throwIfCancelled(options.signal);
    return encodeCanvasWasm(exportCanvas, options.format, quality);
  }

  /**
   * Tiled render for ultra-high-resolution exports exceeding MAX_TEXTURE_SIZE
   */
  private async exportTiled(
    sourceTexture: THREE.Texture,
    settings: EditorSettings,
    options: ExportOptions,
    totalWidth: number,
    totalHeight: number,
    maxSize: number
  ): Promise<Blob> {
    const stitchCanvas = document.createElement('canvas');
    stitchCanvas.width = totalWidth;
    stitchCanvas.height = totalHeight;
    const stitchCtx = stitchCanvas.getContext('2d')!;

    const baseline = Math.min(128, Math.max(32, Math.ceil(Math.max(totalWidth, totalHeight) * 0.002)));
    const source = dimensionsFromRenderInput(sourceTexture);
    const { width, height } = cropSize(source.width, source.height, settings.crop);
    const glow = glowPadding(settings, options.gradeGraph) * Math.max(totalWidth / width, totalHeight / height);
    const effectOverlap = Math.min(Math.max(0, Math.floor((maxSize - 4) / 8) * 4), Math.ceil(Math.max(baseline, glow) / 4) * 4);
    const coreSize = Math.max(1, Math.floor((maxSize - effectOverlap * 2) / 4) * 4);
    const tilesX = Math.ceil(totalWidth / coreSize);
    const tilesY = Math.ceil(totalHeight / coreSize);

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        throwIfCancelled(options.signal);
        const coreX = tx * coreSize;
        const coreY = ty * coreSize;
        const coreW = Math.min(coreSize, totalWidth - coreX);
        const coreH = Math.min(coreSize, totalHeight - coreY);
        const leftOverlap = Math.min(effectOverlap, coreX);
        const topOverlap = Math.min(effectOverlap, coreY);
        const rightOverlap = Math.min(effectOverlap, totalWidth - (coreX + coreW));
        const bottomOverlap = Math.min(effectOverlap, totalHeight - (coreY + coreH));
        const tileX = coreX - leftOverlap;
        const tileY = coreY - topOverlap;
        const tileW = coreW + leftOverlap + rightOverlap;
        const tileH = coreH + topOverlap + bottomOverlap;

        const tileOptions: ExportOptions = {
          ...options,
          format: 'image/png',
          quality: 1,
          overlays: undefined,
          scale: 1,
          width: tileW,
          height: tileH,
          tileInfo: {
            fullWidth: totalWidth,
            fullHeight: totalHeight,
            offsetX: tileX,
            offsetY: tileY,
            tileWidth: tileW,
            tileHeight: tileH
          }
        };

        const tileBlob = await this.exportImage(sourceTexture, settings, tileOptions);
        const tileImg = await loadImageFromBlob(tileBlob);
        throwIfCancelled(options.signal);
        stitchCtx.drawImage(tileImg, leftOverlap, topOverlap, coreW, coreH, coreX, coreY, coreW, coreH);
      }
    }

    if (options.overlays) {
      await ensureOverlayFonts(options.overlays);
      throwIfCancelled(options.signal);
      renderOverlays(stitchCtx, totalWidth, totalHeight, options.overlays);
    }

    const quality = options.quality ?? 0.92;
    throwIfCancelled(options.signal);
    return encodeCanvasWasm(stitchCanvas, options.format, quality);
  }

  public dispose() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.canvas = null;
  }
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}
