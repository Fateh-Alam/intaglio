import type { Texture } from "three";
import type { EditorSettings, WatermarkSettings } from "../../types/editor";
import type { GradeGraph } from "../../types/document";
import type { TextOverlaySettings } from "../../components/CinematicTextOverlay";
import { toFileStem } from "../pageTypes";
import { decodeRawFile } from "../../lib/rawDecoder";
import { createLinearSourceTexture, loadImageTexture } from "../render/sourceTexture";
import { ExportEngine, type ExportOptions } from "../render/ExportEngine";
import { originalFile, saveExport, type LibraryPhoto } from "./bridge";

interface LibraryExportSettings {
  settings: EditorSettings;
  gradeGraph?: GradeGraph;
  format: ExportOptions["format"];
  scale: number;
  quality: number;
  text: TextOverlaySettings;
  watermark: WatermarkSettings;
}

export async function exportPhotos(
  destination: number,
  photos: LibraryPhoto[],
  edit: LibraryExportSettings,
  signal: AbortSignal,
  update: (progress: { current: string; done: number; failed: string[] }) => void,
) {
  const engine = new ExportEngine();
  const failed: string[] = [];
  const extension = edit.format === "image/jpeg" ? "jpg" : edit.format.split("/")[1];
  let done = 0;
  try {
    for (const photo of photos) {
      if (signal.aborted) break;
      update({ current: photo.name, done, failed: [...failed] });
      let url: string | undefined;
      let texture: Texture | undefined;
      try {
        const file = await originalFile(photo);
        signal.throwIfAborted();
        if (photo.raw) {
          const raw = await decodeRawFile(file, undefined, signal);
          texture = createLinearSourceTexture({ width: raw.width, height: raw.height, pixels: raw.pixels16 });
        } else {
          url = URL.createObjectURL(file);
          texture = await loadImageTexture(url);
        }
        const blob = await engine.exportImage(texture, edit.settings, {
          gradeGraph: edit.gradeGraph, format: edit.format, scale: edit.scale, quality: edit.quality,
          overlays: { text: edit.text, watermark: edit.watermark }, signal,
        });
        signal.throwIfAborted();
        await saveExport(destination, `${toFileStem(photo.name)}.${extension}`, await blob.arrayBuffer());
        done += 1;
      } catch (error) {
        if (!signal.aborted) failed.push(`${photo.name}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        texture?.dispose();
        if (url) URL.revokeObjectURL(url);
      }
    }
    return { current: "", done, failed };
  } finally { engine.dispose(); }
}
