"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { FILM_EMULATIONS } from "../lib/filmEmulations";
import {
  IconDownload,
  IconUpload,
  IconRotateClockwise,
  IconZoomIn,
  IconSun,
  IconContrast,
  IconPalette,
  IconAperture,
  IconBolt,
  IconBulb,
  IconEye,
  IconPhoto,
  IconAdjustmentsHorizontal,
  IconTypography,
  IconMapPin,
  IconSparkles,
  IconMovie,
  IconLayersIntersect,
  IconArrowsMaximize,
  IconCircle,
  IconDeviceDesktop,
  IconPerspective,
  IconDroplet,
  IconChevronRight,
  IconDeviceFloppy,
  IconFileCode,
  IconHistory,
  IconChartLine,
  IconCircles,
  IconCamera,
  IconX,
  IconMenu2,
  IconMoon,
  IconCircleFilled,
  IconBrush,
  IconChevronLeft,
  IconMinus,
  IconMaximize,
  IconInfoCircle,
  IconCommand,
} from "@tabler/icons-react";
import { toPng } from "html-to-image";
import {
  DEFAULT_TEXT_OVERLAY,
  TextOverlaySettings,
} from "../components/CinematicTextOverlay";
import CinematicTextControls from "../components/CinematicTextControls";
import ControlGroup from "../components/ControlGroup";
import Slider from "../components/Slider";
import HistoryPanel, { HistoryState } from "../components/HistoryPanel";
import CurveEditor from "../components/CurveEditor";
import ColorWheel from "../components/ColorWheel";
import { solveCatmullRom } from "../utils/spline";
import * as THREE from "three";
import { parseCubeLUT } from "../utils/lutParser";
import { generatePaletteHeist2DLUT } from "../utils/colorTransfer";
import TutorialModal, { TutorialTrigger } from "../components/TutorialModal";
import PresetCreatorModal from "../components/PresetCreatorModal";
import ReferenceViewer from "../components/ReferenceViewer";
import MobileLimitationModal from "../components/MobileLimitationModal";
import LUTCreatorModal from "../components/LUTCreatorModal";
import VideoGradingPanel from "../components/VideoGradingPanel";
import StartScreen from "../components/StartScreen";
import { CommandBar, ShortcutHelp, type AppCommand } from "../components/CommandBar";
import { FORMAT, STORAGE_KEYS } from "../lib/brand";
import {
  TUTORIAL_CONTENT,
  getSeenTutorials,
  markTutorialSeen,
} from "../utils/tutorialContent";
import type {
  EditorSettings,
  EditorSettingKey,
  EditorSettingValue,
  CompositionGuide,
  HistogramData,
  ImageBounds,
  PerformanceMode,
  SerializableEditorSettings,
  WatermarkPosition,
  WatermarkSettings,
} from "../types/editor";

// Dynamic import for the WebGL component to avoid SSR issues
const CinematicEditor = dynamic(() => import("../components/CinematicEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-white/20 font-mono text-sm">
      INITIALIZING RENDER ENGINE...
    </div>
  ),
});

