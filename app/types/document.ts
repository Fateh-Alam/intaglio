import type { PhotoCrop, SerializableEditorSettings } from "./editor";

export const ETCH_APP_ID = "etch-darkroom" as const;
export const LEGACY_INTAGLIO_APP_ID = "intaglio-darkroom" as const;
export const INTAGLIO_APP_ID = ETCH_APP_ID;
export const SUPPORTED_CONTAINER_APP_IDS = new Set<string>([
  ETCH_APP_ID,
  LEGACY_INTAGLIO_APP_ID,
]);
export type ContainerAppId = typeof ETCH_APP_ID | typeof LEGACY_INTAGLIO_APP_ID;
export const INTAGLIO_FORMAT_VERSION = "2.0.0" as const;
export const MAX_CONTAINER_BYTES = 1_073_741_824;
export const MAX_CONTAINER_ENTRIES = 10_000;

export type AssetKind = "source" | "lut" | "font" | "preview" | "comparison";

export interface AssetReference {
  id: string;
  kind: AssetKind;
  sha256: string;
  path: string;
  mimeType: string;
  byteLength: number;
  originalName?: string;
  createdAt?: string;
  lutMetadata?: {
    size: number;
    domainMin: [number, number, number];
    domainMax: [number, number, number];
    title?: string;
  };
}

export interface SourceAsset extends AssetReference {
  kind: "source";
  width: number;
  height: number;
  orientation: number;
  cameraMetadata: Record<string, string | number | null>;
}

export interface RawDevelopState {
  enabled: boolean;
  whiteBalance: "camera" | "as-shot" | "custom";
  temperature: number;
  tint: number;
  exposureCompensation: number;
  demosaicQuality: "draft" | "balanced" | "quality";
  orientation: number;
  highlightMode: "clip" | "blend" | "reconstruct";
  blackLevel: number | null;
  whiteLevel: number | null;
  decoder: { name: "libraw"; version: string; cameraSupported: boolean } | null;
}

export interface GeometryState {
  crop: PhotoCrop;
  rotationDegrees: number;
  zoom: number;
  lensDistortion: number;
  keystoneHorizontal: number;
  keystoneVertical: number;
  anamorphicDistortion: number;
  outputAspect: number | null;
  interpolation: "linear" | "cubic";
}

