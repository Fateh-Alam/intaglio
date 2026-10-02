"use client";

import React from "react";
import * as THREE from "three";
import { IconDownload, IconFiles, IconPlayerStop, IconRefresh, IconX } from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import { ExportEngine } from "../render/ExportEngine";
import { allocateBatchFilename, createBatchZip, type BatchManifest, type BatchManifestItem } from "../../lib/batchExport";
import { decodeRawFile, isRawFile, STILL_FILE_ACCEPT } from "../../lib/rawDecoder";
import { sha256Hex } from "../../lib/crypto";
import { serializeEditorSettings } from "../pageTypes";
import { createLinearSourceTexture, loadImageTexture, type LinearSourceBuffer } from "../render/sourceTexture";

type ItemStatus = "queued" | "developing" | "rendering" | "complete" | "failed" | "cancelled";
interface QueueItem { id: string; file: File; status: ItemStatus; progress: number; detail: string; outputName?: string }

const loadTexture = async (blob: Blob): Promise<{ texture: THREE.Texture; url: string }> => {
  const url = URL.createObjectURL(blob);
  try {
    return { texture: await loadImageTexture(url), url };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
};

export function BatchExportModal(): React.ReactElement | null {
  const { isBatchExportOpen, setIsBatchExportOpen, settings, exportFormat, exportQuality, exportScale, textOverlay, watermark } = useEditorState();
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  if (!isBatchExportOpen) return null;
  const updateItem = (id: string, update: Partial<QueueItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));

  const addFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setItems((current) => [...current, ...files.map((file) => ({ id: crypto.randomUUID(), file, status: "queued" as const, progress: 0, detail: "Ready" }))]);
    event.target.value = "";
  };

  const run = async () => {
    if (isRunning || items.length === 0) return;
    setIsRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const outputs = new Map<string, Blob>();
    const manifestItems: BatchManifestItem[] = [];
    const usedNames = new Set<string>();
    const recipeHash = await sha256Hex(JSON.stringify(serializeEditorSettings(settings)));
    const extension = exportFormat.split("/")[1].replace("jpeg", "jpg");
    const pending = items.filter((item) => item.status !== "complete");
    let cursor = 0;
    let rawTail = Promise.resolve();

    const withRawSlot = async <T,>(operation: () => Promise<T>): Promise<T> => {
      const previous = rawTail;
      let release!: () => void;
      rawTail = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try { return await operation(); }
      finally { release(); }
    };

    const processItem = async (item: QueueItem) => {
      const sourceHash = await sha256Hex(item.file);
      let rawSource: LinearSourceBuffer | null = null;
      let dimensions: { width: number; height: number } | null = null;
      let objectUrl: string | null = null;
      let texture: THREE.Texture | null = null;
      try {
        if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
        if (isRawFile(item.file)) {
          updateItem(item.id, { status: "developing", progress: 0.1, detail: "Developing RAW" });
          const developed = await withRawSlot(() => decodeRawFile(item.file, undefined, controller.signal, (progress, stage) => updateItem(item.id, { progress: progress * 0.45, detail: stage })));
          rawSource = { width: developed.width, height: developed.height, pixels: developed.pixels16 };
          dimensions = { width: developed.width, height: developed.height };
        }
        updateItem(item.id, { status: "rendering", progress: 0.55, detail: "Rendering grade" });
        if (rawSource) {
          texture = createLinearSourceTexture(rawSource);
        } else {
          const loaded = await loadTexture(item.file);
          texture = loaded.texture;
          objectUrl = loaded.url;
        }
        const image = texture.image as { width?: number; height?: number };
        dimensions ??= { width: image.width ?? 0, height: image.height ?? 0 };
        const engine = new ExportEngine();
        let output: Blob;
        try {
          output = await engine.exportImage(texture, settings, { format: exportFormat, quality: exportQuality / 100, scale: exportScale, overlays: { text: textOverlay, watermark }, signal: controller.signal });
        } finally {
          engine.dispose();
        }
        if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
        const outputName = allocateBatchFilename(item.file.name, extension, usedNames);
        outputs.set(outputName, output);
        const outputHash = await sha256Hex(output);
        manifestItems.push({ sourceName: item.file.name, sourceHash, recipeHash, outputName, outputHash, dimensions, warnings: [], failure: null });
        updateItem(item.id, { status: "complete", progress: 1, detail: "Complete", outputName });
      } catch (error) {
        const cancelled = controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError");
        const message = cancelled ? "Cancelled" : error instanceof Error ? error.message : "Batch item failed";
        manifestItems.push({ sourceName: item.file.name, sourceHash, recipeHash, outputName: null, outputHash: null, dimensions, warnings: [], failure: message });
        updateItem(item.id, { status: cancelled ? "cancelled" : "failed", detail: message });
      } finally {
        texture?.dispose();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    };

    const worker = async () => {
      while (!controller.signal.aborted) {
        const index = cursor++;
        const item = pending[index];
        if (!item) return;
        await processItem(item);
      }
    };
    await Promise.all([worker(), worker()]);
    if (controller.signal.aborted) {
      for (const item of pending.slice(cursor)) {
        const sourceHash = await sha256Hex(item.file);
        manifestItems.push({ sourceName: item.file.name, sourceHash, recipeHash, outputName: null, outputHash: null, dimensions: null, warnings: [], failure: "Cancelled" });
        updateItem(item.id, { status: "cancelled", detail: "Cancelled" });
      }
    }
    const manifest: BatchManifest = { formatVersion: "2.0.0", appId: "intaglio-darkroom", createdAt: new Date().toISOString(), items: manifestItems };
    if (outputs.size > 0) {
      const archive = await createBatchZip(outputs, manifest);
      const url = URL.createObjectURL(archive);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `intaglio-batch-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }
    abortRef.current = null;
    setIsRunning(false);
  };

  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"><div className="flex max-h-[90vh] w-full max-w-3xl flex-col border border-white/10 bg-[#15130f] shadow-2xl">
    <header className="flex items-center justify-between border-b border-white/10 p-5"><div><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--intaglio-brass)]"><IconFiles className="intaglio-icon"/> Local batch export</div><p className="mt-2 text-xs text-white/45">Two local raster jobs; RAW decoding remains worker-backed and cancellable.</p></div><button aria-label="Close batch export" onClick={() => !isRunning && setIsBatchExportOpen(false)} className="p-2 text-white/50 hover:text-white"><IconX className="intaglio-icon"/></button></header>
    <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-5">{items.length === 0 && <div className="border border-dashed border-white/15 p-10 text-center text-sm text-white/40">Add JPEG, PNG, WebP, or a supported-camera RAW file.</div>}{items.map((item) => <div key={item.id} className="grid grid-cols-[1fr_110px] items-center gap-4 border border-white/8 bg-black/20 p-3"><div className="min-w-0"><div className="truncate text-sm text-white/75">{item.file.name}</div><div className="mt-1 text-[10px] text-white/40">{item.detail}{item.outputName ? ` · ${item.outputName}` : ""}</div><div className="mt-2 h-0.5 bg-white/10"><div className="h-full bg-[var(--intaglio-brass)]" style={{ width: `${item.progress * 100}%` }}/></div></div><div className="font-mono text-[9px] uppercase tracking-widest text-white/45">{item.status}</div></div>)}</div>
    <footer className="flex items-center justify-between gap-3 border-t border-white/10 p-5"><label className="cursor-pointer border border-white/15 px-4 py-2 font-mono text-[9px] uppercase tracking-widest text-white/60 hover:border-white/35">Add files<input type="file" accept={STILL_FILE_ACCEPT} multiple onChange={addFiles} className="hidden"/></label><div className="flex gap-2">{isRunning ? <button onClick={() => abortRef.current?.abort()} className="flex items-center gap-2 border border-red-400/25 px-4 py-2 font-mono text-[9px] uppercase tracking-widest text-red-200"><IconPlayerStop className="intaglio-icon"/>Cancel</button> : <><button onClick={() => setItems((current) => current.map((item) => item.status === "failed" || item.status === "cancelled" ? { ...item, status: "queued", detail: "Ready", progress: 0 } : item))} className="flex items-center gap-2 border border-white/15 px-4 py-2 font-mono text-[9px] uppercase tracking-widest text-white/55"><IconRefresh className="intaglio-icon"/>Retry failed</button><button onClick={run} disabled={items.length === 0} className="flex items-center gap-2 bg-[var(--intaglio-brass)] px-5 py-2 font-mono text-[9px] font-bold uppercase tracking-widest text-black disabled:opacity-30"><IconDownload className="intaglio-icon"/>Export ZIP</button></>}</div></footer>
  </div></div>;
}