const DEFAULT_SETTINGS: EditorSettings = {
  // Basic - Light
  contrast: 0.0,
  brightness: 0.0,
  highlights: 0.0,
  shadows: 0.0,
  whites: 0.0,
  blacks: 0.0,
  vibrance: 0.0,

  // Grading
  tealOrange: 0.0,
  temperature: 0.0,
  tint: 0.0,

  // Features
  skinProtect: 0.0,
  grain: 0.0,
  vignette: 0.0,
  sharpness: 0.0,
  dehaze: 0.0,
  aberration: 0.0,

  // Pro
  structure: 0.0,
  filmBorder: false,

  // Tone Curve
  toneCurveTexture: null,
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

  // Masking - Radial Gradient
  radialMaskEnabled: false,
  radialMaskX: 0.5,
  radialMaskY: 0.5,
  radialMaskRadius: 0.5,
  radialMaskFeather: 0.3,
  radialMaskInvert: false,
  radialMaskExposure: 0.0,
  radialMaskContrast: 0.0,
  radialMaskSaturation: 0.0,

  // Masking - Linear Gradient
  linearMaskEnabled: false,
  linearMaskAngle: 0.0,
  linearMaskPosition: 0.5,
  linearMaskFeather: 0.3,
  linearMaskExposure: 0.0,
  linearMaskContrast: 0.0,

  // Masking - Luminosity
  luminosityMaskEnabled: false,
  luminosityMaskTarget: 0.5, // 0=shadows, 0.5=mids, 1=highlights
  luminosityMaskRange: 0.3,
  luminosityMaskExposure: 0.0,
  luminosityMaskSaturation: 0.0,

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

type ExportFormat = "image/jpeg" | "image/png" | "image/webp";

type ExportRecipeId =
  | "portfolio"
  | "web-hero"
  | "client-proof"
  | "social-webp"
  | "archive-png";

interface ExportRecipe {
  id: ExportRecipeId;
  name: string;
  description: string;
  format: ExportFormat;
  quality: number;
  scale: number;
}

interface ExportSettings {
  format: ExportFormat;
  quality: number;
  scale: number;
  recipeId: ExportRecipeId | null;
}

interface ProjectViewState {
  performanceMode: PerformanceMode;
  compositionGuide: CompositionGuide;
  activeVirtualCopyId: string | null;
}

interface ImageFileInfo {
  width: number;
  height: number;
  fileType?: string;
  fileSize?: number;
}

type FlagStatus = "unflagged" | "picked" | "rejected";
type ColorLabel = "none" | "red" | "yellow" | "green" | "blue" | "purple";

interface AssetMetadataSettings {
  title: string;
  caption: string;
  creator: string;
  copyright: string;
  keywords: string;
  rating: number;
  colorLabel: ColorLabel;
  flagStatus: FlagStatus;
}

interface ExportSafetyWarning {
  title: string;
  detail: string;
  tone: "warn" | "info";
}

interface VirtualCopy {
  id: string;
  name: string;
  settings: EditorSettings;
  timestamp: number;
}

interface SerializedVirtualCopy {
  id: string;
  name: string;
  settings: SerializableEditorSettings;
  timestamp: number;
}

interface SettingDiff {
  key: string;
  label: string;
  current: string;
  saved: string;
}

interface ProjectSessionFile {
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

const ARCHIVE_FILE_EXTENSION = FORMAT.archiveExtension;
const DEFAULT_ASSET_METADATA: AssetMetadataSettings = {
  title: "",
  caption: "",
  creator: "",
  copyright: "",
  keywords: "",
  rating: 0,
  colorLabel: "none",
  flagStatus: "unflagged",
};

const DEFAULT_WATERMARK: WatermarkSettings = {
  enabled: false,
  text: "",
  position: "bottom-right",
  opacity: 0.55,
  size: 0.32,
};

const COLOR_LABELS: { id: ColorLabel; label: string; color: string }[] = [
  { id: "none", label: "None", color: "transparent" },
  { id: "red", label: "Red", color: "#ef4444" },
  { id: "yellow", label: "Yellow", color: "#f59e0b" },
  { id: "green", label: "Green", color: "#22c55e" },
  { id: "blue", label: "Blue", color: "#3b82f6" },
  { id: "purple", label: "Purple", color: "#a855f7" },
];

const WATERMARK_POSITIONS: { id: WatermarkPosition; label: string }[] = [
  { id: "top-left", label: "Top Left" },
  { id: "top-right", label: "Top Right" },
  { id: "bottom-left", label: "Bottom Left" },
  { id: "bottom-right", label: "Bottom Right" },
  { id: "center", label: "Center" },
];

const EXPORT_RECIPES: ExportRecipe[] = [
  {
    id: "portfolio",
    name: "Portfolio JPG",
    description: "High quality delivery for portfolio and archive previews.",
    format: "image/jpeg",
    quality: 95,
    scale: 2,
  },
  {
    id: "web-hero",
    name: "Website Hero",
    description: "Clean WebP output for large web placements.",
    format: "image/webp",
    quality: 88,
    scale: 1,
  },
  {
    id: "client-proof",
    name: "Client Proof",
    description: "Balanced JPEG proof with modest file size.",
    format: "image/jpeg",
    quality: 82,
    scale: 1,
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
    name: "Archive PNG",
    description: "Lossless PNG export for design handoff.",
    format: "image/png",
    quality: 100,
    scale: 4,
  },
];

const PROJECT_FILE_APP = FORMAT.appId;
const PROJECT_FILE_VERSION = FORMAT.version;

const createHistoryState = (
  settings: EditorSettings,
  action: string
): HistoryState => ({
  id: createLocalId(),
  timestamp: Date.now(),
  action,
  settings,
});

const createLocalId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

const cloneJson = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const serializeEditorSettings = (
  settingsToSerialize: EditorSettings
): SerializableEditorSettings => {
  const serializableSettings: Partial<EditorSettings> = {
    ...settingsToSerialize,
  };
  delete serializableSettings.lutTexture;
  delete serializableSettings.toneCurveTexture;
  delete serializableSettings.compareTexture;
  return serializableSettings as SerializableEditorSettings;
};

const hydrateEditorSettings = (
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
  toneCurveTexture: null,
  compareTexture: null,
});

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const getImageFileInfo = (
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

const isExportFormat = (value: unknown): value is ExportFormat =>
  value === "image/jpeg" || value === "image/png" || value === "image/webp";

const isExportRecipeId = (value: unknown): value is ExportRecipeId =>
  EXPORT_RECIPES.some((recipe) => recipe.id === value);

const isPerformanceMode = (value: unknown): value is PerformanceMode =>
  value === "draft" || value === "balanced" || value === "quality";

const isCompositionGuide = (value: unknown): value is CompositionGuide =>
  value === "off" ||
  value === "thirds" ||
  value === "center" ||
  value === "golden" ||
  value === "safe";

const isFlagStatus = (value: unknown): value is FlagStatus =>
  value === "unflagged" || value === "picked" || value === "rejected";

const isColorLabel = (value: unknown): value is ColorLabel =>
  COLOR_LABELS.some((label) => label.id === value);

const isWatermarkPosition = (value: unknown): value is WatermarkPosition =>
  WATERMARK_POSITIONS.some((position) => position.id === value);

const hydrateAssetMetadata = (
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

const hydrateWatermark = (
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

const isProjectSessionFile = (value: unknown): value is ProjectSessionFile => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ProjectSessionFile>;
  return (
    (candidate.app === PROJECT_FILE_APP ||
      (FORMAT.legacyAppIds as readonly string[]).includes(
        candidate.app ?? ""
      )) &&
    candidate.version === PROJECT_FILE_VERSION &&
    !!candidate.settings &&
    typeof candidate.settings === "object"
  );
};

const toFileStem = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "ormond-session";

const createTimestampSlug = () =>
  new Date().toISOString().replace(/[:.]/g, "-");

const downloadTextFile = (filename: string, text: string) => {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const formatDiffLabel = (key: string) =>
  key
    .replace(/\./g, " / ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase());

const formatDiffValue = (value: unknown): string => {
  if (typeof value === "number") return Number(value.toFixed(3)).toString();
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (typeof value === "string") return value || "None";
  if (value === null || value === undefined) return "None";
  return JSON.stringify(value);
};

const collectSettingDiffs = (
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

const PERFORMANCE_MODES: {
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

const COMPOSITION_GUIDES: {
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

const EDITOR_MODULES = [
  { id: "basic", label: "Develop", shortLabel: "Dev", icon: IconCircle },
  { id: "curves", label: "Tone Curve", shortLabel: "Curve", icon: IconChartLine },
  { id: "hsl", label: "Color Mixer", shortLabel: "Mixer", icon: IconLayersIntersect },
  { id: "color", label: "Profiles", shortLabel: "LUT", icon: IconMovie },
  { id: "masking", label: "Masks", shortLabel: "Mask", icon: IconBrush },
  { id: "films", label: "Film Room", shortLabel: "Film", icon: IconPhoto },
  { id: "metadata", label: "Metadata", shortLabel: "Meta", icon: IconInfoCircle },
  { id: "text", label: "Typography", shortLabel: "Type", icon: IconTypography },
  { id: "transform", label: "Geometry", shortLabel: "Geom", icon: IconArrowsMaximize },
  { id: "effects", label: "Effects", shortLabel: "FX", icon: IconSparkles },
];

const AUXILIARY_MODULES = [
  { id: "history", label: "History", shortLabel: "Hist", icon: IconHistory },
  { id: "snapshots", label: "Snapshots", shortLabel: "Shot", icon: IconCamera },
];

const getEditorModuleLabel = (id: string) =>
  [...EDITOR_MODULES, ...AUXILIARY_MODULES].find((module) => module.id === id)
    ?.label ?? id;

export default function Home() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [textOverlay, setTextOverlay] =
    useState<TextOverlaySettings>(DEFAULT_TEXT_OVERLAY);
  const [assetMetadata, setAssetMetadata] = useState<AssetMetadataSettings>(
    DEFAULT_ASSET_METADATA
  );
  const [watermark, setWatermark] =
    useState<WatermarkSettings>(DEFAULT_WATERMARK);
  const [clipboard, setClipboard] =
    useState<SerializableEditorSettings | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageName, setImageName] = useState("Untitled Image");
  const [imageInfo, setImageInfo] = useState<ImageFileInfo | null>(null);
  const [histogram, setHistogram] = useState<HistogramData | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

  // Handle tab change with tutorial check
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);

    // Show tutorial if not seen
    if (!seenTutorials[tabId] && TUTORIAL_CONTENT[tabId]) {
      setActiveTutorial(tabId);
    }
  };

  const handleTutorialClose = () => {
    if (activeTutorial) {
      markTutorialSeen(activeTutorial);
      setSeenTutorials((prev) => ({ ...prev, [activeTutorial]: true }));
      setActiveTutorial(null);
    }
  };

  const showTutorial = (tabId: string) => {
    if (TUTORIAL_CONTENT[tabId]) {
      setActiveTutorial(tabId);
    }
  };

  // History State
  const [history, setHistory] = useState<HistoryState[]>(() => [
    {
      id: "init",
      timestamp: Date.now(),
      action: "Initial State",
      settings: DEFAULT_SETTINGS,
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Snapshots State (image)
  const [snapshots, setSnapshots] = useState<
    { id: string; url: string; date: number }[]
  >([]);

  // Virtual copies keep alternate non-destructive recipes for the same source.
  const [settingsSnapshots, setSettingsSnapshots] = useState<VirtualCopy[]>([]);
  const [activeVirtualCopyId, setActiveVirtualCopyId] = useState<string | null>(
    null
  );
  const [diffVirtualCopyId, setDiffVirtualCopyId] = useState<string | null>(
    null
  );

  // Tutorial State
  const [seenTutorials, setSeenTutorials] = useState<Record<string, boolean>>(
    () => (typeof window === "undefined" ? {} : getSeenTutorials())
  );
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);

  // Mobile State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Layout State
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isLookIntensityOpen, setIsLookIntensityOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Advanced Features State
  const [isHistogramHelpOpen, setIsHistogramHelpOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  const [isMobileControlsExpanded, setIsMobileControlsExpanded] =
    useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [isLUTCreatorOpen, setIsLUTCreatorOpen] = useState(false);
  const [isVideoGradingOpen, setIsVideoGradingOpen] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);

  // Export Settings
  const [exportFormat, setExportFormat] = useState<ExportFormat>("image/jpeg");
  const [exportQuality, setExportQuality] = useState(90);
  const [exportScale, setExportScale] = useState(1);
  const [activeExportRecipeId, setActiveExportRecipeId] =
    useState<ExportRecipeId | null>(null);
  const [performanceMode, setPerformanceMode] =
    useState<PerformanceMode>("balanced");
  const [compositionGuide, setCompositionGuide] =
    useState<CompositionGuide>("off");
  const activeExportRecipe = useMemo(
    () =>
      EXPORT_RECIPES.find((recipe) => recipe.id === activeExportRecipeId) ??
      null,
    [activeExportRecipeId]
  );

  // Reference match state
  const [roiMode, setRoiMode] = useState<"none" | "source">("none");
  const [sourceROI, setSourceROI] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(
    null
  );
  const exportSafetyWarnings = useMemo<ExportSafetyWarning[]>(() => {
    const warnings: ExportSafetyWarning[] = [];
    const exportWidth = imageInfo
      ? imageInfo.width * exportScale
      : imageBounds
        ? imageBounds.width * exportScale
        : null;
    const exportHeight = imageInfo
      ? imageInfo.height * exportScale
      : imageBounds
        ? imageBounds.height * exportScale
        : null;

    if (
      exportWidth &&
      exportHeight &&
      Math.min(exportWidth, exportHeight) < 1200
    ) {
      warnings.push({
        title: "Small Export",
        detail: `${Math.round(exportWidth)} x ${Math.round(exportHeight)} may be low for print or large screens.`,
        tone: "warn",
      });
    }

    if (exportFormat === "image/jpeg" && exportQuality < 80) {
      warnings.push({
        title: "Compression Risk",
        detail: "JPEG quality below 80 can introduce visible artifacts.",
        tone: "warn",
      });
    }

    if (histogram && histogram.clipping.highlights > 0.02) {
      warnings.push({
        title: "Highlights Clipped",
        detail: `${(histogram.clipping.highlights * 100).toFixed(1)}% of sampled pixels are at highlight limit.`,
        tone: "warn",
      });
    }

    if (histogram && histogram.clipping.shadows > 0.05) {
      warnings.push({
        title: "Shadows Crushed",
        detail: `${(histogram.clipping.shadows * 100).toFixed(1)}% of sampled pixels are at shadow limit.`,
        tone: "warn",
      });
    }

    if (activeExportRecipeId === "client-proof" && !watermark.enabled) {
      warnings.push({
        title: "Proof Watermark Off",
        detail:
          "Client proof exports usually need a visible watermark or delivery mark.",
        tone: "warn",
      });
    }

    if (!assetMetadata.creator.trim() && !assetMetadata.copyright.trim()) {
      warnings.push({
        title: "Rights Metadata Missing",
        detail:
          "Creator and copyright fields are empty for this export session.",
        tone: "warn",
      });
    }

    if (assetMetadata.flagStatus === "rejected") {
      warnings.push({
        title: "Rejected Image",
        detail:
          "This asset is marked rejected. Clear the flag before final delivery if needed.",
        tone: "info",
      });
    }

    if (!activeExportRecipe) {
      warnings.push({
        title: "Custom Delivery",
        detail:
          "No export recipe is selected, so this output uses manual settings.",
        tone: "info",
      });
    }

    if (exportScale >= 4) {
      warnings.push({
        title: "Large Render",
        detail: "4x export can take longer and create a much larger file.",
        tone: "info",
      });
    }

    return warnings;
  }, [
    activeExportRecipe,
    activeExportRecipeId,
    assetMetadata.copyright,
    assetMetadata.creator,
    assetMetadata.flagStatus,
    exportFormat,
    exportQuality,
    exportScale,
    histogram,
    imageBounds,
    imageInfo,
    watermark.enabled,
  ]);
  const diffVirtualCopy = useMemo(
    () =>
      settingsSnapshots.find((copy) => copy.id === diffVirtualCopyId) ?? null,
    [diffVirtualCopyId, settingsSnapshots]
  );
  const editDiffs = useMemo(() => {
    if (!diffVirtualCopy) return [];
    return collectSettingDiffs(
      serializeEditorSettings(settings),
      serializeEditorSettings(diffVirtualCopy.settings)
    ).slice(0, 80);
  }, [diffVirtualCopy, settings]);

  // Tone Curve State (Derived)
  const [activeCurveChannel, setActiveCurveChannel] = useState<
    "master" | "red" | "green" | "blue"
  >("master");

  // Generate Tone Curve Texture
  const toneCurveTexture = useMemo(() => {
    if (!settings.curvePoints) return null;

    // Check if curves are identity (default) to avoid unnecessary processing/texture lookups
    const isIdentity = (points: { x: number; y: number }[]) => {
      if (points.length !== 2) return false;
      return (
        points[0].x === 0 &&
        points[0].y === 0 &&
        points[1].x === 1 &&
        points[1].y === 1
      );
    };

    const ret = settings.curvePoints;
    if (
      isIdentity(ret.master) &&
      isIdentity(ret.red) &&
      isIdentity(ret.green) &&
      isIdentity(ret.blue)
    ) {
      return null;
    }

    const size = 256;
    const data = new Uint8Array(size * 4);

    const master = solveCatmullRom(settings.curvePoints.master);
    const red = solveCatmullRom(settings.curvePoints.red);
    const green = solveCatmullRom(settings.curvePoints.green);
    const blue = solveCatmullRom(settings.curvePoints.blue);

    for (let i = 0; i < size; i++) {
      data[i * 4 + 0] = Math.floor(red[i] * 255);
      data[i * 4 + 1] = Math.floor(green[i] * 255);
      data[i * 4 + 2] = Math.floor(blue[i] * 255);
      data[i * 4 + 3] = Math.floor(master[i] * 255);
    }

    const tex = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }, [settings.curvePoints]);

  useEffect(() => {
    return () => {
      toneCurveTexture?.dispose();
    };
  }, [toneCurveTexture]);

  const cloneSettingsForHistory = (
    settingsToClone: EditorSettings
  ): EditorSettings => ({
    ...settingsToClone,
    curvePoints: cloneJson(settingsToClone.curvePoints),
    colorGrading: cloneJson(settingsToClone.colorGrading),
  });

  const addToHistory = (newSettings: EditorSettings, actionName: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    const newState = createHistoryState(
      cloneSettingsForHistory(newSettings),
      actionName
    );
    if (newHistory.length >= 50) newHistory.shift();
    setHistory([...newHistory, newState]);
    setHistoryIndex((prev) => (newHistory.length >= 50 ? prev : prev + 1));
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSettings(history[newIndex].settings);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSettings(history[newIndex].settings);
    }
  };

  const handleJumpToHistory = (index: number) => {
    setHistoryIndex(index);
    setSettings(history[index].settings);
  };

  const handleClearHistory = () => {
    if (history.length === 0) return;
    const currentState = history[historyIndex];
    setHistory([currentState]);
    setHistoryIndex(0);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setSettings(history[newIndex].settings);
          }
        } else if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setSettings(history[newIndex].settings);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setSettings(history[newIndex].settings);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, historyIndex]);

  // Brush Mask State
  const [brushMaskActive, setBrushMaskActive] = useState(false);
  const [brushSize, setBrushSize] = useState(0.3);
  const [brushFeather, setBrushFeather] = useState(0.5);
  const [brushErasing, setBrushErasing] = useState(false);
  const [brushMaskData, setBrushMaskData] = useState<string>("");
  const [brushMaskExposure, setBrushMaskExposure] = useState(0);
  const [brushMaskContrast, setBrushMaskContrast] = useState(0);
  const [brushMaskSaturation, setBrushMaskSaturation] = useState(0);
  const [brushMaskTemperature, setBrushMaskTemperature] = useState(0);
  const [brushMaskClarity, setBrushMaskClarity] = useState(0);

  // Load preset from localStorage if coming from presets page
  React.useEffect(() => {
    const presetData =
      localStorage.getItem(STORAGE_KEYS.presetPreview) ??
      localStorage.getItem(STORAGE_KEYS.legacyPresetPreview);
    if (presetData) {
      try {
        const presetSettings = JSON.parse(
          presetData
        ) as Partial<EditorSettings>;
        setSettings((prev) => ({ ...prev, ...presetSettings }));
        localStorage.removeItem(STORAGE_KEYS.presetPreview);
        localStorage.removeItem(STORAGE_KEYS.legacyPresetPreview);
      } catch (err) {
        console.error("Failed to load preset:", err);
      }
    }
  }, []);

  const updateSetting = (
    key: EditorSettingKey,
    value: EditorSettingValue | string
  ) => {
    const newVal =
      typeof value === "string" &&
      !isNaN(parseFloat(value)) &&
      isFinite(Number(value))
        ? parseFloat(value)
        : value;

    setSettings((prev) => {
      const newSettings = { ...prev, [key]: newVal } as EditorSettings;

      // Debounce history update
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
      }

      historyTimeoutRef.current = setTimeout(() => {
        // Find a human readable name for the action
        // Simplistic approach: "Change [Key]"
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase());
        addToHistory(newSettings, `Change ${label}`);
      }, 500); // 500ms debounce

      return newSettings;
    });
  };

  const loadImageFile = useCallback(async (file: File) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const nextImageInfo = await getImageFileInfo(dataUrl, file);
      setImageSrc(dataUrl);
      setImageName(file.name);
      setImageInfo(nextImageInfo);
      setAssetMetadata({
        ...DEFAULT_ASSET_METADATA,
        title: toFileStem(file.name).replace(/_/g, " "),
      });
      setWatermark(DEFAULT_WATERMARK);
    } catch (error) {
      console.error("Failed to open image:", error);
      alert("Could not open this image file.");
    }
  }, []);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void loadImageFile(file);
    }
    event.target.value = "";
  };

  const openImagePicker = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        void loadImageFile(file);
      }
    };
    input.click();
  }, [loadImageFile]);

  const handleLutUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const texture = parseCubeLUT(text);
      if (texture) {
        setSettings((prev) => ({
          ...prev,
          lutTexture: texture,
          lutStrength: 1.0,
        }));
      } else {
        alert("Failed to parse LUT file");
      }
    };
    reader.readAsText(file);
  };

  const handlePaletteHeist = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const refUrl = e.target?.result as string;
      if (!imageSrc) return;
      try {
        // Use 2D LUT instead of 3D for WebGL 1 compatibility
        const texture = await generatePaletteHeist2DLUT(
          imageSrc as string,
          refUrl
        );
        setSettings((prev) => ({
          ...prev,
          lutTexture: texture,
          lutStrength: 1.0,
        }));
      } catch (err) {
        console.error("Reference match failed", err);
        alert("Failed to match palette.");
      }
    };
    reader.readAsDataURL(file);
  };

  // ===========================================
  // PRESET & CLIPBOARD MANAGEMENT
  // ===========================================

  // Get serializable settings (exclude textures and non-JSON-safe values)
  const getSerializableSettings = useCallback(
    () => serializeEditorSettings(settings),
    [settings]
  );

  // Load preset from Ormond or legacy recipe files.
  const handleLoadPreset = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const presetData = JSON.parse(e.target?.result as string) as {
          name?: string;
          settings?: Partial<EditorSettings>;
        };
        if (presetData.settings) {
          const mergedSettings: EditorSettings = {
            ...settings,
            ...presetData.settings,
            // Preserve current textures
            lutTexture: settings.lutTexture,
            toneCurveTexture: settings.toneCurveTexture,
            compareTexture: settings.compareTexture,
          };
          setSettings(mergedSettings);
          addToHistory(
            mergedSettings,
            `Load Preset: ${presetData.name || "Untitled"}`
          );
        }
      } catch (err) {
        console.error("Failed to load preset:", err);
        alert("Invalid preset file.");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be loaded again
    event.target.value = "";
  };

  // Copy settings to system clipboard
  const handleCopySettings = async () => {
    try {
      const presetData = {
        version: "2.5",
        settings: getSerializableSettings(),
      };
      await navigator.clipboard.writeText(JSON.stringify(presetData));
      // Also store internally for fallback
      setClipboard(getSerializableSettings());
    } catch {
      // Fallback to internal clipboard
      setClipboard(getSerializableSettings());
    }
  };

  // Paste settings from system clipboard
  const handlePasteSettings = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const presetData = JSON.parse(text) as {
        settings?: Partial<EditorSettings>;
      };
      if (presetData.settings) {
        const mergedSettings: EditorSettings = {
          ...settings,
          ...presetData.settings,
          // Preserve current textures
          lutTexture: settings.lutTexture,
          toneCurveTexture: settings.toneCurveTexture,
          compareTexture: settings.compareTexture,
        };
        setSettings(mergedSettings);
        addToHistory(mergedSettings, "Paste Settings");
        return;
      }
    } catch {
      // Fallback to internal clipboard
      if (clipboard) {
        const mergedSettings: EditorSettings = { ...settings, ...clipboard };
        setSettings(mergedSettings);
        addToHistory(mergedSettings, "Paste Settings");
      }
    }
  };

  const applyExportRecipe = useCallback((recipe: ExportRecipe) => {
    setActiveExportRecipeId(recipe.id);
    setExportFormat(recipe.format);
    setExportQuality(recipe.quality);
    setExportScale(recipe.scale);
  }, []);

  const handleSaveProjectSession = useCallback(() => {
    const session: ProjectSessionFile = {
      app: PROJECT_FILE_APP,
      version: PROJECT_FILE_VERSION,
      createdAt: new Date().toISOString(),
      imageName,
      imageSrc,
      imageInfo,
      settings: getSerializableSettings(),
      textOverlay,
      assetMetadata,
      watermark,
      exportSettings: {
        format: exportFormat,
        quality: exportQuality,
        scale: exportScale,
        recipeId: activeExportRecipeId,
      },
      viewState: {
        performanceMode,
        compositionGuide,
        activeVirtualCopyId,
      },
      virtualCopies: settingsSnapshots.map((copy) => ({
        id: copy.id,
        name: copy.name,
        timestamp: copy.timestamp,
        settings: serializeEditorSettings(copy.settings),
      })),
      branches: settingsSnapshots.map((branch) => ({
        id: branch.id,
        name: branch.name,
        timestamp: branch.timestamp,
        settings: serializeEditorSettings(branch.settings),
      })),
    };

    downloadTextFile(
      `${toFileStem(imageName)}_${createTimestampSlug()}.${ARCHIVE_FILE_EXTENSION}`,
      JSON.stringify(session, null, 2)
    );
  }, [
    activeExportRecipeId,
    exportFormat,
    exportQuality,
    exportScale,
    getSerializableSettings,
    activeVirtualCopyId,
    assetMetadata,
    imageName,
    imageInfo,
    imageSrc,
    performanceMode,
    compositionGuide,
    settingsSnapshots,
    textOverlay,
    watermark,
  ]);

  const restoreProjectSession = useCallback((project: ProjectSessionFile) => {
    const restoredSettings = hydrateEditorSettings(project.settings);
    const restoredExport = project.exportSettings;
    const restoredViewState = project.viewState;

    setImageSrc(project.imageSrc);
    setImageName(project.imageName || "Restored Archive");
    setImageInfo(project.imageInfo ?? null);
    setSettings(restoredSettings);
    setTextOverlay({ ...DEFAULT_TEXT_OVERLAY, ...project.textOverlay });
    setAssetMetadata(hydrateAssetMetadata(project.assetMetadata));
    setWatermark(hydrateWatermark(project.watermark));
    setExportFormat(
      isExportFormat(restoredExport?.format)
        ? restoredExport.format
        : "image/jpeg"
    );
    setExportQuality(
      typeof restoredExport?.quality === "number"
        ? Math.min(100, Math.max(10, restoredExport.quality))
        : 90
    );
    setExportScale(
      typeof restoredExport?.scale === "number" ? restoredExport.scale : 1
    );
    setActiveExportRecipeId(
      isExportRecipeId(restoredExport?.recipeId)
        ? restoredExport.recipeId
        : null
    );
    setPerformanceMode(
      isPerformanceMode(restoredViewState?.performanceMode)
        ? restoredViewState.performanceMode
        : "balanced"
    );
    setCompositionGuide(
      isCompositionGuide(restoredViewState?.compositionGuide)
        ? restoredViewState.compositionGuide
        : "off"
    );
    setActiveVirtualCopyId(restoredViewState?.activeVirtualCopyId ?? null);
    setSettingsSnapshots(
      (project.virtualCopies ?? project.branches ?? []).map((branch) => ({
        id: branch.id,
        name: branch.name,
        timestamp: branch.timestamp,
        settings: hydrateEditorSettings(branch.settings),
      }))
    );
    setDiffVirtualCopyId(null);
    setHistory([createHistoryState(restoredSettings, "Restore Ormond Archive")]);
    setHistoryIndex(0);
  }, []);

  const openProjectPicker = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = `.${FORMAT.archiveExtension},.nyvlt,.nyvproj,application/json`;
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await readFileAsText(file);
        const project = JSON.parse(text) as unknown;
        if (!isProjectSessionFile(project)) {
          throw new Error("Unsupported project file.");
        }
        restoreProjectSession(project);
      } catch (error) {
        console.error("Failed to restore Ormond Archive:", error);
        alert("Invalid or unsupported Ormond Archive file.");
      }
    };
    input.click();
  }, [restoreProjectSession]);

  const handleCreateVirtualCopy = () => {
    const name = prompt(
      "Name this virtual copy:",
      `Look ${settingsSnapshots.length + 1}`
    );
    if (!name) return;

    const nextCopy: VirtualCopy = {
      id: createLocalId(),
      name,
      settings: cloneSettingsForHistory(settings),
      timestamp: Date.now(),
    };

    setSettingsSnapshots((prev) => [...prev, nextCopy]);
    setActiveVirtualCopyId(nextCopy.id);
    addToHistory(settings, `Create Virtual Copy: ${name}`);
  };

  const handleRestoreVirtualCopy = (id: string) => {
    const copy = settingsSnapshots.find((item) => item.id === id);
    if (!copy) return;

    setSettings((prev) => ({
      ...prev,
      ...copy.settings,
      lutTexture: prev.lutTexture,
      toneCurveTexture: prev.toneCurveTexture,
      compareTexture: prev.compareTexture,
    }));
    setActiveVirtualCopyId(copy.id);
    addToHistory(copy.settings, `Restore Virtual Copy: ${copy.name}`);
  };

  const handleDeleteVirtualCopy = (id: string) => {
    setSettingsSnapshots((prev) => prev.filter((copy) => copy.id !== id));
    setActiveVirtualCopyId((prev) => (prev === id ? null : prev));
    setDiffVirtualCopyId((prev) => (prev === id ? null : prev));
  };

  const handleTakeSnapshot = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/jpeg", 0.8);
    setSnapshots((prev) => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), url, date: Date.now() },
    ]);
  };

  const handleCompareSnapshot = (url: string) => {
    new THREE.TextureLoader().load(url, (tex) => {
      setSettings((prev) => ({
        ...prev,
        compareTexture: tex,
        compareEnabled: true,
        wiperActive: true,
      }));
    });
  };

  const handleExport = async () => {
    // Target the entire container
    const editorContainer = document.getElementById(
      "cinematic-editor-container"
    ) as HTMLElement;

    if (!editorContainer || !imageBounds) return;

    // Create a composite canvas sized to the IMAGE (not window)
    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Set export size based on the Image dimensions
    exportCanvas.width = imageBounds.width * exportScale;
    exportCanvas.height = imageBounds.height * exportScale;

    // Enable high-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    try {
      let fontEmbedCSS = "";

      // Manually fetch and inline Google Font if custom font is active
      if (textOverlay.customFontEnabled && textOverlay.customFontName) {
        try {
          const fontName = textOverlay.customFontName.trim();
          const weight = textOverlay.customFontWeight || "400";
          const isItalic = textOverlay.customFontStyle === "italic";
          const axisParam = isItalic ? `1,${weight}` : `0,${weight}`;
          const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(
            /\s+/g,
            "+"
          )}:ital,wght@${axisParam}&display=swap`;

          const cssResponse = await fetch(fontUrl);
          const cssText = await cssResponse.text();

          // Regex to find all url(...)
          const fontUrlRegex = /url\((.*?)\)/g;
          const matches = [...cssText.matchAll(fontUrlRegex)];
          let newCssText = cssText;

          // Fetch and inline each font resource
          for (const match of matches) {
            const resourceUrl = match[1].replace(/['"]/g, "");
            if (resourceUrl.startsWith("http")) {
              const resourceRes = await fetch(resourceUrl);
              const blob = await resourceRes.blob();
              const reader = new FileReader();
              const base64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              newCssText = newCssText.replace(match[1], `"${base64}"`);
            }
          }
          fontEmbedCSS = newCssText;
        } catch (e) {
          console.error("Failed to inline font:", e);
        }
      }

      // Capture the ENTIRE container using oversampling for sharpness
      const captureScale = exportScale * 3;
      const dataUrl = await toPng(editorContainer, {
        quality: 1.0,
        pixelRatio: captureScale,
        cacheBust: true,
        fontEmbedCSS: fontEmbedCSS || undefined,
        // Ensure white/transparent background doesn't mess up
        backgroundColor: "transparent",
        filter: (node) => {
          // Filter out external GFonts link
          if (
            node.tagName === "LINK" &&
            (node as HTMLLinkElement).href.includes("fonts.googleapis.com")
          ) {
            return false;
          }
          // Filter out explicitly ignored elements (Brush Mask, UI overlays)
          if (
            node instanceof HTMLElement &&
            node.getAttribute("data-export-ignore") === "true"
          ) {
            return false;
          }
          return true;
        },
      });

      // Crop the result
      await new Promise<void>((resolve, reject) => {
        const img = new globalThis.Image();
        img.onload = () => {
          // Source Rect: Where the image is in the container (scaled by CAPTURE scale)
          const sx = imageBounds.left * captureScale;
          const sy = imageBounds.top * captureScale;
          const sWidth = imageBounds.width * captureScale;
          const sHeight = imageBounds.height * captureScale;

          // Dest Rect: Full canvas
          const dx = 0;
          const dy = 0;
          const dWidth = exportCanvas.width;
          const dHeight = exportCanvas.height;

          ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
          resolve();
        };
        img.onerror = reject;
        img.src = dataUrl;
      });

      // Convert to Blob and Download
      exportCanvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          const ext = exportFormat.split("/")[1];
          const recipeSlug = activeExportRecipeId ?? "custom";
          link.download = `${toFileStem(imageName)}_${recipeSlug}_${createTimestampSlug()}.${ext}`;
          link.click();
          URL.revokeObjectURL(url);
        },
        exportFormat,
        exportQuality / 100
      );
    } catch (error) {
      console.error("Failed to export:", error);
    }

    // Close modal
    setIsExportModalOpen(false);
  };

  const appCommands: AppCommand[] = [
    {
      id: "open-image",
      title: "Open Photograph",
      section: "Import",
      shortcut: "Ctrl+O",
      keywords: ["upload", "import", "photo"],
      run: openImagePicker,
    },
    {
      id: "load-project-session",
      title: "Open Ormond Archive",
      section: "Archive",
      keywords: ["restore", "session", "archive", "ormond", "nyvlt", "nyvproj"],
      run: openProjectPicker,
    },
    {
      id: "save-project-session",
      title: "Save Ormond Archive",
      section: "Archive",
      shortcut: "Ctrl+S",
      disabled: !imageSrc,
      keywords: ["project", "session", "archive", "ormond"],
      run: handleSaveProjectSession,
    },
    {
      id: "toggle-before-after",
      title: "Toggle Before / After",
      section: "Compare",
      shortcut: "C",
      disabled: !imageSrc,
      keywords: ["before", "after", "compare"],
      run: () => updateSetting("wiperActive", !settings.wiperActive),
    },
    {
      id: "create-virtual-copy",
      title: "Create Virtual Copy",
      section: "Workflow",
      disabled: !imageSrc,
      keywords: ["version", "copy", "look"],
      run: handleCreateVirtualCopy,
    },
    ...settingsSnapshots.map((copy) => ({
      id: `diff-virtual-copy-${copy.id}`,
      title: `Compare Diff: ${copy.name}`,
      section: "Workflow",
      disabled: !imageSrc,
      keywords: ["diff", "compare", "virtual", copy.name],
      run: () => setDiffVirtualCopyId(copy.id),
    })),
    {
      id: "open-metadata",
      title: "Open Metadata",
      section: "Culling",
      disabled: !imageSrc,
      keywords: ["rating", "flag", "watermark", "rights"],
      run: () => handleTabChange("metadata"),
    },
    {
      id: "rate-five",
      title: "Set Rating: 5 Stars",
      section: "Culling",
      shortcut: "5",
      disabled: !imageSrc,
      keywords: ["stars", "rating", "pick"],
      run: () =>
        setAssetMetadata((prev) => ({
          ...prev,
          rating: 5,
        })),
    },
    {
      id: "clear-rating",
      title: "Clear Rating",
      section: "Culling",
      shortcut: "0",
      disabled: !imageSrc,
      keywords: ["stars", "rating"],
      run: () =>
        setAssetMetadata((prev) => ({
          ...prev,
          rating: 0,
        })),
    },
    {
      id: "mark-picked",
      title: "Mark Pick",
      section: "Culling",
      shortcut: "P",
      disabled: !imageSrc,
      keywords: ["flag", "pick", "select"],
      run: () =>
        setAssetMetadata((prev) => ({
          ...prev,
          flagStatus: "picked",
        })),
    },
    {
      id: "mark-rejected",
      title: "Mark Reject",
      section: "Culling",
      shortcut: "X",
      disabled: !imageSrc,
      keywords: ["flag", "reject"],
      run: () =>
        setAssetMetadata((prev) => ({
          ...prev,
          flagStatus: "rejected",
        })),
    },
    {
      id: "clear-flag",
      title: "Clear Flag",
      section: "Culling",
      shortcut: "U",
      disabled: !imageSrc,
      keywords: ["flag", "unflag"],
      run: () =>
        setAssetMetadata((prev) => ({
          ...prev,
          flagStatus: "unflagged",
        })),
    },
    {
      id: "export-image",
      title: "Export Image",
      section: "Delivery",
      shortcut: "Ctrl+E",
      disabled: !imageSrc,
      keywords: ["download", "save", "render"],
      run: () => setIsExportModalOpen(true),
    },
    ...EXPORT_RECIPES.map((recipe) => ({
      id: `export-recipe-${recipe.id}`,
      title: `Use Export Recipe: ${recipe.name}`,
      section: "Delivery",
      disabled: !imageSrc,
      keywords: ["export", "recipe", recipe.name],
      run: () => {
        applyExportRecipe(recipe);
        setIsExportModalOpen(true);
      },
    })),
    ...PERFORMANCE_MODES.map((mode) => ({
      id: `performance-${mode.id}`,
      title: `Set Performance Mode: ${mode.label}`,
      section: "Workspace",
      keywords: ["gpu", "quality", "performance", mode.label],
      run: () => setPerformanceMode(mode.id),
    })),
    ...COMPOSITION_GUIDES.map((guide) => ({
      id: `composition-guide-${guide.id}`,
      title: `Composition Guide: ${guide.label}`,
      section: "Workspace",
      disabled: !imageSrc && guide.id !== "off",
      keywords: ["crop", "guide", "composition", guide.label],
      run: () => setCompositionGuide(guide.id),
    })),
    {
      id: "toggle-focus-mode",
      title: isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode",
      section: "Workspace",
      shortcut: "F",
      disabled: !imageSrc,
      keywords: ["focus", "fullscreen", "minimal", "workspace"],
      run: () => setIsFocusMode((prev) => !prev),
    },
    {
      id: "create-preset",
      title: `Create .${FORMAT.recipeExtension} Print Recipe`,
      section: "Recipes",
      disabled: !imageSrc,
      keywords: ["look", "recipe", "save"],
      run: () => setIsPresetModalOpen(true),
    },
    {
      id: "copy-settings",
      title: "Copy Edit Settings",
      section: "Recipes",
      shortcut: "Ctrl+Shift+C",
      disabled: !imageSrc,
      keywords: ["recipe", "copy"],
      run: handleCopySettings,
    },
    {
      id: "paste-settings",
      title: "Paste Edit Settings",
      section: "Recipes",
      shortcut: "Ctrl+Shift+V",
      disabled: !imageSrc && !clipboard,
      keywords: ["recipe", "paste"],
      run: handlePasteSettings,
    },
    {
      id: "open-history",
      title: "Open History",
      section: "Workflow",
      shortcut: "H",
      disabled: !imageSrc,
      run: () => handleTabChange("history"),
    },
    {
      id: "open-curves",
      title: "Open Tone Curve Lab",
      section: "Develop",
      shortcut: "T",
      disabled: !imageSrc,
      keywords: ["curve", "tone"],
      run: () => handleTabChange("curves"),
    },
    {
      id: "open-hsl",
      title: "Open HSL Mixer",
      section: "Develop",
      disabled: !imageSrc,
      keywords: ["color", "mixer"],
      run: () => handleTabChange("hsl"),
    },
    {
      id: "open-mask",
      title: "Open Masking",
      section: "Local Adjustments",
      shortcut: "M",
      disabled: !imageSrc,
      keywords: ["brush", "gradient", "range"],
      run: () => handleTabChange("masking"),
    },
    {
      id: "open-film",
      title: "Open Film Lab",
      section: "Looks",
      disabled: !imageSrc,
      keywords: ["grain", "halation", "bloom"],
      run: () => handleTabChange("films"),
    },
    {
      id: "open-reference",
      title: "Open Reference Viewer",
      section: "Workflow",
      disabled: !imageSrc,
      keywords: ["reference", "palette"],
      run: () => setIsReferenceOpen(true),
    },
    {
      id: "open-lut-creator",
      title: "Open 3D LUT Creator",
      section: "Color",
      disabled: !imageSrc,
      keywords: ["lut", "cube", "profile"],
      run: () => setIsLUTCreatorOpen(true),
    },
    {
      id: "extract-frame",
      title: "Lift Frame From Video",
      section: "Import",
      keywords: ["video", "clip"],
      run: () => setIsVideoGradingOpen(true),
    },
    {
      id: "show-shortcuts",
      title: "Show Shortcuts",
      section: "Help",
      shortcut: "/",
      keywords: ["keyboard", "hotkeys"],
      run: () => setIsShortcutHelpOpen(true),
    },
  ];

  useEffect(() => {
    const handleGlobalShortcuts = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setIsCommandBarOpen(true);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "o") {
        event.preventDefault();
        if (event.shiftKey) {
          openProjectPicker();
        } else {
          openImagePicker();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "s" && imageSrc) {
        event.preventDefault();
        handleSaveProjectSession();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "e" && imageSrc) {
        event.preventDefault();
        setIsExportModalOpen(true);
        return;
      }

      if (!isTyping && event.key === "/") {
        event.preventDefault();
        setIsShortcutHelpOpen(true);
        return;
      }

      if (isTyping || isCommandBarOpen || isShortcutHelpOpen || !imageSrc) {
        return;
      }

      if (/^[0-5]$/.test(event.key)) {
        event.preventDefault();
        setAssetMetadata((prev) => ({
          ...prev,
          rating: Number(event.key),
        }));
        return;
      }

      if (key === "p") {
        event.preventDefault();
        setAssetMetadata((prev) => ({
          ...prev,
          flagStatus: "picked",
        }));
        return;
      }

      if (key === "x") {
        event.preventDefault();
        setAssetMetadata((prev) => ({
          ...prev,
          flagStatus: "rejected",
        }));
        return;
      }

      if (key === "u") {
        event.preventDefault();
        setAssetMetadata((prev) => ({
          ...prev,
          flagStatus: "unflagged",
        }));
        return;
      }

      if (key === "c") {
        event.preventDefault();
        setSettings((prev) => ({ ...prev, wiperActive: !prev.wiperActive }));
        return;
      }

      if (key === "f") {
        event.preventDefault();
        setIsFocusMode((prev) => !prev);
        return;
      }

      if (key === "h") {
        event.preventDefault();
        setActiveTab("history");
        setIsMobileMenuOpen(false);
      }

      if (key === "t") {
        event.preventDefault();
        setActiveTab("curves");
        setIsMobileMenuOpen(false);
      }

      if (key === "m") {
        event.preventDefault();
        setActiveTab("masking");
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [
    imageSrc,
    handleSaveProjectSession,
    isCommandBarOpen,
    isShortcutHelpOpen,
    openImagePicker,
    openProjectPicker,
  ]);

  // Full-page Start Screen when no image is loaded
  if (!imageSrc) {
    return (
      <main className="flex h-screen w-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-amber-500 selection:text-white relative">
        <StartScreen
          onOpenImage={openImagePicker}
          onOpenArchive={openProjectPicker}
          onOpenVideo={() => setIsVideoGradingOpen(true)}
          onTrySample={() => {
            setSettings(DEFAULT_SETTINGS);
            setImageSrc("/demo.jpg");
            setImageName("Demo Sample");
            setImageInfo({
              width: 2000,
              height: 2500,
              fileType: "image/jpeg",
            });
            setAssetMetadata({
              ...DEFAULT_ASSET_METADATA,
              title: "Demo Sample",
            });
            setWatermark(DEFAULT_WATERMARK);
          }}
        />
        {/* Video Grading Panel - Available from start screen */}
        <VideoGradingPanel
          isOpen={isVideoGradingOpen}
          onClose={() => setIsVideoGradingOpen(false)}
          settings={settings}
          onExtractFrame={(dataUrl) => {
            setImageSrc(dataUrl);
            setImageName("Video Frame");
            setAssetMetadata({
              ...DEFAULT_ASSET_METADATA,
              title: "Video Frame",
            });
            setWatermark(DEFAULT_WATERMARK);
            void getImageFileInfo(dataUrl).then(setImageInfo).catch(() => {
              setImageInfo(null);
            });
          }}
        />
        <CommandBar
          isOpen={isCommandBarOpen}
          commands={appCommands}
          onClose={() => setIsCommandBarOpen(false)}
        />
        <ShortcutHelp
          isOpen={isShortcutHelpOpen}
          commands={appCommands}
          onClose={() => setIsShortcutHelpOpen(false)}
        />
      </main>
    );
  }

  return (
    <main
      className={`grid h-screen w-screen grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-[var(--ormond-charcoal)] font-sans text-[var(--ormond-paper)] selection:bg-[var(--ormond-brass)] selection:text-black md:grid-rows-1 ${
        isFocusMode
          ? "md:grid-cols-[minmax(0,1fr)]"
          : "md:grid-cols-[76px_minmax(0,1fr)_360px]"
      }`}
    >
      <MobileLimitationModal
        isOpen={showMobileWarning}
        onClose={() => setShowMobileWarning(false)}
      />

      {/* LEFT SIDEBAR - MODULES & ANALYZER */}
      <div
        className={`${isFocusMode ? "hidden" : ""} relative z-30 hidden min-h-0 w-[76px] flex-col border-r border-[var(--ormond-line)] bg-[var(--ormond-panel)] md:flex`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          className="hidden"
        >
          {isLeftSidebarOpen ? (
            <IconChevronLeft size={14} />
          ) : (
            <IconChevronRight size={14} />
          )}
        </button>

        {isLeftSidebarOpen ? (
          <div className="flex h-full">
            <div className="flex w-[76px] shrink-0 flex-col border-r border-[var(--ormond-line)] bg-[var(--ormond-charcoal-2)]">
              <div className="flex h-16 items-center justify-center border-b border-[var(--ormond-line)]">
                <div className="relative h-8 w-8 opacity-85">
                  <Image
                    src="/logo.svg"
                    alt="Ormond"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-3">
                <div className="space-y-1">
                  {EDITOR_MODULES.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      title={item.label}
                      className={`flex h-[58px] w-full flex-col items-center justify-center gap-1 border text-[9px] transition ${
                        activeTab === item.id
                          ? "border-[var(--ormond-brass)] bg-[rgba(176,138,82,0.16)] text-[var(--ormond-paper)]"
                          : "border-transparent text-[rgba(231,223,208,0.42)] hover:border-[var(--ormond-line)] hover:bg-white/[0.04] hover:text-[rgba(231,223,208,0.78)]"
                      }`}
                    >
                      <item.icon size={17} strokeWidth={1.5} />
                      <span className="font-mono uppercase tracking-[0.12em]">
                        {item.shortLabel}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 border-t border-white/10 pt-3">
                  {AUXILIARY_MODULES.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      title={item.label}
                      className={`mb-1 flex h-[52px] w-full flex-col items-center justify-center gap-1 border text-[9px] transition ${
                        activeTab === item.id
                          ? "border-[var(--ormond-green)] bg-[rgba(63,85,69,0.24)] text-[var(--ormond-paper)]"
                          : "border-transparent text-[rgba(231,223,208,0.38)] hover:border-[var(--ormond-line)] hover:bg-white/[0.04] hover:text-[rgba(231,223,208,0.78)]"
                      }`}
                    >
                      <item.icon size={16} strokeWidth={1.5} />
                      <span className="font-mono uppercase tracking-[0.12em]">
                        {item.shortLabel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="custom-scrollbar hidden h-full flex-1 overflow-y-auto">
              <div className="p-4">
              <div className="mb-4 flex items-center justify-between px-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/20">
                  Project
                </span>
              </div>

              <div className="mb-3 grid grid-cols-4 gap-2">
                {/* OPEN */}
                <label className="group flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 border border-white/10 bg-black/35 transition-all duration-200 hover:border-amber-400/35 hover:bg-amber-400/5 active:bg-white/[0.12]">
                  <IconUpload
                    size={18}
                    stroke={1.5}
                    className="text-white/40 group-hover:text-white/90 transition-colors"
                  />
                  <span className="text-[9px] font-medium tracking-wider text-white/30 group-hover:text-white/70 uppercase">
                    Open
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                  />
                </label>

                {/* EXTRACT */}
                <button
                  onClick={() => setIsVideoGradingOpen(true)}
                  className="group relative flex aspect-square flex-col items-center justify-center gap-1.5 overflow-hidden border border-white/10 bg-black/35 transition-all duration-200 hover:border-rose-400/35 hover:bg-rose-400/5 active:bg-white/[0.12]"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <IconMovie
                    size={18}
                    stroke={1.5}
                    className="text-white/40 group-hover:text-rose-200 transition-colors z-10"
                  />
                  <span className="text-[9px] font-medium tracking-wider text-white/30 group-hover:text-rose-200/70 uppercase z-10">
                    Clip
                  </span>
                </button>

                {/* REF */}
                <button
                  onClick={() => setIsReferenceOpen(!isReferenceOpen)}
                  className={`group relative flex aspect-square flex-col items-center justify-center gap-1.5 overflow-hidden border transition-all duration-200 ${isReferenceOpen ? "border-cyan-400/35 bg-cyan-400/10" : "border-white/10 bg-black/35 hover:border-cyan-400/35 hover:bg-cyan-400/5"}`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent transition-opacity ${isReferenceOpen ? "opacity-100" : "opacity-0"}`}
                  />
                  <IconPhoto
                    size={18}
                    stroke={1.5}
                    className={`z-10 transition-colors ${isReferenceOpen ? "text-cyan-200" : "text-white/40 group-hover:text-white/90"}`}
                  />
                  <span
                    className={`text-[9px] font-medium tracking-wider uppercase z-10 ${isReferenceOpen ? "text-cyan-200/70" : "text-white/30 group-hover:text-white/70"}`}
                  >
                    Ref
                  </span>
                </button>

                {/* FALSE */}
                <button
                  onClick={() =>
                    updateSetting("falseColor", !settings.falseColor)
                  }
                  className={`group relative flex aspect-square flex-col items-center justify-center gap-1.5 overflow-hidden border transition-all duration-200 ${settings.falseColor ? "border-purple-400/35 bg-purple-400/10" : "border-white/10 bg-black/35 hover:border-purple-400/35 hover:bg-purple-400/5"}`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent transition-opacity ${settings.falseColor ? "opacity-100" : "opacity-0"}`}
                  />
                  <IconEye
                    size={18}
                    stroke={1.5}
                    className={`z-10 transition-colors ${settings.falseColor ? "text-purple-200" : "text-white/40 group-hover:text-white/90"}`}
                  />
                  <span
                    className={`text-[9px] font-medium tracking-wider uppercase z-10 ${settings.falseColor ? "text-purple-200/70" : "text-white/30 group-hover:text-white/70"}`}
                  >
                    False
                  </span>
                </button>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-2">
                <button
                  onClick={handleSaveProjectSession}
                  className="flex items-center justify-center gap-2 border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50 transition hover:border-amber-400/40 hover:text-amber-100"
                >
                  <IconDeviceFloppy size={14} stroke={1.5} />
                  Save Archive
                </button>
                <button
                  onClick={openProjectPicker}
                  className="flex items-center justify-center gap-2 border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50 transition hover:border-white/25 hover:text-white"
                >
                  <IconFileCode size={14} stroke={1.5} />
                  Open Archive
                </button>
              </div>

              <div className="mb-8 border border-cyan-500/15 bg-cyan-500/[0.035] p-4">
                <div className="mb-3 flex justify-center">
                  <Image
                    src="/archive-file.svg"
                    alt=""
                    width={54}
                    height={54}
                    className="opacity-90"
                  />
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/80">
                  Ormond Archive .ormond
                </div>
                <p className="mt-2 text-xs leading-5 text-white/45">
                  An Archive restores the whole session: image source, edit recipe,
                  text overlay, metadata, watermark, export recipe, and virtual
                  copies. Legacy .nyvlt and .nyvproj files still open.
                </p>
                <div className="mt-3 border-t border-white/10 pt-3 font-mono text-[9px] uppercase tracking-[0.24em] text-amber-300/70">
                  .orm = reusable print recipe
                </div>
              </div>

              <div className="mb-8 border border-white/10 bg-black/30 p-4">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.35em] text-white/35">
                  Workspace
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/30">
                        GPU Mode
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-amber-400/70">
                        {performanceMode}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {PERFORMANCE_MODES.map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setPerformanceMode(mode.id)}
                          title={mode.description}
                          className={`border px-2 py-2 text-[9px] font-mono uppercase tracking-[0.18em] transition ${
                            performanceMode === mode.id
                              ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                              : "border-white/10 bg-white/[0.03] text-white/35 hover:border-white/25 hover:text-white/70"
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/30">
                        Guide
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-cyan-300/70">
                        {compositionGuide}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {COMPOSITION_GUIDES.map((guide) => (
                        <button
                          key={guide.id}
                          onClick={() => setCompositionGuide(guide.id)}
                          title={guide.description}
                          className={`border px-2 py-2 text-[9px] font-mono uppercase tracking-[0.18em] transition ${
                            compositionGuide === guide.id
                              ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-100"
                              : "border-white/10 bg-white/[0.03] text-white/35 hover:border-white/25 hover:text-white/70"
                          }`}
                        >
                          {guide.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8 border border-white/10 bg-black/30 p-4">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.35em] text-white/35">
                  Active Module
                </div>
                <div className="text-lg font-light text-white/85">
                  {getEditorModuleLabel(activeTab)}
                </div>
                <p className="mt-2 text-xs leading-5 text-white/45">
                  Use the rail on the far left to move between Develop, color,
                  masks, metadata, and delivery tools.
                </p>
              </div>

              <div className="mt-8 border-t border-white/10 pt-6">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.45em] text-white/40">
                  Analyzer
                </div>
                <div className="relative overflow-hidden border border-white/10 bg-black/30 p-4">
                  <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/30 mb-2 flex justify-between items-center">
                    <span>Histogram</span>
                    <button
                      onClick={() => setIsHistogramHelpOpen(true)}
                      className="text-white/30 hover:text-amber-500 transition"
                    >
                      <IconInfoCircle size={12} />
                    </button>
                  </div>
                  {histogram ? (
                    <HistogramGraph data={histogram} />
                  ) : (
                    <div className="h-[100px] w-full flex items-center justify-center text-[10px] text-white/20 font-mono">
                      Loading...
                    </div>
                  )}
                  <div className="mt-3 flex justify-between font-mono text-[9px] uppercase tracking-[0.35em] text-white/25">
                    <span>Shadows</span>
                    <span>Highlights</span>
                  </div>
                  {histogram && (
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                      <ScopeMetric
                        label="Shadow Clip"
                        value={`${(histogram.clipping.shadows * 100).toFixed(1)}%`}
                        tone={histogram.clipping.shadows > 0.02 ? "warn" : "ok"}
                      />
                      <ScopeMetric
                        label="Highlight Clip"
                        value={`${(histogram.clipping.highlights * 100).toFixed(1)}%`}
                        tone={
                          histogram.clipping.highlights > 0.02 ? "warn" : "ok"
                        }
                      />
                      <ScopeMetric
                        label="RGB Avg"
                        value={`${Math.round(histogram.average.r)}/${Math.round(
                          histogram.average.g
                        )}/${Math.round(histogram.average.b)}`}
                      />
                      <ScopeMetric
                        label="Cast"
                        value={getColorCastLabel(histogram)}
                      />
                    </div>
                  )}
                  {imageInfo && (
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                      <ScopeMetric
                        label="Source"
                        value={`${imageInfo.width}x${imageInfo.height}`}
                      />
                      <ScopeMetric
                        label="Type"
                        value={
                          imageInfo.fileType
                            ? imageInfo.fileType.split("/")[1].toUpperCase()
                            : "Image"
                        }
                      />
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                    <ScopeMetric
                      label="Rating"
                      value={
                        assetMetadata.rating > 0
                          ? `${assetMetadata.rating}/5`
                          : "Clear"
                      }
                    />
                    <ScopeMetric
                      label="Flag"
                      value={assetMetadata.flagStatus}
                      tone={
                        assetMetadata.flagStatus === "rejected"
                          ? "warn"
                          : assetMetadata.flagStatus === "picked"
                            ? "ok"
                            : "neutral"
                      }
                    />
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 gap-4 h-full">
            <div className="h-7 w-7 relative mb-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              <Image
                src="/logo.svg"
                alt="Ormond"
                fill
                className="object-contain"
              />
            </div>
            {/* Collapsed Icons */}
            {EDITOR_MODULES.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setIsLeftSidebarOpen(true);
                  handleTabChange(item.id);
                }}
                className={`p-3 rounded-xl transition-all ${activeTab === item.id ? "bg-amber-500/10 text-amber-500" : "text-gray-600 hover:bg-white/5 hover:text-gray-300"}`}
                title={item.id}
              >
                <item.icon size={18} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CENTER - EDITOR CANVAS */}
      <div
        onClick={() => setIsMobileControlsExpanded(false)}
        className="relative z-0 flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#11100d] md:border-r md:border-[var(--ormond-line)]"
      >
        {/* Top Header - Transparent Overlay on Mobile */}
        <div className="relative z-10 border-b border-[var(--ormond-line)] bg-[rgba(32,29,23,0.96)] px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="relative h-7 w-7 shrink-0 opacity-80">
                  <Image
                    src="/logo.svg"
                    alt="Ormond"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium tracking-wide text-white/90">
                    {imageName}
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.24em] text-white/35">
                    {activeVirtualCopyId
                      ? "Virtual Copy Active"
                      : "Master Edit"}{" "}
                    / {getEditorModuleLabel(activeTab)}
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden">
              <StatusChip label="Mode" value={performanceMode} />
              <StatusChip label="Guide" value={compositionGuide} />
              {imageInfo && (
                <StatusChip
                  label="Source"
                  value={`${imageInfo.width}x${imageInfo.height}`}
                />
              )}
              {histogram && (
                <StatusChip
                  label="Clip"
                  value={`${(histogram.clipping.shadows * 100).toFixed(1)} / ${(histogram.clipping.highlights * 100).toFixed(1)}%`}
                />
              )}
              <StatusChip
                label="Rating"
                value={
                  assetMetadata.rating > 0
                    ? `${assetMetadata.rating}/5`
                    : "Clear"
                }
              />
              <StatusChip label="Flag" value={assetMetadata.flagStatus} />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <label className="hidden cursor-pointer items-center gap-2 border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 transition hover:border-white/25 hover:text-white xl:flex">
                <IconUpload size={14} />
                Open
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => setIsVideoGradingOpen(true)}
                className="hidden"
              >
                <IconMovie size={14} />
                Clip
              </button>
              <button
                onClick={() => setIsReferenceOpen((prev) => !prev)}
                className={`hidden ${
                  isReferenceOpen
                    ? "border-cyan-300/45 bg-cyan-300/10 text-cyan-100"
                    : "border-white/10 bg-black/40 text-white/50 hover:border-cyan-300/35 hover:text-cyan-100"
                }`}
              >
                <IconPhoto size={14} />
                Ref
              </button>
              <button
                onClick={() => updateSetting("falseColor", !settings.falseColor)}
                className={`hidden ${
                  settings.falseColor
                    ? "border-purple-300/45 bg-purple-300/10 text-purple-100"
                    : "border-white/10 bg-black/40 text-white/50 hover:border-purple-300/35 hover:text-purple-100"
                }`}
              >
                <IconEye size={14} />
                False
              </button>
              <button
                onClick={() => setIsCommandBarOpen(true)}
                className="hidden items-center gap-2 border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 transition hover:border-white/25 hover:text-white md:flex"
              >
                <IconCommand size={14} />
                Command
              </button>
              <button
                onClick={() => setIsFocusMode((prev) => !prev)}
                className={`hidden ${
                  isFocusMode
                    ? "border-cyan-400/45 bg-cyan-400/10 text-cyan-100"
                    : "border-white/10 bg-black/40 text-white/50 hover:border-white/25 hover:text-white"
                }`}
              >
                <IconMaximize size={14} />
                Focus
              </button>
              <button
                onClick={handleSaveProjectSession}
                className="hidden items-center gap-2 border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 transition hover:border-amber-400/35 hover:text-amber-100 md:flex"
              >
                <IconDeviceFloppy size={14} />
                Archive
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExportModalOpen(true);
                }}
                className="flex items-center gap-2 border border-amber-400/45 bg-amber-400 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-amber-300"
              >
                <IconDownload size={14} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#0f0f0f]">
          {/* Toolbar Overlay */}

          {/* Look Intensity Overlay - Only show when image is loaded */}
          {imageSrc && !isFocusMode && isLookIntensityOpen && (
            <div
              className={`absolute bottom-6 right-6 z-10 hidden overflow-hidden border border-white/10 bg-[#151515]/90 backdrop-blur-md transition-all duration-300 ease-out md:block ${
                isLookIntensityOpen
                  ? "w-[calc(100%-48px)] p-5"
                  : "w-[240px] border-white/20 bg-[#151515]/95 p-3"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/45 whitespace-nowrap">
                    Look Intensity
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.45em] text-amber-500/70">
                    {Math.round((settings.lutStrength || 0) * 100)}
                  </span>
                </div>
                <button
                  onClick={() => setIsLookIntensityOpen(!isLookIntensityOpen)}
                  className="ml-4 text-white/40 hover:text-white transition"
                >
                  {isLookIntensityOpen ? (
                    <IconMinus size={14} />
                  ) : (
                    <IconMaximize size={14} />
                  )}
                </button>
              </div>

              {isLookIntensityOpen && (
                <div className="mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="relative h-2 w-full bg-white/10">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-amber-700/40 via-amber-500/35 to-blue-500/30"
                      style={{ width: `${(settings.lutStrength || 0) * 100}%` }}
                    />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.lutStrength || 0}
                      onChange={(e) =>
                        updateSetting("lutStrength", parseFloat(e.target.value))
                      }
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="border border-white/10 bg-black/25 px-4 py-3">
                      <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/30">
                        Grain
                      </div>
                      <div className="mt-1 text-sm font-light text-white/70">
                        {(settings.grain * 100).toFixed(0)}
                      </div>
                    </div>
                    <div className="border border-white/10 bg-black/25 px-4 py-3">
                      <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/30">
                        Bloom
                      </div>
                      <div className="mt-1 text-sm font-light text-white/70">
                        {(settings.halation * 100).toFixed(0)}
                      </div>
                    </div>
                    <div className="border border-white/10 bg-black/25 px-4 py-3">
                      <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/30">
                        Temp
                      </div>
                      <div className="mt-1 text-sm font-light text-white/70">
                        {settings.temperature > 0 ? "+" : ""}
                        {(settings.temperature * 100).toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Canvas Area with Zoom/Pan - Only show when image is loaded */}
          {imageSrc && (
            <div className="w-full h-full">
              <CinematicEditor
                settings={{ ...settings, toneCurveTexture }}
                imageUrl={imageSrc}
                onStatsUpdate={setHistogram}
                textOverlay={textOverlay}
                watermark={watermark}
                brushMaskActive={brushMaskActive}
                brushSize={brushSize}
                brushFeather={brushFeather}
                brushErasing={brushErasing}
                brushMaskData={brushMaskData}
                brushMaskExposure={brushMaskExposure}
                brushMaskContrast={brushMaskContrast}
                brushMaskSaturation={brushMaskSaturation}
                brushMaskTemperature={brushMaskTemperature}
                brushMaskClarity={brushMaskClarity}
                performanceMode={performanceMode}
                compositionGuide={compositionGuide}
                onBrushMaskUpdate={setBrushMaskData}
                onBoundsChange={setImageBounds}
              />

              {/* ROI Selection Overlay */}
              {imageBounds && roiMode === "source" && (
                <div
                  className="absolute z-20 cursor-crosshair border-2 border-amber-500/50 bg-amber-500/10"
                  style={{
                    left: imageBounds.left,
                    top: imageBounds.top,
                    width: imageBounds.width,
                    height: imageBounds.height,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const startX = (e.clientX - rect.left) / rect.width;
                    const startY = (e.clientY - rect.top) / rect.height;

                    // Start new ROI
                    setSourceROI({ x: startX, y: startY, w: 0, h: 0 });

                    const handleMouseMove = (ev: MouseEvent) => {
                      const currX = (ev.clientX - rect.left) / rect.width;
                      const currY = (ev.clientY - rect.top) / rect.height;

                      const minX = Math.min(startX, currX);
                      const minY = Math.min(startY, currY);
                      const w = Math.abs(currX - startX);
                      const h = Math.abs(currY - startY);

                      setSourceROI({ x: minX, y: minY, w, h });
                    };

                    const handleMouseUp = () => {
                      window.removeEventListener("mousemove", handleMouseMove);
                      window.removeEventListener("mouseup", handleMouseUp);
                      // Remain in ROI mode to allow adjustments? Or exit?
                      // Let's stay in ROI mode until user clicks "Done" or toggles off.
                    };

                    window.addEventListener("mousemove", handleMouseMove);
                    window.addEventListener("mouseup", handleMouseUp);
                  }}
                >
                  {/* Render the ROI Box */}
                  {sourceROI && (
                    <div
                      className="absolute border border-white boxShadow-xl bg-white/10 backdrop-invert"
                      style={{
                        left: `${sourceROI.x * 100}%`,
                        top: `${sourceROI.y * 100}%`,
                        width: `${sourceROI.w * 100}%`,
                        height: `${sourceROI.h * 100}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-amber-500 text-black text-[9px] font-bold px-1 rounded-sm uppercase">
                        Source Region
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="hidden"
        >
          {isMobileMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
        </button>

        {/* Bottom Actions Panel - Hidden on Mobile */}
        <div className={`${isFocusMode ? "hidden" : "hidden md:grid"} h-[112px] grid-cols-5 gap-px border-t border-white/10 bg-white/10`}>
          <button
            onClick={() => updateSetting("wiperActive", !settings.wiperActive)}
            className={`group bg-[#0d0c0a] p-4 text-left transition-all ${settings.wiperActive ? "text-amber-100" : "text-white/65 hover:bg-[#15130f]"}`}
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/45 group-hover:text-white/70">
              <IconAdjustmentsHorizontal size={14} /> Before / After
            </div>
            <div className="mt-3 text-xs font-light leading-5 text-white/45">
              {settings.wiperActive ? "Split compare active" : "Original compare off"}
            </div>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`group bg-[#0d0c0a] p-4 text-left transition-all ${activeTab === "history" ? "text-amber-100" : "text-white/65 hover:bg-[#15130f]"}`}
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/45 group-hover:text-white/70">
              <IconHistory size={14} /> History
            </div>
            <div className="mt-3 text-xs font-light leading-5 text-white/45">
              {history.length} states recorded.
            </div>
          </button>
          <button
            onClick={handleCreateVirtualCopy}
            className="group bg-[#0d0c0a] p-4 text-left text-white/65 transition-all hover:bg-[#15130f]"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/45 group-hover:text-white/70">
              <IconLayersIntersect size={14} /> Versions
            </div>
            <div className="mt-3 text-xs font-light leading-5 text-white/45">
              {settingsSnapshots.length} virtual copies
            </div>
          </button>
          <button
            onClick={() => setActiveTab("metadata")}
            className="group bg-[#0d0c0a] p-4 text-left text-white/65 transition-all hover:bg-[#15130f]"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/45 group-hover:text-white/70">
              <IconInfoCircle size={14} /> Culling
            </div>
            <div className="mt-3 text-xs font-light leading-5 text-white/45">
              {assetMetadata.rating > 0 ? `${assetMetadata.rating}/5` : "No rating"} /{" "}
              {assetMetadata.flagStatus}
            </div>
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="group bg-[#0d0c0a] p-4 text-left text-white/65 transition-all hover:bg-[#15130f]"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/45 group-hover:text-white/70">
              <IconDownload size={14} /> Export
            </div>
            <div className="mt-3 text-xs font-light leading-5 text-white/45">
              {activeExportRecipe?.name ??
                exportFormat.split("/")[1].toUpperCase()}{" "}
              • {exportQuality}%
            </div>
          </button>
        </div>
      </div>

      {/* RIGHT SIDEBAR - CONTROLS */}
      <div
        className={`${isFocusMode ? "hidden" : ""} relative z-20 flex h-[42vh] min-h-[360px] flex-col border-t border-[var(--ormond-line)] bg-[var(--ormond-panel)] md:h-full md:min-h-0 md:w-[360px] md:border-l md:border-t-0`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
          className="hidden"
        >
          {isRightSidebarOpen ? (
            <IconChevronRight size={14} />
          ) : (
            <IconChevronLeft size={14} />
          )}
        </button>
        {/* Mobile backdrop */}
        <div
          className="hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Control Panel */}
        <div className="z-20 flex h-full w-full flex-col overflow-hidden">
          <div className="h-full w-full">
            <div className="flex h-full w-full min-w-0 flex-col">
              {/* Premium Mobile Tab Bar */}
              <div
                className="custom-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto border-b border-white/10 bg-black/40 px-3 py-3 md:hidden"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {[
                  { id: "basic", icon: <IconSun size={16} />, color: "amber" },
                  {
                    id: "color",
                    icon: <IconPalette size={16} />,
                    color: "purple",
                  },
                  {
                    id: "curves",
                    icon: <IconChartLine size={16} />,
                    color: "blue",
                  },
                  {
                    id: "grading",
                    icon: <IconCircles size={16} />,
                    color: "purple",
                  },
                  { id: "hsl", icon: <IconCircle size={16} />, color: "cyan" },
                  {
                    id: "films",
                    icon: <IconMovie size={16} />,
                    color: "orange",
                  },
                  {
                    id: "effects",
                    icon: <IconSparkles size={16} />,
                    color: "cyan",
                  },
                  {
                    id: "masking",
                    icon: <IconLayersIntersect size={16} />,
                    color: "orange",
                  },
                  {
                    id: "text",
                    icon: <IconTypography size={16} />,
                    color: "green",
                  },
                  {
                    id: "metadata",
                    icon: <IconInfoCircle size={16} />,
                    color: "blue",
                  },
                  {
                    id: "transform",
                    icon: <IconArrowsMaximize size={16} />,
                    color: "amber",
                  },
                  {
                    id: "history",
                    icon: <IconHistory size={16} />,
                    color: "rose",
                  },
                  {
                    id: "snapshots",
                    icon: <IconCamera size={16} />,
                    color: "green",
                  },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  const colorClasses: Record<
                    string,
                    { active: string; inactive: string }
                  > = {
                    amber: {
                      active:
                        "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-amber-500/20",
                      inactive: "text-gray-500",
                    },
                    purple: {
                      active:
                        "bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-purple-500/20",
                      inactive: "text-gray-500",
                    },
                    blue: {
                      active:
                        "bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-blue-500/20",
                      inactive: "text-gray-500",
                    },
                    cyan: {
                      active:
                        "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-cyan-500/20",
                      inactive: "text-gray-500",
                    },
                    orange: {
                      active:
                        "bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-orange-500/20",
                      inactive: "text-gray-500",
                    },
                    green: {
                      active:
                        "bg-green-500/20 text-green-400 border-green-500/40 shadow-green-500/20",
                      inactive: "text-gray-500",
                    },
                    rose: {
                      active:
                        "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/20",
                      inactive: "text-gray-500",
                    },
                  };

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        // Toggle logic for mobile
                        if (
                          typeof window !== "undefined" &&
                          window.innerWidth < 768
                        ) {
                          if (
                            activeTab === tab.id &&
                            isMobileControlsExpanded
                          ) {
                            setIsMobileControlsExpanded(false);
                          } else {
                            handleTabChange(tab.id);
                            setIsMobileControlsExpanded(true);
                          }
                        } else {
                          handleTabChange(tab.id);
                        }
                      }}
                      className={`flex shrink-0 snap-start flex-col items-center gap-1.5 border px-4 py-2.5 font-mono text-[9px] uppercase whitespace-nowrap transition-all duration-200 ${
                        isActive
                          ? `${colorClasses[tab.color].active} border shadow-lg`
                          : `${colorClasses[tab.color].inactive} border-transparent hover:bg-white/5 active:scale-95`
                      }`}
                    >
                      <span
                        className={`transition-transform duration-200 ${isActive ? "scale-110" : ""}`}
                      >
                        {tab.icon}
                      </span>
                      <span className="font-semibold">
                        {getEditorModuleLabel(tab.id)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-[var(--ormond-line)] bg-black/10 px-5 py-4">
                <div className="flex items-center gap-2">
                  <IconChevronRight size={14} className="text-amber-300/60" />
                  <h2 className="font-mono text-sm font-medium uppercase tracking-[0.25em] text-white/90">
                    {getEditorModuleLabel(activeTab)}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <TutorialTrigger onClick={() => showTutorial(activeTab)} />
                  <div className="border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.2em] text-white/35">
                    Inspector
                  </div>
                </div>
              </div>

              {/* Scrollable Controls */}
              <div
                className={`flex-1 overflow-y-auto custom-scrollbar ${activeTab === "history" ? "" : "px-5 py-4 space-y-6"}`}
              >
                {activeTab === "history" && (
                  <HistoryPanel
                    history={history}
                    currentIndex={historyIndex}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onJumpToState={handleJumpToHistory}
                    onClearHistory={handleClearHistory}
                    branches={settingsSnapshots}
                    activeBranchId={activeVirtualCopyId}
                    onCreateBranch={handleCreateVirtualCopy}
                    onRestoreBranch={handleRestoreVirtualCopy}
                    onDeleteBranch={handleDeleteVirtualCopy}
                    onDiffBranch={setDiffVirtualCopyId}
                  />
                )}

                {activeTab === "snapshots" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <ControlGroup title="Snapshots">
                      <button
                        onClick={handleTakeSnapshot}
                        className="w-full py-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded font-mono text-xs uppercase tracking-widest hover:bg-green-500/20 transition flex items-center justify-center gap-2"
                      >
                        <IconCamera size={14} />
                        Take Snapshot
                      </button>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {snapshots.map((snap) => (
                          <div
                            key={snap.id}
                            className="relative group rounded overflow-hidden border border-white/10 bg-black"
                          >
                            <div className="aspect-video relative">
                              <Image
                                src={snap.url}
                                alt="Snapshot"
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="p-2 flex gap-1 justify-center bg-black/80 backdrop-blur absolute bottom-0 inset-x-0 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={() => handleCompareSnapshot(snap.url)}
                                className="p-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/40"
                                title="Compare"
                              >
                                <IconAdjustmentsHorizontal size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setSnapshots((prev) =>
                                    prev.filter((s) => s.id !== snap.id)
                                  );
                                  // Disable compare if deleting current?
                                }}
                                className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40"
                                title="Delete"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                        {snapshots.length === 0 && (
                          <div className="col-span-2 text-center py-8 text-gray-600 font-mono text-[10px] uppercase">
                            No snapshots
                          </div>
                        )}
                      </div>

                      {settings.compareEnabled && (
                        <button
                          onClick={() => updateSetting("compareEnabled", false)}
                          className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded font-mono text-xs uppercase tracking-widest hover:bg-red-500/20 transition mt-4"
                        >
                          Stop Comparison
                        </button>
                      )}
                    </ControlGroup>
                  </div>
                )}

                {activeTab === "curves" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <ControlGroup title="Tone Curves">
                      <div className="flex gap-2 mb-4">
                        {(["master", "red", "green", "blue"] as const).map(
                          (channel) => (
                            <button
                              key={channel}
                              onClick={() => setActiveCurveChannel(channel)}
                              className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest rounded border transition ${
                                activeCurveChannel === channel
                                  ? channel === "master"
                                    ? "bg-white text-black border-white"
                                    : channel === "red"
                                      ? "bg-red-500/20 text-red-500 border-red-500"
                                      : channel === "green"
                                        ? "bg-green-500/20 text-green-500 border-green-500"
                                        : "bg-blue-500/20 text-blue-500 border-blue-500"
                                  : "bg-black/40 text-gray-500 border-white/5 hover:bg-white/5"
                              }`}
                            >
                              {channel}
                            </button>
                          )
                        )}
                      </div>

                      <CurveEditor
                        points={settings.curvePoints[activeCurveChannel]}
                        onChange={(newPoints) => {
                          const newCurvePoints = {
                            ...settings.curvePoints,
                            [activeCurveChannel]: newPoints,
                          };
                          updateSetting("curvePoints", newCurvePoints);
                        }}
                        color={
                          activeCurveChannel === "master"
                            ? "#ffffff"
                            : activeCurveChannel === "red"
                              ? "#ef4444"
                              : activeCurveChannel === "green"
                                ? "#22c55e"
                                : "#3b82f6"
                        }
                      />
                    </ControlGroup>
                  </div>
                )}

                {activeTab === "grading" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <ControlGroup title="Color Grading">
                      <div className="space-y-8 flex flex-col items-center">
                        <ColorWheel
                          label="Shadows"
                          value={settings.colorGrading.shadows}
                          onChange={(val) =>
                            updateSetting("colorGrading", {
                              ...settings.colorGrading,
                              shadows: val,
                            })
                          }
                        />
                        <ColorWheel
                          label="Midtones"
                          value={settings.colorGrading.midtones}
                          onChange={(val) =>
                            updateSetting("colorGrading", {
                              ...settings.colorGrading,
                              midtones: val,
                            })
                          }
                        />
                        <ColorWheel
                          label="Highlights"
                          value={settings.colorGrading.highlights}
                          onChange={(val) =>
                            updateSetting("colorGrading", {
                              ...settings.colorGrading,
                              highlights: val,
                            })
                          }
                        />
                      </div>

                      <div className="mt-6 pt-6 border-t border-white/5">
                        <Slider
                          label="Balance"
                          value={settings.colorGrading.balance}
                          min={-1}
                          max={1}
                          onChange={(v: number) =>
                            updateSetting("colorGrading", {
                              ...settings.colorGrading,
                              balance: v,
                            })
                          }
                          icon={<IconContrast size={14} />}
                        />
                      </div>
                    </ControlGroup>
                  </div>
                )}

                {activeTab === "basic" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <ControlGroup title="Light">
                      <Slider
                        label="Exposure (EV)"
                        value={settings.brightness}
                        min={-5}
                        max={5}
                        step={0.05}
                        onChange={(v) => updateSetting("brightness", v)}
                        icon={<IconSun size={14} />}
                        bipolar
                      />
                      <Slider
                        label="Contrast"
                        value={settings.contrast}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("contrast", v)}
                        icon={<IconContrast size={14} />}
                        bipolar
                      />
                      <Slider
                        label="Highlights"
                        value={settings.highlights || 0}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("highlights", v)}
                        icon={<IconSun size={14} />}
                        bipolar
                      />
                      <Slider
                        label="Shadows"
                        value={settings.shadows || 0}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("shadows", v)}
                        icon={<IconMoon size={14} />}
                        bipolar
                      />
                      <Slider
                        label="Whites"
                        value={settings.whites || 0}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("whites", v)}
                        icon={<IconSun size={14} />}
                        bipolar
                      />
                      <Slider
                        label="Blacks"
                        value={settings.blacks || 0}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("blacks", v)}
                        icon={<IconMoon size={14} />}
                        bipolar
                      />
                      <Slider
                        label="Vibrance"
                        value={settings.vibrance || 0}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("vibrance", v)}
                        icon={<IconPalette size={14} />}
                        bipolar
                      />
                      <Slider
                        label="Dehaze"
                        value={settings.dehaze}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("dehaze", v)}
                        icon={<IconAperture size={14} />}
                      />
                    </ControlGroup>

                    <ControlGroup title="Detail">
                      <Slider
                        label="Structure (Clarity)"
                        value={settings.structure}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("structure", v)}
                        icon={<IconBolt size={14} />}
                      />
                      <Slider
                        label="Sharpness"
                        value={settings.sharpness}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("sharpness", v)}
                        icon={<IconBolt size={14} />}
                      />
                    </ControlGroup>

                    <ControlGroup title="Directional Light">
                      <Slider
                        label="Strength"
                        value={settings.godLightStrength}
                        min={0}
                        max={1}
                        onChange={(v) =>
                          updateSetting("godLightStrength", v)
                        }
                        icon={<IconSun size={14} />}
                      />
                      <Slider
                        label="Light X"
                        value={settings.godLightX}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("godLightX", v)}
                        icon={<IconSun size={14} />}
                      />
                      <Slider
                        label="Light Y"
                        value={settings.godLightY}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("godLightY", v)}
                        icon={<IconSun size={14} />}
                      />
                      <div className="pt-2 border-t border-white/5 mt-2">
                        <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-3">
                          Light Color
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              updateSetting("godLightColorR", 1.0);
                              updateSetting("godLightColorG", 0.85);
                              updateSetting("godLightColorB", 0.7);
                            }}
                            className="flex-1 py-2.5 text-[9px] uppercase bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded text-orange-300 cursor-pointer hover:from-orange-500/30 hover:to-yellow-500/30 hover:border-orange-500/50 active:scale-95 transition-all"
                          >
                            Warm
                          </button>
                          <button
                            onClick={() => {
                              updateSetting("godLightColorR", 1.0);
                              updateSetting("godLightColorG", 1.0);
                              updateSetting("godLightColorB", 1.0);
                            }}
                            className="flex-1 py-2.5 text-[9px] uppercase bg-white/5 border border-white/10 rounded text-white cursor-pointer hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all"
                          >
                            Neutral
                          </button>
                          <button
                            onClick={() => {
                              updateSetting("godLightColorR", 0.8);
                              updateSetting("godLightColorG", 0.9);
                              updateSetting("godLightColorB", 1.0);
                            }}
                            className="flex-1 py-2.5 text-[9px] uppercase bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded text-blue-300 cursor-pointer hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-500/50 active:scale-95 transition-all"
                          >
                            Cool
                          </button>
                        </div>
                      </div>
                      <Slider
                        label="Specular (Shine)"
                        value={settings.godLightSpecular}
                        min={0}
                        max={1}
                        onChange={(v) =>
                          updateSetting("godLightSpecular", v)
                        }
                        icon={<IconBolt size={14} />}
                      />
                      <Slider
                        label="Rim Light (Edge Glow)"
                        value={settings.godLightRim}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("godLightRim", v)}
                        icon={<IconSun size={14} />}
                      />
                      <Slider
                        label="Falloff"
                        value={settings.godLightFalloff}
                        min={0}
                        max={3}
                        onChange={(v) =>
                          updateSetting("godLightFalloff", v)
                        }
                        icon={<IconAperture size={14} />}
                      />
                    </ControlGroup>
                  </div>
                )}

                {activeTab === "color" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <ControlGroup title="Reference Match">
                      <div className="flex gap-2 mb-4">
                        {/* ROI Toggle */}
                        <button
                          onClick={() =>
                            setRoiMode(roiMode === "source" ? "none" : "source")
                          }
                          className={`flex-1 py-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${roiMode === "source" ? "bg-amber-500 text-black border-amber-500" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}`}
                        >
                          <IconMapPin size={16} />
                          <span className="text-[10px] font-mono uppercase tracking-wider">
                            Select Region
                          </span>
                        </button>

                        {/* Steal Button */}
                        <label
                          className={`flex-[2] flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-900 to-blue-900 hover:from-purple-800 hover:to-blue-800 text-xs uppercase tracking-widest font-medium rounded-lg transition border border-white/20 cursor-pointer shadow-lg`}
                        >
                          <IconBolt size={14} className="text-yellow-400" />{" "}
                          Match Reference
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePaletteHeist}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {sourceROI && (
                        <div className="flex justify-between items-center mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded">
                          <span className="text-[10px] text-amber-500 font-mono uppercase">
                            Region Active
                          </span>
                          <button
                            onClick={() => setSourceROI(null)}
                            className="text-white/40 hover:text-white"
                          >
                            <IconX size={12} />
                          </button>
                        </div>
                      )}

                      <p className="text-[10px] text-gray-500 italic text-center">
                        Select a region of your image (optional) and upload a
                        reference to borrow its color balance.
                      </p>
                    </ControlGroup>

                    <ControlGroup title="LUT Cabinet">
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <label className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-xs uppercase tracking-widest font-medium rounded-lg transition border border-white/5 cursor-pointer">
                          <IconUpload size={14} /> Upload
                          <input
                            type="file"
                            accept=".cube"
                            onChange={handleLutUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => setIsLUTCreatorOpen(true)}
                          className="flex items-center justify-center gap-2 py-3 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-xs uppercase tracking-widest font-medium rounded-lg transition border border-violet-500/30"
                        >
                          <IconPalette size={14} /> Create
                        </button>
                      </div>
                      <Slider
                        label="LUT Strength"
                        value={settings.lutStrength || 0}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("lutStrength", v)}
                        icon={<IconPalette size={14} />}
                      />
                    </ControlGroup>

                    <ControlGroup title="White Balance">
                      <Slider
                        label="Temp"
                        value={settings.temperature}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("temperature", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Tint"
                        value={settings.tint}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("tint", v)}
                        icon={<IconPalette size={14} />}
                      />
                    </ControlGroup>

                    <ControlGroup title="Color Separation">
                      <Slider
                        label="Teal & Orange"
                        value={settings.tealOrange}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("tealOrange", v)}
                        accentColor="accent-orange-500"
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Skin Protection"
                        value={settings.skinProtect}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("skinProtect", v)}
                        icon={<IconPalette size={14} />}
                      />
                    </ControlGroup>

                    <ControlGroup title="HSL Selective">
                      <div className="flex justify-between px-1 mb-2">
                        <button
                          onClick={() => updateSetting("targetHue", 0.0)}
                          className={`w-6 h-6 rounded-full bg-red-500 border-2 ${settings.targetHue === 0 ? "border-white" : "border-transparent"}`}
                        />
                        <button
                          onClick={() => updateSetting("targetHue", 0.15)}
                          className={`w-6 h-6 rounded-full bg-yellow-500 border-2 ${settings.targetHue === 0.15 ? "border-white" : "border-transparent"}`}
                        />
                        <button
                          onClick={() => updateSetting("targetHue", 0.33)}
                          className={`w-6 h-6 rounded-full bg-green-500 border-2 ${settings.targetHue === 0.33 ? "border-white" : "border-transparent"}`}
                        />
                        <button
                          onClick={() => updateSetting("targetHue", 0.5)}
                          className={`w-6 h-6 rounded-full bg-cyan-500 border-2 ${settings.targetHue === 0.5 ? "border-white" : "border-transparent"}`}
                        />
                        <button
                          onClick={() => updateSetting("targetHue", 0.66)}
                          className={`w-6 h-6 rounded-full bg-blue-500 border-2 ${settings.targetHue === 0.66 ? "border-white" : "border-transparent"}`}
                        />
                        <button
                          onClick={() => updateSetting("targetHue", 0.83)}
                          className={`w-6 h-6 rounded-full bg-purple-500 border-2 ${settings.targetHue === 0.83 ? "border-white" : "border-transparent"}`}
                        />
                      </div>
                      <Slider
                        label="Hue Shift"
                        value={settings.hueShift}
                        min={-0.5}
                        max={0.5}
                        onChange={(v) => updateSetting("hueShift", v)}
                        icon={<IconPalette size={14} />}
                      />
                    </ControlGroup>
                  </div>
                )}

                {/* HSL Panel Tab */}
                {activeTab === "hsl" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <p className="text-[9px] uppercase tracking-widest text-gray-600 text-center mb-2">
                      Per-Color Channel Adjustments
                    </p>

                    {/* Red Channel */}
                    <ControlGroup
                      title="Red"
                      icon={
                        <IconCircleFilled size={12} className="text-red-500" />
                      }
                    >
                      <Slider
                        label="Hue"
                        value={settings.hslRedHue}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslRedHue", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Saturation"
                        value={settings.hslRedSat}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslRedSat", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Luminance"
                        value={settings.hslRedLum}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslRedLum", v)}
                        icon={<IconSun size={14} />}
                      />
                    </ControlGroup>

                    {/* Orange Channel */}
                    <ControlGroup
                      title="Orange"
                      icon={
                        <IconCircleFilled
                          size={12}
                          className="text-orange-500"
                        />
                      }
                    >
                      <Slider
                        label="Hue"
                        value={settings.hslOrangeHue}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslOrangeHue", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Saturation"
                        value={settings.hslOrangeSat}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslOrangeSat", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Luminance"
                        value={settings.hslOrangeLum}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslOrangeLum", v)}
                        icon={<IconSun size={14} />}
                      />
                    </ControlGroup>

                    {/* Yellow Channel */}
                    <ControlGroup
                      title="Yellow"
                      icon={
                        <IconCircleFilled
                          size={12}
                          className="text-yellow-500"
                        />
                      }
                    >
                      <Slider
                        label="Hue"
                        value={settings.hslYellowHue}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslYellowHue", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Saturation"
                        value={settings.hslYellowSat}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslYellowSat", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Luminance"
                        value={settings.hslYellowLum}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslYellowLum", v)}
                        icon={<IconSun size={14} />}
                      />
                    </ControlGroup>

                    {/* Green Channel */}
                    <ControlGroup
                      title="Green"
                      icon={
                        <IconCircleFilled
                          size={12}
                          className="text-green-500"
                        />
                      }
                    >
                      <Slider
                        label="Hue"
                        value={settings.hslGreenHue}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslGreenHue", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Saturation"
                        value={settings.hslGreenSat}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslGreenSat", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Luminance"
                        value={settings.hslGreenLum}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslGreenLum", v)}
                        icon={<IconSun size={14} />}
                      />
                    </ControlGroup>

                    {/* Aqua Channel */}
                    <ControlGroup
                      title="Aqua"
                      icon={
                        <IconCircleFilled size={12} className="text-cyan-400" />
                      }
                    >
                      <Slider
                        label="Hue"
                        value={settings.hslAquaHue}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslAquaHue", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Saturation"
                        value={settings.hslAquaSat}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslAquaSat", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Luminance"
                        value={settings.hslAquaLum}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslAquaLum", v)}
                        icon={<IconSun size={14} />}
                      />
                    </ControlGroup>

                    {/* Blue Channel */}
                    <ControlGroup
                      title="Blue"
                      icon={
                        <IconCircleFilled size={12} className="text-blue-500" />
                      }
                    >
                      <Slider
                        label="Hue"
                        value={settings.hslBlueHue}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslBlueHue", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Saturation"
                        value={settings.hslBlueSat}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslBlueSat", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Luminance"
                        value={settings.hslBlueLum}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslBlueLum", v)}
                        icon={<IconSun size={14} />}
                      />
                    </ControlGroup>

                    {/* Purple Channel */}
                    <ControlGroup
                      title="Purple"
                      icon={
                        <IconCircleFilled
                          size={12}
                          className="text-purple-500"
                        />
                      }
                    >
                      <Slider
                        label="Hue"
                        value={settings.hslPurpleHue}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslPurpleHue", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Saturation"
                        value={settings.hslPurpleSat}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslPurpleSat", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Luminance"
                        value={settings.hslPurpleLum}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslPurpleLum", v)}
                        icon={<IconSun size={14} />}
                      />
                    </ControlGroup>

                    {/* Magenta Channel */}
                    <ControlGroup
                      title="Magenta"
                      icon={
                        <IconCircleFilled size={12} className="text-pink-500" />
                      }
                    >
                      <Slider
                        label="Hue"
                        value={settings.hslMagentaHue}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslMagentaHue", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Saturation"
                        value={settings.hslMagentaSat}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslMagentaSat", v)}
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Luminance"
                        value={settings.hslMagentaLum}
                        min={-1}
                        max={1}
                        onChange={(v) => updateSetting("hslMagentaLum", v)}
                        icon={<IconSun size={14} />}
                      />
                    </ControlGroup>
                  </div>
                )}

                {/* Film Emulation Tab */}
                {activeTab === "films" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <ControlGroup title="Film Stock Emulation">
                      <p className="text-[9px] text-gray-500 mb-4 text-center">
                        Authentic analog film simulation
                      </p>

                      <div className="flex flex-col space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-4 custom-scrollbar">
                        {Object.entries(
                          FILM_EMULATIONS.reduce((acc, film) => {
                            if (!acc[film.category]) acc[film.category] = [];
                            acc[film.category].push(film);
                            return acc;
                          }, {} as Record<string, typeof FILM_EMULATIONS>)
                        ).map(([category, films]) => (
                          <div key={category} className="space-y-3">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider sticky top-0 bg-[#0a0a0a] py-1 z-10 border-b border-white/5">
                              {category}
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              {films.map((film) => (
                                <button
                                  key={film.id}
                                  onClick={() => updateSetting("filmEmulation", film.id)}
                                  title={film.name}
                                  className={`p-3 rounded-lg border transition-all text-left truncate flex flex-col justify-center items-start ${
                                    settings.filmEmulation === film.id
                                      ? "bg-amber-900/20 border-amber-500/50 ring-1 ring-amber-500/30"
                                      : "bg-white/5 border-white/10 hover:border-white/20"
                                  }`}
                                >
                                  <div className="text-xs font-medium text-gray-200 truncate w-full">
                                    {film.name}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {settings.filmEmulation !== "none" && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <Slider
                            label="Film Strength"
                            value={settings.filmEmulationStrength}
                            min={0}
                            max={1}
                            onChange={(v) =>
                              updateSetting("filmEmulationStrength", v)
                            }
                            icon={<IconAperture size={14} />}
                          />
                        </div>
                      )}
                    </ControlGroup>
                  </div>
                )}

                {activeTab === "effects" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <ControlGroup title="Optics">
                      <Slider
                        label="Vignette"
                        value={settings.vignette}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("vignette", v)}
                        icon={<IconEye size={14} />}
                      />
                      <Slider
                        label="Chromatic Aberration"
                        value={settings.aberration}
                        min={0}
                        max={0.02}
                        step={0.001}
                        onChange={(v) => updateSetting("aberration", v)}
                        icon={<IconAperture size={14} />}
                      />
                      <Slider
                        label="Anamorphic Distortion"
                        value={settings.anamorphicDistortion}
                        min={0}
                        max={1}
                        onChange={(v) =>
                          updateSetting("anamorphicDistortion", v)
                        }
                        icon={<IconEye size={14} />}
                      />
                      <Slider
                        label="Anamorphic Streaks"
                        value={settings.anamorphicStreaks}
                        min={0}
                        max={1}
                        onChange={(v) =>
                          updateSetting("anamorphicStreaks", v)
                        }
                        icon={<IconBolt size={14} />}
                      />
                    </ControlGroup>

                    <ControlGroup title="Physics: Halation & Bloom">
                      <h4 className="text-[10px] font-bold text-red-400 mb-2 uppercase tracking-wider">
                        Halation (Film Bleed)
                      </h4>
                      <Slider
                        label="Strength"
                        value={settings.halation || 0}
                        min={0}
                        max={2}
                        onChange={(v) => updateSetting("halation", v)}
                        icon={<IconBolt size={14} />}
                        accentColor="accent-red-500"
                      />
                      <div className="flex gap-2">
                        <Slider
                          label="Threshold"
                          value={settings.halationThreshold || 0.7}
                          min={0}
                          max={1}
                          step={0.01}
                          onChange={(v: number) =>
                            updateSetting("halationThreshold", v)
                          }
                          icon={<IconBolt size={12} />}
                        />
                        <Slider
                          label="Radius"
                          value={settings.halationRadius || 1.0}
                          min={0}
                          max={3}
                          onChange={(v: number) =>
                            updateSetting("halationRadius", v)
                          }
                          icon={<IconBolt size={12} />}
                        />
                      </div>

                      <div className="h-px bg-white/10 my-4" />

                      <h4 className="text-[10px] font-bold text-blue-400 mb-2 uppercase tracking-wider">
                        Optical Bloom
                      </h4>
                      <Slider
                        label="Strength"
                        value={settings.bloom || 0}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("bloom", v)}
                        icon={<IconBulb size={14} />}
                        accentColor="accent-blue-500"
                      />
                      <div className="flex gap-2">
                        <Slider
                          label="Threshold"
                          value={settings.bloomThreshold || 0.8}
                          min={0}
                          max={1}
                          step={0.01}
                          onChange={(v: number) =>
                            updateSetting("bloomThreshold", v)
                          }
                          icon={<IconBulb size={12} />}
                        />
                        <Slider
                          label="Radius"
                          value={settings.bloomRadius || 1.0}
                          min={0}
                          max={3}
                          onChange={(v: number) =>
                            updateSetting("bloomRadius", v)
                          }
                          icon={<IconBulb size={12} />}
                        />
                      </div>
                    </ControlGroup>

                    <ControlGroup title="Texture & Overlays">
                      <Slider
                        label="Film Grain"
                        value={settings.grain}
                        min={0}
                        max={0.5}
                        onChange={(v) => updateSetting("grain", v)}
                        icon={<IconPhoto size={14} />}
                      />
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-medium text-gray-400">
                          Film Border
                        </span>
                        <button
                          onClick={() =>
                            updateSetting("filmBorder", !settings.filmBorder)
                          }
                          className={`w-10 h-5 rounded-full relative transition ${settings.filmBorder ? "bg-orange-500" : "bg-gray-700"}`}
                        >
                          <div
                            className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.filmBorder ? "left-6" : "left-1"}`}
                          />
                        </button>
                      </div>
                    </ControlGroup>
                  </div>
                )}

                {activeTab === "masking" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* BRUSH MASK - Lightroom Style */}
                    <ControlGroup title="Brush Mask (Paint to Select)">
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => {
                            setBrushMaskActive(!brushMaskActive);
                            setBrushErasing(false);
                          }}
                          className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-medium rounded-lg transition border flex items-center justify-center gap-2 ${
                            brushMaskActive && !brushErasing
                              ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                              : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          🖌️ Brush
                        </button>
                        <button
                          onClick={() => {
                            setBrushMaskActive(true);
                            setBrushErasing(true);
                          }}
                          className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-medium rounded-lg transition border flex items-center justify-center gap-2 ${
                            brushMaskActive && brushErasing
                              ? "bg-red-500/20 border-red-500/50 text-red-400"
                              : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          🧹 Eraser
                        </button>
                      </div>

                      {brushMaskActive && (
                        <p className="text-[10px] text-cyan-400/80 italic mb-4 text-center">
                          Paint on the image to create your mask
                        </p>
                      )}

                      <Slider
                        label="Brush Size"
                        value={brushSize}
                        min={0.1}
                        max={1}
                        onChange={(v) => setBrushSize(v)}
                        icon={<IconAperture size={14} />}
                      />
                      <Slider
                        label="Feather (Softness)"
                        value={brushFeather}
                        min={0}
                        max={1}
                        onChange={(v) => setBrushFeather(v)}
                        icon={<IconAperture size={14} />}
                      />

                      <button
                        onClick={() => {
                          window.__brushMaskClear?.();
                          setBrushMaskData("");
                        }}
                        className="w-full py-2 text-[10px] uppercase tracking-widest bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition mt-2"
                      >
                        Clear Mask
                      </button>

                      {brushMaskData && (
                        <div className="pt-3 border-t border-white/5 mt-3">
                          <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-3">
                            Mask Adjustments
                          </p>
                          <Slider
                            label="Exposure"
                            value={brushMaskExposure}
                            min={-1}
                            max={1}
                            onChange={(v) =>
                              setBrushMaskExposure(v)
                            }
                            icon={<IconSun size={14} />}
                          />
                          <Slider
                            label="Contrast"
                            value={brushMaskContrast}
                            min={-1}
                            max={1}
                            onChange={(v) =>
                              setBrushMaskContrast(v)
                            }
                            icon={<IconContrast size={14} />}
                          />
                          <Slider
                            label="Saturation"
                            value={brushMaskSaturation}
                            min={-1}
                            max={1}
                            onChange={(v) =>
                              setBrushMaskSaturation(v)
                            }
                            icon={<IconPalette size={14} />}
                          />
                          <Slider
                            label="Temperature"
                            value={brushMaskTemperature}
                            min={-1}
                            max={1}
                            onChange={(v) =>
                              setBrushMaskTemperature(v)
                            }
                            icon={<IconSun size={14} />}
                          />
                          <Slider
                            label="Clarity"
                            value={brushMaskClarity}
                            min={0}
                            max={1}
                            onChange={(v) =>
                              setBrushMaskClarity(v)
                            }
                            icon={<IconBolt size={14} />}
                          />
                        </div>
                      )}
                    </ControlGroup>

                    <div className="border-t border-white/10 pt-4">
                      <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-4 text-center">
                        — Parametric Masks —
                      </p>
                    </div>

                    <ControlGroup title="Radial Gradient Mask">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-medium text-gray-400">
                          Enable
                        </span>
                        <button
                          onClick={() =>
                            updateSetting(
                              "radialMaskEnabled",
                              !settings.radialMaskEnabled
                            )
                          }
                          className={`w-10 h-5 rounded-full relative transition ${settings.radialMaskEnabled ? "bg-amber-500" : "bg-gray-700"}`}
                        >
                          <div
                            className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.radialMaskEnabled ? "left-6" : "left-1"}`}
                          />
                        </button>
                      </div>
                      <Slider
                        label="Center X"
                        value={settings.radialMaskX}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("radialMaskX", v)}
                        icon={<IconAperture size={14} />}
                      />
                      <Slider
                        label="Center Y"
                        value={settings.radialMaskY}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("radialMaskY", v)}
                        icon={<IconAperture size={14} />}
                      />
                      <Slider
                        label="Radius"
                        value={settings.radialMaskRadius}
                        min={0.1}
                        max={1}
                        onChange={(v) =>
                          updateSetting("radialMaskRadius", v)
                        }
                        icon={<IconAperture size={14} />}
                      />
                      <Slider
                        label="Feather"
                        value={settings.radialMaskFeather}
                        min={0}
                        max={0.5}
                        onChange={(v) =>
                          updateSetting("radialMaskFeather", v)
                        }
                        icon={<IconAperture size={14} />}
                      />
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-medium text-gray-400">
                          Invert Mask
                        </span>
                        <button
                          onClick={() =>
                            updateSetting(
                              "radialMaskInvert",
                              !settings.radialMaskInvert
                            )
                          }
                          className={`w-10 h-5 rounded-full relative transition ${settings.radialMaskInvert ? "bg-amber-500" : "bg-gray-700"}`}
                        >
                          <div
                            className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.radialMaskInvert ? "left-6" : "left-1"}`}
                          />
                        </button>
                      </div>
                      <div className="pt-2 border-t border-white/5 mt-2">
                        <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-3">
                          Mask Adjustments
                        </p>
                        <Slider
                          label="Exposure"
                          value={settings.radialMaskExposure}
                          min={-1}
                          max={1}
                          onChange={(v) =>
                            updateSetting("radialMaskExposure", v)
                          }
                          icon={<IconSun size={14} />}
                        />
                        <Slider
                          label="Contrast"
                          value={settings.radialMaskContrast}
                          min={-1}
                          max={1}
                          onChange={(v) =>
                            updateSetting("radialMaskContrast", v)
                          }
                          icon={<IconContrast size={14} />}
                        />
                        <Slider
                          label="Saturation"
                          value={settings.radialMaskSaturation}
                          min={-1}
                          max={1}
                          onChange={(v) =>
                            updateSetting("radialMaskSaturation", v)
                          }
                          icon={<IconPalette size={14} />}
                        />
                      </div>
                    </ControlGroup>

                    <ControlGroup title="Linear Gradient Mask">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-medium text-gray-400">
                          Enable
                        </span>
                        <button
                          onClick={() =>
                            updateSetting(
                              "linearMaskEnabled",
                              !settings.linearMaskEnabled
                            )
                          }
                          className={`w-10 h-5 rounded-full relative transition ${settings.linearMaskEnabled ? "bg-amber-500" : "bg-gray-700"}`}
                        >
                          <div
                            className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.linearMaskEnabled ? "left-6" : "left-1"}`}
                          />
                        </button>
                      </div>
                      <Slider
                        label="Angle"
                        value={settings.linearMaskAngle}
                        min={0}
                        max={1}
                        onChange={(v) =>
                          updateSetting("linearMaskAngle", v)
                        }
                        icon={<IconRotateClockwise size={14} />}
                      />
                      <Slider
                        label="Position"
                        value={settings.linearMaskPosition}
                        min={0}
                        max={1}
                        onChange={(v) =>
                          updateSetting("linearMaskPosition", v)
                        }
                        icon={<IconAdjustmentsHorizontal size={14} />}
                      />
                      <Slider
                        label="Feather"
                        value={settings.linearMaskFeather}
                        min={0}
                        max={0.5}
                        onChange={(v) =>
                          updateSetting("linearMaskFeather", v)
                        }
                        icon={<IconAperture size={14} />}
                      />
                      <div className="pt-2 border-t border-white/5 mt-2">
                        <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-3">
                          Mask Adjustments
                        </p>
                        <Slider
                          label="Exposure"
                          value={settings.linearMaskExposure}
                          min={-1}
                          max={1}
                          onChange={(v) =>
                            updateSetting("linearMaskExposure", v)
                          }
                          icon={<IconSun size={14} />}
                        />
                        <Slider
                          label="Contrast"
                          value={settings.linearMaskContrast}
                          min={-1}
                          max={1}
                          onChange={(v) =>
                            updateSetting("linearMaskContrast", v)
                          }
                          icon={<IconContrast size={14} />}
                        />
                      </div>
                    </ControlGroup>

                    <ControlGroup title="Luminosity Mask">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-medium text-gray-400">
                          Enable
                        </span>
                        <button
                          onClick={() =>
                            updateSetting(
                              "luminosityMaskEnabled",
                              !settings.luminosityMaskEnabled
                            )
                          }
                          className={`w-10 h-5 rounded-full relative transition ${settings.luminosityMaskEnabled ? "bg-amber-500" : "bg-gray-700"}`}
                        >
                          <div
                            className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.luminosityMaskEnabled ? "left-6" : "left-1"}`}
                          />
                        </button>
                      </div>
                      <div className="flex justify-between mb-3">
                        <button
                          onClick={() =>
                            updateSetting("luminosityMaskTarget", 0.2)
                          }
                          className={`flex-1 py-2 mx-1 text-[9px] uppercase rounded ${settings.luminosityMaskTarget < 0.35 ? "bg-gray-800 border border-amber-500/50 text-amber-400" : "bg-gray-800/50 border border-white/10 text-gray-500"}`}
                        >
                          Shadows
                        </button>
                        <button
                          onClick={() =>
                            updateSetting("luminosityMaskTarget", 0.5)
                          }
                          className={`flex-1 py-2 mx-1 text-[9px] uppercase rounded ${settings.luminosityMaskTarget >= 0.35 && settings.luminosityMaskTarget <= 0.65 ? "bg-gray-600 border border-amber-500/50 text-amber-400" : "bg-gray-600/50 border border-white/10 text-gray-500"}`}
                        >
                          Mids
                        </button>
                        <button
                          onClick={() =>
                            updateSetting("luminosityMaskTarget", 0.8)
                          }
                          className={`flex-1 py-2 mx-1 text-[9px] uppercase rounded ${settings.luminosityMaskTarget > 0.65 ? "bg-gray-400 border border-amber-500/50 text-amber-900" : "bg-gray-400/50 border border-white/10 text-gray-600"}`}
                        >
                          Highlights
                        </button>
                      </div>
                      <Slider
                        label="Range"
                        value={settings.luminosityMaskRange}
                        min={0.1}
                        max={0.5}
                        onChange={(v) =>
                          updateSetting("luminosityMaskRange", v)
                        }
                        icon={<IconAdjustmentsHorizontal size={14} />}
                      />
                      <div className="pt-2 border-t border-white/5 mt-2">
                        <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-3">
                          Mask Adjustments
                        </p>
                        <Slider
                          label="Exposure"
                          value={settings.luminosityMaskExposure}
                          min={-1}
                          max={1}
                          onChange={(v) =>
                            updateSetting("luminosityMaskExposure", v)
                          }
                          icon={<IconSun size={14} />}
                        />
                        <Slider
                          label="Saturation"
                          value={settings.luminosityMaskSaturation}
                          min={-1}
                          max={1}
                          onChange={(v) =>
                            updateSetting("luminosityMaskSaturation", v)
                          }
                          icon={<IconPalette size={14} />}
                        />
                      </div>
                    </ControlGroup>
                  </div>
                )}

                {activeTab === "metadata" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <ControlGroup title="Culling">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                            Rating
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber-300/70">
                            {assetMetadata.rating > 0
                              ? `${assetMetadata.rating}/5`
                              : "Clear"}
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                          {[0, 1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              onClick={() =>
                                setAssetMetadata((prev) => ({
                                  ...prev,
                                  rating,
                                }))
                              }
                              className={`h-10 border font-mono text-[11px] uppercase tracking-[0.16em] transition ${
                                assetMetadata.rating === rating
                                  ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
                                  : "border-white/10 bg-white/[0.03] text-white/40 hover:border-white/25 hover:text-white/75"
                              }`}
                            >
                              {rating === 0 ? "0" : rating}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4">
                        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                          Flag
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              ["picked", "Pick"],
                              ["rejected", "Reject"],
                              ["unflagged", "Clear"],
                            ] as const
                          ).map(([flag, label]) => (
                            <button
                              key={flag}
                              onClick={() =>
                                setAssetMetadata((prev) => ({
                                  ...prev,
                                  flagStatus: flag,
                                }))
                              }
                              className={`border px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] transition ${
                                assetMetadata.flagStatus === flag
                                  ? flag === "picked"
                                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                                    : flag === "rejected"
                                      ? "border-red-400/50 bg-red-400/10 text-red-200"
                                      : "border-white/30 bg-white/10 text-white"
                                  : "border-white/10 bg-white/[0.03] text-white/35 hover:border-white/25 hover:text-white/70"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4">
                        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                          Color Label
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {COLOR_LABELS.map((label) => (
                            <button
                              key={label.id}
                              onClick={() =>
                                setAssetMetadata((prev) => ({
                                  ...prev,
                                  colorLabel: label.id,
                                }))
                              }
                              title={label.label}
                              className={`flex h-9 items-center justify-center border transition ${
                                assetMetadata.colorLabel === label.id
                                  ? "border-white/70 bg-white/10"
                                  : "border-white/10 bg-white/[0.03] hover:border-white/30"
                              }`}
                            >
                              <span
                                className={`h-4 w-4 rounded-full border ${
                                  label.id === "none"
                                    ? "border-white/25"
                                    : "border-transparent"
                                }`}
                                style={{
                                  backgroundColor: label.color,
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </ControlGroup>

                    <ControlGroup title="Metadata">
                      <div className="space-y-4">
                        <label className="block">
                          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                            Title
                          </span>
                          <input
                            value={assetMetadata.title}
                            onChange={(event) =>
                              setAssetMetadata((prev) => ({
                                ...prev,
                                title: event.target.value,
                              }))
                            }
                            className="w-full border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white/80 outline-none transition placeholder:text-white/20 focus:border-amber-500/50"
                            placeholder="Untitled"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                            Caption
                          </span>
                          <textarea
                            value={assetMetadata.caption}
                            onChange={(event) =>
                              setAssetMetadata((prev) => ({
                                ...prev,
                                caption: event.target.value,
                              }))
                            }
                            rows={3}
                            className="w-full resize-none border border-white/10 bg-black/40 px-3 py-2.5 text-sm leading-5 text-white/80 outline-none transition placeholder:text-white/20 focus:border-amber-500/50"
                            placeholder="Delivery note or image caption"
                          />
                        </label>

                        <div className="grid grid-cols-1 gap-3">
                          <label className="block">
                            <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                              Creator
                            </span>
                            <input
                              value={assetMetadata.creator}
                              onChange={(event) =>
                                setAssetMetadata((prev) => ({
                                  ...prev,
                                  creator: event.target.value,
                                }))
                              }
                              className="w-full border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white/80 outline-none transition placeholder:text-white/20 focus:border-amber-500/50"
                              placeholder="Creator or studio"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                              Copyright
                            </span>
                            <input
                              value={assetMetadata.copyright}
                              onChange={(event) =>
                                setAssetMetadata((prev) => ({
                                  ...prev,
                                  copyright: event.target.value,
                                }))
                              }
                              className="w-full border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white/80 outline-none transition placeholder:text-white/20 focus:border-amber-500/50"
                              placeholder="All rights reserved"
                            />
                          </label>
                        </div>

                        <label className="block">
                          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                            Keywords
                          </span>
                          <input
                            value={assetMetadata.keywords}
                            onChange={(event) =>
                              setAssetMetadata((prev) => ({
                                ...prev,
                                keywords: event.target.value,
                              }))
                            }
                            className="w-full border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white/80 outline-none transition placeholder:text-white/20 focus:border-amber-500/50"
                            placeholder="portrait, editorial, delivery"
                          />
                        </label>
                      </div>
                    </ControlGroup>

                    <ControlGroup title="Watermark">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">
                          Enable delivery mark
                        </span>
                        <button
                          onClick={() =>
                            setWatermark((prev) => ({
                              ...prev,
                              enabled: !prev.enabled,
                              text: prev.text || "PROOF",
                            }))
                          }
                          className={`w-10 h-5 rounded-full relative transition ${watermark.enabled ? "bg-amber-500" : "bg-gray-700"}`}
                        >
                          <div
                            className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${watermark.enabled ? "left-6" : "left-1"}`}
                          />
                        </button>
                      </div>

                      <label className="block pt-2">
                        <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                          Text
                        </span>
                        <input
                          value={watermark.text}
                          onChange={(event) =>
                            setWatermark((prev) => ({
                              ...prev,
                              text: event.target.value,
                            }))
                          }
                          className="w-full border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white/80 outline-none transition placeholder:text-white/20 focus:border-amber-500/50"
                          placeholder="PROOF"
                        />
                      </label>

                      <div className="pt-2">
                        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                          Position
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {WATERMARK_POSITIONS.map((position) => (
                            <button
                              key={position.id}
                              onClick={() =>
                                setWatermark((prev) => ({
                                  ...prev,
                                  position: position.id,
                                }))
                              }
                              className={`border px-2 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                                watermark.position === position.id
                                  ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                                  : "border-white/10 bg-white/[0.03] text-white/35 hover:border-white/25 hover:text-white/70"
                              }`}
                            >
                              {position.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 pt-2">
                        <Slider
                          label="Opacity"
                          value={watermark.opacity}
                          min={0}
                          max={1}
                          step={0.01}
                          onChange={(value) =>
                            setWatermark((prev) => ({
                              ...prev,
                              opacity: value,
                            }))
                          }
                          icon={<IconEye size={14} />}
                        />
                        <Slider
                          label="Size"
                          value={watermark.size}
                          min={0}
                          max={1}
                          step={0.01}
                          onChange={(value) =>
                            setWatermark((prev) => ({
                              ...prev,
                              size: value,
                            }))
                          }
                          icon={<IconTypography size={14} />}
                        />
                      </div>
                    </ControlGroup>
                  </div>
                )}

                {activeTab === "text" && (
                  <CinematicTextControls
                    textOverlay={textOverlay}
                    setTextOverlay={setTextOverlay}
                  />
                )}

                {activeTab === "transform" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <ControlGroup title="Geometry">
                      <Slider
                        label="Rotate"
                        value={settings.rotate}
                        min={-0.5}
                        max={0.5}
                        step={0.01}
                        onChange={(v) => updateSetting("rotate", v)}
                        icon={<IconRotateClockwise size={14} />}
                      />
                      <Slider
                        label="Zoom"
                        value={settings.zoom}
                        min={1}
                        max={3}
                        onChange={(v) => updateSetting("zoom", v)}
                        icon={<IconZoomIn size={14} />}
                      />
                    </ControlGroup>

                    <ControlGroup title="Optics & Lens">
                      <Slider
                        label="Lens Distortion"
                        value={settings.lensDistortion}
                        min={-0.5}
                        max={0.5}
                        onChange={(v) =>
                          updateSetting("lensDistortion", v)
                        }
                        icon={<IconDeviceDesktop size={14} />}
                        bipolar
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Slider
                          label="Keystone H"
                          value={settings.keystoneH}
                          min={-0.5}
                          max={0.5}
                          onChange={(v) => updateSetting("keystoneH", v)}
                          icon={<IconPerspective size={14} />}
                          bipolar
                        />
                        <Slider
                          label="Keystone V"
                          value={settings.keystoneV}
                          min={-0.5}
                          max={0.5}
                          onChange={(v) => updateSetting("keystoneV", v)}
                          icon={<IconPerspective size={14} />}
                          bipolar
                        />
                      </div>

                      <div className="pt-4 mt-2 border-t border-white/5">
                        <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-3">
                          Tilt-Shift Blur
                        </p>
                        <Slider
                          label="Blur Amount"
                          value={settings.tiltShiftAmount}
                          min={0}
                          max={1}
                          onChange={(v) =>
                            updateSetting("tiltShiftAmount", v)
                          }
                          icon={<IconDroplet size={14} />}
                        />
                        {settings.tiltShiftAmount > 0 && (
                          <>
                            <Slider
                              label="Position"
                              value={settings.tiltShiftPosition}
                              min={0}
                              max={1}
                              onChange={(v) =>
                                updateSetting("tiltShiftPosition", v)
                              }
                              icon={<IconArrowsMaximize size={14} />}
                            />
                            <Slider
                              label="Angle"
                              value={settings.tiltShiftAngle}
                              min={-3.14}
                              max={3.14}
                              step={0.1}
                              onChange={(v) =>
                                updateSetting("tiltShiftAngle", v)
                              }
                              icon={<IconRotateClockwise size={14} />}
                            />
                          </>
                        )}
                      </div>
                    </ControlGroup>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="hidden border-t border-white/5 bg-black/40 p-4 md:block md:space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIsPresetModalOpen(true)}
                    className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-900/50 to-orange-900/50 hover:from-amber-800/50 hover:to-orange-800/50 text-[10px] uppercase tracking-widest font-medium rounded-lg transition border border-amber-500/30"
                  >
                    <IconDeviceFloppy size={12} /> Create .{FORMAT.recipeExtension}
                  </button>
                  <label className="flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-widest font-medium rounded-lg transition border border-white/5 cursor-pointer">
                    <IconFileCode size={12} /> Load .{FORMAT.recipeExtension}
                    <input
                      type="file"
                      accept={`.${FORMAT.recipeExtension},.nyv,.json`}
                      onChange={handleLoadPreset}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopySettings}
                    className="flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-widest font-medium rounded-lg transition border border-white/5"
                  >
                    Copy
                  </button>
                  <button
                    onClick={handlePasteSettings}
                    disabled={!clipboard}
                    className={`flex items-center justify-center gap-2 py-2.5 text-[10px] uppercase tracking-widest font-medium rounded-lg transition border border-white/5 ${clipboard ? "bg-white/5 hover:bg-white/10" : "bg-black/20 text-gray-600 cursor-not-allowed"}`}
                  >
                    Paste
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tutorial Modal */}
      {activeTutorial && TUTORIAL_CONTENT[activeTutorial] && (
        <TutorialModal
          isOpen={!!activeTutorial}
          onClose={handleTutorialClose}
          content={TUTORIAL_CONTENT[activeTutorial]}
        />
      )}

      {/* Preset Creator Modal */}
      <PresetCreatorModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        settings={settings}
        onSave={(presetData) => {
          const blob = new Blob([JSON.stringify(presetData, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${presetData.name.replace(/\s+/g, "-").toLowerCase() || "recipe"}-${Date.now()}.${FORMAT.recipeExtension}`;
          a.click();
          URL.revokeObjectURL(url);
        }}
      />

      {/* Reference Viewer */}
      <ReferenceViewer
        isOpen={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        referenceUrl={referenceImageUrl}
        originalUrl={imageSrc}
        onUploadReference={(file) => {
          const url = URL.createObjectURL(file);
          setReferenceImageUrl(url);
        }}
      />

      {/* LUT Creator Modal */}
      <LUTCreatorModal
        isOpen={isLUTCreatorOpen}
        onClose={() => setIsLUTCreatorOpen(false)}
        onApplyLUT={(lutData) => {
          // Create a 3D LUT texture from the data
          const size = 17;
          const data = new Uint8Array(size * size * size * 4);
          for (let i = 0; i < lutData.length; i += 3) {
            const idx = (i / 3) * 4;
            data[idx] = Math.round(lutData[i] * 255);
            data[idx + 1] = Math.round(lutData[i + 1] * 255);
            data[idx + 2] = Math.round(lutData[i + 2] * 255);
            data[idx + 3] = 255;
          }
          const texture = new THREE.Data3DTexture(data, size, size, size);
          texture.format = THREE.RGBAFormat;
          texture.type = THREE.UnsignedByteType;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.wrapR = THREE.ClampToEdgeWrapping;
          texture.needsUpdate = true;
          updateSetting("lutTexture", texture);
          updateSetting("lutStrength", 1.0);
          addToHistory(settings, "Apply Custom LUT");
        }}
      />

      {/* Video Grading Panel */}
      <VideoGradingPanel
        isOpen={isVideoGradingOpen}
        onClose={() => setIsVideoGradingOpen(false)}
        settings={settings}
        onExtractFrame={(dataUrl) => {
          setImageSrc(dataUrl);
          setImageName("Video Frame");
          setAssetMetadata({
            ...DEFAULT_ASSET_METADATA,
            title: "Video Frame",
          });
          setWatermark(DEFAULT_WATERMARK);
          void getImageFileInfo(dataUrl).then(setImageInfo).catch(() => {
            setImageInfo(null);
          });
          addToHistory(settings, "Extract Video Frame");
        }}
      />

      {/* Histogram Help Modal */}
      {isHistogramHelpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-8 max-w-md relative shadow-2xl">
            <button
              onClick={() => setIsHistogramHelpOpen(false)}
              className="absolute top-4 right-4 text-white/30 hover:text-white"
            >
              <IconX size={18} />
            </button>
            <h3 className="font-mono text-lg uppercase tracking-widest text-amber-500 mb-6 flex items-center gap-3">
              <IconChartLine /> Reading the Histogram
            </h3>
            <div className="space-y-4 text-sm font-light text-gray-300 leading-relaxed">
              <p>
                The histogram shows the distribution of exposure in your image
                from shadows (left) to highlights (right).
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono uppercase tracking-wider text-white/40 my-4">
                <div className="bg-gradient-to-r from-black via-gray-900 to-transparent h-2 rounded" />
                <div className="bg-gradient-to-r from-transparent via-gray-500 to-transparent h-2 rounded" />
                <div className="bg-gradient-to-r from-transparent via-white to-white h-2 rounded" />
                <span>Blacks</span>
                <span>Midtones</span>
                <span>Whites</span>
              </div>
              <ul className="space-y-2 list-disc pl-4 text-white/60">
                <li>
                  <span className="text-red-400">Peaks on the far left</span>{" "}
                  indicate crushed blacks (loss of shadow detail).
                </li>
                <li>
                  <span className="text-blue-400">Peaks on the far right</span>{" "}
                  indicate clipped highlights (blown out whites).
                </li>
                <li>
                  <span className="text-white">RGB Lines</span> indicate color
                  balance. Separate lines imply a color cast.
                </li>
              </ul>

              <div className="mt-6 border-t border-white/10 pt-4">
                <h4 className="font-mono text-xs uppercase tracking-widest text-amber-500 mb-2">
                  In Plain English
                </h4>
                <p className="text-sm font-light text-gray-400">
                  Think of it as a mountain range. Use the &quot;mountains&quot;
                  to tell if your photo is too dark or too bright. You generally want
                  the mountains to be in the middle, not squashed against the
                  sides.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-white/10 bg-[#151515] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-amber-300/70">
                  <IconDownload size={15} /> Delivery
                </div>
                <h3 className="mt-2 text-xl font-light text-white">
                  Export Image
                </h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="border border-white/10 bg-black/30 p-2 text-white/35 transition hover:border-white/25 hover:text-white"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="custom-scrollbar space-y-6 overflow-y-auto p-6">
              {/* Recipes */}
              <div className="space-y-3">
                <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                  Export Recipes
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXPORT_RECIPES.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => applyExportRecipe(recipe)}
                      className={`border p-3 text-left transition-all ${activeExportRecipeId === recipe.id ? "border-amber-500/60 bg-amber-500/10" : "border-white/10 bg-black/30 hover:border-white/25"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-mono uppercase tracking-[0.22em] text-white/80">
                          {recipe.name}
                        </span>
                        <span className="shrink-0 text-[10px] font-mono text-amber-400/80">
                          {recipe.format.split("/")[1].toUpperCase()} •{" "}
                          {recipe.scale}x
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-white/45">
                        {recipe.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div className="space-y-3">
                <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["image/jpeg", "image/png", "image/webp"] as const).map(
                    (fmt) => (
                      <button
                        key={fmt}
                        onClick={() => {
                          setActiveExportRecipeId(null);
                          setExportFormat(fmt);
                        }}
                        className={`border p-3 text-center transition-all ${exportFormat === fmt ? "border-white bg-white text-black" : "border-white/10 bg-black/30 text-white/60 hover:border-white/25"}`}
                      >
                        <div className="font-bold text-sm">
                          {fmt
                            .split("/")[1]
                            .toUpperCase()
                            .replace("JPEG", "JPG")}
                        </div>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Quality */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                    Quality
                  </label>
                  <span className="text-[10px] font-mono text-amber-500">
                    {exportQuality}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={exportQuality}
                  onChange={(e) => {
                    setActiveExportRecipeId(null);
                    setExportQuality(Number(e.target.value));
                  }}
                  className="w-full"
                />
              </div>

              {/* Scale */}
              <div className="space-y-3">
                <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                  Scale factor
                </label>
                <div className="flex gap-2">
                  {[0.5, 1, 2, 4].map((scale) => (
                    <button
                      key={scale}
                      onClick={() => {
                        setActiveExportRecipeId(null);
                        setExportScale(scale);
                      }}
                      className={`flex-1 border p-2 font-mono text-xs transition-all ${exportScale === scale ? "border-amber-400/60 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/50 hover:border-white/25"}`}
                    >
                      {scale}x
                    </button>
                  ))}
                </div>
              </div>

              {exportSafetyWarnings.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                    Export Safety
                  </label>
                  <div className="space-y-2">
                    {exportSafetyWarnings.map((warning) => (
                      <div
                        key={`${warning.title}-${warning.detail}`}
                        className={`border p-3 ${
                          warning.tone === "warn"
                            ? "border-amber-500/25 bg-amber-500/[0.06]"
                            : "border-cyan-500/20 bg-cyan-500/[0.04]"
                        }`}
                      >
                        <div
                          className={`font-mono text-[10px] uppercase tracking-[0.24em] ${
                            warning.tone === "warn"
                              ? "text-amber-300"
                              : "text-cyan-300"
                          }`}
                        >
                          {warning.title}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-white/45">
                          {warning.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-white/10 bg-black/30 p-6">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="flex-1 border border-white/10 bg-black/40 py-3 font-mono text-xs uppercase tracking-widest text-white/60 transition hover:border-white/25 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-[2] border border-amber-400/40 bg-amber-400 py-3 font-mono text-xs font-bold uppercase tracking-widest text-black transition hover:bg-amber-300"
              >
                Export Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Diff Modal */}
      {diffVirtualCopy && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden border border-white/10 bg-[#151515] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-300/70">
                  Edit Diff
                </div>
                <h3 className="mt-2 text-xl font-light text-white">
                  Current Edit vs {diffVirtualCopy.name}
                </h3>
              </div>
              <button
                onClick={() => setDiffVirtualCopyId(null)}
                className="border border-white/10 bg-black/30 p-2 text-white/35 transition hover:border-white/25 hover:text-white"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="custom-scrollbar overflow-y-auto p-6">
              {editDiffs.length > 0 ? (
                <div className="space-y-2">
                  {editDiffs.map((diff) => (
                    <div
                      key={diff.key}
                      className="grid grid-cols-1 gap-3 border border-white/10 bg-black/30 p-4 md:grid-cols-3"
                    >
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/30">
                          Setting
                        </div>
                        <div className="mt-1 text-sm text-white/75">
                          {diff.label}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-amber-300/70">
                          Current
                        </div>
                        <div className="mt-1 break-words text-sm text-white/70">
                          {diff.current}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-cyan-300/70">
                          Saved Copy
                        </div>
                        <div className="mt-1 break-words text-sm text-white/70">
                          {diff.saved}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-white/10 bg-black/30 p-8 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
                    No Differences
                  </div>
                  <p className="mt-3 text-sm text-white/45">
                    The current recipe matches this virtual copy.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-white/10 bg-black/30 p-6">
              <button
                onClick={() => setDiffVirtualCopyId(null)}
                className="flex-1 border border-white/10 bg-black/40 py-3 font-mono text-xs uppercase tracking-widest text-white/60 transition hover:border-white/25 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleRestoreVirtualCopy(diffVirtualCopy.id);
                  setDiffVirtualCopyId(null);
                }}
                className="flex-[2] border border-cyan-300/40 bg-cyan-300 py-3 font-mono text-xs font-bold uppercase tracking-widest text-black transition hover:bg-cyan-200"
              >
                Restore This Copy
              </button>
            </div>
          </div>
        </div>
      )}

      <CommandBar
        isOpen={isCommandBarOpen}
        commands={appCommands}
        onClose={() => setIsCommandBarOpen(false)}
      />
      <ShortcutHelp
        isOpen={isShortcutHelpOpen}
        commands={appCommands}
        onClose={() => setIsShortcutHelpOpen(false)}
      />
    </main>
  );
}

// --- UI COMPONENTS ---

const getColorCastLabel = (data: HistogramData) => {
  const { r, g, b } = data.average;
  const warmCool = r - b;
  const greenMagenta = g - (r + b) / 2;

  if (Math.abs(warmCool) < 8 && Math.abs(greenMagenta) < 8) return "Neutral";
  if (warmCool > 12) return "Warm";
  if (warmCool < -12) return "Cool";
  if (greenMagenta > 10) return "Green";
  if (greenMagenta < -10) return "Magenta";
  return "Subtle";
};

const ScopeMetric = ({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn";
}) => {
  const toneClass =
    tone === "warn"
      ? "text-red-300"
      : tone === "ok"
        ? "text-emerald-300"
        : "text-white/55";

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-2 py-2">
      <div className="font-mono text-[8px] uppercase tracking-[0.26em] text-white/25">
        {label}
      </div>
      <div className={`mt-1 font-mono text-[10px] ${toneClass}`}>{value}</div>
    </div>
  );
};

const StatusChip = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-[96px] border border-white/10 bg-black/35 px-3 py-1.5">
    <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/25">
      {label}
    </div>
    <div className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.18em] text-white/60">
      {value}
    </div>
  </div>
);

const HistogramGraph = ({
  data,
}: {
  data: { r: number[]; g: number[]; b: number[] };
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Find max value to normalize
    const max = Math.max(...data.r, ...data.g, ...data.b);

    ctx.globalCompositeOperation = "screen";

    const drawChannel = (channelData: number[], color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * w;
        const y = h - (channelData[i] / max) * h;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.fill();
    };

    drawChannel(data.r, "rgba(255, 0, 0, 0.5)");
    drawChannel(data.g, "rgba(0, 255, 0, 0.5)");
    drawChannel(data.b, "rgba(0, 0, 255, 0.5)");
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={100}
      className="w-[200px] h-[100px]"
    />
  );
};
