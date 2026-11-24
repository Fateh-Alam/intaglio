"use client";

import React, { useEffect } from "react";
import * as THREE from "three";
import { IconDownload, IconFiles, IconPlayerStop, IconRefresh, IconX } from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import { ExportEngine } from "../render/ExportEngine";
import { allocateBatchFilename, createBatchZip, type BatchManifest, type BatchManifestItem } from "../../lib/batchExport";
import { decodeRawFile, isRawFile, STILL_FILE_ACCEPT } from "../../lib/rawDecoder";
import { sha256Hex } from "../../lib/crypto";
import { FORMAT } from "../../lib/brand";
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
  const { gradeGraph } = useEditorState();
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isBatchExportOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isRunning) setIsBatchExportOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isBatchExportOpen, isRunning, setIsBatchExportOpen]);

  if (!isBatchExportOpen) return null;
  const updateItem = (id: string, update: Partial<QueueItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...update } : item)));

  const addFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setItems((current) => [
      ...current,
      ...files.map((file) => ({ id: crypto.randomUUID(), file, status: "queued" as const, progress: 0, detail: "Ready" })),
    ]);
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
          const developed = await withRawSlot(() =>
            decodeRawFile(item.file, undefined, controller.signal, (progress, stage) =>
              updateItem(item.id, { progress: progress * 0.45, detail: stage })
            )
          );
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
          output = await engine.exportImage(texture, settings, {
            gradeGraph,
            format: exportFormat,
            quality: exportQuality / 100,
            scale: exportScale,
            overlays: { text: textOverlay, watermark },
            signal: controller.signal,
          });
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
    const manifest: BatchManifest = { formatVersion: "2.0.0", appId: FORMAT.appId, createdAt: new Date().toISOString(), items: manifestItems };
    if (outputs.size > 0) {
      const archive = await createBatchZip(outputs, manifest);
      const url = URL.createObjectURL(archive);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `etch-batch-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }
    abortRef.current = null;
    setIsRunning(false);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onClick={() => !isRunning && setIsBatchExportOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-export-title"
        className="ui-root flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[18px] bg-[var(--ui-panel)] ring-1 ring-inset ring-[var(--ui-line-strong)] shadow-[var(--ui-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--ui-line)] px-6 py-5">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-accent-strong)]">
              <IconFiles size={14} stroke={1.8} />
              Batch
            </div>
            <h3 id="batch-export-title" className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-[var(--ui-text)]">
              Local batch export
            </h3>
            <p className="mt-1 text-[12px] text-[var(--ui-text-2)]">
              Applies your current grade locally in parallel; RAW files decode on a background worker.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close batch export"
            onClick={() => !isRunning && setIsBatchExportOpen(false)}
            className="ui-focus grid h-8 w-8 place-items-center rounded-[8px] text-[var(--ui-text-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
          >
            <IconX size={16} />
          </button>
        </header>

        <div className="ui-scroll flex-1 space-y-2 overflow-y-auto px-6 py-5">
          {items.length === 0 && (
            <div className="rounded-[12px] border border-dashed border-[var(--ui-line-strong)] bg-white/[0.015] p-10 text-center text-[13px] text-[var(--ui-text-2)]">
              Add JPEG, PNG, WebP, or a supported-camera RAW file.
            </div>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_96px] items-center gap-4 rounded-[10px] bg-black/25 px-3.5 py-3 ring-1 ring-inset ring-[var(--ui-line)]"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-[var(--ui-text)]">
                  {item.file.name}
                </div>
                <div className="mt-0.5 text-[11.5px] text-[var(--ui-text-2)]">
                  {item.detail}
                  {item.outputName ? ` · ${item.outputName}` : ""}
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-[var(--ui-accent)] transition-[width] duration-200"
                    style={{ width: `${item.progress * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-right text-[11px] font-medium capitalize text-[var(--ui-text-2)]">
                {item.status}
              </div>
            </div>
          ))}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ui-line)] bg-[var(--ui-chrome)]/60 px-6 py-4">
          <label className="ui-focus inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[9px] bg-[var(--ui-control)] px-3.5 text-[12px] font-medium text-[var(--ui-text)] ring-1 ring-inset ring-[var(--ui-line)] transition-colors hover:bg-[var(--ui-control-hover)]">
            Add files
            <input type="file" accept={STILL_FILE_ACCEPT} multiple onChange={addFiles} className="sr-only" />
          </label>
          <div className="flex gap-2">
            {isRunning ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="ui-focus inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-[var(--ui-danger)]/15 px-4 text-[12px] font-medium text-[var(--ui-danger)] ring-1 ring-inset ring-[var(--ui-danger)]/30 transition-colors hover:bg-[var(--ui-danger)]/25"
              >
                <IconPlayerStop size={14} stroke={1.8} />
                Cancel
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setItems((current) =>
                      current.map((item) =>
                        item.status === "failed" || item.status === "cancelled"
                          ? { ...item, status: "queued", detail: "Ready", progress: 0 }
                          : item
                      )
                    )
                  }
                  className="ui-focus inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-[var(--ui-control)] px-3.5 text-[12px] font-medium text-[var(--ui-text-2)] ring-1 ring-inset ring-[var(--ui-line)] transition-colors hover:bg-[var(--ui-control-hover)] hover:text-[var(--ui-text)]"
                >
                  <IconRefresh size={14} stroke={1.8} />
                  Retry failed
                </button>
                <button
                  type="button"
                  onClick={run}
                  disabled={items.length === 0}
                  className="ui-focus inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-[var(--ui-accent)] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--ui-accent-strong)] disabled:pointer-events-none disabled:opacity-40"
                >
                  <IconDownload size={14} stroke={2} />
                  Export ZIP
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
