import { VirtualCopy, ExportFormat, ExportRecipeId, ExportSafetyWarning, createHistoryState, ExportRecipe, EXPORT_RECIPES, PERFORMANCE_MODES, COMPOSITION_GUIDES, isExportFormat, isExportRecipeId, ImageFileInfo } from "../pageTypes";
import type { EditorSettings, EditorSettingKey, EditorSettingValue, CompositionGuide, HistogramData, ImageBounds, PerformanceMode, SerializableEditorSettings, WatermarkSettings, AssetMetadataSettings, AppCommand, GridOverlayMode } from "../../types/editor";


import React, { createContext, useContext, useState, useRef, useEffect, useMemo, useCallback } from "react";
import { DEFAULT_TEXT_OVERLAY, TextOverlaySettings } from "../../components/CinematicTextOverlay";
import { applyRecipe } from "../../lib/recipeEngine";
import { PRESETS } from "../../lib/presets";
import { FORMAT, STORAGE_KEYS } from "../../lib/brand";
import * as THREE from "three";
import { createLut3DTexture, parseCubeData, parseCubeLUT, serializeCubeLUT, type CubeLutData } from "../../utils/lutParser";
import { generatePaletteMatchLut } from "../../utils/colorTransfer";
import { TUTORIAL_CONTENT, getSeenTutorials, markTutorialSeen } from "../../utils/tutorialContent";
import { ExportEngine } from "../render/ExportEngine";
import { loadRenderSource, type LinearSourceBuffer } from "../render/sourceTexture";
import { DEFAULT_RAW_DEVELOP_STATE, type AssetReference, type GradeGraph, type IntaglioDocumentV2, type RawDevelopState, type RuntimeAssetStore } from "../../types/document";
import { createRuntimeAssetStore, createIntaglioDocument } from "../../lib/intaglioDocument";
import { createIntaglioContainer, openIntaglioContainer, triggerContainerDownload } from "../../lib/intaglioContainer";
import { sha256Hex } from "../../lib/crypto";
import { createDefaultGradeGraph } from "../../lib/gradeGraph";
import { decodeRawFile, isRawFile, STILL_FILE_ACCEPT } from "../../lib/rawDecoder";
import { rasterizeBrushStrokes } from "../../lib/brushMaskRaster";

// We need to import all types and constants from page.tsx or extract them.
// For now, we will just export them from page.tsx and import them here.
import {
  DEFAULT_SETTINGS,
  DEFAULT_ASSET_METADATA,
  DEFAULT_WATERMARK,
  createLocalId,
  cloneJson,
  serializeEditorSettings,
  hydrateEditorSettings,
  getImageFileInfo,
  hydrateAssetMetadata,
  hydrateWatermark,
  toFileStem,
  createTimestampSlug,
  collectSettingDiffs,
  ARCHIVE_FILE_EXTENSION
} from "../pageTypes"; // We'll extract types to pageTypes.ts


import { HistoryState } from "../../components/HistoryPanel";

