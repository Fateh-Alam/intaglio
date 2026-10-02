import type { EditorSettings, CompositionGuide, PerformanceMode, SerializableEditorSettings, WatermarkPosition, WatermarkSettings, AssetMetadataSettings } from "../types/editor";
import { IconCircle, IconCircles, IconChartLine, IconLayersIntersect, IconMovie, IconBrush, IconPhoto, IconInfoCircle, IconTypography, IconArrowsMaximize, IconSparkles, IconHistory, IconCamera, IconPalette } from "@tabler/icons-react";
import { TextOverlaySettings } from "../components/CinematicTextOverlay";
import { FORMAT } from "../lib/brand";

import { HistoryState } from "../components/HistoryPanel";

export const DEFAULT_SETTINGS: EditorSettings = {
  // Basic - Light
  contrast: 0.0,
  brightness: 0.0,
  highlights: 0.0,
  shadows: 0.0,
  whites: 0.0,
  blacks: 0.0,
  vibrance: 0.0,
  saturation: 0.0,

  // Grading
  tealOrange: 0.0,
  temperature: 0,
  tint: 0,
  skinProtect: 0,
  safeSkinEnabled: false,
  protectHighlights: false,
  grain: 0.0,
  vignette: 0.0,
  sharpness: 0.0,
  dehaze: 0.0,
  aberration: 0.0,

  // Pro
  structure: 0,
  filmBorder: false,
  filmToeStrength: 0,
  filmToeLength: 0.1,
  filmShoulderStrength: 0,
  filmShoulderLength: 1,
  filmGamma: 1,
  filmBlackLift: 0,
  filmWhiteRolloff: 0,
  colorCrossover: 0,
  lumaDesat: 0,

  // Tone Curve
  curvePoints: {
    master: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
    red: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
    green: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
    blue: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  },

  // Color Grading (Shadows, Midtones, Highlights)
  colorGrading: {
    shadows: { h: 0, s: 0, l: 0 },
    midtones: { h: 0, s: 0, l: 0 },
    highlights: { h: 0, s: 0, l: 0 },
    balance: 0,
  },

  // A/B Comparison
  compareEnabled: false,
  compareTexture: null,
  compareSplit: 0.5,

  // Halation & Bloom
  halation: 0.0,
  halationThreshold: 0.7,
  halationRadius: 1.0,
  bloom: 0.0,
  bloomThreshold: 0.8,
  bloomRadius: 1.0,

  // Lens (New)
  lensDistortion: 0.0,
  keystoneH: 0.0,
  keystoneV: 0.0,
  tiltShiftAmount: 0.0,
  tiltShiftPosition: 0.5,
  tiltShiftAngle: 0.0,

  // LUT
  lutTexture: null,
  lutStrength: 0.0,

  // Black Magic
  falseColor: false,
  anamorphicDistortion: 0.0,
  anamorphicStreaks: 0.0,

  // Directional light controls
  godLightStrength: 0.0,
  godLightX: 0.5,
  godLightY: 0.5,
  godLightColorR: 1.0,
  godLightColorG: 0.95,
  godLightColorB: 0.9,
  godLightSpecular: 0.0,
  godLightRim: 0.0,
  godLightFalloff: 1.0,

  // HSL
  targetHue: 0.0,
  hueShift: 0.0,

  // Transform
  rotate: 0.0,
  zoom: 1.0,

  // Recipe
  appliedRecipeId: null,
  recipeIntensity: 1.0,

  // Mask System
  adjustmentLayers: [],
  masks: [],

  // HSL Panel - 8 Color Channels (Hue, Saturation, Luminance)
  hslRedHue: 0.0,
  hslRedSat: 0.0,
  hslRedLum: 0.0,
  hslOrangeHue: 0.0,
  hslOrangeSat: 0.0,
  hslOrangeLum: 0.0,
  hslYellowHue: 0.0,
  hslYellowSat: 0.0,
  hslYellowLum: 0.0,
  hslGreenHue: 0.0,
  hslGreenSat: 0.0,
  hslGreenLum: 0.0,
  hslAquaHue: 0.0,
  hslAquaSat: 0.0,
  hslAquaLum: 0.0,
  hslBlueHue: 0.0,
  hslBlueSat: 0.0,
  hslBlueLum: 0.0,
  hslPurpleHue: 0.0,
  hslPurpleSat: 0.0,
  hslPurpleLum: 0.0,
  hslMagentaHue: 0.0,
  hslMagentaSat: 0.0,
  hslMagentaLum: 0.0,

  // Film Emulation
  filmEmulation: "none",
  filmEmulationStrength: 1.0,

  // UI State
  wiperActive: false,
};

