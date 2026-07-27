import { getEditorModuleLabel, VirtualCopy, ProjectSessionFile, ExportFormat, ExportRecipeId, ExportSafetyWarning, createHistoryState, ExportRecipe, EXPORT_RECIPES, PERFORMANCE_MODES, COMPOSITION_GUIDES, isPerformanceMode, isCompositionGuide, isExportFormat, isExportRecipeId, ImageFileInfo } from "../pageTypes";
import type { EditorSettings, EditorSettingKey, EditorSettingValue, CompositionGuide, HistogramData, ImageBounds, PerformanceMode, SerializableEditorSettings, WatermarkPosition, WatermarkSettings, AssetMetadataSettings, AppCommand, GridOverlayMode } from "../../types/editor";


import React, { createContext, useContext, useState, useRef, useEffect, useMemo, useCallback } from "react";
import { DEFAULT_TEXT_OVERLAY, TextOverlaySettings } from "../../components/CinematicTextOverlay";
import { applyRecipe, removeRecipe } from "../../lib/recipeEngine";
import { PRESETS } from "../../lib/presets";
import { FORMAT, STORAGE_KEYS } from "../../lib/brand";
import { toPng } from "html-to-image";
import { solveCatmullRom } from "../../utils/spline";
import * as THREE from "three";
import { parseCubeLUT } from "../../utils/lutParser";
import { generatePaletteHeist2DLUT } from "../../utils/colorTransfer";
import { TUTORIAL_CONTENT, getSeenTutorials, markTutorialSeen } from "../../utils/tutorialContent";
import { ExportEngine } from "../render/ExportEngine";

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
  readFileAsDataUrl,
  readFileAsText,
  getImageFileInfo,
  hydrateAssetMetadata,
  hydrateWatermark,
  isProjectSessionFile,
  toFileStem,
  createTimestampSlug,
  downloadTextFile,
  collectSettingDiffs,
  PROJECT_FILE_APP,
  PROJECT_FILE_VERSION,
  ARCHIVE_FILE_EXTENSION,
  EDITOR_MODULES,
  AUXILIARY_MODULES
} from "../pageTypes"; // We'll extract types to pageTypes.ts


import { HistoryState } from "../../components/HistoryPanel";

