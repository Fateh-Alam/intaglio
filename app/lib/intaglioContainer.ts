import { strFromU8, strToU8, unzipSync, Zip, ZipDeflate, ZipPassThrough } from "fflate";
import {
  INTAGLIO_APP_ID,
  INTAGLIO_FORMAT_VERSION,
  MAX_CONTAINER_BYTES,
  MAX_CONTAINER_ENTRIES,
  type AssetReference,
  type IntaglioContainerManifest,
  type IntaglioDocumentV2,
  type RuntimeAssetStore,
} from "../types/document";
import { sha256Hex } from "./crypto";
import { validateGradeGraph } from "./gradeGraph";

export class IntaglioContainerError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "IntaglioContainerError"; }
}

const safePath = (path: string): boolean => !path.startsWith("/") && !path.includes("\\") && path.split("/").every((part) => part !== ".." && part !== "");
const SUPPORTED_CAPABILITIES = new Set(["grade-graph-v2", "embedded-assets", "linear-srgb"]);
const ASSET_PREFIX: Record<AssetReference["kind"], string> = {
  source: "assets/source/",
  lut: "assets/luts/",
  font: "assets/fonts/",
  preview: "previews/",
  comparison: "assets/comparisons/",
};

function validatePortableJson(value: unknown, path = "document"): void {
  if (typeof value === "string") {
    if (/^(blob:|file:)/i.test(value) || /^\/(?:Users|home|private|var|tmp)\//.test(value) || /^[A-Za-z]:\\/.test(value)) {
      throw new IntaglioContainerError("runtime-reference", `Portable data contains a local runtime reference at ${path}.`);
    }
    return;
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") return;
  if (Array.isArray(value)) { value.forEach((item, index) => validatePortableJson(item, `${path}[${index}]`)); return; }
  if (typeof value !== "object") throw new IntaglioContainerError("document-json", `Portable data at ${path} is not JSON-safe.`);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (/(?:texture|objectUrl|filesystemPath|cacheKey|gpuTarget|renderTarget)/i.test(key)) {
      throw new IntaglioContainerError("runtime-key", `Portable data contains forbidden runtime key ${path}.${key}.`);
    }
    validatePortableJson(child, `${path}.${key}`);
  }
}

function validateAssetReference(asset: AssetReference): void {
  if (!Object.hasOwn(ASSET_PREFIX, asset.kind)) throw new IntaglioContainerError("asset-kind", `Unknown asset kind ${String(asset.kind)}.`);
  if (!/^[a-f0-9]{64}$/.test(asset.sha256) || !asset.id || !asset.mimeType || !Number.isSafeInteger(asset.byteLength) || asset.byteLength < 0 || asset.byteLength > MAX_CONTAINER_BYTES) {
    throw new IntaglioContainerError("asset-reference", `Asset ${asset.id || "(unnamed)"} has invalid identity, MIME type, hash, or size.`);
  }
  if (!safePath(asset.path) || !asset.path.startsWith(ASSET_PREFIX[asset.kind]) || !asset.path.includes(asset.sha256)) {
    throw new IntaglioContainerError("asset-path", `Asset ${asset.id} does not use its canonical hash-addressed ${asset.kind} path.`);
  }
  if (asset.kind === "lut" && !asset.path.endsWith(".cube")) throw new IntaglioContainerError("asset-path", `LUT asset ${asset.id} must preserve .cube bytes.`);
  if (asset.kind === "comparison" && !/\.webp$/i.test(asset.path)) throw new IntaglioContainerError("asset-path", `Comparison asset ${asset.id} must be WebP.`);
  if (asset.lutMetadata && (asset.kind !== "lut" || !Number.isInteger(asset.lutMetadata.size) || asset.lutMetadata.size < 2 || asset.lutMetadata.domainMax.some((value, index) => value <= asset.lutMetadata!.domainMin[index]))) {
    throw new IntaglioContainerError("lut-metadata", `LUT metadata for ${asset.id} is invalid.`);
  }
}

interface ZipIndexEntry { path: string; compressedSize: number; uncompressedSize: number; flags: number }