function useEditorStateController() {
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
  const [sourceFile, setSourceFile] = useState<File | Blob | null>(null);
  const [documentAssets, setDocumentAssets] = useState<AssetReference[]>([]);
  const [gradeGraph, setGradeGraph] = useState<GradeGraph>(() => createDefaultGradeGraph());
  const [rawDevelop, setRawDevelop] = useState<RawDevelopState>(DEFAULT_RAW_DEVELOP_STATE);
  // Full-precision RAW pixels, keyed to the display URL they were developed for
  // so a later image can never render from a stale RAW buffer.
  const [rawSourceEntry, setRawSourceEntry] = useState<{ imageUrl: string; buffer: LinearSourceBuffer } | null>(null);
  const [sourceCameraMetadata, setSourceCameraMetadata] = useState<Record<string, string | number | null>>({});
  const [rawProgress, setRawProgress] = useState<{ progress: number; stage: string } | null>(null);
  const rawAbortRef = useRef<AbortController | null>(null);
  const runtimeAssetsRef = useRef<RuntimeAssetStore>(createRuntimeAssetStore());
  const [imageName, setImageName] = useState("Untitled Image");
  const [imageInfo, setImageInfo] = useState<ImageFileInfo | null>(null);
  const [gridOverlayMode, setGridOverlayMode] = useState<GridOverlayMode>("none");
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
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
  
  // The bottom presets bar state
  const [isPresetsBarOpen, setIsPresetsBarOpen] = useState(false);
  
  // Focus Mode hides sidebars. It is automatically true if the presets bar is open.
  const [isFocusModeManual, setIsFocusModeManual] = useState(false);
  const isFocusMode = isFocusModeManual || isPresetsBarOpen;
  
  const setIsFocusMode = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setIsFocusModeManual(prev => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      if (!nextVal) {
        setIsPresetsBarOpen(false);
      }
      return nextVal;
    });
  }, []);

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
  const [isProofSheetOpen, setIsProofSheetOpen] = useState(false);
  const [isBatchExportOpen, setIsBatchExportOpen] = useState(false);
  const [activePlateId, setActivePlateId] = useState<string>("base");
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
  const [matchROI, setMatchROI] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareSplit, setCompareSplit] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lutInputRef = useRef<HTMLInputElement>(null);
  const handleCommand = (cmd: AppCommand) => { cmd.run(); };
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

    if (histogram && histogram.highlightClipPct > 0.02) {
      warnings.push({
        title: "Highlights Clipped",
        detail: `${(histogram.highlightClipPct * 100).toFixed(1)}% of sampled pixels are at highlight limit.`,
        tone: "warn",
      });
    }

    if (histogram && histogram.shadowClipPct > 0.05) {
      warnings.push({
        title: "Shadows Crushed",
        detail: `${(histogram.shadowClipPct * 100).toFixed(1)}% of sampled pixels are at shadow limit.`,
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

  const rawSource = rawSourceEntry && rawSourceEntry.imageUrl === imageSrc ? rawSourceEntry.buffer : null;

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

  const [brushMaskActive, setBrushMaskActive] = useState(false);
  const [brushSize, setBrushSize] = useState(0.3);
  const [brushFeather, setBrushFeather] = useState(0.5);
  const [brushErasing, setBrushErasing] = useState(false);
  const [brushCanvas, setBrushCanvas] = useState<HTMLCanvasElement | null>(null);
  const [brushCanvasDirty, setBrushCanvasDirty] = useState(0);

  // Load preset from localStorage if coming from presets page
  React.useEffect(() => {
    const presetData = localStorage.getItem(STORAGE_KEYS.presetPreview);
    if (presetData) {
      try {
        const presetSettings = JSON.parse(
          presetData
        ) as Partial<EditorSettings>;
        setSettings((prev) => ({ ...prev, ...presetSettings }));
        localStorage.removeItem(STORAGE_KEYS.presetPreview);
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
      rawAbortRef.current?.abort();
      let displayFile: File | Blob = file;
      let nextImageInfo: ImageFileInfo;
      let cameraMetadata: Record<string, string | number | null> = {};
      let rawWorkingBuffer: RuntimeAssetStore["rawWorkingBuffer"];
      if (isRawFile(file)) {
        const controller = new AbortController();
        rawAbortRef.current = controller;
        const developed = await decodeRawFile(file, DEFAULT_RAW_DEVELOP_STATE, controller.signal, (progress, stage) => setRawProgress({ progress, stage }));
        displayFile = developed.preview;
        nextImageInfo = { width: developed.width, height: developed.height, fileType: file.type || "application/octet-stream", fileSize: file.size };
        cameraMetadata = developed.metadata;
        setRawDevelop(developed.rawDevelop);
        rawWorkingBuffer = { width: developed.width, height: developed.height, pixels: developed.pixels16 };
      } else {
        setRawDevelop(DEFAULT_RAW_DEVELOP_STATE);
        const probeUrl = URL.createObjectURL(file);
        try {
          nextImageInfo = await getImageFileInfo(probeUrl, file);
        } finally {
          URL.revokeObjectURL(probeUrl);
        }
      }
      const objectUrl = URL.createObjectURL(displayFile);
      setImageSrc(prevSrc => {
        if (prevSrc && prevSrc.startsWith('blob:')) {
          URL.revokeObjectURL(prevSrc);
        }
        return objectUrl;
      });
      setImageName(file.name);
      setImageInfo(nextImageInfo);
      setSourceFile(file);
      setDocumentAssets([]);
      setGradeGraph(createDefaultGradeGraph());
      runtimeAssetsRef.current = createRuntimeAssetStore();
      runtimeAssetsRef.current.sourceFile = file;
      runtimeAssetsRef.current.sourceUrl = objectUrl;
      runtimeAssetsRef.current.rawWorkingBuffer = rawWorkingBuffer;
      setRawSourceEntry(rawWorkingBuffer ? { imageUrl: objectUrl, buffer: rawWorkingBuffer } : null);
      setSourceCameraMetadata(cameraMetadata);
      setAssetMetadata({
        ...DEFAULT_ASSET_METADATA,
        title: toFileStem(file.name).replace(/_/g, " "),
        description: [cameraMetadata.cameraMake, cameraMetadata.cameraModel].filter(Boolean).join(" "),
      });
      setWatermark(DEFAULT_WATERMARK);
    } catch (error) {
      console.error("Failed to open image:", error);
      alert(error instanceof Error ? error.message : "Could not open this image file.");
    } finally {
      rawAbortRef.current = null;
      setRawProgress(null);
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
    input.accept = STILL_FILE_ACCEPT;
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        void loadImageFile(file);
      }
    };
    input.click();
  }, [loadImageFile]);

  // Every LUT source (file, LUT Creator, Palette Match) is installed as a .cube
  // asset so the grade renders identically and round-trips through archives.
  const installCubeLut = async (cubeText: string, originalName: string): Promise<boolean> => {
    const lut = parseCubeData(cubeText);
    if (!lut) return false;
    const file = new File([cubeText], originalName, { type: "application/x-cube-lut" });
    const sha256 = await sha256Hex(file);
    const asset: AssetReference = {
      id: `lut-${sha256.slice(0, 16)}`,
      kind: "lut",
      sha256,
      path: `assets/luts/${sha256}.cube`,
      mimeType: "application/x-cube-lut",
      byteLength: file.size,
      originalName,
      lutMetadata: {
        size: lut.size,
        domainMin: lut.domainMin,
        domainMax: lut.domainMax,
        ...(lut.title ? { title: lut.title } : {}),
      },
    };
    const texture = createLut3DTexture(lut);
    runtimeAssetsRef.current.lutFiles.set(asset.id, file);
    setDocumentAssets((current) => [...current.filter((item) => item.kind !== "lut"), asset]);
    setSettings((prev) => ({ ...prev, lutTexture: texture, lutStrength: 1.0 }));
    addToHistory({ ...settings, lutTexture: texture, lutStrength: 1.0 }, `Apply LUT: ${lut.title ?? originalName}`);
    return true;
  };

  const handleApplyGeneratedLut = async (lut: CubeLutData) => {
    const name = `${(lut.title ?? "custom-lut").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.cube`;
    await installCubeLut(serializeCubeLUT(lut), name);
  };

  const handleLutUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text()
      .then((text) => installCubeLut(text, file.name))
      .then((installed) => { if (!installed) alert("Failed to parse LUT file"); })
      .catch(() => alert("Failed to read LUT file"));
  };

  const handleFontUpload = async (file: File) => {
    if (!/\.(woff2|ttf|otf)$/i.test(file.name)) throw new Error("Intaglio embeds .woff2, .ttf, or .otf fonts only.");
    const sha256 = await sha256Hex(file);
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "woff2";
    const family = `Intaglio-${sha256.slice(0, 12)}`;
    const face = new FontFace(family, await file.arrayBuffer());
    await face.load();
    document.fonts.add(face);
    const asset: AssetReference = { id: `font-${sha256.slice(0, 16)}`, kind: "font", sha256, path: `assets/fonts/${sha256}.${extension}`, mimeType: file.type || `font/${extension}`, byteLength: file.size, originalName: file.name };
    runtimeAssetsRef.current.fontFiles.set(asset.id, file);
    setDocumentAssets((current) => [...current.filter((item) => item.id !== asset.id), asset]);
    setTextOverlay((current) => ({ ...current, customFontEnabled: true, customFontName: family }));
  };

  const hydratePortableAssets = useCallback(async (
    restoredSettings: EditorSettings,
    assets: AssetReference[],
    runtime: RuntimeAssetStore,
  ): Promise<EditorSettings> => {
    let lutTexture: THREE.Data3DTexture | null = restoredSettings.lutTexture;
    const lutAsset = assets.find((asset) => asset.kind === "lut");
    if (lutAsset) {
      const bytes = runtime.lutFiles.get(lutAsset.id);
      if (!bytes) throw new Error(`Embedded LUT ${lutAsset.originalName ?? lutAsset.id} is missing.`);
      lutTexture = parseCubeLUT(await bytes.text());
      if (!lutTexture) throw new Error(`Embedded LUT ${lutAsset.originalName ?? lutAsset.id} is invalid.`);
    }
    for (const asset of assets.filter((item) => item.kind === "font")) {
      const bytes = runtime.fontFiles.get(asset.id);
      if (!bytes) throw new Error(`Embedded font ${asset.originalName ?? asset.id} is missing.`);
      const family = `Intaglio-${asset.sha256.slice(0, 12)}`;
      if (!document.fonts.check(`12px "${family}"`)) {
        const face = new FontFace(family, await bytes.arrayBuffer());
        await face.load();
        document.fonts.add(face);
      }
    }
    return { ...restoredSettings, lutTexture };
  }, []);

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
        const lut = await generatePaletteMatchLut(imageSrc, refUrl);
        await handleApplyGeneratedLut(lut);
      } catch (err) {
        console.error("Reference match failed", err);
        alert("Failed to match palette.");
      }
    };
    reader.readAsDataURL(file);
  };

  // ===========================================
  // RECIPE & PRESET & CLIPBOARD MANAGEMENT
  // ===========================================

  const handleApplyRecipe = useCallback((recipeId: string, intensity: number = 1.0) => {
    const recipe = PRESETS.find(p => p.id === recipeId);
    if (!recipe) return;
    
    setSettings(prev => {
      const newSettings = applyRecipe(prev, recipe, intensity);
      // We don't add to history on slider drag, so we leave history out of this internal updater, 
      // or we handle history carefully
      return newSettings;
    });
  }, []);

  // Get serializable settings (exclude textures and non-JSON-safe values)
  const getSerializableSettings = useCallback(
    () => serializeEditorSettings(settings),
    [settings]
  );

  // Load a portable Intaglio V2 recipe. JSON and legacy formats are deliberately unsupported.
  const handleLoadPreset = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith(`.${FORMAT.recipeExtension}`)) throw new Error("Only portable .int V2 recipes are supported.");
      const { manifest, runtime } = await openIntaglioContainer(file);
      if (manifest.kind !== "recipe") throw new Error("Choose an .int recipe, not an .intaglio project.");
      const recipeSettings = await hydratePortableAssets(hydrateEditorSettings(manifest.document.editorSettingsSnapshot), manifest.document.assets, runtime);
      const mergedSettings: EditorSettings = {
        ...settings,
        ...recipeSettings,
        compareTexture: settings.compareTexture,
      };
      setSettings(mergedSettings);
      setGradeGraph(manifest.document.graph);
      setDocumentAssets(manifest.document.assets.filter((asset) => asset.kind === "lut" || asset.kind === "font"));
      for (const [id, blob] of runtime.lutFiles) runtimeAssetsRef.current.lutFiles.set(id, blob);
      for (const [id, blob] of runtime.fontFiles) runtimeAssetsRef.current.fontFiles.set(id, blob);
      addToHistory(mergedSettings, `Load Recipe: ${manifest.document.title}`);
    } catch (error) {
      console.error("Failed to load Intaglio recipe:", error);
      alert(error instanceof Error ? error.message : "Invalid or unsupported .int recipe.");
    } finally {
      event.target.value = "";
    }
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

  const handleSaveProjectSession = useCallback(async () => {
    if (!imageSrc || !imageInfo) return;
    try {
      let portableSource = sourceFile;
      if (!portableSource) {
        const response = await fetch(imageSrc);
        if (!response.ok) throw new Error("The original photograph is no longer available.");
        portableSource = await response.blob();
      }
      runtimeAssetsRef.current.sourceFile = portableSource;
      const document = await createIntaglioDocument({
        title: assetMetadata.title || toFileStem(imageName),
        sourceFile: portableSource,
        sourceName: imageName,
        imageInfo,
        settings,
        textOverlay,
        watermark,
        metadata: assetMetadata,
        exportFormat,
        exportQuality,
        exportScale,
        exportRecipeId: activeExportRecipeId,
        assets: documentAssets,
        graph: gradeGraph,
        rawDevelop,
        cameraMetadata: sourceCameraMetadata,
        history: history.map((entry) => ({
          id: entry.id,
          timestamp: entry.timestamp,
          action: entry.action,
          settings: serializeEditorSettings(entry.settings),
        })),
        historyIndex,
        virtualCopies: settingsSnapshots.map((copy) => ({
          id: copy.id,
          name: copy.name,
          timestamp: copy.timestamp,
          settings: serializeEditorSettings(copy.settings),
        })),
        activeVirtualCopyId,
      });
      const archive = await createIntaglioContainer("project", document, runtimeAssetsRef.current);
      triggerContainerDownload(archive, `${toFileStem(imageName)}_${createTimestampSlug()}.${ARCHIVE_FILE_EXTENSION}`);
    } catch (error) {
      console.error("Failed to save Intaglio Archive:", error);
      alert(error instanceof Error ? error.message : "Could not create a portable Intaglio Archive.");
    }
  }, [
    activeExportRecipeId,
    exportFormat,
    exportQuality,
    exportScale,
    assetMetadata,
    documentAssets,
    gradeGraph,
    rawDevelop,
    sourceCameraMetadata,
    history,
    historyIndex,
    settingsSnapshots,
    activeVirtualCopyId,
    imageName,
    imageInfo,
    imageSrc,
    settings,
    sourceFile,
    textOverlay,
    watermark,
  ]);

  const handleSaveRecipe = useCallback(async (recipe: { name: string; description: string; settings: Partial<SerializableEditorSettings> }) => {
    try {
      const recipeSettings = hydrateEditorSettings(recipe.settings);
      // Runtime textures are resolved from embedded asset bytes on import.
      recipeSettings.lutTexture = settings.lutStrength > 0 ? settings.lutTexture : null;
      recipeSettings.lutStrength = settings.lutStrength > 0 ? settings.lutStrength : 0;
      const reusableAssets = documentAssets.filter((asset) => asset.kind === "lut" || asset.kind === "font");
      const document = await createIntaglioDocument({
        title: recipe.name || "Untitled Recipe",
        sourceFile: null,
        sourceName: "",
        imageInfo: null,
        settings: recipeSettings,
        textOverlay,
        watermark,
        metadata: { ...assetMetadata, description: recipe.description },
        exportFormat,
        exportQuality,
        exportScale,
        exportRecipeId: activeExportRecipeId,
        assets: reusableAssets,
        graph: gradeGraph,
        rawDevelop,
      });
      const archive = await createIntaglioContainer("recipe", document, runtimeAssetsRef.current);
      triggerContainerDownload(archive, `${toFileStem(recipe.name || "recipe")}.${FORMAT.recipeExtension}`);
    } catch (error) {
      console.error("Failed to save Intaglio recipe:", error);
      alert(error instanceof Error ? error.message : "Could not create a portable Intaglio recipe.");
    }
  }, [activeExportRecipeId, assetMetadata, documentAssets, exportFormat, exportQuality, exportScale, gradeGraph, rawDevelop, settings.lutStrength, settings.lutTexture, textOverlay, watermark]);

  const restoreProjectSession = useCallback(async (document: IntaglioDocumentV2, runtime: RuntimeAssetStore) => {
    const restoredSettings = await hydratePortableAssets(hydrateEditorSettings(document.editorSettingsSnapshot), document.assets, runtime);
    const restoredExport = document.exportProfiles.find((profile) => profile.id === document.activeExportProfileId) ?? document.exportProfiles[0];
    const source = document.source;
    if (!source || !runtime.sourceFile) throw new Error("This project does not contain its original photograph.");
    let displayUrl = runtime.sourceUrl;
    if (document.rawDevelop.enabled) {
      const rawName = source.originalName || "restored.raw";
      const rawFile = new File([runtime.sourceFile], rawName, { type: source.mimeType, lastModified: 0 });
      const developed = await decodeRawFile(rawFile, document.rawDevelop, undefined, (progress, stage) => setRawProgress({ progress, stage }));
      displayUrl = URL.createObjectURL(developed.preview);
      runtime.rawWorkingBuffer = { width: developed.width, height: developed.height, pixels: developed.pixels16 };
      if (runtime.sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(runtime.sourceUrl);
      runtime.sourceUrl = displayUrl;
    }
    if (!displayUrl) throw new Error("This project cannot create a display proxy for its photograph.");
    setRawSourceEntry(runtime.rawWorkingBuffer ? { imageUrl: displayUrl, buffer: runtime.rawWorkingBuffer } : null);
    setImageSrc((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return displayUrl;
    });
    setSourceFile(runtime.sourceFile);
    runtimeAssetsRef.current = runtime;
    setDocumentAssets(document.assets.filter((asset) => asset.kind !== "source"));
    setGradeGraph(document.graph);
    setRawDevelop(document.rawDevelop);
    setSourceCameraMetadata(source.cameraMetadata);
    setImageName(source.originalName || "Restored Archive");
    setImageInfo({ width: source.width, height: source.height, fileType: source.mimeType, fileSize: source.byteLength });
    setSettings(restoredSettings);
    setSnapshots((current) => {
      current.forEach((snapshot) => URL.revokeObjectURL(snapshot.url));
      return document.assets.filter((asset) => asset.kind === "comparison").map((asset) => {
        const blob = runtime.comparisonFiles.get(asset.id);
        if (!blob) throw new Error(`Comparison snapshot ${asset.id} is missing.`);
        return {
          id: asset.id,
          url: URL.createObjectURL(blob),
          date: asset.createdAt ? Date.parse(asset.createdAt) : Date.now(),
        };
      });
    });
    const brushStrokes = restoredSettings.masks.filter((mask) => mask.type === "brush").flatMap((mask) => mask.params.strokes);
    if (brushStrokes.length > 0) {
      const canvas = rasterizeBrushStrokes(brushStrokes, 1024, Math.max(1, Math.round(1024 * source.height / source.width)));
      setBrushCanvas(canvas);
      setBrushCanvasDirty((current) => current + 1);
    } else {
      setBrushCanvas(null);
    }
    const subtitle = document.overlays.textBlocks.find((block) => block.role === "subtitle");
    const date = document.overlays.textBlocks.find((block) => block.role === "date");
    const billing = document.overlays.textBlocks.find((block) => block.role === "billing");
    setTextOverlay((current) => ({
      ...current,
      subtitleEnabled: subtitle?.enabled ?? false,
      subtitleText: subtitle?.text ?? "",
      subtitleX: ((subtitle?.x ?? 0.5) - 0.5) * 100,
      subtitleY: (1 - (subtitle?.y ?? 0.7)) * 100,
      dateEnabled: date?.enabled ?? false,
      dateText: date?.text ?? "",
      dateX: ((date?.x ?? 0.5) - 0.5) * 100,
      dateY: ((date?.y ?? 0.2) - 0.2) * 100,
      billingBlockEnabled: billing?.enabled ?? false,
      billingBlockText: billing?.text ?? "",
      billingX: ((billing?.x ?? 0.5) - 0.5) * 100,
      billingY: (1 - (billing?.y ?? 0.95)) * 100,
      customFontEnabled: Boolean(subtitle?.fontAssetId),
      customFontName: subtitle?.fontFamily ?? current.customFontName,
    }));
    setAssetMetadata(hydrateAssetMetadata(document.metadata as Partial<AssetMetadataSettings>));
    setWatermark(hydrateWatermark({
      enabled: document.overlays.watermark.enabled,
      text: document.overlays.watermark.text,
      position: document.overlays.watermark.anchor,
      opacity: document.overlays.watermark.opacity,
      size: document.overlays.watermark.fontSize,
    }));
    setExportFormat(
      isExportFormat(restoredExport?.format)
        ? restoredExport.format
        : "image/jpeg"
    );
    setExportQuality(
      typeof restoredExport?.quality === "number"
        ? Math.min(100, Math.max(10, restoredExport.quality * 100))
        : 90
    );
    setExportScale(
      typeof restoredExport?.scale === "number" ? restoredExport.scale : 1
    );
    setActiveExportRecipeId(isExportRecipeId(restoredExport?.id) ? restoredExport.id : null);
    setPerformanceMode("balanced");
    setCompositionGuide("off");
    const hydrateSavedSettings = (saved: SerializableEditorSettings): EditorSettings => ({
      ...hydrateEditorSettings(saved),
      lutTexture: restoredSettings.lutTexture,
      compareTexture: null,
    });
    const restoredHistory = document.history.map((entry) => ({
      ...entry,
      settings: hydrateSavedSettings(entry.settings),
    }));
    const restoredCopies = document.virtualCopies.map((copy) => ({
      ...copy,
      settings: hydrateSavedSettings(copy.settings),
    }));
    setActiveVirtualCopyId(document.activeVirtualCopyId);
    setSettingsSnapshots(restoredCopies);
    setDiffVirtualCopyId(null);
    setHistory(restoredHistory.length > 0 ? restoredHistory : [createHistoryState(restoredSettings, "Restore Intaglio Archive")]);
    setHistoryIndex(restoredHistory.length > 0 ? Math.min(document.historyIndex, restoredHistory.length - 1) : 0);
    setRawProgress(null);
  }, [hydratePortableAssets]);

  const openProjectPicker = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = `.${FORMAT.archiveExtension},${FORMAT.archiveMimeType}`;
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        if (!file.name.toLowerCase().endsWith(`.${FORMAT.archiveExtension}`)) throw new Error("Only packaged .intaglio V2 projects are supported.");
        const { manifest, runtime } = await openIntaglioContainer(file);
        if (manifest.kind !== "project") throw new Error("Choose an .intaglio project, not an .int recipe.");
        await restoreProjectSession(manifest.document, runtime);
      } catch (error) {
        console.error("Failed to restore Intaglio Archive:", error);
        alert("Invalid or unsupported Intaglio Archive file.");
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

  const handleTakeSnapshot = async () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#main-editor-canvas");
    if (!canvas) return;
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not encode comparison snapshot.")), "image/webp", 0.9));
    const sha256 = await sha256Hex(blob);
    const asset: AssetReference = {
      id: `comparison-${sha256.slice(0, 16)}`,
      kind: "comparison",
      sha256,
      path: `assets/comparisons/${sha256}.webp`,
      mimeType: "image/webp",
      byteLength: blob.size,
      originalName: `snapshot-${new Date().toISOString()}.webp`,
      createdAt: new Date().toISOString(),
    };
    runtimeAssetsRef.current.comparisonFiles.set(asset.id, blob);
    setDocumentAssets((current) => [...current.filter((item) => item.id !== asset.id), asset]);
    const url = URL.createObjectURL(blob);
    setSnapshots((prev) => [...prev, { id: asset.id, url, date: Date.now() }]);
  };

  const handleCompareSnapshot = (url: string) => {
    new THREE.TextureLoader().load(url, (tex) => {
      setSettings((prev) => {
        prev.compareTexture?.dispose();
        return {
          ...prev,
          compareTexture: tex,
          compareEnabled: true,
          wiperActive: true,
        };
      });
    });
  };

  const handleDeleteSnapshot = (id: string) => {
    setSnapshots((current) => {
      const removed = current.find((snapshot) => snapshot.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((snapshot) => snapshot.id !== id);
    });
    runtimeAssetsRef.current.comparisonFiles.delete(id);
    setDocumentAssets((current) => current.filter((asset) => asset.id !== id));
    setSettings((current) => {
      current.compareTexture?.dispose();
      return {
        ...current,
        compareTexture: null,
        compareEnabled: false,
        wiperActive: false,
      };
    });
  };

  const handleExport = async () => {
    if (!imageSrc) return;

    try {
      // 1. Load source image texture
      const texture = await loadRenderSource(imageSrc, rawSource);

      // 2. Instantiate ExportEngine and render full-resolution Blob
      const exportEngine = new ExportEngine();
      const format = exportFormat as 'image/jpeg' | 'image/png' | 'image/webp';
      const blob = await exportEngine.exportImage(texture, settings, {
        format,
        quality: exportQuality / 100,
        scale: exportScale,
        brushCanvas,
        overlays: { text: textOverlay, watermark },
      });

      // 3. Trigger clean browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const ext = format.split("/")[1] || "jpeg";
      const recipeSlug = activeExportRecipeId ?? "custom";
      link.download = `${toFileStem(imageName)}_${recipeSlug}_${createTimestampSlug()}.${ext}`;
      link.click();
      URL.revokeObjectURL(url);

      // Clean up export engine resources
      exportEngine.dispose();
      texture.dispose();
      setIsExportModalOpen(false);
    } catch (error) {
      console.error("Failed to export via GPU RenderGraph:", error);
      alert(error instanceof Error ? `Export failed: ${error.message}` : "Export failed.");
    }
  };

  const handleCarouselExport = async () => {
    if (!imageSrc) return;
    try {
      const texture = await loadRenderSource(imageSrc, rawSource);
      const exportEngine = new ExportEngine();
      const format = exportFormat as 'image/jpeg' | 'image/png' | 'image/webp';
      const baseOpts = { format, quality: exportQuality / 100, scale: exportScale, brushCanvas, overlays: { text: textOverlay, watermark } };

      // Helper to trigger download
      const downloadBlob = (blob: Blob, suffix: string) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const ext = format.split("/")[1] || "jpeg";
        link.download = `${toFileStem(imageName)}_${suffix}_${createTimestampSlug()}.${ext}`;
        link.click();
        URL.revokeObjectURL(url);
      };

      // 1. Before Slide (Original)
      const { DEFAULT_SETTINGS } = await import('../pageTypes');
      const beforeBlob = await exportEngine.exportImage(texture, { ...settings, ...DEFAULT_SETTINGS }, { ...baseOpts, overlays: undefined });

      // 2. Final Edit Slide
      const afterBlob = await exportEngine.exportImage(texture, settings, baseOpts);

      exportEngine.dispose();
      texture.dispose();

      // 3. Stitch them together using Canvas 2D
      const beforeImg = new window.Image();
      beforeImg.src = URL.createObjectURL(beforeBlob);
      await new Promise(r => { beforeImg.onload = r; });
      
      const afterImg = new window.Image();
      afterImg.src = URL.createObjectURL(afterBlob);
      await new Promise(r => { afterImg.onload = r; });

      const canvas = document.createElement('canvas');
      const padding = 60;
      const textHeight = 160;
      // Side by side layout
      canvas.width = beforeImg.width * 2 + padding * 3;
      canvas.height = beforeImg.height + padding * 2 + textHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Fill background
        ctx.fillStyle = '#0f0f11';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw images
        ctx.drawImage(beforeImg, padding, padding);
        ctx.drawImage(afterImg, beforeImg.width + padding * 2, padding);

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BEFORE', padding + beforeImg.width / 2, padding + beforeImg.height + 80);
        ctx.fillText('AFTER', beforeImg.width + padding * 2 + afterImg.width / 2, padding + afterImg.height + 80);
        
        ctx.fillStyle = '#888888';
        ctx.font = '32px monospace';
        const recipeName = activeExportRecipeId || settings.appliedRecipeId || 'Custom';
        const specs = `Recipe: ${recipeName}  |  Contrast: ${(settings.contrast || 0).toFixed(2)}  |  Bloom: ${(settings.bloom || 0).toFixed(2)}  |  Halation: ${(settings.halation || 0).toFixed(2)}`;
        ctx.fillText(specs, canvas.width / 2, canvas.height - 40);

        // Export the stitched image
        canvas.toBlob((stitchedBlob) => {
          if (stitchedBlob) downloadBlob(stitchedBlob, "contact-sheet");
          URL.revokeObjectURL(beforeImg.src);
          URL.revokeObjectURL(afterImg.src);
        }, format, exportQuality / 100);
      }
    } catch (error) {
      console.error("Failed to export carousel:", error);
      alert(error instanceof Error ? `Carousel export failed: ${error.message}` : "Carousel export failed.");
    }
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
      title: "Open Intaglio Archive",
      section: "Archive",
      keywords: ["restore", "session", "archive", "intaglio"],
      run: openProjectPicker,
    },
    {
      id: "save-project-session",
      title: "Save Intaglio Archive",
      section: "Archive",
      shortcut: "Ctrl+S",
      disabled: !imageSrc,
      keywords: ["project", "session", "archive", "intaglio"],
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
    {
      id: "batch-export",
      title: "Open Local Batch Export",
      section: "Delivery",
      keywords: ["batch", "zip", "multiple", "local"],
      run: () => setIsBatchExportOpen(true),
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
    setIsFocusMode,
  ]);

  // Full-page Start Screen when no image is loaded

  const editorState = {
    settings, setSettings,
    textOverlay, setTextOverlay,
    assetMetadata, setAssetMetadata,
    watermark, setWatermark,
    clipboard, setClipboard,
    imageSrc, setImageSrc,
    imageName, setImageName,
    imageInfo, setImageInfo,
    documentAssets, setDocumentAssets,
    histogram, setHistogram,
    activeTab, setActiveTab,
    handleTabChange,
    handleTutorialClose,
    showTutorial,
    history, setHistory,
    historyIndex, setHistoryIndex,
    snapshots, setSnapshots,
    settingsSnapshots, setSettingsSnapshots,
    activeVirtualCopyId, setActiveVirtualCopyId,
    diffVirtualCopyId, setDiffVirtualCopyId,
    seenTutorials, setSeenTutorials,
    activeTutorial, setActiveTutorial,
    isMobileMenuOpen, setIsMobileMenuOpen,
    isLeftSidebarOpen, setIsLeftSidebarOpen,
    isRightSidebarOpen, setIsRightSidebarOpen,
    isLookIntensityOpen, setIsLookIntensityOpen,
    isFocusMode, setIsFocusMode,
    isHistogramHelpOpen, setIsHistogramHelpOpen,
    isExportModalOpen, setIsExportModalOpen,
    showMobileWarning, setShowMobileWarning,
    isPresetsBarOpen, setIsPresetsBarOpen,
    isMobileControlsExpanded, setIsMobileControlsExpanded,
    isPresetModalOpen, setIsPresetModalOpen,
    isReferenceOpen, setIsReferenceOpen,
    isLUTCreatorOpen, setIsLUTCreatorOpen,
    isProofSheetOpen, setIsProofSheetOpen,
    isBatchExportOpen, setIsBatchExportOpen,
    activePlateId, setActivePlateId,
    roiMode, setRoiMode,
    sourceROI, setSourceROI,
    matchROI, setMatchROI,
    brushMaskActive, setBrushMaskActive,
    brushSize, setBrushSize,
    brushFeather, setBrushFeather,
    brushErasing, setBrushErasing,
    brushCanvas, setBrushCanvas,
    brushCanvasDirty, setBrushCanvasDirty,
    sourceFile,
    gradeGraph, setGradeGraph,
    rawDevelop, rawProgress,
    rawSource,
    cancelRawDecode: () => rawAbortRef.current?.abort(),
    updateSetting,
    handleUndo,
    handleRedo,
    gridOverlayMode, setGridOverlayMode,
    isAnalysisOpen,
    setIsAnalysisOpen,
    addToHistory,
    handleSaveProjectSession,
    handleSaveRecipe,
    openImagePicker,
    openProjectPicker,
    isCommandBarOpen, setIsCommandBarOpen,
    isShortcutHelpOpen, setIsShortcutHelpOpen,
    handleCommand,
    compositionGuide, setCompositionGuide,
    performanceMode, setPerformanceMode,
    imageBounds, setImageBounds,
    handleUpload,
    handlePaletteHeist,
    handleLutUpload,
    handleApplyGeneratedLut,
    handleFontUpload,
    handleExport,
    handleCarouselExport,
    handleCompareSnapshot,
    handleDeleteSnapshot,
    handleDeleteVirtualCopy,
    handleTakeSnapshot,
    handleRestoreVirtualCopy,
    handleJumpToHistory,
    handleClearHistory,
    handleLoadPreset,
    handleApplyRecipe,
    fileInputRef,
    lutInputRef,
    appCommands,
    compareEnabled,
    compareSplit,
    setCompareSplit, setCompareEnabled,
    exportSafetyWarnings,
    activeCurveChannel,
    setActiveCurveChannel,
    editDiffs,
    referenceImageUrl,
    setReferenceImageUrl,
    handleCreateVirtualCopy,
    handleCopySettings,
    handlePasteSettings,
    applyExportRecipe,
    activeExportRecipeId,
    setActiveExportRecipeId,
    setExportFormat,
    exportFormat,
    exportQuality,
    setExportQuality,
    setExportScale,
    exportScale,
    diffVirtualCopy
  };

  return editorState;
}

export type EditorContextValue = ReturnType<typeof useEditorStateController>;
export const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const value = useEditorStateController();
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export const useEditorState = (): EditorContextValue => {
  const value = useContext(EditorContext);
  if (!value) throw new Error("useEditorState must be used inside EditorProvider.");
  return value;
};