// We create a Context that holds everything
export const EditorContext = createContext<any>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
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
      setSeenTutorials((prev: any) => ({ ...prev, [activeTutorial]: true }));
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
      EXPORT_RECIPES.find((recipe: any) => recipe.id === activeExportRecipeId) ??
      null,
    [activeExportRecipeId]
  );

  // Reference match state
  const [roiMode, setRoiMode] = useState<"none" | "source">("none");
  const [matchROI, setMatchROI] = useState<any>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareSplit, setCompareSplit] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lutInputRef = useRef<HTMLInputElement>(null);
  const handleCommand = (cmd: any) => { console.log("Command:", cmd); };
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
      settingsSnapshots.find((copy: any) => copy.id === diffVirtualCopyId) ?? null,
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
    setHistoryIndex((prev: any) => (newHistory.length >= 50 ? prev : prev + 1));
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
    const presetData =
      localStorage.getItem(STORAGE_KEYS.presetPreview) ??
      localStorage.getItem(STORAGE_KEYS.legacyPresetPreview);
    if (presetData) {
      try {
        const presetSettings = JSON.parse(
          presetData
        ) as Partial<EditorSettings>;
        setSettings((prev: any) => ({ ...prev, ...presetSettings }));
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

    setSettings((prev: any) => {
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
          .replace(/^./, (str: any) => str.toUpperCase());
        addToHistory(newSettings, `Change ${label}`);
      }, 500); // 500ms debounce

      return newSettings;
    });
  };

  const loadImageFile = useCallback(async (file: File) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const nextImageInfo = await getImageFileInfo(objectUrl, file);
      setImageSrc(prevSrc => {
        if (prevSrc && prevSrc.startsWith('blob:')) {
          URL.revokeObjectURL(prevSrc);
        }
        return objectUrl;
      });
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
        setSettings((prev: any) => ({
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
        setSettings((prev: any) => ({
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

  // Load preset from Intaglio or legacy recipe files.
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
      virtualCopies: settingsSnapshots.map((copy: any) => ({
        id: copy.id,
        name: copy.name,
        timestamp: copy.timestamp,
        settings: serializeEditorSettings(copy.settings),
      })),
      branches: settingsSnapshots.map((branch: any) => ({
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
      (project.virtualCopies ?? project.branches ?? []).map((branch: any) => ({
        id: branch.id,
        name: branch.name,
        timestamp: branch.timestamp,
        settings: hydrateEditorSettings(branch.settings),
      }))
    );
    setDiffVirtualCopyId(null);
    setHistory([createHistoryState(restoredSettings, "Restore Intaglio Archive")]);
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

    setSettingsSnapshots((prev: any) => [...prev, nextCopy]);
    setActiveVirtualCopyId(nextCopy.id);
    addToHistory(settings, `Create Virtual Copy: ${name}`);
  };

  const handleRestoreVirtualCopy = (id: string) => {
    const copy = settingsSnapshots.find((item) => item.id === id);
    if (!copy) return;

    setSettings((prev: any) => ({
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
    setSettingsSnapshots((prev: any) => prev.filter((copy: any) => copy.id !== id));
    setActiveVirtualCopyId((prev: any) => (prev === id ? null : prev));
    setDiffVirtualCopyId((prev: any) => (prev === id ? null : prev));
  };

  const handleTakeSnapshot = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/jpeg", 0.8);
    setSnapshots((prev: any) => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), url, date: Date.now() },
    ]);
  };

  const handleCompareSnapshot = (url: string) => {
    new THREE.TextureLoader().load(url, (tex) => {
      setSettings((prev: any) => ({
        ...prev,
        compareTexture: tex,
        compareEnabled: true,
        wiperActive: true,
      }));
    });
  };

  const handleExport = async () => {
    if (!imageSrc) return;

    try {
      // 1. Load source image texture
      const textureLoader = new THREE.TextureLoader();
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(imageSrc, resolve, undefined, reject);
      });

      // 2. Instantiate ExportEngine and render full-resolution Blob
      const exportEngine = new ExportEngine();
      const format = exportFormat as 'image/jpeg' | 'image/png' | 'image/webp';
      const blob = await exportEngine.exportImage(texture, settings, {
        format,
        quality: exportQuality / 100,
        scale: exportScale,
        brushCanvas
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
    } catch (error) {
      console.error("Failed to export via GPU RenderGraph:", error);
    }

    // Close modal
    setIsExportModalOpen(false);
  };

  const handleCarouselExport = async () => {
    if (!imageSrc) return;
    try {
      const textureLoader = new THREE.TextureLoader();
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(imageSrc, resolve, undefined, reject);
      });
      const exportEngine = new ExportEngine();
      const format = exportFormat as 'image/jpeg' | 'image/png' | 'image/webp';
      const baseOpts = { format, quality: exportQuality / 100, scale: exportScale, brushCanvas };

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
      const beforeBlob = await exportEngine.exportImage(texture, { ...settings, ...DEFAULT_SETTINGS }, baseOpts);

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
      keywords: ["restore", "session", "archive", "ormond", "nyvlt", "nyvproj"],
      run: openProjectPicker,
    },
    {
      id: "save-project-session",
      title: "Save Intaglio Archive",
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
    ...settingsSnapshots.map((copy: any) => ({
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
        setAssetMetadata((prev: any) => ({
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
        setAssetMetadata((prev: any) => ({
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
        setAssetMetadata((prev: any) => ({
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
        setAssetMetadata((prev: any) => ({
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
        setAssetMetadata((prev: any) => ({
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
    ...EXPORT_RECIPES.map((recipe: any) => ({
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
    ...PERFORMANCE_MODES.map((mode: any) => ({
      id: `performance-${mode.id}`,
      title: `Set Performance Mode: ${mode.label}`,
      section: "Workspace",
      keywords: ["gpu", "quality", "performance", mode.label],
      run: () => setPerformanceMode(mode.id),
    })),
    ...COMPOSITION_GUIDES.map((guide: any) => ({
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
      run: () => setIsFocusMode((prev: any) => !prev),
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
        setAssetMetadata((prev: any) => ({
          ...prev,
          rating: Number(event.key),
        }));
        return;
      }

      if (key === "p") {
        event.preventDefault();
        setAssetMetadata((prev: any) => ({
          ...prev,
          flagStatus: "picked",
        }));
        return;
      }

      if (key === "x") {
        event.preventDefault();
        setAssetMetadata((prev: any) => ({
          ...prev,
          flagStatus: "rejected",
        }));
        return;
      }

      if (key === "u") {
        event.preventDefault();
        setAssetMetadata((prev: any) => ({
          ...prev,
          flagStatus: "unflagged",
        }));
        return;
      }

      if (key === "c") {
        event.preventDefault();
        setSettings((prev: any) => ({ ...prev, wiperActive: !prev.wiperActive }));
        return;
      }

      if (key === "f") {
        event.preventDefault();
        setIsFocusMode((prev: any) => !prev);
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

  const editorState = {
    settings, setSettings,
    textOverlay, setTextOverlay,
    assetMetadata, setAssetMetadata,
    watermark, setWatermark,
    clipboard, setClipboard,
    imageSrc, setImageSrc,
    imageName, setImageName,
    imageInfo, setImageInfo,
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
    roiMode, setRoiMode,
    sourceROI, setSourceROI,
    matchROI, setMatchROI,
    brushMaskActive, setBrushMaskActive,
    brushSize, setBrushSize,
    brushFeather, setBrushFeather,
    brushErasing, setBrushErasing,
    brushCanvas, setBrushCanvas,
    brushCanvasDirty, setBrushCanvasDirty,
    isVideoGradingOpen, setIsVideoGradingOpen,
    videoSrc, setVideoSrc,
    updateSetting,
    handleUndo,
    handleRedo,
    gridOverlayMode, setGridOverlayMode,
    isAnalysisOpen,
    setIsAnalysisOpen,
    addToHistory,
    toneCurveTexture,
    handleSaveProjectSession,
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
    handleExport,
    handleCarouselExport,
    handleCompareSnapshot,
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

  return <EditorContext.Provider value={editorState}>{children}</EditorContext.Provider>;
}

export const useEditorState = () => useContext(EditorContext);
