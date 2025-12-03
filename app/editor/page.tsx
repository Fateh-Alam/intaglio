"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  Download,
  Upload,
  Save,
  FileJson,
  RotateCw,
  ZoomIn,
  Sun,
  Contrast,
  Palette,
  Aperture,
  Zap,
  Eye,
  Image as ImageIcon,
  Sliders,
} from "lucide-react";
import { parseCubeLUT } from "../utils/lutParser";
import { generatePaletteHeist2DLUT } from "../utils/colorTransfer";

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
  // Basic
  contrast: 0.0,
  brightness: 0.0,

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

  // LUT
  lutTexture: null as any,
  lutStrength: 0.0,

  // Black Magic
  falseColor: false,
  anamorphicDistortion: 0.0,
  anamorphicStreaks: 0.0,
  godLightStrength: 0.0,
  godLightX: 0.5,
  godLightY: 0.5,

  // HSL
  targetHue: 0.0, // 0=Red, 0.33=Green, 0.66=Blue
  hueShift: 0.0,

  // Transform
  rotate: 0.0,
  zoom: 1.0,

  // UI State (passed to shader)
  wiperActive: false,
};

export default function Home() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [clipboard, setClipboard] = useState<typeof DEFAULT_SETTINGS | null>(
    null
  );
  const [imageSrc, setImageSrc] = useState("/demo.png");
  const [histogram, setHistogram] = useState<{
    r: number[];
    g: number[];
    b: number[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

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

  const updateSetting = (key: string, value: string | number | boolean) => {
    setSettings((prev: any) => ({
      ...prev,
      [key]: typeof value === "string" ? parseFloat(value) : value,
    }));
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

  const handleExport = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    // Create a temporary link to download the image
    const link = document.createElement("a");
    link.download = `nyvarra-edit-${Date.now()}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
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
    <main className="flex h-screen w-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-amber-500 selection:text-white relative">
      {/* Film grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* LEFT: The Editor (WebGL Canvas) */}
      <div className="flex-grow relative bg-[#020202] flex items-center justify-center overflow-hidden">
        {/* Toolbar Overlay */}
        <div className="absolute top-6 left-6 z-10 flex gap-4">
          <label className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition cursor-pointer font-mono text-[10px] uppercase tracking-[0.25em]">
            <Upload size={14} />
            <span>Open Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={() => updateSetting("wiperActive", !settings.wiperActive)}
            className={`flex items-center gap-2 px-4 py-2 backdrop-blur-xl border transition font-mono text-[10px] uppercase tracking-[0.25em] ${settings.wiperActive ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5"}`}
          >
            <Sliders size={14} />
            <span>Compare</span>
          </button>

          <button
            onClick={() => updateSetting("falseColor", !settings.falseColor)}
            className={`flex items-center gap-2 px-4 py-2 backdrop-blur-xl border transition font-mono text-[10px] uppercase tracking-[0.25em] ${settings.falseColor ? "bg-purple-500/20 border-purple-500/50 text-purple-400" : "bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5"}`}
          >
            <Eye size={14} />
            <span>False Color</span>
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
            settings={settings}
            imageUrl={imageSrc}
            onStatsUpdate={setHistogram}
          />
        </div>
      </div>

      {/* RIGHT: The Control Panel */}
      <div className="w-[400px] bg-[#0a0a0a] border-l border-white/5 flex flex-col z-20 shadow-2xl relative">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative h-6 w-6">
              <Image
                src="/logo.png"
                alt="Nyvarra Logo"
                fill
                className="object-contain opacity-80"
              />
            </div>
            <h1 className="font-mono text-xl font-light tracking-[0.3em] text-white">
              NYVARRA
            </h1>
          </div>
          <div className="text-[10px] text-amber-900/60 font-mono uppercase tracking-[0.3em]">
            v1.0
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {["basic", "color", "effects", "transform"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 font-mono text-[10px] uppercase tracking-[0.3em] font-medium transition-colors ${
                activeTab === tab
                  ? "text-amber-400 border-b-2 border-amber-500 bg-white/5"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Scrollable Controls */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {activeTab === "basic" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <ControlGroup title="Light">
                <Slider
                  label="Exposure"
                  value={settings.brightness}
                  min={-0.5}
                  max={0.5}
                  onChange={(v: any) => updateSetting("brightness", v)}
                  icon={<Sun size={14} />}
                />
                <Slider
                  label="Contrast"
                  value={settings.contrast}
                  min={-0.5}
                  max={0.5}
                  onChange={(v: any) => updateSetting("contrast", v)}
                  icon={<Contrast size={14} />}
                />
                <Slider
                  label="Dehaze"
                  value={settings.dehaze}
                  min={0}
                  max={1}
                  onChange={(v: any) => updateSetting("dehaze", v)}
                  icon={<Aperture size={14} />}
                />
              </ControlGroup>

              <ControlGroup title="Detail">
                <Slider
                  label="Structure (Clarity)"
                  value={settings.structure}
                  min={0}
                  max={1}
                  onChange={(v: any) => updateSetting("structure", v)}
                  icon={<Zap size={14} />}
                />
                <Slider
                  label="Sharpness"
                  value={settings.sharpness}
                  min={0}
                  max={1}
                  onChange={(v: any) => updateSetting("sharpness", v)}
                  icon={<Zap size={14} />}
                />
              </ControlGroup>

              <ControlGroup title="God Light (3D Relighting)">
                <Slider
                  label="Strength"
                  value={settings.godLightStrength}
                  min={0}
                  max={1}
                  onChange={(v: any) => updateSetting("godLightStrength", v)}
                  icon={<Sun size={14} />}
                />
                <Slider
                  label="Light X"
                  value={settings.godLightX}
                  min={0}
                  max={1}
                  onChange={(v: any) => updateSetting("godLightX", v)}
                  icon={<Sun size={14} />}
                />
                <Slider
                  label="Light Y"
                  value={settings.godLightY}
                  min={0}
                  max={1}
                  onChange={(v: any) => updateSetting("godLightY", v)}
                  icon={<Sun size={14} />}
                />
              </ControlGroup>
            </div>
          )}

          {activeTab === "color" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <ControlGroup title="Palette Heist (Neural Match)">
                <label className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-900 to-blue-900 hover:from-purple-800 hover:to-blue-800 text-xs uppercase tracking-widest font-medium rounded-lg transition border border-white/20 cursor-pointer mb-4 shadow-lg">
                  <Zap size={14} className="text-yellow-400" /> Steal Look from
                  Image
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
                  <Upload size={14} /> Upload .CUBE LUT
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
                  icon={<Palette size={14} />}
                />
              </ControlGroup>

              <ControlGroup title="White Balance">
                <Slider
                  label="Temp"
                  value={settings.temperature}
                  min={-1}
                  max={1}
                  onChange={(v: any) => updateSetting("temperature", v)}
                  icon={<Palette size={14} />}
                />
                <Slider
                  label="Tint"
                  value={settings.tint}
                  min={-1}
                  max={1}
                  onChange={(v: any) => updateSetting("tint", v)}
                  icon={<Palette size={14} />}
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
                  icon={<Palette size={14} />}
                />
                <Slider
                  label="Skin Protection"
                  value={settings.skinProtect}
                  min={0}
                  max={1}
                  onChange={(v: any) => updateSetting("skinProtect", v)}
                  icon={<Palette size={14} />}
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
                  icon={<Palette size={14} />}
                />
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
                  icon={<Eye size={14} />}
                />
                <Slider
                  label="Chromatic Aberration"
                  value={settings.aberration}
                  min={0}
                  max={0.02}
                  step={0.001}
                  onChange={(v: any) => updateSetting("aberration", v)}
                  icon={<Aperture size={14} />}
                />
                <Slider
                  label="Glow / Bloom"
                  value={settings.halation}
                  min={0}
                  max={1}
                  onChange={(v: any) => updateSetting("halation", v)}
                  icon={<Zap size={14} />}
                />
                <Slider
                  label="Anamorphic Distortion"
                  value={settings.anamorphicDistortion}
                  min={0}
                  max={1}
                  onChange={(v: any) =>
                    updateSetting("anamorphicDistortion", v)
                  }
                  icon={<Eye size={14} />}
                />
                <Slider
                  label="Anamorphic Streaks"
                  value={settings.anamorphicStreaks}
                  min={0}
                  max={1}
                  onChange={(v: any) => updateSetting("anamorphicStreaks", v)}
                  icon={<Zap size={14} />}
                />
              </ControlGroup>

              <ControlGroup title="Texture & Overlays">
                <Slider
                  label="Film Grain"
                  value={settings.grain}
                  min={0}
                  max={0.5}
                  onChange={(v: any) => updateSetting("grain", v)}
                  icon={<ImageIcon size={14} />}
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
                  icon={<RotateCw size={14} />}
                />
                <Slider
                  label="Zoom"
                  value={settings.zoom}
                  min={1}
                  max={3}
                  onChange={(v: any) => updateSetting("zoom", v)}
                  icon={<ZoomIn size={14} />}
                />
              </ControlGroup>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-[#111]">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={handleDownloadPreset}
              className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-xs uppercase tracking-widest font-medium rounded-lg transition border border-white/5"
            >
              <Save size={14} /> Save Preset
            </button>
            <label className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-xs uppercase tracking-widest font-medium rounded-lg transition border border-white/5 cursor-pointer">
              <FileJson size={14} /> Load Preset
              <input
                type="file"
                accept=".json"
                onChange={handleImportPreset}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={handleCopySettings}
              className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-xs uppercase tracking-widest font-medium rounded-lg transition border border-white/5"
            >
              Copy Edits
            </button>
            <button
              onClick={handlePasteSettings}
              disabled={!clipboard}
              className={`flex items-center justify-center gap-2 py-3 text-xs uppercase tracking-widest font-medium rounded-lg transition border border-white/5 ${clipboard ? "bg-white/5 hover:bg-white/10" : "bg-black/20 text-gray-600 cursor-not-allowed"}`}
            >
              Paste Edits
            </button>
          </div>

          <button
            onClick={handleExport}
            className="w-full py-4 bg-white text-black font-bold uppercase tracking-[0.2em] hover:bg-gray-200 transition rounded-lg flex items-center justify-center gap-2"
          >
            <Download size={16} /> Export Image
          </button>
        </div>
      </div>
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

const ControlGroup = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-4">
    <h3 className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber-900/70 font-semibold mb-2">
      {title}
    </h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const Slider = ({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  icon,
  accentColor = "accent-white",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: any) => void;
  icon: React.ReactNode;
  accentColor?: string;
}) => (
  <div className="space-y-2 group">
    <div className="flex justify-between items-center text-gray-400 group-hover:text-gray-200 transition">
      <div className="flex items-center gap-2">
        {icon}
        <label className="font-mono text-[11px] font-medium">{label}</label>
      </div>
      <span className="text-[10px] font-mono opacity-50 tracking-wider">
        {value.toFixed(2)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer ${accentColor} hover:bg-gray-700 transition`}
    />
  </div>
);
