import type { TextOverlaySettings } from "../components/CinematicTextOverlay";
import type { AssetMetadataSettings, EditorSettings, WatermarkSettings } from "../types/editor";
import {
  DEFAULT_GEOMETRY_STATE,
  DEFAULT_RAW_DEVELOP_STATE,
  INTAGLIO_FORMAT_VERSION,
  type AssetReference,
  type DocumentHistoryEntry,
  type DocumentVirtualCopy,
  type GradeGraph,
  type RawDevelopState,
  type IntaglioDocumentV2,
  type RuntimeAssetStore,
  type SourceAsset,
} from "../types/document";
import type { ExportFormat, ExportRecipeId, ImageFileInfo } from "../editor/pageTypes";
import { serializeEditorSettings } from "../editor/pageTypes";
import { createDefaultGradeGraph } from "./gradeGraph";
import { sha256Hex } from "./crypto";

export const createRuntimeAssetStore = (): RuntimeAssetStore => ({
  sourceFile: null,
  sourceUrl: null,
  lutFiles: new Map(),
  fontFiles: new Map(),
  comparisonFiles: new Map(),
});

export interface DocumentAdapterInput {
  id?: string;
  title: string;
  sourceFile: File | Blob | null;
  sourceName: string;
  imageInfo: ImageFileInfo | null;
  settings: EditorSettings;
  textOverlay: TextOverlaySettings;
  watermark: WatermarkSettings;
  metadata: AssetMetadataSettings;
  exportFormat: ExportFormat;
  exportQuality: number;
  exportScale: number;
  exportRecipeId: ExportRecipeId | null;
  assets?: AssetReference[];
  graph?: GradeGraph;
  rawDevelop?: RawDevelopState;
  cameraMetadata?: SourceAsset["cameraMetadata"];
  history?: DocumentHistoryEntry[];
  historyIndex?: number;
  virtualCopies?: DocumentVirtualCopy[];
  activeVirtualCopyId?: string | null;
}

const positionForWatermark = (watermark: WatermarkSettings): { x: number; y: number } => {
  const inset = 0.04;
  switch (watermark.position) {
    case "top-left": return { x: inset, y: inset };
    case "top-right": return { x: 1 - inset, y: inset };
    case "bottom-left": return { x: inset, y: 1 - inset };
    case "bottom-right": return { x: 1 - inset, y: 1 - inset };
    default: return { x: 0.5, y: 0.5 };
  }
};