export type ExportFormat = "image/jpeg" | "image/png" | "image/webp";

export type ExportRecipeId =
  | "portfolio"
  | "web-hero"
  | "client-proof"
  | "social-webp"
  | "archive-png"
  | "ig-feed"
  | "ig-square"
  | "ig-story";

export interface ExportRecipe {
  id: ExportRecipeId;
  name: string;
  description: string;
  format: ExportFormat;
  quality: number;
  scale: number;
}

export interface ExportSettings {
  format: ExportFormat;
  quality: number;
  scale: number;
  recipeId: ExportRecipeId | null;
}

export interface ProjectViewState {
  performanceMode: PerformanceMode;
  compositionGuide: CompositionGuide;
  activeVirtualCopyId: string | null;
}

export interface ImageFileInfo {
  width: number;
  height: number;
  fileType?: string;
  fileSize?: number;
}

export type FlagStatus = "unflagged" | "picked" | "rejected";
export type ColorLabel = "none" | "red" | "yellow" | "green" | "blue" | "purple";


export interface ExportSafetyWarning {
  title: string;
  detail: string;
  tone: "warn" | "info";
}

export interface VirtualCopy {
  id: string;
  name: string;
  settings: EditorSettings;
  timestamp: number;
}

export interface SerializedVirtualCopy {
  id: string;
  name: string;
  settings: SerializableEditorSettings;
  timestamp: number;
}

export interface SettingDiff {
  key: string;
  label: string;
  current: string;
  saved: string;
}

export interface ProjectSessionFile {
  app: string;
  version: string;
  createdAt?: string;
  imageName?: string;
  imageSrc: string | null;
  imageInfo?: ImageFileInfo | null;
  settings: SerializableEditorSettings;
  textOverlay?: Partial<TextOverlaySettings>;
  assetMetadata?: Partial<AssetMetadataSettings>;
  watermark?: Partial<WatermarkSettings>;
  exportSettings?: Partial<ExportSettings>;
  viewState?: Partial<ProjectViewState>;
  virtualCopies?: SerializedVirtualCopy[];
  branches?: SerializedVirtualCopy[];
}

export const ARCHIVE_FILE_EXTENSION = FORMAT.archiveExtension;
export const DEFAULT_ASSET_METADATA: AssetMetadataSettings = {
  title: "Untitled Project",
  caption: "",
  author: "",
  creator: "",
  copyright: "",
  camera: "",
  lens: "",
  iso: "",
  focalLength: "",
  aperture: "",
  shutterSpeed: "",
  date: "",
  location: "",
  description: "",
  keywords: "",
  rating: 0,
  colorLabel: "none",
  flagStatus: "unflagged",
};

export const DEFAULT_WATERMARK: WatermarkSettings = {
  enabled: false,
  text: "",
  position: "bottom-right",
  opacity: 0.55,
  size: 0.32,
};

export const COLOR_LABELS: { id: ColorLabel; label: string; color: string }[] = [
  { id: "none", label: "None", color: "transparent" },
  { id: "red", label: "Red", color: "#ef4444" },
  { id: "yellow", label: "Yellow", color: "#f59e0b" },
  { id: "green", label: "Green", color: "#22c55e" },
  { id: "blue", label: "Blue", color: "#3b82f6" },
  { id: "purple", label: "Purple", color: "#a855f7" },
];

export const WATERMARK_POSITIONS: { id: WatermarkPosition; label: string }[] = [
  { id: "top-left", label: "Top Left" },
  { id: "top-right", label: "Top Right" },
  { id: "bottom-left", label: "Bottom Left" },
  { id: "bottom-right", label: "Bottom Right" },
  { id: "center", label: "Center" },
];

export const EXPORT_RECIPES: ExportRecipe[] = [
  {
    id: "portfolio",
    name: "Portfolio HQ",
    description: "Maximum quality JPEG for personal portfolios and high-end delivery.",
    format: "image/jpeg",
    quality: 95,
    scale: 1,
  },
  {
    id: "web-hero",
    name: "Web Hero",
    description: "WebP format for fast-loading website hero headers and banners.",
    format: "image/webp",
    quality: 85,
    scale: 0.5,
  },
  {
    id: "ig-feed",
    name: "IG Feed (Portrait)",
    description: "Optimized for Instagram Feed (4:5). Exports as high-quality JPEG.",
    format: "image/jpeg",
    quality: 90,
    scale: 1,
  },
  {
    id: "ig-square",
    name: "IG Square",
    description: "Optimized for Instagram Square (1:1).",
    format: "image/jpeg",
    quality: 90,
    scale: 1,
  },
  {
    id: "ig-story",
    name: "IG Story",
    description: "Optimized for Instagram Stories (9:16).",
    format: "image/jpeg",
    quality: 90,
    scale: 1,
  },
  {
    id: "client-proof",
    name: "Client Proof",
    description: "Low-res, compressed JPEG. Automatically enables the watermark overlay.",
    format: "image/jpeg",
    quality: 60,
    scale: 0.5,
  },
  {
    id: "social-webp",
    name: "Social WebP",
    description: "Crisp social export with extra resolution headroom.",
    format: "image/webp",
    quality: 90,
    scale: 2,
  },
  {
    id: "archive-png",
    name: "Archive Lossless",
    description: "Massive, uncompressed PNG for archival or secondary grading in Photoshop.",
    format: "image/png",
    quality: 100,
    scale: 4,
  },
];

