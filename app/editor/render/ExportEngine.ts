import * as THREE from 'three';
import { RenderGraph } from './RenderGraph';
import { BaseDevelopPass } from './passes/BaseDevelopPass';
import { LocalAdjustmentsPass } from './passes/LocalAdjustmentsPass';
import { OklchMixerPass } from './passes/OklchMixerPass';
import { ColorWheelsPass } from './passes/ColorWheelsPass';
import { FilmEmulationPass } from './passes/FilmEmulationPass';
import { HalationPass } from './passes/HalationPass';
import { BloomPass } from './passes/BloomPass';
import { OpticalFXPass } from './passes/OpticalFXPass';
import { SharpenPass } from './passes/SharpenPass';
import { DisplayTransformPass } from './passes/DisplayTransformPass';
import { EditorSettings } from '../../types/editor';

export interface ExportOptions {
  format: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number; // 0 to 1
  scale?: number;   // multiplier relative to original image size
  width?: number;   // explicit target width
  height?: number;  // explicit target height
  brushCanvas?: HTMLCanvasElement | null;
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
    const img = sourceTexture.image as HTMLImageElement | undefined;
    const imgWidth = img?.width || 1920;
    const imgHeight = img?.height || 1080;

    let targetWidth = options.width || Math.round(imgWidth * (options.scale || 1.0));
    let targetHeight = options.height || Math.round(imgHeight * (options.scale || 1.0));

    const renderer = this.getRenderer(targetWidth, targetHeight);
    const maxTextureSize = renderer.capabilities.maxTextureSize || 4096;

    // Check if tiling is needed
    if (targetWidth > maxTextureSize || targetHeight > maxTextureSize) {
      return this.exportTiled(sourceTexture, settings, options, targetWidth, targetHeight, maxTextureSize);
    }

    const graph = new RenderGraph();
    const baseDevelop = new BaseDevelopPass();
    const localAdjustments = new LocalAdjustmentsPass();
    const oklchMixer = new OklchMixerPass();
    const colorWheels = new ColorWheelsPass();
    const filmEmulation = new FilmEmulationPass();
    const halation = new HalationPass();
    const bloom = new BloomPass();
    const optical = new OpticalFXPass();
    const sharpen = new SharpenPass();
    const displayTransform = new DisplayTransformPass();

    graph.addPass(baseDevelop);
    graph.addPass(localAdjustments);
    graph.addPass(oklchMixer);
    graph.addPass(colorWheels);
    graph.addPass(filmEmulation);
    graph.addPass(halation);
    graph.addPass(bloom);
    graph.addPass(optical);
    graph.addPass(sharpen);
    graph.addPass(displayTransform);

    graph.setSize(targetWidth, targetHeight);

    if (options.brushCanvas) {
      const brushTexture = new THREE.CanvasTexture(options.brushCanvas);
      localAdjustments.setBrushMask(brushTexture);
    }

    const finalTarget = new THREE.WebGLRenderTarget(targetWidth, targetHeight, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      colorSpace: THREE.NoColorSpace
    });

    if (options.tileInfo) {
      graph.setViewOffset(
        options.tileInfo.fullWidth,
        options.tileInfo.fullHeight,
        options.tileInfo.offsetX,
        options.tileInfo.offsetY,
        options.tileInfo.tileWidth,
        options.tileInfo.tileHeight
      );
    }

    // Execute graph rendering
    graph.render(renderer, settings, sourceTexture, finalTarget);

    // Copy from WebGLRenderTarget to canvas
    const finalQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: finalTarget.texture })
    );
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    scene.add(finalQuad);

    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    // Clean up GPU targets
    graph.dispose();
    finalTarget.dispose();
    finalQuad.geometry.dispose();
    (finalQuad.material as THREE.Material).dispose();

    // Export canvas blob
    const quality = options.quality ?? 0.92;
    return new Promise<Blob>((resolve, reject) => {
      if (!this.canvas) {
        reject(new Error('Export canvas initialization failed'));
        return;
      }
      this.canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to encode image blob'));
        },
        options.format,
        quality
      );
    });
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

    const tilesX = Math.ceil(totalWidth / maxSize);
    const tilesY = Math.ceil(totalHeight / maxSize);

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const tileW = Math.min(maxSize, totalWidth - tx * maxSize);
        const tileH = Math.min(maxSize, totalHeight - ty * maxSize);

        const tileOptions: ExportOptions = {
          ...options,
          scale: 1,
          width: tileW,
          height: tileH,
          tileInfo: {
            fullWidth: totalWidth,
            fullHeight: totalHeight,
            offsetX: tx * maxSize,
            offsetY: ty * maxSize,
            tileWidth: tileW,
            tileHeight: tileH
          }
        };

        const tileBlob = await this.exportImage(sourceTexture, settings, tileOptions);
        const tileImg = await loadImageFromBlob(tileBlob);
        stitchCtx.drawImage(tileImg, tx * maxSize, ty * maxSize, tileW, tileH);
      }
    }

    const quality = options.quality ?? 0.92;
    return new Promise<Blob>((resolve, reject) => {
      stitchCanvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to encode tiled image blob'));
        },
        options.format,
        quality
      );
    });
  }

  public dispose() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.canvas = null;
  }
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
