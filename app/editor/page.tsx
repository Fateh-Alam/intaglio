"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
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
  IconEye,
  IconPhoto,
  IconAdjustmentsHorizontal,
  IconTypography,
  IconMapPin,
  IconCalendar,
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
  IconClock,
  IconHistory,
  IconChartLine,
  IconCircles,
  IconCamera,
  IconX,
  IconMenu2,
  IconSpacingHorizontal,
  IconMoon,
  IconItalic,
  IconLetterCase,
  IconLetterCaseUpper,
  IconLetterCaseLower,
  IconBold,
  IconCircleFilled,
} from "@tabler/icons-react";
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
import {
  TUTORIAL_CONTENT,
  getSeenTutorials,
  markTutorialSeen,
} from "../utils/tutorialContent";

// Dynamic import for the WebGL component to avoid SSR issues
const CinematicEditor = dynamic(() => import("../components/CinematicEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-white/20 font-mono text-sm">
      INITIALIZING NEURAL ENGINE...
    </div>
  ),
});

const DEFAULT_SETTINGS = {
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
  halation: 0.0,
  sharpness: 0.0,
  dehaze: 0.0,
  aberration: 0.0,

  // Pro
  structure: 0.0,
  filmBorder: false,

  // Tone Curve
  toneCurveTexture: null as any,
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
  compareTexture: null as any,
  compareSplit: 0.5,

  // Lens (New)
  lensDistortion: 0.0,
  keystoneH: 0.0,
  keystoneV: 0.0,
  tiltShiftAmount: 0.0,
  tiltShiftPosition: 0.5,
  tiltShiftAngle: 0.0,

  // LUT
  lutTexture: null as any,
  lutStrength: 0.0,

  // Black Magic
  falseColor: false,
  anamorphicDistortion: 0.0,
  anamorphicStreaks: 0.0,

  // Advanced God Lighting
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
  filmEmulation: "none" as
    | "none"
    | "portra400"
    | "ektar100"
    | "velvia50"
    | "pro400h"
    | "cinestill800t"
    | "vision3500t"
    | "hp5"
    | "vista400"
    | "lomo800"
    | "technicolor"
    | "bleachbypass"
    | "crossprocess",
  filmEmulationStrength: 1.0,

  // UI State
  wiperActive: false,
};