function inspectZipIndex(bytes: Uint8Array): ZipIndexEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumEocd = 22;
  let eocd = -1;
  for (let offset = bytes.byteLength - minimumEocd; offset >= Math.max(0, bytes.byteLength - 65_557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new IntaglioContainerError("invalid-zip", "This is not a valid packaged Intaglio file.");
  const count = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (count === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw new IntaglioContainerError("zip64", "ZIP64 containers are outside the Intaglio public-beta contract.");
  if (count > MAX_CONTAINER_ENTRIES || centralOffset + centralSize > bytes.byteLength) throw new IntaglioContainerError("entry-limit", "The container has too many or invalid entries.");
  const decoder = new TextDecoder();
  const entries: ZipIndexEntry[] = [];
  const paths = new Set<string>();
  let offset = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== 0x02014b50) throw new IntaglioContainerError("invalid-zip", "The ZIP directory is malformed.");
    const flags = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > bytes.byteLength) throw new IntaglioContainerError("invalid-zip", "The ZIP directory is truncated.");
    const path = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (!safePath(path)) throw new IntaglioContainerError("unsafe-path", `The container contains an unsafe path: ${path}.`);
    if (paths.has(path)) throw new IntaglioContainerError("duplicate-entry", `The container contains duplicate entry ${path}.`);
    if ((flags & 1) !== 0) throw new IntaglioContainerError("encrypted-entry", "Encrypted ZIP entries are unsupported.");
    paths.add(path);
    entries.push({ path, compressedSize, uncompressedSize, flags });
    offset = end;
  }
  if (offset !== centralOffset + centralSize) throw new IntaglioContainerError("invalid-zip", "The ZIP directory length is inconsistent.");
  return entries;
}

function assetBlob(asset: AssetReference, runtime: RuntimeAssetStore): Blob | null {
  if (asset.kind === "source") return runtime.sourceFile;
  if (asset.kind === "lut") return runtime.lutFiles.get(asset.id) ?? null;
  if (asset.kind === "font") return runtime.fontFiles.get(asset.id) ?? null;
  return runtime.comparisonFiles.get(asset.id) ?? null;
}

type StreamEntry = { path: string; source: Blob | Uint8Array; compress: boolean };
const opfsCleanup = new WeakMap<Blob, () => Promise<void>>();
const OPFS_ARCHIVE_THRESHOLD_BYTES = 64 * 1024 * 1024;

export async function releaseContainerOutput(blob: Blob): Promise<void> {
  const cleanup = opfsCleanup.get(blob);
  if (!cleanup) return;
  opfsCleanup.delete(blob);
  await cleanup();
}

export interface ContainerStoragePreflight {
  requiredBytes: number;
  availableBytes: number | null;
  usesOpfs: boolean;
}

export function assertContainerStorageCapacity(requiredBytes: number, availableBytes: number | null): void {
  if (availableBytes !== null && availableBytes < requiredBytes) {
    throw new IntaglioContainerError("insufficient-storage", `This portable save needs about ${formatBytes(requiredBytes)}, but this browser session reports only ${formatBytes(availableBytes)} available. Free local storage, close Private Browsing, or save a recipe without the photograph.`);
  }
}

export async function preflightContainerStorage(requiredBytes: number): Promise<ContainerStoragePreflight> {
  const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
  let availableBytes: number | null = null;
  if (storage?.estimate) {
    try {
      const estimate = await storage.estimate();
      availableBytes = typeof estimate.quota === "number" ? Math.max(0, estimate.quota - (estimate.usage ?? 0)) : null;
    } catch {
      availableBytes = null;
    }
  }
  assertContainerStorageCapacity(requiredBytes, availableBytes);
  let usesOpfs = false;
  if (storage && "getDirectory" in storage) {
    try { await storage.getDirectory(); usesOpfs = true; } catch { usesOpfs = false; }
  }
  if (requiredBytes >= OPFS_ARCHIVE_THRESHOLD_BYTES && !usesOpfs && typeof navigator !== "undefined") {
    throw new IntaglioContainerError("storage-unavailable", `This ${formatBytes(requiredBytes)} portable save needs origin-private file storage, which is unavailable in this browser session. Leave Private Browsing, free local storage, or save a recipe without the photograph.`);
  }
  return { requiredBytes, availableBytes, usesOpfs };
}

const formatBytes = (bytes: number): string => bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : bytes >= 1024 ** 2 ? `${Math.ceil(bytes / 1024 ** 2)} MB` : `${Math.ceil(bytes / 1024)} KB`;

async function pushEntry(file: ZipDeflate | ZipPassThrough, source: Blob | Uint8Array): Promise<void> {
  if (source instanceof Uint8Array) {
    file.push(source, true);
    return;
  }
  const reader = source.stream().getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) { file.push(new Uint8Array(0), true); break; }
      file.push(value, false);
    }
  } finally {
    reader.releaseLock();
  }
}