export const PROJECT_FILE_APP = FORMAT.appId;
export const PROJECT_FILE_VERSION = FORMAT.version;

export const createHistoryState = (
  settings: EditorSettings,
  action: string
): HistoryState => ({
  id: createLocalId(),
  timestamp: Date.now(),
  action,
  settings,
});

export const createLocalId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

export const cloneJson = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const serializeEditorSettings = (
  settingsToSerialize: EditorSettings
): SerializableEditorSettings => {
  const serializableSettings: Partial<EditorSettings> = {
    ...settingsToSerialize,
  };
  delete serializableSettings.lutTexture;
  delete serializableSettings.compareTexture;
  return serializableSettings as SerializableEditorSettings;
};

export const hydrateEditorSettings = (
  partialSettings: Partial<EditorSettings> = {}
): EditorSettings => ({
  ...DEFAULT_SETTINGS,
  ...partialSettings,
  curvePoints: cloneJson(
    partialSettings.curvePoints ?? DEFAULT_SETTINGS.curvePoints
  ),
  colorGrading: cloneJson(
    partialSettings.colorGrading ?? DEFAULT_SETTINGS.colorGrading
  ),
  lutTexture: null,
  compareTexture: null,
});

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

export const getImageFileInfo = (
  src: string,
  file?: File
): Promise<ImageFileInfo> =>
  new Promise((resolve, reject) => {
    const image = new globalThis.Image();
    image.onload = () =>
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        fileType: file?.type,
        fileSize: file?.size,
      });
    image.onerror = reject;
    image.src = src;
  });

export const isExportFormat = (value: unknown): value is ExportFormat =>
  value === "image/jpeg" || value === "image/png" || value === "image/webp";

export const isExportRecipeId = (value: unknown): value is ExportRecipeId =>
  EXPORT_RECIPES.some((recipe) => recipe.id === value);

export const isPerformanceMode = (value: unknown): value is PerformanceMode =>
  value === "draft" || value === "balanced" || value === "quality";

export const isCompositionGuide = (value: unknown): value is CompositionGuide =>
  value === "off" ||
  value === "thirds" ||
  value === "center" ||
  value === "golden" ||
  value === "safe";

export const isFlagStatus = (value: unknown): value is FlagStatus =>
  value === "unflagged" || value === "picked" || value === "rejected";

export const isColorLabel = (value: unknown): value is ColorLabel =>
  COLOR_LABELS.some((label) => label.id === value);

export const isWatermarkPosition = (value: unknown): value is WatermarkPosition =>
  WATERMARK_POSITIONS.some((position) => position.id === value);

export const hydrateAssetMetadata = (
  partialMetadata: Partial<AssetMetadataSettings> = {}
): AssetMetadataSettings => ({
  ...DEFAULT_ASSET_METADATA,
  ...partialMetadata,
  rating:
    typeof partialMetadata.rating === "number"
      ? Math.min(5, Math.max(0, Math.round(partialMetadata.rating)))
      : DEFAULT_ASSET_METADATA.rating,
  colorLabel: isColorLabel(partialMetadata.colorLabel)
    ? partialMetadata.colorLabel
    : DEFAULT_ASSET_METADATA.colorLabel,
  flagStatus: isFlagStatus(partialMetadata.flagStatus)
    ? partialMetadata.flagStatus
    : DEFAULT_ASSET_METADATA.flagStatus,
});

export const hydrateWatermark = (
  partialWatermark: Partial<WatermarkSettings> = {}
): WatermarkSettings => ({
  ...DEFAULT_WATERMARK,
  ...partialWatermark,
  enabled:
    typeof partialWatermark.enabled === "boolean"
      ? partialWatermark.enabled
      : DEFAULT_WATERMARK.enabled,
  position: isWatermarkPosition(partialWatermark.position)
    ? partialWatermark.position
    : DEFAULT_WATERMARK.position,
  opacity:
    typeof partialWatermark.opacity === "number"
      ? Math.min(1, Math.max(0, partialWatermark.opacity))
      : DEFAULT_WATERMARK.opacity,
  size:
    typeof partialWatermark.size === "number"
      ? Math.min(1, Math.max(0, partialWatermark.size))
      : DEFAULT_WATERMARK.size,
});

