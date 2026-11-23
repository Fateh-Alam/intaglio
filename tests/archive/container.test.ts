import { describe, expect, it } from "vitest";
import { unzipSync, zipSync, strToU8 } from "fflate";
import { DEFAULT_SETTINGS, DEFAULT_ASSET_METADATA, DEFAULT_WATERMARK, serializeEditorSettings } from "../../app/editor/pageTypes";
import { DEFAULT_TEXT_OVERLAY } from "../../app/components/CinematicTextOverlay";
import { createIntaglioDocument, createRuntimeAssetStore } from "../../app/lib/intaglioDocument";
import { assertContainerStorageCapacity, createIntaglioContainer, openIntaglioContainer, preflightContainerStorage } from "../../app/lib/intaglioContainer";

const replaceManifest = async (archive: Blob, update: (manifest: Record<string, unknown>) => void): Promise<Blob> => {
  const entries = unzipSync(new Uint8Array(await archive.arrayBuffer()));
  const manifest = JSON.parse(new TextDecoder().decode(entries["manifest.json"])) as Record<string, unknown>;
  update(manifest);
  entries["manifest.json"] = strToU8(JSON.stringify(manifest));
  const manifestBytes = entries["manifest.json"];
  const digestInput = manifestBytes.buffer.slice(manifestBytes.byteOffset, manifestBytes.byteOffset + manifestBytes.byteLength) as ArrayBuffer;
  const hash = await crypto.subtle.digest("SHA-256", digestInput);
  const checksum = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  entries["checksums.sha256"] = strToU8(`${checksum}  manifest.json\n`);
  return new Blob([zipSync(entries).slice().buffer]);
};