export interface BrushPoint {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

export interface BrushStroke {
  id: string;
  points: BrushPoint[];
  size: number;
  feather: number;
  flow: number;
  opacity: number;
  mode: "paint" | "erase";
}

export type ImageNodeKind =
  | "source"
  | "raw-develop"
  | "geometry"
  | "develop"
  | "curve"
  | "hsl-mixer"
  | "oklch-mixer"
  | "color-wheels"
  | "lut"
  | "film"
  | "halation"
  | "bloom"
  | "optical"
  | "sharpen"
  | "plate-composite"
  | "text"
  | "watermark"
  | "display-transform"
  | "output";

export type MaskNodeKind =
  | "mask-radial"
  | "mask-linear"
  | "mask-luminance"
  | "mask-color-range"
  | "mask-brush"
  | "mask-add"
  | "mask-subtract"
  | "mask-intersect";

export type GradeNodeKind = ImageNodeKind | MaskNodeKind;
export type GradePortType = "image" | "mask";

interface GradeNodeBase<TKind extends GradeNodeKind, TParams> {
  id: string;
  kind: TKind;
  name: string;
  enabled: boolean;
  opacity: number;
  params: TParams;
  position?: { x: number; y: number };
}

export type GradeNode =
  | GradeNodeBase<ImageNodeKind, Record<string, unknown>>
  | GradeNodeBase<"mask-radial", { center: { x: number; y: number }; radiusX: number; radiusY: number; feather: number; invert: boolean }>
  | GradeNodeBase<"mask-linear", { angle: number; position: number; feather: number; invert: boolean }>
  | GradeNodeBase<"mask-luminance", { target: number; range: number; feather: number; invert: boolean }>
  | GradeNodeBase<"mask-color-range", { targetHue: number; hueWidth: number; targetChroma: number; chromaRange: number; feather: number; invert: boolean }>
  | GradeNodeBase<"mask-brush", { strokes: BrushStroke[]; invert: boolean }>
  | GradeNodeBase<"mask-add" | "mask-subtract" | "mask-intersect", Record<string, never>>;

export interface GradeEdge {
  id: string;
  sourceNodeId: string;
  sourcePort: GradePortType;
  targetNodeId: string;
  targetPort: GradePortType;
  order: number;
}

export interface GradeGraph {
  version: 2;
  nodes: GradeNode[];
  edges: GradeEdge[];
  outputNodeId: string;
}

export interface Plate {
  id: string;
  name: string;
  nodeIds: string[];
  enabled: boolean;
  opacity: number;
  blendMode: "normal";
  maskOutputNodeId: string | null;
}

export interface TextBlock {
  id: string;
  role: "subtitle" | "date" | "location" | "billing";
  enabled: boolean;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  fontAssetId: string | null;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  letterSpacing: number;
  lineHeight: number;
  align: "left" | "center" | "right";
  color: string;
  opacity: number;
  shadow: { color: string; blur: number; offsetX: number; offsetY: number };
}

export interface WatermarkDocument {
  enabled: boolean;
  text: string;
  x: number;
  y: number;
  anchor: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  fontAssetId: string | null;
  fontFamily: string;
  fontSize: number;
  opacity: number;
}

export interface OverlayDocument {
  textBlocks: TextBlock[];
  watermark: WatermarkDocument;
}

export interface ExportProfile {
  id: string;
  name: string;
  format: "image/jpeg" | "image/png" | "image/webp";
  width: number | null;
  height: number | null;
  scale: number;
  quality: number;
  filenameTemplate: string;
  watermarkPolicy: "document" | "always" | "never";
  metadataPolicy: "preserve-rights" | "strip";
}

export interface DocumentHistoryEntry {
  id: string;
  timestamp: number;
  action: string;
  settings: SerializableEditorSettings;
}

export interface DocumentVirtualCopy {
  id: string;
  name: string;
  timestamp: number;
  settings: SerializableEditorSettings;
}

export interface IntaglioDocumentV2 {
  schemaVersion: 2;
  id: string;
  title: string;
  source: SourceAsset | null;
  rawDevelop: RawDevelopState;
  geometry: GeometryState;
  graph: GradeGraph;
  plates: Plate[];
  overlays: OverlayDocument;
  assets: AssetReference[];
  exportProfiles: ExportProfile[];
  activeExportProfileId: string | null;
  history: DocumentHistoryEntry[];
  historyIndex: number;
  virtualCopies: DocumentVirtualCopy[];
  activeVirtualCopyId: string | null;
  metadata: Record<string, string | number | string[] | null>;
  editorSettingsSnapshot: SerializableEditorSettings;
  createdAt: string;
  updatedAt: string;
}

export interface IntaglioContainerManifest {
  appId: ContainerAppId;
  formatVersion: typeof INTAGLIO_FORMAT_VERSION;
  kind: "recipe" | "project";
  createdAt: string;
  document: IntaglioDocumentV2;
  assets: AssetReference[];
  requiredCapabilities: string[];
}

export interface RuntimeAssetStore {
  sourceFile: File | Blob | null;
  sourceUrl: string | null;
  lutFiles: Map<string, Blob>;
  fontFiles: Map<string, Blob>;
  comparisonFiles: Map<string, Blob>;
  rawWorkingBuffer?: { width: number; height: number; pixels: Uint16Array };
}

export const DEFAULT_RAW_DEVELOP_STATE: RawDevelopState = {
  enabled: false,
  whiteBalance: "camera",
  temperature: 6500,
  tint: 0,
  exposureCompensation: 0,
  demosaicQuality: "balanced",
  orientation: 1,
  highlightMode: "blend",
  blackLevel: null,
  whiteLevel: null,
  decoder: null,
};

export const DEFAULT_GEOMETRY_STATE: GeometryState = {
  crop: { x: 0, y: 0, width: 1, height: 1 },
  rotationDegrees: 0,
  zoom: 1,
  lensDistortion: 0,
  keystoneHorizontal: 0,
  keystoneVertical: 0,
  anamorphicDistortion: 0,
  outputAspect: null,
  interpolation: "linear",
};