async function createStreamingZip(entries: readonly StreamEntry[], mimeType: string, preferOpfs: boolean): Promise<Blob> {
  const chunks: BlobPart[] = [];
  let opfsDirectory: FileSystemDirectoryHandle | null = null;
  let opfsHandle: FileSystemFileHandle | null = null;
  let opfsWriter: FileSystemWritableFileStream | null = null;
  let writeChain = Promise.resolve();
  const temporaryName = `intaglio-${crypto.randomUUID()}.tmp`;
  if (preferOpfs && typeof navigator !== "undefined" && navigator.storage && "getDirectory" in navigator.storage) {
    try {
      opfsDirectory = await navigator.storage.getDirectory();
      opfsHandle = await opfsDirectory.getFileHandle(temporaryName, { create: true });
      opfsWriter = await opfsHandle.createWritable();
    } catch {
      opfsDirectory = null; opfsHandle = null; opfsWriter = null;
    }
  }
  let outputBytes = 0;
  let settled = false;
  let resolveDone!: () => void;
  let rejectDone!: (error: Error) => void;
  const done = new Promise<void>((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
  const archive = new Zip((error, chunk, final) => {
    if (settled) return;
    if (error) { settled = true; rejectDone(error); return; }
    outputBytes += chunk.byteLength;
    if (outputBytes > MAX_CONTAINER_BYTES) {
      settled = true;
      archive.terminate();
      rejectDone(new IntaglioContainerError("too-large", "The packaged file exceeds Intaglio's 1 GB public-beta limit."));
      return;
    }
    // fflate may reuse its callback buffer; Blob parts must own their bytes.
    const ownedChunk = chunk.slice();
    if (opfsWriter) writeChain = writeChain.then(() => opfsWriter!.write(ownedChunk));
    else chunks.push(ownedChunk.buffer as ArrayBuffer);
    if (final) { settled = true; resolveDone(); }
  });
  try {
    for (const entry of entries) {
      const stream = entry.compress ? new ZipDeflate(entry.path, { level: 6 }) : new ZipPassThrough(entry.path);
      archive.add(stream);
      await pushEntry(stream, entry.source);
    }
    archive.end();
    await done;
    if (opfsWriter && opfsHandle && opfsDirectory) {
      await writeChain;
      await opfsWriter.close();
      const file = await opfsHandle.getFile();
      opfsCleanup.set(file, async () => {
        try { await opfsDirectory?.removeEntry(temporaryName); } catch {}
      });
      return file;
    }
    return new Blob(chunks, { type: mimeType });
  } catch (error) {
    if (!settled) archive.terminate();
    try { await opfsWriter?.abort(); } catch {}
    try { await opfsDirectory?.removeEntry(temporaryName); } catch {}
    throw error;
  }
}

export async function createIntaglioContainer(kind: "recipe" | "project", document: IntaglioDocumentV2, runtime: RuntimeAssetStore, thumbnail?: Blob): Promise<Blob> {
  const graphResult = validateGradeGraph(document.graph);
  if (!graphResult.valid) throw new IntaglioContainerError("invalid-graph", graphResult.issues.map((issue) => issue.message).join(" "));
  validatePortableJson(document);
  const includedAssets = document.assets.filter((asset) => kind === "project" || asset.kind === "lut" || asset.kind === "font");
  const estimatedBytes = includedAssets.reduce((total, asset) => total + asset.byteLength, 0) + (thumbnail?.size ?? 0) + 4 * 1024 * 1024;
  if (estimatedBytes > MAX_CONTAINER_BYTES) throw new IntaglioContainerError("too-large", "The estimated packaged file exceeds Intaglio's 1 GB public-beta limit.");
  const storage = await preflightContainerStorage(Math.min(MAX_CONTAINER_BYTES, Math.ceil(estimatedBytes * 1.05)));
  const manifest: IntaglioContainerManifest = {
    appId: INTAGLIO_APP_ID,
    formatVersion: INTAGLIO_FORMAT_VERSION,
    kind,
    createdAt: new Date().toISOString(),
    document: {
      ...document,
      source: kind === "project" ? document.source : null,
      assets: includedAssets,
      history: kind === "project" ? document.history : [],
      historyIndex: kind === "project" ? document.historyIndex : 0,
      virtualCopies: kind === "project" ? document.virtualCopies : [],
      activeVirtualCopyId: kind === "project" ? document.activeVirtualCopyId : null,
    },
    assets: includedAssets,
    requiredCapabilities: ["grade-graph-v2", "embedded-assets", "linear-srgb"],
  };

  const entries: StreamEntry[] = [];
  const checksumLines: string[] = [];
  for (const asset of includedAssets) {
    validateAssetReference(asset);
    if (!safePath(asset.path)) throw new IntaglioContainerError("unsafe-path", `Unsafe asset path ${asset.path}.`);
    const blob = assetBlob(asset, runtime);
    if (!blob) throw new IntaglioContainerError("missing-asset", `Required ${asset.kind} asset ${asset.originalName ?? asset.id} is unavailable.`);
    const actualHash = await sha256Hex(blob);
    if (actualHash !== asset.sha256) throw new IntaglioContainerError("checksum", `Asset ${asset.id} changed after it was registered.`);
    entries.push({ path: asset.path, source: blob, compress: asset.kind !== "source" });
    checksumLines.push(`${actualHash}  ${asset.path}`);
  }
  if (thumbnail) {
    const bytes = new Uint8Array(await thumbnail.arrayBuffer());
    entries.push({ path: "previews/thumbnail.webp", source: thumbnail, compress: false });
    checksumLines.push(`${await sha256Hex(bytes)}  previews/thumbnail.webp`);
  }
  const manifestBytes = strToU8(JSON.stringify(manifest));
  entries.push({ path: "manifest.json", source: manifestBytes, compress: true });
  checksumLines.unshift(`${await sha256Hex(manifestBytes)}  manifest.json`);
  entries.push({ path: "checksums.sha256", source: strToU8(`${checksumLines.join("\n")}\n`), compress: true });
  return createStreamingZip(entries, kind === "project" ? "application/x-intaglio-archive" : "application/x-intaglio-recipe", storage.usesOpfs && estimatedBytes >= OPFS_ARCHIVE_THRESHOLD_BYTES);
}

function parseChecksums(text: string): Map<string, string> {
  const checksums = new Map<string, string>();
  for (const line of text.trim().split(/\r?\n/)) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match || !safePath(match[2])) throw new IntaglioContainerError("checksums", "The checksum manifest is malformed.");
    checksums.set(match[2], match[1]);
  }
  return checksums;
}