describe("Etch V2 containers", () => {
  it("preflights storage with deterministic size-specific failures", async () => {
    expect(() => assertContainerStorageCapacity(80 * 1024 * 1024, 120 * 1024 * 1024)).not.toThrow();
    expect(() => assertContainerStorageCapacity(80 * 1024 * 1024, null)).not.toThrow();
    expect(() => assertContainerStorageCapacity(80 * 1024 * 1024, 40 * 1024 * 1024)).toThrow(/needs about 80 MB.*40 MB available/i);
    await expect(preflightContainerStorage(1024)).resolves.toMatchObject({ requiredBytes: 1024 });
  });

  it("round-trips a portable project and preserves original bytes", async () => {
    const source = new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: "image/png" });
    const runtime = createRuntimeAssetStore(); runtime.sourceFile = source;
    const savedSettings = serializeEditorSettings({ ...DEFAULT_SETTINGS, brightness: 0.75 });
    const document = await createIntaglioDocument({
      title: "Fixture",
      sourceFile: source,
      sourceName: "fixture.png",
      imageInfo: { width: 2, height: 2, fileType: "image/png", fileSize: source.size },
      settings: DEFAULT_SETTINGS,
      textOverlay: DEFAULT_TEXT_OVERLAY,
      watermark: DEFAULT_WATERMARK,
      metadata: DEFAULT_ASSET_METADATA,
      exportFormat: "image/png",
      exportQuality: 100,
      exportScale: 1,
      exportRecipeId: null,
      history: [{ id: "history-1", timestamp: 42, action: "Exposure", settings: savedSettings }],
      historyIndex: 0,
      virtualCopies: [{ id: "copy-1", name: "Alternate", timestamp: 43, settings: savedSettings }],
      activeVirtualCopyId: "copy-1",
    });
    const archive = await createIntaglioContainer("project", document, runtime);
    const restored = await openIntaglioContainer(archive);
    expect(restored.manifest.formatVersion).toBe("2.0.0");
    expect(new Uint8Array(await restored.runtime.sourceFile!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    expect(restored.manifest.document.history[0].settings.brightness).toBe(0.75);
    expect(restored.manifest.document.virtualCopies[0].name).toBe("Alternate");
    expect(restored.manifest.document.activeVirtualCopyId).toBe("copy-1");
  });

  it("rejects legacy JSON and traversal entries", async () => {
    await expect(openIntaglioContainer(new Blob(["{}"]))).rejects.toThrow(/packaged Etch/i);
    const malicious = zipSync({ "../escape": strToU8("bad"), "manifest.json": strToU8("{}"), "checksums.sha256": strToU8("") });
    expect(Object.keys(unzipSync(malicious))).toContain("../escape");
    await expect(openIntaglioContainer(new Blob([malicious.slice().buffer]))).rejects.toThrow(/unsafe path/i);
  });

  it("opens legacy intaglio-darkroom V2 archives alongside etch-darkroom archives", async () => {
    const runtime = createRuntimeAssetStore();
    const document = await createIntaglioDocument({
      title: "Legacy Compat Recipe",
      sourceFile: null,
      sourceName: "",
      imageInfo: null,
      settings: { ...DEFAULT_SETTINGS, filmEmulation: "wes_anderson" },
      textOverlay: DEFAULT_TEXT_OVERLAY,
      watermark: DEFAULT_WATERMARK,
      metadata: DEFAULT_ASSET_METADATA,
      exportFormat: "image/png",
      exportQuality: 100,
      exportScale: 1,
      exportRecipeId: null,
    });
    const currentArchive = await createIntaglioContainer("recipe", document, runtime);
    const currentRestored = await openIntaglioContainer(currentArchive);
    expect(currentRestored.manifest.appId).toBe("etch-darkroom");

    const legacyArchive = await replaceManifest(currentArchive, (manifest) => {
      manifest.appId = "intaglio-darkroom";
    });
    const legacyRestored = await openIntaglioContainer(legacyArchive);
    expect(legacyRestored.manifest.appId).toBe("intaglio-darkroom");
    expect(legacyRestored.manifest.document.editorSettingsSnapshot.filmEmulation).toBe("wes_anderson");
  });

  it("rejects unknown required capabilities before restoring the document", async () => {
    const runtime = createRuntimeAssetStore();
    const document = await createIntaglioDocument({ title: "Recipe", sourceFile: null, sourceName: "", imageInfo: null, settings: DEFAULT_SETTINGS, textOverlay: DEFAULT_TEXT_OVERLAY, watermark: DEFAULT_WATERMARK, metadata: DEFAULT_ASSET_METADATA, exportFormat: "image/png", exportQuality: 100, exportScale: 1, exportRecipeId: null });
    const recipe = await createIntaglioContainer("recipe", document, runtime);
    const unsupported = await replaceManifest(recipe, (manifest) => { manifest.requiredCapabilities = ["grade-graph-v2", "future-neural-node"]; });
    await expect(openIntaglioContainer(unsupported)).rejects.toThrow(/unsupported capability/i);
  });

  it("rejects entries omitted from the manifest and checksum table", async () => {
    const runtime = createRuntimeAssetStore();
    const document = await createIntaglioDocument({ title: "Recipe", sourceFile: null, sourceName: "", imageInfo: null, settings: DEFAULT_SETTINGS, textOverlay: DEFAULT_TEXT_OVERLAY, watermark: DEFAULT_WATERMARK, metadata: DEFAULT_ASSET_METADATA, exportFormat: "image/png", exportQuality: 100, exportScale: 1, exportRecipeId: null });
    const recipe = await createIntaglioContainer("recipe", document, runtime);
    const entries = unzipSync(new Uint8Array(await recipe.arrayBuffer()));
    entries["assets/luts/undeclared.cube"] = strToU8("LUT_3D_SIZE 2");
    const tampered = new Blob([zipSync(entries).slice().buffer]);
    await expect(openIntaglioContainer(tampered)).rejects.toThrow(/covered exactly once/i);
  });

  it("rejects runtime resources and local URLs inside portable document data", async () => {
    const runtime = createRuntimeAssetStore();
    const document = await createIntaglioDocument({ title: "Recipe", sourceFile: null, sourceName: "", imageInfo: null, settings: DEFAULT_SETTINGS, textOverlay: DEFAULT_TEXT_OVERLAY, watermark: DEFAULT_WATERMARK, metadata: DEFAULT_ASSET_METADATA, exportFormat: "image/png", exportQuality: 100, exportScale: 1, exportRecipeId: null });
    const recipe = await createIntaglioContainer("recipe", document, runtime);
    const runtimeKey = await replaceManifest(recipe, (manifest) => {
      const packagedDocument = manifest.document as Record<string, unknown>;
      packagedDocument.compareTexture = { id: "gpu-resource" };
    });
    await expect(openIntaglioContainer(runtimeKey)).rejects.toThrow(/forbidden runtime key/i);
    const localUrl = await replaceManifest(recipe, (manifest) => {
      const packagedDocument = manifest.document as Record<string, unknown>;
      packagedDocument.previewUrl = "blob:https://intaglio.app/local-object";
    });
    await expect(openIntaglioContainer(localUrl)).rejects.toThrow(/local runtime reference/i);
  });

  it("keeps comparison snapshots project-only while embedding reusable recipe assets", async () => {
    const lut = new Blob(["LUT_3D_SIZE 2\n0 0 0\n"], { type: "application/x-cube-lut" });
    const comparison = new Blob([new Uint8Array([9, 8, 7])], { type: "image/webp" });
    const runtime = createRuntimeAssetStore();
    runtime.lutFiles.set("lut-fixture", lut);
    runtime.comparisonFiles.set("comparison-fixture", comparison);
    const lutHash = await hashBlob(lut);
    const comparisonHash = await hashBlob(comparison);
    const assets = [
      { id: "lut-fixture", kind: "lut" as const, sha256: lutHash, path: `assets/luts/${lutHash}.cube`, mimeType: lut.type, byteLength: lut.size },
      { id: "comparison-fixture", kind: "comparison" as const, sha256: comparisonHash, path: `assets/comparisons/${comparisonHash}.webp`, mimeType: comparison.type, byteLength: comparison.size },
    ];
    const document = await createIntaglioDocument({ title: "Recipe", sourceFile: null, sourceName: "", imageInfo: null, settings: DEFAULT_SETTINGS, textOverlay: DEFAULT_TEXT_OVERLAY, watermark: DEFAULT_WATERMARK, metadata: DEFAULT_ASSET_METADATA, exportFormat: "image/png", exportQuality: 100, exportScale: 1, exportRecipeId: null, assets, history: [{ id: "history", timestamp: 1, action: "Not reusable", settings: serializeEditorSettings(DEFAULT_SETTINGS) }], virtualCopies: [{ id: "copy", name: "Project only", timestamp: 2, settings: serializeEditorSettings(DEFAULT_SETTINGS) }] });
    const restored = await openIntaglioContainer(await createIntaglioContainer("recipe", document, runtime));
    expect(restored.manifest.assets.map((asset) => asset.kind)).toEqual(["lut"]);
    expect(restored.runtime.lutFiles.get("lut-fixture")).toBeDefined();
    expect(restored.runtime.comparisonFiles.size).toBe(0);
    expect(restored.manifest.document.history).toEqual([]);
    expect(restored.manifest.document.virtualCopies).toEqual([]);
  });
});

async function hashBlob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
