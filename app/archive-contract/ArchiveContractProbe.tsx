"use client";

import { useEffect, useState } from "react";
import { DEFAULT_TEXT_OVERLAY } from "../components/CinematicTextOverlay";
import { DEFAULT_ASSET_METADATA, DEFAULT_SETTINGS, DEFAULT_WATERMARK } from "../editor/pageTypes";
import { createIntaglioContainer, preflightContainerStorage, releaseContainerOutput } from "../lib/intaglioContainer";
import { createIntaglioDocument, createRuntimeAssetStore } from "../lib/intaglioDocument";

const SOURCE_BYTES = 65 * 1024 * 1024;

async function runProbe(): Promise<Record<string, unknown>> {
  const storage = await preflightContainerStorage(SOURCE_BYTES + 5 * 1024 * 1024);
  if (!storage.usesOpfs) throw new Error("OPFS is unavailable in this browser context.");
  const chunks: ArrayBuffer[] = [];
  for (let offset = 0; offset < SOURCE_BYTES; offset += 1024 * 1024) {
    const chunk = new Uint8Array(Math.min(1024 * 1024, SOURCE_BYTES - offset));
    chunk.fill((offset / (1024 * 1024)) & 0xff);
    chunks.push(chunk.buffer);
  }
  const source = new Blob(chunks, { type: "application/octet-stream" });
  const document = await createIntaglioDocument({
    title: "OPFS archive contract",
    sourceFile: source,
    sourceName: "large-source.bin",
    imageInfo: { width: 1, height: 1, fileType: source.type, fileSize: source.size },
    settings: DEFAULT_SETTINGS,
    textOverlay: DEFAULT_TEXT_OVERLAY,
    watermark: DEFAULT_WATERMARK,
    metadata: DEFAULT_ASSET_METADATA,
    exportFormat: "image/png",
    exportQuality: 100,
    exportScale: 1,
    exportRecipeId: null,
  });
  const runtime = createRuntimeAssetStore();
  runtime.sourceFile = source;
  const archive = await createIntaglioContainer("project", document, runtime);
  try {
    const signature = Array.from(new Uint8Array(await archive.slice(0, 4).arrayBuffer()), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return { sourceBytes: source.size, archiveBytes: archive.size, diskBackedFile: archive instanceof File, signature, usesOpfs: storage.usesOpfs };
  } finally {
    await releaseContainerOutput(archive);
  }
}

export default function ArchiveContractProbe(): React.ReactElement {
  const [result, setResult] = useState<{ status: "running" | "passed" | "failed"; evidence?: Record<string, unknown>; error?: string }>({ status: "running" });
  useEffect(() => {
    void runProbe().then((evidence) => setResult({ status: "passed", evidence })).catch((error: unknown) => setResult({ status: "failed", error: error instanceof Error ? error.message : String(error) }));
  }, []);
  return <main className="min-h-screen bg-black p-8 font-mono text-white"><h1>Intaglio archive contract probe</h1><output data-testid="archive-contract-result" data-status={result.status}>{JSON.stringify(result)}</output></main>;
}