export default function Home() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [textOverlay, setTextOverlay] =
    useState<TextOverlaySettings>(DEFAULT_TEXT_OVERLAY);
  const [clipboard, setClipboard] = useState<typeof DEFAULT_SETTINGS | null>(
    null
  );
  const [imageSrc, setImageSrc] = useState("/demo.jpg");
  const [histogram, setHistogram] = useState<{
    r: number[];
    g: number[];
    b: number[];
  } | null>(null);
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
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Snapshots State
  const [snapshots, setSnapshots] = useState<
    { id: string; url: string; date: number }[]
  >([]);

  // Tutorial State
  const [seenTutorials, setSeenTutorials] = useState<Record<string, boolean>>(
    {}
  );
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);

  // Mobile State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize tutorials from localStorage
  useEffect(() => {
    setSeenTutorials(getSeenTutorials());
  }, []);

  // Tone Curve State (Derived)
  const [toneCurveTexture, setToneCurveTexture] =
    useState<THREE.DataTexture | null>(null);
  const [activeCurveChannel, setActiveCurveChannel] = useState<
    "master" | "red" | "green" | "blue"
  >("master");

  // Generate Tone Curve Texture
  useEffect(() => {
    if (!settings.curvePoints) return;

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
    setToneCurveTexture(tex);
  }, [settings.curvePoints]);

  // Initialize history on mount
  useEffect(() => {
    // Add initial state
    const initialState: HistoryState = {
      id: "init",
      timestamp: Date.now(),
      action: "Initial State",
      settings: DEFAULT_SETTINGS,
    };
    setHistory([initialState]);
    setHistoryIndex(0);
  }, []);

  const addToHistory = (newSettings: any, actionName: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    const newState: HistoryState = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      action: actionName,
      settings: JSON.parse(JSON.stringify(newSettings)),
    };
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
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history]);

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
    const presetData = localStorage.getItem("nyvarra_preset_preview");
    if (presetData) {
      try {
        const presetSettings = JSON.parse(presetData);
        setSettings((prev: any) => ({ ...prev, ...presetSettings }));
        localStorage.removeItem("nyvarra_preset_preview");
      } catch (err) {
        console.error("Failed to load preset:", err);
      }
    }
  }, []);

  const updateSetting = (key: string, value: any) => {
    const newVal =
      typeof value === "string" &&
      !isNaN(parseFloat(value)) &&
      isFinite(Number(value))
        ? parseFloat(value)
        : value;

    setSettings((prev: any) => {
      const newSettings = { ...prev, [key]: newVal };

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

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
    }
  };

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
      try {
        // Use 2D LUT instead of 3D for WebGL 1 compatibility
        const texture = await generatePaletteHeist2DLUT(imageSrc, refUrl);
        setSettings((prev: any) => ({
          ...prev,
          lutTexture: texture,
          lutStrength: 1.0,
        }));
      } catch (err) {
        console.error("Palette Heist failed", err);
        alert("Failed to steal palette!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopySettings = () => {
    setClipboard(settings);
  };

  const handlePasteSettings = () => {
    if (clipboard) {
      // Preserve image-specific things if any, but here we just copy all style settings
      // We might want to keep the current LUT if the clipboard doesn't have one, or overwrite?
      // For now, overwrite all style settings.
      setSettings((prev: { wiperActive: any; lutTexture: any }) => ({
        ...clipboard,
        // Keep UI state that shouldn't be copied
        wiperActive: prev.wiperActive,
        lutTexture: clipboard.lutTexture || prev.lutTexture, // Keep existing LUT if clipboard has none?
      }));
    }
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
      setSettings((prev: any) => ({
        ...prev,
        compareTexture: tex,
        compareEnabled: true,
        wiperActive: true,
      }));
    });
  };

  const handleExport = async () => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    // Create a composite canvas to include text overlays
    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;

    // Draw the WebGL canvas
    ctx.drawImage(canvas, 0, 0);

    // Draw text overlays if enabled
    if (textOverlay.subtitleEnabled || textOverlay.dateEnabled) {
      ctx.globalAlpha = textOverlay.opacity;

      const fontSize = textOverlay.fontSize * 40; // Scale for export
      const style = textOverlay.subtitleStyle;

      // Film style configurations for export
      const filmStyles: Record<
        string,
        { titleColor: string; metaColor: string; font: string }
      > = {
        blade_runner: {
          titleColor: "#ffffff",
          metaColor: "rgba(255, 200, 100, 0.9)",
          font: "Impact, sans-serif",
        },
        interstellar: {
          titleColor: "#ffffff",
          metaColor: "rgba(255, 255, 255, 0.6)",
          font: "system-ui, sans-serif",
        },
        sicario: {
          titleColor: "#f5f5f5",
          metaColor: "#d4a855",
          font: "Impact, sans-serif",
        },
        dune: {
          titleColor: "#f4e4c9",
          metaColor: "rgba(244, 228, 201, 0.7)",
          font: "Georgia, serif",
        },
        arrival: {
          titleColor: "#ffffff",
          metaColor: "rgba(255, 255, 255, 0.5)",
          font: "system-ui, sans-serif",
        },
        revenant: {
          titleColor: "#e8e0d5",
          metaColor: "rgba(232, 224, 213, 0.6)",
          font: "Georgia, serif",
        },
      };

      const currentStyle = filmStyles[style] || filmStyles.blade_runner;

      // Date/Location
      if (
        textOverlay.dateEnabled &&
        (textOverlay.dateText || textOverlay.locationText)
      ) {
        ctx.font = `${fontSize * 0.4}px ${currentStyle.font}`;
        ctx.textAlign = "center";
        ctx.fillStyle = currentStyle.metaColor;
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 10;
        const dateText =
          textOverlay.dateText && textOverlay.locationText
            ? `${textOverlay.dateText} — ${textOverlay.locationText}`
            : textOverlay.dateText || textOverlay.locationText;
        ctx.fillText(
          dateText,
          exportCanvas.width / 2,
          exportCanvas.height - 100
        );
      }

      // Subtitle
      if (textOverlay.subtitleEnabled && textOverlay.subtitleText) {
        ctx.font = `${fontSize * 1.5}px ${currentStyle.font}`;
        ctx.textAlign = "center";
        ctx.fillStyle = currentStyle.titleColor;
        ctx.shadowColor = "rgba(0,0,0,0.95)";
        ctx.shadowBlur = 20;
        ctx.fillText(
          textOverlay.subtitleText,
          exportCanvas.width / 2,
          exportCanvas.height - 50
        );
      }

      ctx.globalAlpha = 1;
    }

    // Create a temporary link to download the image
    const link = document.createElement("a");
    link.download = `nyvarra-edit-${Date.now()}.jpg`;
    link.href = exportCanvas.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  const handleDownloadPreset = () => {
    const presetData = {
      name: "Nyvarra Custom Look",
      version: "1.0",
      settings: settings,
    };
    const jsonString = JSON.stringify(presetData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NYVARRA_PRESET_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportPreset = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target) return;
      try {
        const json = JSON.parse(e.target.result as string);
        if (json.settings) {
          setSettings((prev: any) => ({ ...prev, ...json.settings }));
        }
      } catch (err) {
        console.error("Invalid preset file", err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="flex flex-col md:flex-row h-screen w-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-amber-500 selection:text-white relative">
      {/* Film grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* LEFT: The Editor (WebGL Canvas) */}
      <div className="flex-1 relative bg-[#020202] flex items-center justify-center overflow-hidden min-h-[40vh] md:min-h-0">
        {/* Toolbar Overlay - Responsive */}
        <div className="absolute top-3 md:top-6 left-3 md:left-6 z-10 flex gap-2 md:gap-4">
          <label className="flex items-center justify-center gap-2 w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 bg-black/60 md:bg-black/40 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition cursor-pointer font-mono text-[10px] uppercase tracking-[0.25em] rounded-xl md:rounded">
            <IconUpload size={16} className="md:w-3.5 md:h-3.5" />
            <span className="hidden md:inline">Open Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={() => updateSetting("wiperActive", !settings.wiperActive)}
            className={`flex items-center justify-center gap-2 w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 backdrop-blur-xl border transition font-mono text-[10px] uppercase tracking-[0.25em] rounded-xl md:rounded ${settings.wiperActive ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "bg-black/60 md:bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5"}`}
          >
            <IconAdjustmentsHorizontal
              size={16}
              className="md:w-3.5 md:h-3.5"
            />
            <span className="hidden md:inline">Compare</span>
          </button>

          <button
            onClick={() => updateSetting("falseColor", !settings.falseColor)}
            className={`flex items-center justify-center gap-2 w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 backdrop-blur-xl border transition font-mono text-[10px] uppercase tracking-[0.25em] rounded-xl md:rounded ${settings.falseColor ? "bg-purple-500/20 border-purple-500/50 text-purple-400" : "bg-black/60 md:bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5"}`}
          >
            <IconEye size={16} className="md:w-3.5 md:h-3.5" />
            <span className="hidden md:inline">False Color</span>
          </button>
        </div>

        {/* Histogram Overlay */}
        {histogram && (
          <div className="absolute top-6 right-6 z-10 p-2 bg-black/50 backdrop-blur-xl border border-white/10 pointer-events-none">
            <HistogramGraph data={histogram} />
          </div>
        )}

        <div className="w-full h-full">
          <CinematicEditor
            settings={{ ...settings, toneCurveTexture }}
            imageUrl={imageSrc}
            onStatsUpdate={setHistogram}
            textOverlay={textOverlay}
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
            onBrushMaskUpdate={setBrushMaskData}
          />
        </div>
      </div>

      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-amber-500 text-black shadow-2xl shadow-amber-500/30 flex items-center justify-center"
      >
        {isMobileMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
      </button>

      {/* RIGHT: The Control Panel with Icon Sidebar */}
      <div
        className={`fixed md:relative inset-0 md:inset-auto flex h-full transition-transform duration-300 z-40 ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}
      >
        {/* Mobile backdrop */}
        <div
          className={`md:hidden absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Icon Sidebar */}
        <div className="hidden md:flex w-16 bg-black/40 backdrop-blur-xl border-l border-white/5 flex-col items-center py-4 gap-1 z-30">
          {/* Logo */}
          <div className="mb-4 pb-4 border-b border-white/10 w-full flex justify-center">
            <div className="relative h-7 w-7">
              <Image
                src="/logo.png"
                alt="Nyvarra"
                fill
                className="object-contain opacity-80"
              />
            </div>
          </div>

          {/* Navigation Icons */}
          {[
            {
              id: "basic",
              icon: <IconSun size={18} />,
              label: "Basic",
              color: "amber",
            },
            {
              id: "color",
              icon: <IconPalette size={18} />,
              label: "Color",
              color: "purple",
            },
            {
              id: "curves",
              icon: <IconChartLine size={18} />,
              label: "Curves",
              color: "blue",
            },
            {
              id: "grading",
              icon: <IconCircles size={18} />,
              label: "Grading",
              color: "purple",
            },
            {
              id: "hsl",
              icon: <IconCircle size={18} />,
              label: "HSL",
              color: "cyan",
            },
            {
              id: "films",
              icon: <IconMovie size={18} />,
              label: "Films",
              color: "orange",
            },
            {
              id: "effects",
              icon: <IconSparkles size={18} />,
              label: "Effects",
              color: "cyan",
            },
            {
              id: "masking",
              icon: <IconLayersIntersect size={18} />,
              label: "Masks",
              color: "orange",
            },
            {
              id: "text",
              icon: <IconTypography size={18} />,
              label: "Text",
              color: "green",
            },
            {
              id: "transform",
              icon: <IconArrowsMaximize size={18} />,
              label: "Transform",
              color: "amber",
            },
            {
              id: "history",
              icon: <IconHistory size={18} />,
              label: "History",
              color: "rose",
            },
            {
              id: "snapshots",
              icon: <IconCamera size={18} />,
              label: "Snaps",
              color: "green",
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const colorClasses: Record<string, string> = {
              amber: isActive
                ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                : "",
              purple: isActive
                ? "bg-purple-500/20 text-purple-400 border-purple-500/50"
                : "",
              cyan: isActive
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                : "",
              orange: isActive
                ? "bg-orange-500/20 text-orange-400 border-orange-500/50"
                : "",
              green: isActive
                ? "bg-green-500/20 text-green-400 border-green-500/50"
                : "",
              rose: isActive
                ? "bg-rose-500/20 text-rose-400 border-rose-500/50"
                : "",
            };

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 border group relative ${
                  isActive
                    ? `${colorClasses[tab.color]} shadow-[0_0_15px_rgba(255,255,255,0.1)] border-${tab.color}-500/50`
                    : "text-gray-500 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10"
                }`}
              >
                <div
                  className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}
                >
                  {tab.icon}
                </div>

                {/* Floating Tooltip */}
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900/90 backdrop-blur-md text-white text-[10px] font-mono uppercase tracking-widest rounded-md opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 border border-white/10 shadow-xl flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-${tab.color}-500 shadow-[0_0_8px_currentColor]`}
                  />
                  {tab.label}
                  {/* Arrow Tip */}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900/90 border-l border-b border-white/10 rotate-45 transform" />
                </div>
              </button>
            );
          })}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Quick Actions at Bottom */}
          <div className="pt-4 border-t border-white/10 w-full flex flex-col items-center gap-1">
            <button
              onClick={handleExport}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/20 group relative"
              title="Export"
            >
              <IconDownload size={18} />
              <span className="absolute left-full ml-3 px-2 py-1 bg-black/90 text-white text-[10px] uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Export
              </span>
            </button>
          </div>
        </div>

        {/* Control Panel */}
        <div className="w-full md:w-[360px] bg-black/60 backdrop-blur-2xl border-l border-white/5 flex flex-col z-20 shadow-2xl ml-auto">
          {/* Premium Mobile Tab Bar */}
          <div
            className="md:hidden flex overflow-x-auto snap-x snap-mandatory custom-scrollbar border-b border-white/10 py-3 px-3 gap-2 bg-black/40"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {[
              { id: "basic", icon: <IconSun size={16} />, color: "amber" },
              { id: "color", icon: <IconPalette size={16} />, color: "purple" },
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
              { id: "films", icon: <IconMovie size={16} />, color: "orange" },
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
                id: "transform",
                icon: <IconArrowsMaximize size={16} />,
                color: "amber",
              },
              { id: "history", icon: <IconHistory size={16} />, color: "rose" },
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
                  onClick={() => handleTabChange(tab.id)}
                  className={`snap-start flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl text-[9px] font-mono uppercase whitespace-nowrap transition-all duration-200 border shrink-0 ${
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
                  <span className="font-semibold">{tab.id}</span>
                </button>
              );
            })}
          </div>

          {/* Panel Header */}
          <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <IconChevronRight size={14} className="text-amber-500/60" />
              <h2 className="font-mono text-sm uppercase tracking-[0.25em] text-white/90 font-medium">
                {activeTab}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <TutorialTrigger onClick={() => showTutorial(activeTab)} />
              <div className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">
                v1.0
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
                    onChange={(v: any) => updateSetting("brightness", v)}
                    icon={<IconSun size={14} />}
                    bipolar
                  />
                  <Slider
                    label="Contrast"
                    value={settings.contrast}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("contrast", v)}
                    icon={<IconContrast size={14} />}
                    bipolar
                  />
                  <Slider
                    label="Highlights"
                    value={settings.highlights || 0}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("highlights", v)}
                    icon={<IconSun size={14} />}
                    bipolar
                  />
                  <Slider
                    label="Shadows"
                    value={settings.shadows || 0}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("shadows", v)}
                    icon={<IconMoon size={14} />}
                    bipolar
                  />
                  <Slider
                    label="Whites"
                    value={settings.whites || 0}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("whites", v)}
                    icon={<IconSun size={14} />}
                    bipolar
                  />
                  <Slider
                    label="Blacks"
                    value={settings.blacks || 0}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("blacks", v)}
                    icon={<IconMoon size={14} />}
                    bipolar
                  />
                  <Slider
                    label="Vibrance"
                    value={settings.vibrance || 0}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("vibrance", v)}
                    icon={<IconPalette size={14} />}
                    bipolar
                  />
                  <Slider
                    label="Dehaze"
                    value={settings.dehaze}
                    min={0}
                    max={1}
                    onChange={(v: any) => updateSetting("dehaze", v)}
                    icon={<IconAperture size={14} />}
                  />
                </ControlGroup>

                <ControlGroup title="Detail">
                  <Slider
                    label="Structure (Clarity)"
                    value={settings.structure}
                    min={0}
                    max={1}
                    onChange={(v: any) => updateSetting("structure", v)}
                    icon={<IconBolt size={14} />}
                  />
                  <Slider
                    label="Sharpness"
                    value={settings.sharpness}
                    min={0}
                    max={1}
                    onChange={(v: any) => updateSetting("sharpness", v)}
                    icon={<IconBolt size={14} />}
                  />
                </ControlGroup>

                <ControlGroup title="God Light (Advanced Relighting)">
                  <Slider
                    label="Strength"
                    value={settings.godLightStrength}
                    min={0}
                    max={1}
                    onChange={(v: any) => updateSetting("godLightStrength", v)}
                    icon={<IconSun size={14} />}
                  />
                  <Slider
                    label="Light X"
                    value={settings.godLightX}
                    min={0}
                    max={1}
                    onChange={(v: any) => updateSetting("godLightX", v)}
                    icon={<IconSun size={14} />}
                  />
                  <Slider
                    label="Light Y"
                    value={settings.godLightY}
                    min={0}
                    max={1}
                    onChange={(v: any) => updateSetting("godLightY", v)}
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
                    onChange={(v: any) => updateSetting("godLightSpecular", v)}
                    icon={<IconBolt size={14} />}
                  />
                  <Slider
                    label="Rim Light (Edge Glow)"
                    value={settings.godLightRim}
                    min={0}
                    max={1}
                    onChange={(v: any) => updateSetting("godLightRim", v)}
                    icon={<IconSun size={14} />}
                  />
                  <Slider
                    label="Falloff"
                    value={settings.godLightFalloff}
                    min={0}
                    max={3}
                    onChange={(v: any) => updateSetting("godLightFalloff", v)}
                    icon={<IconAperture size={14} />}
                  />
                </ControlGroup>
              </div>
            )}

            {activeTab === "color" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <ControlGroup title="Palette Heist (Neural Match)">
                  <label className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-900 to-blue-900 hover:from-purple-800 hover:to-blue-800 text-xs uppercase tracking-widest font-medium rounded-lg transition border border-white/20 cursor-pointer mb-4 shadow-lg">
                    <IconBolt size={14} className="text-yellow-400" /> Steal
                    Look from Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePaletteHeist}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-gray-500 italic text-center">
                    Upload a screenshot from a movie to copy its color grading.
                  </p>
                </ControlGroup>

                <ControlGroup title="Cinema Lab (3D LUTs)">
                  <label className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-xs uppercase tracking-widest font-medium rounded-lg transition border border-white/5 cursor-pointer mb-4">
                    <IconUpload size={14} /> Upload .CUBE LUT
                    <input
                      type="file"
                      accept=".cube"
                      onChange={handleLutUpload}
                      className="hidden"
                    />
                  </label>
                  <Slider
                    label="LUT Strength"
                    value={settings.lutStrength || 0}
                    min={0}
                    max={1}
                    onChange={(v: any) => updateSetting("lutStrength", v)}
                    icon={<IconPalette size={14} />}
                  />
                </ControlGroup>

                <ControlGroup title="White Balance">
                  <Slider
                    label="Temp"
                    value={settings.temperature}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("temperature", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Tint"
                    value={settings.tint}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("tint", v)}
                    icon={<IconPalette size={14} />}
                  />
                </ControlGroup>

                <ControlGroup title="Cinematic Grading">
                  <Slider
                    label="Teal & Orange"
                    value={settings.tealOrange}
                    min={0}
                    max={1}
                    onChange={(v: any) => updateSetting("tealOrange", v)}
                    accentColor="accent-orange-500"
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Skin Protection"
                    value={settings.skinProtect}
                    min={0}
                    max={1}
                    onChange={(v: any) => updateSetting("skinProtect", v)}
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
                    onChange={(v: any) => updateSetting("hueShift", v)}
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
                  icon={<IconCircleFilled size={12} className="text-red-500" />}
                >
                  <Slider
                    label="Hue"
                    value={settings.hslRedHue}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslRedHue", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Saturation"
                    value={settings.hslRedSat}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslRedSat", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Luminance"
                    value={settings.hslRedLum}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslRedLum", v)}
                    icon={<IconSun size={14} />}
                  />
                </ControlGroup>

                {/* Orange Channel */}
                <ControlGroup
                  title="Orange"
                  icon={
                    <IconCircleFilled size={12} className="text-orange-500" />
                  }
                >
                  <Slider
                    label="Hue"
                    value={settings.hslOrangeHue}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslOrangeHue", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Saturation"
                    value={settings.hslOrangeSat}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslOrangeSat", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Luminance"
                    value={settings.hslOrangeLum}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslOrangeLum", v)}
                    icon={<IconSun size={14} />}
                  />
                </ControlGroup>

                {/* Yellow Channel */}
                <ControlGroup
                  title="Yellow"
                  icon={
                    <IconCircleFilled size={12} className="text-yellow-500" />
                  }
                >
                  <Slider
                    label="Hue"
                    value={settings.hslYellowHue}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslYellowHue", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Saturation"
                    value={settings.hslYellowSat}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslYellowSat", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Luminance"
                    value={settings.hslYellowLum}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslYellowLum", v)}
                    icon={<IconSun size={14} />}
                  />
                </ControlGroup>

                {/* Green Channel */}
                <ControlGroup
                  title="Green"
                  icon={
                    <IconCircleFilled size={12} className="text-green-500" />
                  }
                >
                  <Slider
                    label="Hue"
                    value={settings.hslGreenHue}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslGreenHue", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Saturation"
                    value={settings.hslGreenSat}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslGreenSat", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Luminance"
                    value={settings.hslGreenLum}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslGreenLum", v)}
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
                    onChange={(v: any) => updateSetting("hslAquaHue", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Saturation"
                    value={settings.hslAquaSat}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslAquaSat", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Luminance"
                    value={settings.hslAquaLum}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslAquaLum", v)}
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
                    onChange={(v: any) => updateSetting("hslBlueHue", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Saturation"
                    value={settings.hslBlueSat}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslBlueSat", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Luminance"
                    value={settings.hslBlueLum}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslBlueLum", v)}
                    icon={<IconSun size={14} />}
                  />
                </ControlGroup>

                {/* Purple Channel */}
                <ControlGroup
                  title="Purple"
                  icon={
                    <IconCircleFilled size={12} className="text-purple-500" />
                  }
                >
                  <Slider
                    label="Hue"
                    value={settings.hslPurpleHue}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslPurpleHue", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Saturation"
                    value={settings.hslPurpleSat}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslPurpleSat", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Luminance"
                    value={settings.hslPurpleLum}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslPurpleLum", v)}
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
                    onChange={(v: any) => updateSetting("hslMagentaHue", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Saturation"
                    value={settings.hslMagentaSat}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslMagentaSat", v)}
                    icon={<IconPalette size={14} />}
                  />
                  <Slider
                    label="Luminance"
                    value={settings.hslMagentaLum}
                    min={-1}
                    max={1}
                    onChange={(v: any) => updateSetting("hslMagentaLum", v)}
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

                  <div className="grid grid-cols-2 gap-3">
                    {/* None */}
                    <button
                      onClick={() => updateSetting("filmEmulation", "none")}
                      className={`p-3 rounded-lg border transition-all ${
                        settings.filmEmulation === "none"
                          ? "bg-white/10 border-amber-500/50 ring-1 ring-amber-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-medium text-gray-300">
                        None
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        Original
                      </div>
                    </button>

                    {/* Kodak Portra 400 */}
                    <button
                      onClick={() =>
                        updateSetting("filmEmulation", "portra400")
                      }
                      className={`p-3 rounded-lg border transition-all ${
                        settings.filmEmulation === "portra400"
                          ? "bg-amber-900/20 border-amber-500/50 ring-1 ring-amber-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-medium text-amber-200">
                        Portra 400
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        Warm skin tones
                      </div>
                    </button>

                    {/* Kodak Ektar 100 */}
                    <button
                      onClick={() => updateSetting("filmEmulation", "ektar100")}
                      className={`p-3 rounded-lg border transition-all ${
                        settings.filmEmulation === "ektar100"
                          ? "bg-orange-900/20 border-orange-500/50 ring-1 ring-orange-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-medium text-orange-200">
                        Ektar 100
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        Vivid & punchy
                      </div>
                    </button>

                    {/* Fuji Velvia 50 */}
                    <button
                      onClick={() => updateSetting("filmEmulation", "velvia50")}
                      className={`p-3 rounded-lg border transition-all ${
                        settings.filmEmulation === "velvia50"
                          ? "bg-green-900/20 border-green-500/50 ring-1 ring-green-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-medium text-green-200">
                        Velvia 50
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        Hyper-saturated
                      </div>
                    </button>

                    {/* Fuji Pro 400H */}
                    <button
                      onClick={() => updateSetting("filmEmulation", "pro400h")}
                      className={`p-3 rounded-lg border transition-all ${
                        settings.filmEmulation === "pro400h"
                          ? "bg-sky-900/20 border-sky-500/50 ring-1 ring-sky-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-medium text-sky-200">
                        Pro 400H
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        Soft pastels
                      </div>
                    </button>

                    {/* Cinestill 800T */}
                    <button
                      onClick={() =>
                        updateSetting("filmEmulation", "cinestill800t")
                      }
                      className={`p-3 rounded-lg border transition-all ${
                        settings.filmEmulation === "cinestill800t"
                          ? "bg-teal-900/20 border-teal-500/50 ring-1 ring-teal-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-medium text-teal-200">
                        Cinestill 800T
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        Tungsten halation
                      </div>
                    </button>

                    {/* Kodak Vision3 500T */}
                    <button
                      onClick={() =>
                        updateSetting("filmEmulation", "vision3500t")
                      }
                      className={`p-3 rounded-lg border transition-all ${
                        settings.filmEmulation === "vision3500t"
                          ? "bg-indigo-900/20 border-indigo-500/50 ring-1 ring-indigo-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-medium text-indigo-200">
                        Vision3 500T
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        Cinema tungsten
                      </div>
                    </button>

                    {/* Ilford HP5 Plus - B&W */}
                    <button
                      onClick={() => updateSetting("filmEmulation", "hp5")}
                      className={`p-3 rounded-lg border transition-all ${
                        settings.filmEmulation === "hp5"
                          ? "bg-gray-700/50 border-gray-400/50 ring-1 ring-gray-400/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-medium text-gray-200">
                        Ilford HP5
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        Classic B&W
                      </div>
                    </button>

                    {/* Agfa Vista 400 */}
                    <button
                      onClick={() => updateSetting("filmEmulation", "vista400")}
                      className={`p-3 rounded-lg border transition-all ${
                        settings.filmEmulation === "vista400"
                          ? "bg-yellow-900/20 border-yellow-500/50 ring-1 ring-yellow-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-medium text-yellow-200">
                        Agfa Vista
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        Vintage warm
                      </div>
                    </button>

                    {/* Lomography 800 */}
                    <button
                      onClick={() => updateSetting("filmEmulation", "lomo800")}
                      className={`p-3 rounded-lg border transition-all ${
                        settings.filmEmulation === "lomo800"
                          ? "bg-cyan-900/20 border-cyan-500/50 ring-1 ring-cyan-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-medium text-cyan-200">
                        Lomo 800
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        Vivid & punchy
                      </div>
                    </button>

                    {/* Technicolor 3-Strip */}
                    <button
                      onClick={() =>
                        updateSetting("filmEmulation", "technicolor")
                      }
                      className={`p-3 rounded-lg border transition-all ${
                        settings.filmEmulation === "technicolor"
                          ? "bg-rose-900/20 border-rose-500/50 ring-1 ring-rose-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-medium text-rose-200">
                        Technicolor
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        Vintage cinema
                      </div>
                    </button>

                    {/* Bleach Bypass */}
                    <button
                      onClick={() =>
                        updateSetting("filmEmulation", "bleachbypass")
                      }
                      className={`p-3 rounded-lg border transition-all ${
                        settings.filmEmulation === "bleachbypass"
                          ? "bg-slate-700/50 border-slate-400/50 ring-1 ring-slate-400/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-medium text-slate-200">
                        Bleach Bypass
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        High contrast
                      </div>
                    </button>

                    {/* Cross Process */}
                    <button
                      onClick={() =>
                        updateSetting("filmEmulation", "crossprocess")
                      }
                      className={`p-3 rounded-lg border transition-all col-span-2 ${
                        settings.filmEmulation === "crossprocess"
                          ? "bg-fuchsia-900/20 border-fuchsia-500/50 ring-1 ring-fuchsia-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-medium text-fuchsia-200">
                        Cross Process
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        E-6 to C-41 wild colors
                      </div>
                    </button>
                  </div>

                  {settings.filmEmulation !== "none" && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <Slider
                        label="Film Strength"
                        value={settings.filmEmulationStrength}
                        min={0}
                        max={1}
                        onChange={(v: any) =>
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
                    onChange={(v: any) => updateSetting("vignette", v)}
                    icon={<IconEye size={14} />}
                  />
                  <Slider
                    label="Chromatic Aberration"
                    value={settings.aberration}
                    min={0}
                    max={0.02}
                    step={0.001}
                    onChange={(v: any) => updateSetting("aberration", v)}
                    icon={<IconAperture size={14} />}
                  />
                  <Slider
                    label="Glow / Bloom"
                    value={settings.halation}
                    min={0}
                    max={1}
                    onChange={(v: any) => updateSetting("halation", v)}
                    icon={<IconBolt size={14} />}
                  />
                  <Slider
                    label="Anamorphic Distortion"
                    value={settings.anamorphicDistortion}
                    min={0}
                    max={1}
                    onChange={(v: any) =>
                      updateSetting("anamorphicDistortion", v)
                    }
                    icon={<IconEye size={14} />}
                  />
                  <Slider
                    label="Anamorphic Streaks"
                    value={settings.anamorphicStreaks}
                    min={0}
                    max={1}
                    onChange={(v: any) => updateSetting("anamorphicStreaks", v)}
                    icon={<IconBolt size={14} />}
                  />
                </ControlGroup>

                <ControlGroup title="Texture & Overlays">
                  <Slider
                    label="Film Grain"
                    value={settings.grain}
                    min={0}
                    max={0.5}
                    onChange={(v: any) => updateSetting("grain", v)}
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
                    onChange={(v: any) => setBrushSize(parseFloat(v))}
                    icon={<IconAperture size={14} />}
                  />
                  <Slider
                    label="Feather (Softness)"
                    value={brushFeather}
                    min={0}
                    max={1}
                    onChange={(v: any) => setBrushFeather(parseFloat(v))}
                    icon={<IconAperture size={14} />}
                  />

                  <button
                    onClick={() => {
                      if ((window as any).__brushMaskClear) {
                        (window as any).__brushMaskClear();
                      }
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
                        onChange={(v: any) =>
                          setBrushMaskExposure(parseFloat(v))
                        }
                        icon={<IconSun size={14} />}
                      />
                      <Slider
                        label="Contrast"
                        value={brushMaskContrast}
                        min={-1}
                        max={1}
                        onChange={(v: any) =>
                          setBrushMaskContrast(parseFloat(v))
                        }
                        icon={<IconContrast size={14} />}
                      />
                      <Slider
                        label="Saturation"
                        value={brushMaskSaturation}
                        min={-1}
                        max={1}
                        onChange={(v: any) =>
                          setBrushMaskSaturation(parseFloat(v))
                        }
                        icon={<IconPalette size={14} />}
                      />
                      <Slider
                        label="Temperature"
                        value={brushMaskTemperature}
                        min={-1}
                        max={1}
                        onChange={(v: any) =>
                          setBrushMaskTemperature(parseFloat(v))
                        }
                        icon={<IconSun size={14} />}
                      />
                      <Slider
                        label="Clarity"
                        value={brushMaskClarity}
                        min={0}
                        max={1}
                        onChange={(v: any) =>
                          setBrushMaskClarity(parseFloat(v))
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
                    onChange={(v: any) => updateSetting("radialMaskX", v)}
                    icon={<IconAperture size={14} />}
                  />
                  <Slider
                    label="Center Y"
                    value={settings.radialMaskY}
                    min={0}
                    max={1}
                    onChange={(v: any) => updateSetting("radialMaskY", v)}
                    icon={<IconAperture size={14} />}
                  />
                  <Slider
                    label="Radius"
                    value={settings.radialMaskRadius}
                    min={0.1}
                    max={1}
                    onChange={(v: any) => updateSetting("radialMaskRadius", v)}
                    icon={<IconAperture size={14} />}
                  />
                  <Slider
                    label="Feather"
                    value={settings.radialMaskFeather}
                    min={0}
                    max={0.5}
                    onChange={(v: any) => updateSetting("radialMaskFeather", v)}
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
                      onChange={(v: any) =>
                        updateSetting("radialMaskExposure", v)
                      }
                      icon={<IconSun size={14} />}
                    />
                    <Slider
                      label="Contrast"
                      value={settings.radialMaskContrast}
                      min={-1}
                      max={1}
                      onChange={(v: any) =>
                        updateSetting("radialMaskContrast", v)
                      }
                      icon={<IconContrast size={14} />}
                    />
                    <Slider
                      label="Saturation"
                      value={settings.radialMaskSaturation}
                      min={-1}
                      max={1}
                      onChange={(v: any) =>
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
                    onChange={(v: any) => updateSetting("linearMaskAngle", v)}
                    icon={<IconRotateClockwise size={14} />}
                  />
                  <Slider
                    label="Position"
                    value={settings.linearMaskPosition}
                    min={0}
                    max={1}
                    onChange={(v: any) =>
                      updateSetting("linearMaskPosition", v)
                    }
                    icon={<IconAdjustmentsHorizontal size={14} />}
                  />
                  <Slider
                    label="Feather"
                    value={settings.linearMaskFeather}
                    min={0}
                    max={0.5}
                    onChange={(v: any) => updateSetting("linearMaskFeather", v)}
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
                      onChange={(v: any) =>
                        updateSetting("linearMaskExposure", v)
                      }
                      icon={<IconSun size={14} />}
                    />
                    <Slider
                      label="Contrast"
                      value={settings.linearMaskContrast}
                      min={-1}
                      max={1}
                      onChange={(v: any) =>
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
                      onClick={() => updateSetting("luminosityMaskTarget", 0.2)}
                      className={`flex-1 py-2 mx-1 text-[9px] uppercase rounded ${settings.luminosityMaskTarget < 0.35 ? "bg-gray-800 border border-amber-500/50 text-amber-400" : "bg-gray-800/50 border border-white/10 text-gray-500"}`}
                    >
                      Shadows
                    </button>
                    <button
                      onClick={() => updateSetting("luminosityMaskTarget", 0.5)}
                      className={`flex-1 py-2 mx-1 text-[9px] uppercase rounded ${settings.luminosityMaskTarget >= 0.35 && settings.luminosityMaskTarget <= 0.65 ? "bg-gray-600 border border-amber-500/50 text-amber-400" : "bg-gray-600/50 border border-white/10 text-gray-500"}`}
                    >
                      Mids
                    </button>
                    <button
                      onClick={() => updateSetting("luminosityMaskTarget", 0.8)}
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
                    onChange={(v: any) =>
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
                      onChange={(v: any) =>
                        updateSetting("luminosityMaskExposure", v)
                      }
                      icon={<IconSun size={14} />}
                    />
                    <Slider
                      label="Saturation"
                      value={settings.luminosityMaskSaturation}
                      min={-1}
                      max={1}
                      onChange={(v: any) =>
                        updateSetting("luminosityMaskSaturation", v)
                      }
                      icon={<IconPalette size={14} />}
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
                    onChange={(v: any) => updateSetting("rotate", v)}
                    icon={<IconRotateClockwise size={14} />}
                  />
                  <Slider
                    label="Zoom"
                    value={settings.zoom}
                    min={1}
                    max={3}
                    onChange={(v: any) => updateSetting("zoom", v)}
                    icon={<IconZoomIn size={14} />}
                  />
                </ControlGroup>

                <ControlGroup title="Optics & Lens">
                  <Slider
                    label="Lens Distortion"
                    value={settings.lensDistortion}
                    min={-0.5}
                    max={0.5}
                    onChange={(v: any) => updateSetting("lensDistortion", v)}
                    icon={<IconDeviceDesktop size={14} />}
                    bipolar
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Slider
                      label="Keystone H"
                      value={settings.keystoneH}
                      min={-0.5}
                      max={0.5}
                      onChange={(v: any) => updateSetting("keystoneH", v)}
                      icon={<IconPerspective size={14} />}
                      bipolar
                    />
                    <Slider
                      label="Keystone V"
                      value={settings.keystoneV}
                      min={-0.5}
                      max={0.5}
                      onChange={(v: any) => updateSetting("keystoneV", v)}
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
                      onChange={(v: any) => updateSetting("tiltShiftAmount", v)}
                      icon={<IconDroplet size={14} />}
                    />
                    {settings.tiltShiftAmount > 0 && (
                      <>
                        <Slider
                          label="Position"
                          value={settings.tiltShiftPosition}
                          min={0}
                          max={1}
                          onChange={(v: any) =>
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
                          onChange={(v: any) =>
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
          <div className="p-4 border-t border-white/5 bg-black/40 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadPreset}
                className="flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-widest font-medium rounded-lg transition border border-white/5"
              >
                <IconDeviceFloppy size={12} /> Save
              </button>
              <label className="flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-widest font-medium rounded-lg transition border border-white/5 cursor-pointer">
                <IconFileCode size={12} /> Load
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportPreset}
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

      {/* Tutorial Modal */}
      {activeTutorial && TUTORIAL_CONTENT[activeTutorial] && (
        <TutorialModal
          isOpen={!!activeTutorial}
          onClose={handleTutorialClose}
          content={TUTORIAL_CONTENT[activeTutorial]}
        />
      )}
    </main>
  );
}

// --- UI COMPONENTS ---

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