export const toFileStem = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "intaglio-session";

export const createTimestampSlug = () =>
  new Date().toISOString().replace(/[:.]/g, "-");

export const formatDiffLabel = (key: string) =>
  key
    .replace(/\./g, " / ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase());

export const formatDiffValue = (value: unknown): string => {
  if (typeof value === "number") return Number(value.toFixed(3)).toString();
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (typeof value === "string") return value || "None";
  if (value === null || value === undefined) return "None";
  return JSON.stringify(value);
};

export const collectSettingDiffs = (
  current: SerializableEditorSettings,
  saved: SerializableEditorSettings,
  prefix = ""
): SettingDiff[] => {
  const currentRecord = current as unknown as Record<string, unknown>;
  const savedRecord = saved as unknown as Record<string, unknown>;
  const keys = new Set([
    ...Object.keys(currentRecord),
    ...Object.keys(savedRecord),
  ]);
  const diffs: SettingDiff[] = [];

  keys.forEach((key) => {
    const diffKey = prefix ? `${prefix}.${key}` : key;
    const currentValue = currentRecord[key];
    const savedValue = savedRecord[key];

    if (
      currentValue &&
      savedValue &&
      typeof currentValue === "object" &&
      typeof savedValue === "object" &&
      !Array.isArray(currentValue) &&
      !Array.isArray(savedValue)
    ) {
      diffs.push(
        ...collectSettingDiffs(
          currentValue as SerializableEditorSettings,
          savedValue as SerializableEditorSettings,
          diffKey
        )
      );
      return;
    }

    if (JSON.stringify(currentValue) !== JSON.stringify(savedValue)) {
      diffs.push({
        key: diffKey,
        label: formatDiffLabel(diffKey),
        current: formatDiffValue(currentValue),
        saved: formatDiffValue(savedValue),
      });
    }
  });

  return diffs;
};

export const PERFORMANCE_MODES: {
  id: PerformanceMode;
  label: string;
  description: string;
}[] = [
  {
    id: "draft",
    label: "Draft",
    description: "Lower GPU load for weak devices.",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Default smooth editing quality.",
  },
  {
    id: "quality",
    label: "Quality",
    description: "Higher preview fidelity.",
  },
];

export const COMPOSITION_GUIDES: {
  id: CompositionGuide;
  label: string;
  description: string;
}[] = [
  { id: "off", label: "Off", description: "No guide overlay." },
  { id: "thirds", label: "Thirds", description: "Rule-of-thirds grid." },
  { id: "center", label: "Center", description: "Center crosshair." },
  { id: "golden", label: "Golden", description: "Golden-ratio grid." },
  { id: "safe", label: "Safe", description: "Title and delivery safe areas." },
];

export const EDITOR_MODULES = [
  { id: "process", label: "Process Engine", shortLabel: "Process", icon: IconLayersIntersect },
  { id: "graph", label: "Grade Graph", shortLabel: "Graph", icon: IconCircles },
  { id: "basic", label: "Development", shortLabel: "Dev", icon: IconCircle },
  { id: "films", label: "Film Room", shortLabel: "Film", icon: IconPhoto },
  { id: "curves", label: "Tone Curve", shortLabel: "Curve", icon: IconChartLine },
  { id: "hsl", label: "Colour Mixer", shortLabel: "Mixer", icon: IconPalette },
  { id: "color", label: "Profiles", shortLabel: "LUT", icon: IconMovie },
  { id: "masking", label: "Plates & Masks", shortLabel: "Masks", icon: IconBrush },
  { id: "transform", label: "Geometry", shortLabel: "Geom", icon: IconArrowsMaximize },
  { id: "effects", label: "Texture & Optics", shortLabel: "Texture", icon: IconSparkles },
  { id: "text", label: "Typography", shortLabel: "Type", icon: IconTypography },
  { id: "metadata", label: "Archive", shortLabel: "Meta", icon: IconInfoCircle },
];

export const AUXILIARY_MODULES = [
  { id: "history", label: "History", shortLabel: "Hist", icon: IconHistory },
  { id: "snapshots", label: "Snapshots", shortLabel: "Shot", icon: IconCamera },
];

export const getEditorModuleLabel = (id: string) =>
  [...EDITOR_MODULES, ...AUXILIARY_MODULES].find((module) => module.id === id)
    ?.label ?? id;
