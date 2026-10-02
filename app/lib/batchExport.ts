import { strToU8, Zip, ZipDeflate, ZipPassThrough } from "fflate";
import { sha256Hex } from "./crypto";

export interface BatchManifestItem {
  sourceName: string;
  sourceHash: string;
  recipeHash: string;
  outputName: string | null;
  outputHash: string | null;
  dimensions: { width: number; height: number } | null;
  warnings: string[];
  failure: string | null;
}

export interface BatchManifest {
  formatVersion: "2.0.0";
  appId: "intaglio-darkroom";
  createdAt: string;
  items: BatchManifestItem[];
}

export const safeFileStem = (name: string): string => name
  .replace(/\.[^.]+$/, "")
  .normalize("NFKD")
  .replace(/[^a-zA-Z0-9_-]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .toLowerCase() || "untitled";

export function allocateBatchFilename(sourceName: string, extension: string, used: Set<string>): string {
  const stem = safeFileStem(sourceName);
  let index = 1;
  let candidate = `${stem}.${extension}`;
  while (used.has(candidate.toLowerCase())) {
    index += 1;
    candidate = `${stem}-${index}.${extension}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export async function createBatchZip(outputs: ReadonlyMap<string, Blob>, manifest: BatchManifest): Promise<Blob> {
  const chunks: BlobPart[] = [];
  let resolveDone!: () => void;
  let rejectDone!: (error: Error) => void;
  const done = new Promise<void>((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
  const zip = new Zip((error, chunk, final) => {
    if (error) { rejectDone(error); return; }
    chunks.push(chunk.slice().buffer as ArrayBuffer);
    if (final) resolveDone();
  });
  try {
    for (const [name, blob] of outputs) {
      const entry = new ZipPassThrough(`outputs/${name}`);
      zip.add(entry);
      const reader = blob.stream().getReader();
      try {
        for (;;) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) { entry.push(new Uint8Array(0), true); break; }
          entry.push(value, false);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const manifestEntry = new ZipDeflate("batch-manifest.json", { level: 6 });
    zip.add(manifestEntry);
    manifestEntry.push(strToU8(JSON.stringify(manifest, null, 2)), true);
    zip.end();
    await done;
    return new Blob(chunks, { type: "application/zip" });
  } catch (error) {
    zip.terminate();
    throw error;
  }
}

export async function completedBatchItem(input: Omit<BatchManifestItem, "outputHash" | "failure"> & { output: Blob }): Promise<BatchManifestItem> {
  return { ...input, outputHash: await sha256Hex(input.output), failure: null };
}
