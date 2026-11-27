/**
 * Video export of animated Creative Effects.
 *
 * Every frame is rendered by the same renderer as still exports, titles and
 * watermark included, then encoded on this device with WebCodecs and written
 * to an MP4 in memory. Nothing is uploaded.
 */
import * as THREE from "three";
import { BufferTarget, canEncodeVideo, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, QUALITY_VERY_HIGH } from "mediabunny";
import type { EditorSettings, WatermarkSettings } from "../../types/editor";
import type { TextOverlaySettings } from "../../components/CinematicTextOverlay";
import type { GradeGraph } from "../../types/document";
import { EFFECT_BY_ID } from "../effects/catalog";
import type { CreativeEffect } from "../effects/settings";
import { cropSize } from "../../lib/cropGeometry";
import { IntaglioRenderer } from "./IntaglioRenderer";
import { ensureOverlayFonts, renderOverlays } from "./overlayCompositor";

export interface VideoExportOptions {
  /** Short edge of the video in pixels (720, 1080, 2160). */
  shortEdge: number;
  fps: number;
  seconds: number;
  gradeGraph?: GradeGraph;
  overlays?: { text: TextOverlaySettings; watermark: WatermarkSettings };
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}

/** Effects whose look moves with their phase control. */
export function isAnimated(layer: CreativeEffect): boolean {
  return layer.enabled && Boolean(EFFECT_BY_ID.get(layer.effect as never)?.controls.some((control) => control.key === "phase"));
}

export function hasAnimatedEffects(settings: Pick<EditorSettings, "creativeEffects">): boolean {
  return (settings.creativeEffects ?? []).some(isAnimated);
}

/**
 * Settings for one frame. Each animated layer runs exactly one full cycle over
 * the clip, starting from its saved phase, so the last frame flows into the first.
 */
export function frameSettings(settings: EditorSettings, progress: number): EditorSettings {
  return {
    ...settings,
    creativeEffects: settings.creativeEffects.map((layer) => (isAnimated(layer) ? { ...layer, phase: (layer.phase + progress) % 1 } : layer)),
  };
}

/**
 * Video size for the cropped photo. Like "1080p", the short edge sets the size
 * (1080×1350 for 4:5, 1920×1080 for 16:9). Even dimensions, never upscaled.
 */
export function videoSize(sourceWidth: number, sourceHeight: number, crop: EditorSettings["crop"], shortEdge: number): { width: number; height: number } {
  const cropped = cropSize(sourceWidth, sourceHeight, crop);
  const scale = Math.min(1, shortEdge / Math.min(cropped.width, cropped.height));
  const even = (value: number) => Math.max(2, Math.round((value * scale) / 2) * 2);
  return { width: even(cropped.width), height: even(cropped.height) };
}

export type VideoSupport = { ok: true } | { ok: false; reason: string };

export async function videoSupport(width: number, height: number, fps: number): Promise<VideoSupport> {
  if (typeof VideoEncoder === "undefined") {
    return { ok: false, reason: "This browser can’t encode video. Use a recent Chrome, Edge or Safari." };
  }
  const ok = await canEncodeVideo("avc", { width, height, frameRate: fps, quality: QUALITY_HIGH }).catch(() => false);
  return ok ? { ok: true } : { ok: false, reason: `This browser can’t encode ${width}×${height} H.264 video. Try a smaller size.` };
}

class Cancelled extends Error {
  constructor() { super("Video export cancelled."); this.name = "AbortError"; }
}

/** Render and encode the clip. Resolves with an MP4 file. */
export async function exportEffectVideo(sourceTexture: THREE.Texture, settings: EditorSettings, options: VideoExportOptions): Promise<Blob> {
  const image = sourceTexture.image as { width: number; height: number };
  const { width, height } = videoSize(image.width, image.height, settings.crop, options.shortEdge);
  const support = await videoSupport(width, height, options.fps);
  if (!support.ok) throw new Error(support.reason);

  // WebGL renders the graded frame; a 2D canvas adds titles and is what the encoder reads.
  const glCanvas = document.createElement("canvas");
  glCanvas.width = width;
  glCanvas.height = height;
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setSize(width, height, false);
  const frame = document.createElement("canvas");
  frame.width = width;
  frame.height = height;
  const context = frame.getContext("2d", { alpha: false });
  if (!context) throw new Error("Video frame canvas could not be created.");

  const intaglio = new IntaglioRenderer();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const source = new CanvasSource(frame, { codec: "avc", quality: Math.max(width, height) > 1920 ? QUALITY_VERY_HIGH : QUALITY_HIGH, keyFrameInterval: 1 });
  output.addVideoTrack(source, { frameRate: options.fps });

  const total = Math.max(1, Math.round(options.fps * options.seconds));
  try {
    if (options.overlays) await ensureOverlayFonts(options.overlays);
    await output.start();
    for (let index = 0; index < total; index++) {
      if (options.signal?.aborted) throw new Cancelled();
      intaglio.render({
        renderer,
        sourceTexture,
        settings: frameSettings(settings, index / total),
        gradeGraph: options.gradeGraph,
        target: null,
        width,
        height,
      });
      context.drawImage(glCanvas, 0, 0, width, height);
      if (options.overlays) renderOverlays(context, width, height, options.overlays);
      await source.add(index / options.fps, 1 / options.fps);
      options.onProgress?.((index + 1) / total);
    }
    await output.finalize();
    const buffer = (output.target as BufferTarget).buffer;
    if (!buffer) throw new Error("The video encoder produced no data.");
    return new Blob([buffer], { type: "video/mp4" });
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  } finally {
    intaglio.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