export async function openIntaglioContainer(file: Blob): Promise<{ manifest: IntaglioContainerManifest; runtime: RuntimeAssetStore }> {
  if (file.size > MAX_CONTAINER_BYTES) throw new IntaglioContainerError("too-large", "This project exceeds Intaglio's 1 GB public-beta limit.");
  const archiveBytes = new Uint8Array(await file.arrayBuffer());
  const index = inspectZipIndex(archiveBytes);
  const indexedExpandedBytes = index.reduce((total, entry) => total + entry.uncompressedSize, 0);
  const indexedCompressedBytes = index.reduce((total, entry) => total + entry.compressedSize, 0);
  if (indexedExpandedBytes > MAX_CONTAINER_BYTES) throw new IntaglioContainerError("expanded-size", "The expanded project exceeds Intaglio's 1 GB limit.");
  if (indexedCompressedBytes > 0 && indexedExpandedBytes / indexedCompressedBytes > 200) throw new IntaglioContainerError("compression-ratio", "The container has an unsafe compression ratio.");
  let entries: Record<string, Uint8Array>;
  try { entries = unzipSync(archiveBytes); }
  catch { throw new IntaglioContainerError("invalid-zip", "This is not a valid packaged Intaglio file."); }
  const paths = Object.keys(entries);
  if (paths.length > MAX_CONTAINER_ENTRIES) throw new IntaglioContainerError("entry-limit", "The container has too many entries.");
  if (paths.some((path) => !safePath(path))) throw new IntaglioContainerError("unsafe-path", "The container contains an unsafe path.");
  const totalBytes = Object.values(entries).reduce((total, bytes) => total + bytes.byteLength, 0);
  if (totalBytes > MAX_CONTAINER_BYTES) throw new IntaglioContainerError("expanded-size", "The expanded project exceeds Intaglio's 1 GB limit.");
  if (file.size > 0 && totalBytes / file.size > 200) throw new IntaglioContainerError("compression-ratio", "The container has an unsafe compression ratio.");
  if (!entries["manifest.json"] || !entries["checksums.sha256"]) throw new IntaglioContainerError("manifest", "The container is missing its manifest or checksums.");
  const checksums = parseChecksums(strFromU8(entries["checksums.sha256"]));
  const contentPaths = paths.filter((path) => path !== "checksums.sha256");
  if (checksums.size !== contentPaths.length || contentPaths.some((path) => !checksums.has(path))) throw new IntaglioContainerError("checksums", "Every container entry must be covered exactly once by checksums.sha256.");
  for (const [path, expected] of checksums) {
    const bytes = entries[path];
    if (!bytes || await sha256Hex(bytes) !== expected) throw new IntaglioContainerError("checksum", `Checksum validation failed for ${path}.`);
  }
  let manifest: IntaglioContainerManifest;
  try { manifest = JSON.parse(strFromU8(entries["manifest.json"])) as IntaglioContainerManifest; }
  catch { throw new IntaglioContainerError("manifest-json", "The Intaglio manifest is not valid JSON."); }
  if (manifest.appId !== INTAGLIO_APP_ID || manifest.formatVersion !== INTAGLIO_FORMAT_VERSION || !["recipe", "project"].includes(manifest.kind)) throw new IntaglioContainerError("unsupported-version", "Only Intaglio V2 packaged files are supported.");
  const unsupportedCapability = manifest.requiredCapabilities?.find((capability) => !SUPPORTED_CAPABILITIES.has(capability));
  if (!Array.isArray(manifest.requiredCapabilities) || unsupportedCapability) throw new IntaglioContainerError("unsupported-capability", `This file requires an unsupported capability${unsupportedCapability ? `: ${unsupportedCapability}` : ""}.`);
  if (manifest.document.schemaVersion !== 2 || !validateGradeGraph(manifest.document.graph).valid) throw new IntaglioContainerError("document", "The packaged document or grade graph is invalid.");
  validatePortableJson(manifest.document);
  if (JSON.stringify(manifest.assets) !== JSON.stringify(manifest.document.assets)) throw new IntaglioContainerError("asset-table", "The manifest asset tables disagree.");
  const assetPaths = new Set<string>();
  const assetIds = new Set<string>();
  for (const asset of manifest.assets) {
    validateAssetReference(asset);
    if (assetPaths.has(asset.path) || assetIds.has(asset.id) || asset.path === "manifest.json" || asset.path === "checksums.sha256") throw new IntaglioContainerError("asset-table", "The manifest contains duplicate or reserved asset entries.");
    assetPaths.add(asset.path); assetIds.add(asset.id);
  }
  const permittedPaths = new Set(["manifest.json", "checksums.sha256", "previews/thumbnail.webp", ...assetPaths]);
  if (paths.some((path) => !permittedPaths.has(path))) throw new IntaglioContainerError("unknown-entry", "The container includes files that are not declared by its manifest.");
  if (manifest.kind === "recipe" && (manifest.document.source || manifest.assets.some((asset) => asset.kind === "source"))) throw new IntaglioContainerError("recipe-source", "A portable recipe may not contain a photograph.");
  const sourceAssets = manifest.assets.filter((asset) => asset.kind === "source");
  if (manifest.kind === "project" && (sourceAssets.length !== 1 || !manifest.document.source || manifest.document.source.id !== sourceAssets[0].id)) throw new IntaglioContainerError("project-source", "A project must declare exactly one matching original source asset.");

  const runtime: RuntimeAssetStore = { sourceFile: null, sourceUrl: null, lutFiles: new Map(), fontFiles: new Map(), comparisonFiles: new Map() };
  for (const asset of manifest.assets) {
    const bytes = entries[asset.path];
    if (!bytes || bytes.byteLength !== asset.byteLength) throw new IntaglioContainerError("asset", `Asset ${asset.id} is missing or has the wrong length.`);
    const blob = new Blob([bytes.slice().buffer], { type: asset.mimeType });
    if (asset.kind === "source") { runtime.sourceFile = blob; runtime.sourceUrl = URL.createObjectURL(blob); }
    else if (asset.kind === "lut") runtime.lutFiles.set(asset.id, blob);
    else if (asset.kind === "font") runtime.fontFiles.set(asset.id, blob);
    else runtime.comparisonFiles.set(asset.id, blob);
  }
  return { manifest, runtime };
}

export function triggerContainerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    void releaseContainerOutput(blob);
  }, 30_000);
}