export async function createIntaglioDocument(input: DocumentAdapterInput): Promise<IntaglioDocumentV2> {
  const now = new Date().toISOString();
  let source: SourceAsset | null = null;
  const assets = [...(input.assets ?? [])];
  if (input.sourceFile && input.imageInfo) {
    const sha256 = await sha256Hex(input.sourceFile);
    const extension = input.sourceName.split(".").pop()?.toLowerCase() || "bin";
    source = {
      id: `source-${sha256.slice(0, 16)}`,
      kind: "source",
      sha256,
      path: `assets/source/${sha256}.${extension}`,
      mimeType: input.sourceFile.type || input.imageInfo.fileType || "application/octet-stream",
      byteLength: input.sourceFile.size,
      originalName: input.sourceName,
      width: input.imageInfo.width,
      height: input.imageInfo.height,
      orientation: 1,
      cameraMetadata: input.cameraMetadata ?? {},
    };
    assets.push(source);
  }

  const watermarkPosition = positionForWatermark(input.watermark);
  const embeddedFont = assets.find((asset) => asset.kind === "font");
  const textBlocks = [
    { id: "subtitle", role: "subtitle" as const, enabled: input.textOverlay.subtitleEnabled, text: input.textOverlay.subtitleText, x: 0.5 + input.textOverlay.subtitleX / 100, y: 1 - input.textOverlay.subtitleY / 100 },
    { id: "date", role: "date" as const, enabled: input.textOverlay.dateEnabled, text: [input.textOverlay.dateText, input.textOverlay.locationText].filter(Boolean).join(" · "), x: 0.5 + input.textOverlay.dateX / 100, y: 0.2 + input.textOverlay.dateY / 100 },
    { id: "billing", role: "billing" as const, enabled: input.textOverlay.billingBlockEnabled, text: input.textOverlay.billingBlockText, x: 0.5 + input.textOverlay.billingX / 100, y: 1 - input.textOverlay.billingY / 100 },
  ].map((block) => ({
    ...block,
    maxWidth: 0.9,
    fontAssetId: input.textOverlay.customFontEnabled ? embeddedFont?.id ?? null : null,
    fontFamily: input.textOverlay.customFontEnabled ? input.textOverlay.customFontName : "Inter",
    fontSize: input.textOverlay.fontSize,
    fontWeight: Number(input.textOverlay.customFontWeight) || 400,
    fontStyle: input.textOverlay.customFontStyle,
    letterSpacing: input.textOverlay.letterSpacing,
    lineHeight: input.textOverlay.lineHeight,
    align: input.textOverlay.textAlign === "justify" ? "left" as const : input.textOverlay.textAlign,
    color: "#ffffff",
    opacity: input.textOverlay.opacity,
    shadow: { color: input.textOverlay.shadowColor, blur: input.textOverlay.shadowBlur, offsetX: 0, offsetY: input.textOverlay.shadowDistance },
  }));

  const graph = structuredClone(input.graph ?? createDefaultGradeGraph());
  for (const mask of input.settings.masks) {
    const kind = mask.type === "radial" ? "mask-radial" : mask.type === "linear" ? "mask-linear" : mask.type === "luminosity" ? "mask-luminance" : mask.type === "colorRange" ? "mask-color-range" : "mask-brush";
    const params = mask.type === "brush"
      ? { strokes: mask.params.strokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ x: point.x, y: point.y, pressure: point.pressure ?? 1, time: point.t })) })), invert: false }
      : { ...mask.params, invert: "invert" in mask.params ? mask.params.invert : false };
    if (!graph.nodes.some((node) => node.id === mask.id)) graph.nodes.push({ id: mask.id, kind, name: mask.name, enabled: true, opacity: mask.opacity, params } as import("../types/document").GradeNode);
    if (!graph.edges.some((edge) => edge.sourceNodeId === mask.id)) graph.edges.push({ id: `edge-${mask.id}-plates`, sourceNodeId: mask.id, sourcePort: "mask", targetNodeId: "plates", targetPort: "mask", order: graph.edges.filter((edge) => edge.targetNodeId === "plates" && edge.targetPort === "mask").length });
  }

  return {
    schemaVersion: 2,
    id: input.id ?? crypto.randomUUID(),
    title: input.title,
    source,
    rawDevelop: input.rawDevelop ?? { ...DEFAULT_RAW_DEVELOP_STATE },
    geometry: {
      ...DEFAULT_GEOMETRY_STATE,
      rotationDegrees: input.settings.rotate,
      zoom: Math.max(0.01, input.settings.zoom || 1),
      lensDistortion: input.settings.lensDistortion,
      keystoneHorizontal: input.settings.keystoneH,
      keystoneVertical: input.settings.keystoneV,
      anamorphicDistortion: input.settings.anamorphicDistortion,
    },
    graph,
    plates: [
      { id: "base", name: "Base Emulsion", nodeIds: ["develop", "curve", "oklch", "wheels"], enabled: true, opacity: 1, blendMode: "normal", maskOutputNodeId: null },
      ...input.settings.adjustmentLayers.map((layer) => ({ id: layer.id, name: layer.name, nodeIds: [], enabled: true, opacity: layer.opacity, blendMode: "normal" as const, maskOutputNodeId: layer.maskIds.at(-1) ?? null })),
    ],
    overlays: {
      textBlocks,
      watermark: {
        enabled: input.watermark.enabled,
        text: input.watermark.text,
        x: watermarkPosition.x,
        y: watermarkPosition.y,
        anchor: input.watermark.position,
        fontAssetId: null,
        fontFamily: "Inter",
        fontSize: input.watermark.size,
        opacity: input.watermark.opacity,
      },
    },
    assets,
    exportProfiles: [{
      id: input.exportRecipeId ?? "custom",
      name: input.exportRecipeId ?? "Custom Delivery",
      format: input.exportFormat,
      width: null,
      height: null,
      scale: input.exportScale,
      quality: input.exportQuality / 100,
      filenameTemplate: "{source}-{timestamp}",
      watermarkPolicy: "document",
      metadataPolicy: "preserve-rights",
    }],
    activeExportProfileId: input.exportRecipeId ?? "custom",
    history: input.history ?? [],
    historyIndex: Math.max(0, Math.min(input.historyIndex ?? 0, Math.max(0, (input.history?.length ?? 1) - 1))),
    virtualCopies: input.virtualCopies ?? [],
    activeVirtualCopyId: input.activeVirtualCopyId ?? null,
    metadata: { ...input.metadata },
    editorSettingsSnapshot: serializeEditorSettings(input.settings),
    createdAt: now,
    updatedAt: now,
  };
}

export const INTAGLIO_DOCUMENT_VERSION = INTAGLIO_FORMAT_VERSION;
