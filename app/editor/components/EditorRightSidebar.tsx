import Image from "next/image";
import { TUTORIAL_CONTENT } from "../../utils/tutorialContent";
import { FORMAT } from "../../lib/brand";
import HistoryPanel from "../../components/HistoryPanel";
import CurveEditor from "../../components/CurveEditor";
import ColorWheel from "../../components/ColorWheel";
import { FILM_EMULATIONS } from "../../lib/filmEmulations";
import CinematicTextControls from "../../components/CinematicTextControls";
import TutorialModal from "../../components/TutorialModal";
import PresetCreatorModal from "../../components/PresetCreatorModal";
import ReferenceViewer from "../../components/ReferenceViewer";
import LUTCreatorModal from "../../components/LUTCreatorModal";
import PlateStackPanel from "./PlateStackPanel";
import ColorMixerUI from "./ColorMixerUI";
import ProcessEnginePanel from "./ProcessEnginePanel";
import AdvancedGraphPanel from "./AdvancedGraphPanel";
import type {
  EditorSettings,
  AdjustmentLayer,
  CurvePoints
} from "../../types/editor";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLOR_LABELS, WATERMARK_POSITIONS } from "../pageTypes";
import { getEditorModuleLabel } from '../pageTypes';
import { TutorialTrigger } from '../../components/TutorialModal';
import { useEditorState } from '../hooks/useEditorState';
import { IconUpload, IconMovie, IconPhoto, IconEye, IconDeviceFloppy, IconAdjustmentsHorizontal, IconHistory, IconLayersIntersect, IconInfoCircle, IconX, IconCircle, IconChartLine, IconTypography, IconArrowsMaximize, IconSparkles, IconCamera, IconRotateClockwise, IconZoomIn, IconSun, IconContrast, IconPalette, IconAperture, IconBolt, IconBulb, IconMapPin, IconDeviceDesktop, IconPerspective, IconDroplet, IconChevronRight, IconFileCode, IconCircles, IconMoon, IconChevronLeft, IconTemperature, IconCheck } from "@tabler/icons-react";
import Slider from "../../components/Slider";
import ControlGroup from "../../components/ControlGroup";

export function EditorRightSidebar() {
  const editorState = useEditorState();
  const {
    settings,
    textOverlay, setTextOverlay,
    assetMetadata, setAssetMetadata,
    watermark, setWatermark,
    clipboard,
    imageSrc,
    activeTab,
    activePlateId, setActivePlateId,
    gradeGraph, setGradeGraph,
    handleTabChange,
    handleTutorialClose,
    showTutorial,
    history,
    historyIndex,
    snapshots,
    settingsSnapshots,
    activeVirtualCopyId,
    setDiffVirtualCopyId,
    activeTutorial,
    setIsMobileMenuOpen,
    isRightSidebarOpen, setIsRightSidebarOpen,
    isFocusMode,
    isHistogramHelpOpen, setIsHistogramHelpOpen,
    isMobileControlsExpanded, setIsMobileControlsExpanded,
    isPresetModalOpen, setIsPresetModalOpen,
    isReferenceOpen, setIsReferenceOpen,
    isLUTCreatorOpen, setIsLUTCreatorOpen,
    roiMode, setRoiMode,
    sourceROI, setSourceROI,
    updateSetting,
    handleApplyRecipe,
    handleUndo,
    handleRedo,
    handleSaveRecipe,
    handlePaletteHeist,
    handleLutUpload,
    handleApplyGeneratedLut,
    handleFontUpload,
    handleCompareSnapshot,
    handleDeleteSnapshot,
    handleDeleteVirtualCopy,
    handleTakeSnapshot,
    handleRestoreVirtualCopy,
    handleJumpToHistory,
    handleClearHistory,
    handleLoadPreset,
    activeCurveChannel,
    setActiveCurveChannel,
    editDiffs,
    referenceImageUrl,
    setReferenceImageUrl,
    handleCreateVirtualCopy,
    handleCopySettings,
    handlePasteSettings,
    diffVirtualCopy
  } = editorState;

  const getDevValue = <K extends keyof EditorSettings>(key: K, fallback: EditorSettings[K] = 0 as EditorSettings[K]): EditorSettings[K] => {
    if (activePlateId === "base") {
      return settings[key] || fallback;
    }
    const layer = settings.adjustmentLayers?.find((l: AdjustmentLayer) => l.id === activePlateId);
    if (!layer || !layer.params) return fallback;

    if (key in layer.params) {
      return layer.params[key] ?? fallback;
    }

    // Fallback to base settings for properties that aren't defined in the plate
    return settings[key] ?? fallback;
  };

  const updateDevValue = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    if (activePlateId === "base") {
      updateSetting(key, value);
    } else {
      const layerIndex = settings.adjustmentLayers?.findIndex((l: AdjustmentLayer) => l.id === activePlateId) ?? -1;
      if (layerIndex >= 0 && settings.adjustmentLayers) {
        const newLayers = [...settings.adjustmentLayers];
        newLayers[layerIndex] = {
          ...newLayers[layerIndex],
          params: {
            ...newLayers[layerIndex].params,
            [key]: value
          }
        };
        updateSetting("adjustmentLayers", newLayers);
      }
    }
  };

  // Helper for components that need the entire settings object for the plate (e.g. ColorMixerUI)
  const getPlateSettings = (): EditorSettings => {
    if (activePlateId === "base") return settings;
    const layer = settings.adjustmentLayers?.find((l: AdjustmentLayer) => l.id === activePlateId);
    if (!layer || !layer.params) return settings;
    return { ...settings, ...layer.params };
  };

  return (
    <>
      {/* RIGHT SIDEBAR - CONTROLS */}
      <AnimatePresence>
        {!isFocusMode && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-20 flex h-[42vh] min-h-[360px] flex-col border-t border-white/5 bg-[#1c1c1e] md:h-full md:min-h-0 md:w-[380px] md:border-l md:border-t-0"
          >
        {/* Toggle Button */}
        <div role="button"
          onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
          className="hidden"
        >
          {isRightSidebarOpen ? (
            <IconChevronRight className="intaglio-icon"/>
          ) : (
            <IconChevronLeft className="intaglio-icon"/>
          )}
        </div>
        {/* Mobile backdrop */}
        <div
          className="hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Control Panel */}
        <div className="z-20 flex h-full w-full flex-col overflow-hidden">
          <div className="h-full w-full flex flex-col">
            
            {/* Scopes & Analysis (Moved to Top Toolbar) */}

            <div className="flex flex-1 w-full min-w-0 flex-col overflow-hidden">
              {/* Premium Mobile Tab Bar */}
              <div
                className="custom-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto border-b border-white/5 bg-[rgba(20,19,15,0.8)] px-3 py-3 md:hidden backdrop-blur-md"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {[
                  { id: "basic", icon: <IconSun className="intaglio-icon"/> },
                  { id: "graph", icon: <IconCircles className="intaglio-icon"/> },
                  { id: "color", icon: <IconPalette className="intaglio-icon"/> },
                  { id: "curves", icon: <IconChartLine className="intaglio-icon"/> },
                  { id: "grading", icon: <IconCircles className="intaglio-icon"/> },
                  { id: "hsl", icon: <IconCircle className="intaglio-icon"/> },
                  { id: "films", icon: <IconMovie className="intaglio-icon"/> },
                  { id: "effects", icon: <IconSparkles className="intaglio-icon"/> },
                  { id: "masking", icon: <IconLayersIntersect className="intaglio-icon"/> },
                  { id: "text", icon: <IconTypography className="intaglio-icon"/> },
                  { id: "metadata", icon: <IconInfoCircle className="intaglio-icon"/> },
                  { id: "transform", icon: <IconArrowsMaximize className="intaglio-icon"/> },
                  { id: "history", icon: <IconHistory className="intaglio-icon"/> },
                  { id: "snapshots", icon: <IconCamera className="intaglio-icon"/> },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;

                  return (
                    <div role="button"
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
                      className={`flex shrink-0 snap-start flex-col items-center gap-1.5 rounded-lg px-4 py-2.5 whitespace-nowrap transition-all duration-300 ${
                        isActive
                          ? "bg-[rgba(176,138,82,0.15)] text-[var(--intaglio-brass)] shadow-[inset_0_0_0_1px_rgba(176,138,82,0.3)]"
                          : "text-white/40 hover:bg-[rgba(231,223,208,0.05)] active:scale-95"
                      }`}
                    >
                      <span
                        className={`transition-transform duration-300 ${isActive ? "scale-110" : ""}`}
                      >
                        {tab.icon}
                      </span>
                      <span className="text-[9px] font-mono tracking-widest font-medium tracking-wide uppercase">
                        {getEditorModuleLabel(tab.id)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-white/5 bg-transparent px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-[2px] bg-[var(--intaglio-brass)]" />
                  <h2 className="text-sm font-semibold text-white/90">
                    {getEditorModuleLabel(activeTab)}
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  <TutorialTrigger onClick={() => showTutorial(activeTab)} />
                  <div className="border border-white/5 px-2.5 py-1 text-[9px] font-mono font-medium uppercase tracking-widest text-white/40">
                    Inspector
                  </div>
                </div>
              </div>

              {/* Scrollable Controls */}
              <div
                className={`flex-1 overflow-y-auto custom-scrollbar ${activeTab === "history" || activeTab === "process" ? "" : "px-5 py-4 space-y-6"}`}
              >
                {/* 1. PROCESS ENGINE */}
                {activeTab === "process" && (
                  <div className="px-5 py-4">
                    <ProcessEnginePanel
                      onApplyProcess={(recipe) => handleApplyRecipe(recipe.id)}
                      activeProcessId={undefined /* we can track active process later if needed */}
                    />
                  </div>
                )}

                {activeTab === "graph" && (
                  <div className="px-5 py-4">
                    <AdvancedGraphPanel graph={gradeGraph} onGraphChange={setGradeGraph} settings={settings} updateSetting={updateSetting} />
                  </div>
                )}

                {/* 2. DEVELOPMENT */}
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
                      <div role="button"
                        onClick={handleTakeSnapshot}
                        className="w-full py-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded font-mono text-xs font-medium hover:bg-green-500/20 transition flex items-center justify-center gap-2"
                      >
                        <IconCamera className="intaglio-icon"/>
                        Take Snapshot
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {snapshots.map((snap) => (
                          <div
                            key={snap.id}
                            className="relative group rounded overflow-hidden border border-white/5 bg-black"
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
                              <div role="button"
                                onClick={() => handleCompareSnapshot(snap.url)}
                                className="p-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/40"
                                title="Compare"
                              >
                                <IconAdjustmentsHorizontal className="intaglio-icon"/>
                              </div>
                              <div role="button"
                                onClick={() => handleDeleteSnapshot(snap.id)}
                                className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40"
                                title="Delete"
                              >
                                ×
                              </div>
                            </div>
                          </div>
                        ))}
                        {snapshots.length === 0 && (
                          <div className="col-span-2 text-center py-8 text-gray-600 font-mono text-[11px] font-medium">
                            No snapshots
                          </div>
                        )}
                      </div>

                      {settings.compareEnabled && (
                        <div role="button"
                          onClick={() => updateSetting("compareEnabled", false)}
                          className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded font-mono text-xs font-medium hover:bg-red-500/20 transition mt-4"
                        >
                          Stop Comparison
                        </div>
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
                            <div role="button"
                              key={channel}
                              onClick={() => setActiveCurveChannel(channel)}
                              className={`flex-1 py-1.5 text-[11px] font-medium rounded border transition ${
                                activeCurveChannel === channel
                                  ? channel === "master"
                                    ? "bg-white text-black border-white"
                                    : channel === "red"
                                      ? "bg-red-500/20 text-red-500 border-red-500"
                                      : channel === "green"
                                        ? "bg-green-500/20 text-green-500 border-green-500"
                                        : "bg-blue-500/20 text-blue-500 border-blue-500"
                                  : "bg-black/40 text-white/40 border-white/5 hover:bg-[rgba(231,223,208,0.045)]"
                              }`}
                            >
                              {channel}
                            </div>
                          )
                        )}
                      </div>

                      <CurveEditor
                        points={getPlateSettings().curvePoints[activeCurveChannel as keyof CurvePoints]}
                        onChange={(newPoints) => {
                          const newCurvePoints = {
                            ...getPlateSettings().curvePoints,
                            [activeCurveChannel as keyof CurvePoints]: newPoints,
                          };
                          updateDevValue("curvePoints", newCurvePoints);
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
                          icon={<IconContrast className="intaglio-icon"/>}
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
                        value={getDevValue("brightness", 0)}
                        min={-5}
                        max={5}
                        step={0.05}
                        onChange={(v) => updateDevValue("brightness", v)}
                        icon={<IconSun className="intaglio-icon"/>}
                        bipolar
                      />
                      <Slider
                        label="Contrast"
                        value={getDevValue("contrast", 0)}
                        min={-1}
                        max={1}
                        onChange={(v) => updateDevValue("contrast", v)}
                        icon={<IconContrast className="intaglio-icon"/>}
                        bipolar
                      />
                      <Slider
                        label="Highlights"
                        value={getDevValue("highlights", 0)}
                        min={-1}
                        max={1}
                        onChange={(v) => updateDevValue("highlights", v)}
                        icon={<IconSun className="intaglio-icon"/>}
                        bipolar
                      />
                      <Slider
                        label="Shadows"
                        value={getDevValue("shadows", 0)}
                        min={-1}
                        max={1}
                        onChange={(v) => updateDevValue("shadows", v)}
                        icon={<IconMoon className="intaglio-icon"/>}
                        bipolar
                      />
                      <Slider
                        label="Whites"
                        value={getDevValue("whites", 0)}
                        min={-1}
                        max={1}
                        onChange={(v) => updateDevValue("whites", v)}
                        icon={<IconSun className="intaglio-icon"/>}
                        bipolar
                      />
                      <Slider
                        label="Blacks"
                        value={getDevValue("blacks", 0)}
                        min={-1}
                        max={1}
                        onChange={(v) => updateDevValue("blacks", v)}
                        icon={<IconMoon className="intaglio-icon"/>}
                        bipolar
                      />
                      <Slider
                        label="Vibrance"
                        value={getDevValue("vibrance", 0)}
                        min={-1}
                        max={1}
                        onChange={(v) => updateDevValue("vibrance", v)}
                        icon={<IconPalette className="intaglio-icon"/>}
                        bipolar
                      />
                      <Slider
                        label="Dehaze"
                        value={getDevValue("dehaze", 0)}
                        min={0}
                        max={1}
                        onChange={(v) => updateDevValue("dehaze", v)}
                        icon={<IconAperture className="intaglio-icon"/>}
                      />
                    </ControlGroup>

                    <ControlGroup title="Detail">
                      <Slider
                        label="Structure (Clarity)"
                        value={getDevValue("structure", 0)}
                        min={0}
                        max={1}
                        onChange={(v) => updateDevValue("structure", v)}
                        icon={<IconBolt className="intaglio-icon"/>}
                      />
                      <Slider
                        label="Sharpness"
                        value={getDevValue("sharpness", 0)}
                        min={0}
                        max={1}
                        onChange={(v) => updateDevValue("sharpness", v)}
                        icon={<IconBolt className="intaglio-icon"/>}
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
                        icon={<IconSun className="intaglio-icon"/>}
                      />
                      <Slider
                        label="Light X"
                        value={settings.godLightX}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("godLightX", v)}
                        icon={<IconSun className="intaglio-icon"/>}
                      />
                      <Slider
                        label="Light Y"
                        value={settings.godLightY}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("godLightY", v)}
                        icon={<IconSun className="intaglio-icon"/>}
                      />
                      <div className="pt-2 border-t border-white/5 mt-2">
                        <p className="text-[11px] font-medium text-white/50 mb-3">
                          Light Color
                        </p>
                        <div className="flex gap-2">
                          <div role="button"
                            onClick={() => {
                              updateSetting("godLightColorR", 1.0);
                              updateSetting("godLightColorG", 0.85);
                              updateSetting("godLightColorB", 0.7);
                            }}
                            className="flex-1 py-2.5 text-[11px] font-medium bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded text-orange-300 cursor-pointer hover:from-orange-500/30 hover:to-yellow-500/30 hover:border-orange-500/50 active:scale-95 transition-all"
                          >
                            Warm
                          </div>
                          <div role="button"
                            onClick={() => {
                              updateSetting("godLightColorR", 1.0);
                              updateSetting("godLightColorG", 1.0);
                              updateSetting("godLightColorB", 1.0);
                            }}
                            className="flex-1 py-2.5 text-[11px] font-medium bg-[rgba(231,223,208,0.045)] border border-white/5 rounded text-white cursor-pointer hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all"
                          >
                            Neutral
                          </div>
                          <div role="button"
                            onClick={() => {
                              updateSetting("godLightColorR", 0.8);
                              updateSetting("godLightColorG", 0.9);
                              updateSetting("godLightColorB", 1.0);
                            }}
                            className="flex-1 py-2.5 text-[11px] font-medium bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded text-blue-300 cursor-pointer hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-500/50 active:scale-95 transition-all"
                          >
                            Cool
                          </div>
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
                        icon={<IconBolt className="intaglio-icon"/>}
                      />
                      <Slider
                        label="Rim Light (Edge Glow)"
                        value={settings.godLightRim}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("godLightRim", v)}
                        icon={<IconSun className="intaglio-icon"/>}
                      />
                      <Slider
                        label="Falloff"
                        value={settings.godLightFalloff}
                        min={0}
                        max={3}
                        onChange={(v) =>
                          updateSetting("godLightFalloff", v)
                        }
                        icon={<IconAperture className="intaglio-icon"/>}
                      />
                    </ControlGroup>
                  </div>
                )}

                {activeTab === "color" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <ControlGroup title="Reference Match">
                      <div className="flex gap-2 mb-4">
                        {/* ROI Toggle */}
                        <div role="button"
                          onClick={() =>
                            setRoiMode(roiMode === "source" ? "none" : "source")
                          }
                          className={`flex-1 py-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${roiMode === "source" ? "bg-amber-500 text-black border-amber-500" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}`}
                        >
                          <IconMapPin className="intaglio-icon"/>
                          <span className="intaglio-label">
                            Select Region
                          </span>
                        </div>

                        {/* Steal Button */}
                        <label
                          className={`flex-[2] flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-900 to-blue-900 hover:from-purple-800 hover:to-blue-800 text-xs font-medium font-medium rounded-lg transition border border-white/20 cursor-pointer shadow-lg`}
                        >
                          <IconBolt className="intaglio-icon text-yellow-400"/>{" "}
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
                        <div className="flex gap-2 text-[10px] font-mono tracking-widest text-[rgba(231,223,208,0.58)] bg-black/40 p-2 rounded border border-white/5">
                          <IconCheck className="w-3 h-3 text-green-400" />
                          Region selected for match
                        </div>
                      )}
                    </ControlGroup>

                    <ColorMixerUI settings={getPlateSettings()} updateSetting={updateDevValue} />

                    <ControlGroup title="White Balance">
                      <div className="flex gap-2 mb-4">
                        {/* ROI Toggle */}
                        <div role="button"
                          onClick={() =>
                            setRoiMode(roiMode === "source" ? "none" : "source")
                          }
                          className={`flex-1 py-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${roiMode === "source" ? "bg-amber-500 text-black border-amber-500" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}`}
                        >
                          <IconMapPin className="intaglio-icon"/>
                          <span className="intaglio-label">
                            Select Region
                          </span>
                        </div>

                        {/* Steal Button */}
                        <label
                          className={`flex-[2] flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-900 to-blue-900 hover:from-purple-800 hover:to-blue-800 text-xs font-medium font-medium rounded-lg transition border border-white/20 cursor-pointer shadow-lg`}
                        >
                          <IconBolt className="intaglio-icon text-yellow-400"/>{" "}
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
                          <span className="text-[9px] font-mono tracking-widest text-amber-500 font-mono uppercase">
                            Region Active
                          </span>
                          <div role="button"
                            onClick={() => setSourceROI(null)}
                            className="text-white/40 hover:text-white"
                          >
                            <IconX className="intaglio-icon"/>
                          </div>
                        </div>
                      )}

                      <p className="text-[9px] font-mono tracking-widest text-white/40 italic text-center">
                        Select a region of your image (optional) and upload a
                        reference to borrow its color balance.
                      </p>
                    </ControlGroup>

                    <ControlGroup title="LUT Cabinet">
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <label className="flex items-center justify-center gap-2 py-3 bg-[rgba(231,223,208,0.045)] hover:bg-white/10 text-xs font-medium font-medium rounded-lg transition border border-white/5 cursor-pointer">
                          <IconUpload className="intaglio-icon"/> Upload
                          <input
                            type="file"
                            accept=".cube"
                            onChange={handleLutUpload}
                            className="hidden"
                          />
                        </label>
                        <div role="button"
                          onClick={() => setIsLUTCreatorOpen(true)}
                          className="flex items-center justify-center gap-2 py-3 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-xs font-medium font-medium rounded-lg transition border border-violet-500/30"
                        >
                          <IconPalette className="intaglio-icon"/> Create
                        </div>
                      </div>
                      <Slider
                        label="LUT Strength"
                        value={settings.lutStrength || 0}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("lutStrength", v)}
                        icon={<IconPalette className="intaglio-icon"/>}
                      />
                    </ControlGroup>

                    <ControlGroup title="White Balance">
                      <Slider
                        label="Temperature"
                        value={getDevValue("temperature", 0)}
                        min={-1}
                        max={1}
                        onChange={(v) => updateDevValue("temperature", v)}
                        icon={<IconTemperature className="intaglio-icon"/>}
                        bipolar
                      />
                      <Slider
                        label="Tint"
                        value={getDevValue("tint", 0)}
                        min={-1}
                        max={1}
                        onChange={(v) => updateDevValue("tint", v)}
                        icon={<IconPalette className="intaglio-icon"/>}
                        bipolar
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
                        icon={<IconPalette className="intaglio-icon"/>}
                      />
                    </ControlGroup>

                    <ControlGroup title="Deterministic Safeguards">
                      <div className="flex flex-col gap-2 mb-4">
                        <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-2">
                            <IconSparkles className="intaglio-icon text-purple-400" />
                            <div>
                              <div className="text-xs font-medium text-white">Safe Skin Engine</div>
                              <div className="text-[10px] text-white/50">OKLCH tone protection</div>
                            </div>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={settings.safeSkinEnabled}
                            onChange={(e) => updateSetting("safeSkinEnabled", e.target.checked)}
                            className="w-4 h-4 accent-purple-500 rounded bg-white/10 border-white/20"
                          />
                        </label>
                        
                        <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-2">
                            <IconSun className="intaglio-icon text-amber-400" />
                            <div>
                              <div className="text-xs font-medium text-white">Protect Highlights</div>
                              <div className="text-[10px] text-white/50">Prevent highlight clipping</div>
                            </div>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={settings.protectHighlights}
                            onChange={(e) => updateSetting("protectHighlights", e.target.checked)}
                            className="w-4 h-4 accent-amber-500 rounded bg-white/10 border-white/20"
                          />
                        </label>
                      </div>

                      {!settings.safeSkinEnabled && (
                        <Slider
                          label="Manual Skin Protection"
                          value={settings.skinProtect}
                          min={0}
                          max={1}
                          onChange={(v) => updateSetting("skinProtect", v)}
                          icon={<IconPalette className="intaglio-icon text-white/50"/>}
                        />
                      )}
                    </ControlGroup>

                    <ControlGroup title="HSL Selective">
                      <div className="flex justify-between px-1 mb-2">
                        <div role="button"
                          onClick={() => updateSetting("targetHue", 0.0)}
                          className={`w-6 h-6 rounded-full bg-red-500 border-2 ${settings.targetHue === 0 ? "border-white" : "border-transparent"}`}
                        />
                        <div role="button"
                          onClick={() => updateSetting("targetHue", 0.15)}
                          className={`w-6 h-6 rounded-full bg-yellow-500 border-2 ${settings.targetHue === 0.15 ? "border-white" : "border-transparent"}`}
                        />
                        <div role="button"
                          onClick={() => updateSetting("targetHue", 0.33)}
                          className={`w-6 h-6 rounded-full bg-green-500 border-2 ${settings.targetHue === 0.33 ? "border-white" : "border-transparent"}`}
                        />
                        <div role="button"
                          onClick={() => updateSetting("targetHue", 0.5)}
                          className={`w-6 h-6 rounded-full bg-cyan-500 border-2 ${settings.targetHue === 0.5 ? "border-white" : "border-transparent"}`}
                        />
                        <div role="button"
                          onClick={() => updateSetting("targetHue", 0.66)}
                          className={`w-6 h-6 rounded-full bg-blue-500 border-2 ${settings.targetHue === 0.66 ? "border-white" : "border-transparent"}`}
                        />
                        <div role="button"
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
                        icon={<IconPalette className="intaglio-icon"/>}
                      />
                    </ControlGroup>
                  </div>
                )}

                {/* HSL Panel Tab */}
                {activeTab === "hsl" && (
                  <ColorMixerUI settings={settings} updateSetting={updateSetting} />
                )}

                {/* Film Emulation Tab */}
                {activeTab === "films" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <ControlGroup title="Film Stock Emulation">
                      <p className="text-[9px] font-mono tracking-widest text-white/40 mb-4 text-center">
                        Authentic analog film simulation
                      </p>

                      <div className="flex flex-col space-y-6 max-h-[60vh] overflow-y-auto overflow-x-hidden pr-1 pb-4 custom-scrollbar">
                        {Object.entries(
                          FILM_EMULATIONS.reduce((acc, film) => {
                            if (!acc[film.category]) acc[film.category] = [];
                            acc[film.category].push(film);
                            return acc;
                          }, {} as Record<string, typeof FILM_EMULATIONS>)
                        ).map(([category, films]) => {
                          const isIntaglio = category === "Intaglio-0 Collection";
                          return (
                          <div key={category} className="space-y-2">
                            {/* Category header */}
                            <div className={`sticky top-0 z-10 py-1.5 px-1 flex items-center gap-2 border-b ${isIntaglio ? "border-[var(--intaglio-brass)] bg-[#0d0c0a]" : "border-white/5 bg-[#0a0a0a]"}`}>
                              {isIntaglio && <span className="w-1.5 h-1.5 bg-[var(--intaglio-brass)] rounded-full" />}
                              <h4 className={`text-[11px] font-medium ${isIntaglio ? "text-[var(--intaglio-brass)] font-bold" : "text-white/60 font-bold"}`}>
                                {category}
                              </h4>
                              {isIntaglio && <span className="text-[7px] font-mono tracking-widest text-[var(--intaglio-brass)] opacity-60 ml-auto">EXCLUSIVE</span>}
                            </div>

                            {/* Film cards — single column for rich detail */}
                            <div className="flex flex-col gap-2">
                              {films.map((film) => {
                                const isActive = settings.filmEmulation === film.id;
                                const isNone = film.id === "none";
                                return (
                                <div role="button"
                                  key={film.id}
                                  onClick={() => updateSetting("filmEmulation", film.id)}
                                  className={`group relative cursor-pointer transition-all duration-200 ${isNone ? "py-2 px-3 border" : "p-0 border overflow-hidden"} ${
                                    isActive
                                      ? isIntaglio
                                        ? "border-[var(--intaglio-brass)] bg-[rgba(184,156,96,0.08)] ring-1 ring-[var(--intaglio-brass)]/30"
                                        : "border-amber-500/50 bg-amber-900/15 ring-1 ring-amber-500/20"
                                      : isIntaglio
                                        ? "border-[var(--intaglio-brass)]/30 bg-[#0d0c0a] hover:border-[var(--intaglio-brass)]/60"
                                        : "border-white/5 bg-[rgba(231,223,208,0.025)] hover:border-[rgba(231,223,208,0.15)]"
                                  }`}
                                >
                                  {/* None gets simple treatment */}
                                  {isNone ? (
                                    <div className="flex items-center gap-3">
                                      <div className="w-5 h-5 border border-white/5 bg-[#0a0908] flex items-center justify-center">
                                        <span className="text-[8px] text-white/30">✕</span>
                                      </div>
                                      <span className="text-[10px] font-mono tracking-widest text-white/50">NONE — ORIGINAL</span>
                                    </div>
                                  ) : (
                                    <>
                                      {/* Color swatch bar at top */}
                                      <div
                                        className="w-full h-3 opacity-80 group-hover:opacity-100 transition-opacity"
                                        style={{ background: film.swatch }}
                                      />

                                      {/* Card body */}
                                      <div className="px-3 py-2.5">
                                        {/* Name + type badge row */}
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                          <span className={`text-[10px] font-mono tracking-widest font-medium leading-tight ${isIntaglio ? "text-[var(--intaglio-paper)]" : "text-gray-200"}`}>
                                            {film.name}
                                          </span>
                                          <span className={`shrink-0 text-[7px] font-mono tracking-widest uppercase px-1.5 py-0.5 border ${
                                            film.type === "bw"
                                              ? "text-gray-400 border-gray-600 bg-gray-800/50"
                                              : film.type === "duotone"
                                                ? "text-amber-400 border-amber-700/50 bg-amber-900/20"
                                                : "text-emerald-400 border-emerald-700/50 bg-emerald-900/20"
                                          }`}>
                                            {film.type === "bw" ? "B&W" : film.type === "duotone" ? "DUO" : "CLR"}
                                          </span>
                                        </div>

                                        {/* Description */}
                                        <p className={`text-[8px] leading-relaxed mb-1.5 ${isIntaglio ? "text-[rgba(231,223,208,0.45)] font-serif italic" : "text-[rgba(231,223,208,0.35)]"}`}>
                                          {film.description}
                                        </p>

                                        {/* Bottom row: tone dot + best for */}
                                        <div className="flex items-center gap-1.5">
                                          <span className={`w-1.5 h-1.5 rounded-full ${
                                            film.tone === "warm"
                                              ? "bg-orange-400"
                                              : film.tone === "cool"
                                                ? "bg-blue-400"
                                                : "bg-gray-400"
                                          }`} />
                                          <span className="text-[7px] font-mono tracking-widest text-white/30 uppercase">
                                            {film.bestFor}
                                          </span>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                              })}
                            </div>
                          </div>
                        );
                        })}
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
                            icon={<IconAperture className="intaglio-icon"/>}
                          />
                        </div>
                      )}
                    </ControlGroup>

                    <ControlGroup title="Film Density Physics">
                      <Slider
                        label="Toe Strength (Shadows)"
                        value={settings.filmToeStrength}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("filmToeStrength", v)}
                        icon={<IconSun className="intaglio-icon"/>}
                      />
                      <Slider
                        label="Shoulder Strength (Highlights)"
                        value={settings.filmShoulderStrength}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("filmShoulderStrength", v)}
                        icon={<IconSun className="intaglio-icon"/>}
                      />
                      <Slider
                        label="Film Gamma"
                        value={settings.filmGamma}
                        min={0.5}
                        max={1.5}
                        onChange={(v) => updateSetting("filmGamma", v)}
                        icon={<IconContrast className="intaglio-icon"/>}
                      />
                      <Slider
                        label="Color Crossover"
                        value={settings.colorCrossover}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("colorCrossover", v)}
                        icon={<IconPalette className="intaglio-icon"/>}
                      />
                      <Slider
                        label="Luma Desaturation"
                        value={settings.lumaDesat}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("lumaDesat", v)}
                        icon={<IconPalette className="intaglio-icon"/>}
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
                        onChange={(v) => updateSetting("vignette", v)}
                        icon={<IconEye className="intaglio-icon"/>}
                      />
                      <Slider
                        label="Chromatic Aberration"
                        value={settings.aberration}
                        min={0}
                        max={0.02}
                        step={0.001}
                        onChange={(v) => updateSetting("aberration", v)}
                        icon={<IconAperture className="intaglio-icon"/>}
                      />
                      <Slider
                        label="Anamorphic Distortion"
                        value={settings.anamorphicDistortion}
                        min={0}
                        max={1}
                        onChange={(v) =>
                          updateSetting("anamorphicDistortion", v)
                        }
                        icon={<IconEye className="intaglio-icon"/>}
                      />
                      <Slider
                        label="Anamorphic Streaks"
                        value={settings.anamorphicStreaks}
                        min={0}
                        max={1}
                        onChange={(v) =>
                          updateSetting("anamorphicStreaks", v)
                        }
                        icon={<IconBolt className="intaglio-icon"/>}
                      />
                    </ControlGroup>

                    <ControlGroup title="Physics: Halation & Bloom">
                      <h4 className="text-[9px] font-mono tracking-widest font-bold text-red-400 mb-2 uppercase tracking-wider">
                        Halation (Film Bleed)
                      </h4>
                      <Slider
                        label="Strength"
                        value={settings.halation || 0}
                        min={0}
                        max={2}
                        onChange={(v) => updateSetting("halation", v)}
                        icon={<IconBolt className="intaglio-icon"/>}
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
                          icon={<IconBolt className="intaglio-icon"/>}
                        />
                        <Slider
                          label="Radius"
                          value={settings.halationRadius || 1.0}
                          min={0}
                          max={3}
                          onChange={(v: number) =>
                            updateSetting("halationRadius", v)
                          }
                          icon={<IconBolt className="intaglio-icon"/>}
                        />
                      </div>

                      <div className="h-px bg-white/10 my-4" />

                      <h4 className="text-[9px] font-mono tracking-widest font-bold text-blue-400 mb-2 uppercase tracking-wider">
                        Optical Bloom
                      </h4>
                      <Slider
                        label="Strength"
                        value={settings.bloom || 0}
                        min={0}
                        max={1}
                        onChange={(v) => updateSetting("bloom", v)}
                        icon={<IconBulb className="intaglio-icon"/>}
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
                          icon={<IconBulb className="intaglio-icon"/>}
                        />
                        <Slider
                          label="Radius"
                          value={settings.bloomRadius || 1.0}
                          min={0}
                          max={3}
                          onChange={(v: number) =>
                            updateSetting("bloomRadius", v)
                          }
                          icon={<IconBulb className="intaglio-icon"/>}
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
                        icon={<IconPhoto className="intaglio-icon"/>}
                      />
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] font-mono tracking-widest font-medium text-white/60">
                          Film Border
                        </span>
                        <div role="button"
                          onClick={() =>
                            updateSetting("filmBorder", !settings.filmBorder)
                          }
                          className={`w-10 h-5 rounded-full relative transition ${settings.filmBorder ? "bg-orange-500" : "bg-gray-700"}`}
                        >
                          <div
                            className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.filmBorder ? "left-6" : "left-1"}`}
                          />
                        </div>
                      </div>
                    </ControlGroup>
                  </div>
                )}

                {activeTab === "masking" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <PlateStackPanel
                      settings={settings}
                      updateSetting={updateSetting}
                      activePlateId={activePlateId}
                      setActivePlateId={setActivePlateId}
                    />
                  </div>
                )}

                {activeTab === "metadata" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <ControlGroup title="Culling">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-mono text-[11px] font-medium tracking-[0.28em] text-white/50">
                            Rating
                          </span>
                          <span className="font-mono text-[11px] font-medium tracking-[0.28em] text-amber-300/70">
                            {assetMetadata.rating > 0
                              ? `${assetMetadata.rating}/5`
                              : "Clear"}
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                          {[0, 1, 2, 3, 4, 5].map((rating) => (
                            <div role="button"
                              key={rating}
                              onClick={() =>
                                setAssetMetadata((prev) => ({
                                  ...prev,
                                  rating,
                                }))
                              }
                              className={`h-10 border font-mono text-xs font-medium tracking-[0.16em] transition ${
                                assetMetadata.rating === rating
                                  ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
                                  : "border-white/5 bg-white/[0.03] text-white/40 hover:border-white/25 hover:text-white/75"
                              }`}
                            >
                              {rating === 0 ? "0" : rating}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4">
                        <div className="mb-2 font-mono text-[11px] font-medium tracking-[0.28em] text-white/50">
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
                            <div role="button"
                              key={flag}
                              onClick={() =>
                                setAssetMetadata((prev) => ({
                                  ...prev,
                                  flagStatus: flag,
                                }))
                              }
                              className={`border px-2 py-2.5 font-mono text-[11px] font-medium tracking-[0.2em] transition ${
                                assetMetadata.flagStatus === flag
                                  ? flag === "picked"
                                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                                    : flag === "rejected"
                                      ? "border-red-400/50 bg-red-400/10 text-red-200"
                                      : "border-white/30 bg-white/10 text-white"
                                  : "border-white/5 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/70"
                              }`}
                            >
                              {label}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4">
                        <div className="mb-2 font-mono text-[11px] font-medium tracking-[0.28em] text-white/50">
                          Color Label
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {COLOR_LABELS.map((label) => (
                            <div role="button"
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
                                  : "border-white/5 bg-white/[0.03] hover:border-white/30"
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
                            </div>
                          ))}
                        </div>
                      </div>
                    </ControlGroup>

                    <ControlGroup title="Metadata">
                      <div className="space-y-4">
                        <label className="block">
                          <span className="mb-2 block font-mono text-[11px] font-medium tracking-[0.28em] text-white/50">
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
                            className="w-full border border-white/5 bg-[#0a0908] px-3 py-2 text-[10px] font-mono tracking-widest text-[var(--intaglio-paper)] outline-none transition placeholder:text-white/30 focus:border-[var(--intaglio-brass)] focus:bg-white/5"
                            placeholder="Untitled"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block font-mono text-[11px] font-medium tracking-[0.28em] text-white/50">
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
                            className="w-full resize-none border border-white/5 bg-[#0a0908] px-3 py-2 text-[10px] font-mono tracking-widest leading-relaxed text-[var(--intaglio-paper)] outline-none transition placeholder:text-white/30 focus:border-[var(--intaglio-brass)] focus:bg-white/5"
                            placeholder="Delivery note or image caption"
                          />
                        </label>

                        <div className="grid grid-cols-1 gap-3">
                          <label className="block">
                            <span className="mb-2 block font-mono text-[11px] font-medium tracking-[0.28em] text-white/50">
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
                              className="w-full border border-white/5 bg-[#0a0908] px-3 py-2 text-[10px] font-mono tracking-widest text-[var(--intaglio-paper)] outline-none transition placeholder:text-white/30 focus:border-[var(--intaglio-brass)] focus:bg-white/5"
                              placeholder="Creator or studio"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-2 block font-mono text-[11px] font-medium tracking-[0.28em] text-white/50">
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
                              className="w-full border border-white/5 bg-[#0a0908] px-3 py-2 text-[10px] font-mono tracking-widest text-[var(--intaglio-paper)] outline-none transition placeholder:text-white/30 focus:border-[var(--intaglio-brass)] focus:bg-white/5"
                              placeholder="All rights reserved"
                            />
                          </label>
                        </div>

                        <label className="block">
                          <span className="mb-2 block font-mono text-[11px] font-medium tracking-[0.28em] text-white/50">
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
                            className="w-full border border-white/5 bg-[#0a0908] px-3 py-2 text-[10px] font-mono tracking-widest text-[var(--intaglio-paper)] outline-none transition placeholder:text-white/30 focus:border-[var(--intaglio-brass)] focus:bg-white/5"
                            placeholder="portrait, editorial, delivery"
                          />
                        </label>
                      </div>
                    </ControlGroup>

                    <ControlGroup title="Watermark">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono tracking-widest font-medium text-white/60">
                          Enable delivery mark
                        </span>
                        <div role="button"
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
                        </div>
                      </div>

                      <label className="block pt-2">
                        <span className="mb-2 block font-mono text-[11px] font-medium tracking-[0.28em] text-white/50">
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
                          className="w-full border border-white/5 bg-[#0a0908] px-3 py-2 text-[10px] font-mono tracking-widest text-[var(--intaglio-paper)] outline-none transition placeholder:text-white/30 focus:border-[var(--intaglio-brass)] focus:bg-white/5"
                          placeholder="PROOF"
                        />
                      </label>

                      <div className="pt-2">
                        <div className="mb-2 font-mono text-[11px] font-medium tracking-[0.28em] text-white/50">
                          Position
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {WATERMARK_POSITIONS.map((position) => (
                            <div role="button"
                              key={position.id}
                              onClick={() =>
                                setWatermark((prev) => ({
                                  ...prev,
                                  position: position.id,
                                }))
                              }
                              className={`border px-2 py-2.5 text-left font-mono text-[11px] font-medium tracking-[0.18em] transition ${
                                watermark.position === position.id
                                  ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                                  : "border-white/5 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/70"
                              }`}
                            >
                              {position.label}
                            </div>
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
                          icon={<IconEye className="intaglio-icon"/>}
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
                          icon={<IconTypography className="intaglio-icon"/>}
                        />
                      </div>
                    </ControlGroup>
                  </div>
                )}

                {activeTab === "text" && (
                  <CinematicTextControls
                    textOverlay={textOverlay}
                    setTextOverlay={setTextOverlay}
                    onFontUpload={handleFontUpload}
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
                        icon={<IconRotateClockwise className="intaglio-icon"/>}
                      />
                      <Slider
                        label="Zoom"
                        value={settings.zoom}
                        min={1}
                        max={3}
                        onChange={(v) => updateSetting("zoom", v)}
                        icon={<IconZoomIn className="intaglio-icon"/>}
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
                        icon={<IconDeviceDesktop className="intaglio-icon"/>}
                        bipolar
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Slider
                          label="Keystone H"
                          value={settings.keystoneH}
                          min={-0.5}
                          max={0.5}
                          onChange={(v) => updateSetting("keystoneH", v)}
                          icon={<IconPerspective className="intaglio-icon"/>}
                          bipolar
                        />
                        <Slider
                          label="Keystone V"
                          value={settings.keystoneV}
                          min={-0.5}
                          max={0.5}
                          onChange={(v) => updateSetting("keystoneV", v)}
                          icon={<IconPerspective className="intaglio-icon"/>}
                          bipolar
                        />
                      </div>

                      <div className="pt-4 mt-2 border-t border-white/5">
                        <p className="text-[11px] font-medium text-white/50 mb-3">
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
                          icon={<IconDroplet className="intaglio-icon"/>}
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
                              icon={<IconArrowsMaximize className="intaglio-icon"/>}
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
                              icon={<IconRotateClockwise className="intaglio-icon"/>}
                            />
                          </>
                        )}
                      </div>
                    </ControlGroup>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="hidden border-t border-white/5 bg-transparent p-4 md:block md:space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setIsPresetModalOpen(true)}
                    className="flex cursor-pointer items-center justify-center gap-2 py-2 bg-white/5 hover:bg-[var(--intaglio-brass)] hover:text-[#0d0c0a] text-[11px] font-medium font-medium transition-colors border border-white/5 hover:border-[var(--intaglio-brass)] text-[var(--intaglio-paper)]"
                  >
                    <IconDeviceFloppy className="intaglio-icon"/> Create .{FORMAT.recipeExtension}
                  </div>
                  <label className="flex items-center justify-center gap-2 py-2 bg-transparent hover:bg-white/5 text-[11px] font-medium font-medium transition-colors border border-white/5 cursor-pointer text-white/50 hover:text-[var(--intaglio-paper)]">
                    <IconFileCode className="intaglio-icon"/> Load .{FORMAT.recipeExtension}
                    <input
                      type="file"
                      accept={`.${FORMAT.recipeExtension},${FORMAT.recipeMimeType}`}
                      onChange={handleLoadPreset}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={handleCopySettings}
                    className="flex cursor-pointer items-center justify-center gap-2 py-2 bg-transparent hover:bg-white/5 text-[11px] font-medium font-medium transition-colors border border-white/5 text-white/50 hover:text-[var(--intaglio-paper)]"
                  >
                    Copy
                  </div>
                  <div
                    onClick={handlePasteSettings}
                    className={`flex cursor-pointer items-center justify-center gap-2 py-2 text-[11px] font-medium font-medium transition-colors border border-white/5 ${clipboard ? "bg-transparent hover:bg-white/5 text-white/50 hover:text-[var(--intaglio-paper)]" : "bg-[#0a0908] text-gray-700 cursor-not-allowed border-gray-800"}`}
                  >
                    Paste
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        onSave={(presetData) => void handleSaveRecipe(presetData)}
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
          void handleApplyGeneratedLut({
            size: Math.round(Math.cbrt(lutData.length / 3)),
            values: Float32Array.from(lutData),
            domainMin: [0, 0, 0],
            domainMax: [1, 1, 1],
            title: "Custom LUT",
          });
        }}
      />

      

      {/* Histogram Help Modal */}
      {isHistogramHelpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-8 max-w-md relative shadow-2xl">
            <div role="button"
              onClick={() => setIsHistogramHelpOpen(false)}
              className="absolute top-4 right-4 text-white/30 hover:text-white"
            >
              <IconX className="intaglio-icon"/>
            </div>
            <h3 className="font-mono text-lg uppercase tracking-widest text-amber-500 mb-6 flex items-center gap-3">
              <IconChartLine className="intaglio-icon"/> Reading the Histogram
            </h3>
            <div className="space-y-4 text-sm font-light text-[rgba(231,223,208,0.72)] leading-relaxed">
              <p>
                The histogram shows the distribution of exposure in your image
                from shadows (left) to highlights (right).
              </p>
              <div className="grid grid-cols-3 gap-2 text-center intaglio-label text-white/40 my-4">
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

              <div className="mt-6 border-t border-white/5 pt-4">
                <h4 className="font-mono text-xs font-medium text-amber-500 mb-2">
                  In Plain English
                </h4>
                <p className="text-sm font-light text-white/60">
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



      {/* Edit Diff Modal */}
      {diffVirtualCopy && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden border border-white/5 bg-[#151515] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/5 p-6">
              <div>
                <div className="font-mono text-[9px] font-mono tracking-widest intaglio-label text-cyan-300/70">
                  Edit Diff
                </div>
                <h3 className="mt-2 text-xl font-light text-white">
                  Current Edit vs {diffVirtualCopy.name}
                </h3>
              </div>
              <div role="button"
                onClick={() => setDiffVirtualCopyId(null)}
                className="border border-white/5 bg-[var(--intaglio-panel-soft)] p-2 text-white/50 transition hover:border-white/25 hover:text-white"
              >
                <IconX className="intaglio-icon"/>
              </div>
            </div>

            <div className="custom-scrollbar overflow-y-auto p-6">
              {editDiffs.length > 0 ? (
                <div className="space-y-2">
                  {editDiffs.map((diff) => (
                    <div
                      key={diff.key}
                      className="grid grid-cols-1 gap-3 border border-white/5 bg-[var(--intaglio-panel-soft)] p-4 md:grid-cols-3"
                    >
                      <div>
                        <div className="font-mono text-[11px] font-medium tracking-[0.28em] text-white/30">
                          Setting
                        </div>
                        <div className="mt-1 text-sm text-white/75">
                          {diff.label}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[11px] font-medium tracking-[0.28em] text-amber-300/70">
                          Current
                        </div>
                        <div className="mt-1 break-words text-sm text-white/70">
                          {diff.current}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[11px] font-medium tracking-[0.28em] text-cyan-300/70">
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
                <div className="border border-white/5 bg-[var(--intaglio-panel-soft)] p-8 text-center">
                  <div className="font-mono text-[11px] font-medium tracking-[0.3em] text-white/50">
                    No Differences
                  </div>
                  <p className="mt-3 text-sm text-white/60">
                    The current recipe matches this virtual copy.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-white/5 bg-[var(--intaglio-panel-soft)] p-6">
              <div role="button"
                onClick={() => setDiffVirtualCopyId(null)}
                className="flex-1 border border-white/5 bg-black/40 py-3 font-mono text-xs font-medium text-white/60 transition hover:border-white/25 hover:text-white"
              >
                Close
              </div>
              <div role="button"
                onClick={() => {
                  handleRestoreVirtualCopy(diffVirtualCopy.id);
                  setDiffVirtualCopyId(null);
                }}
                className="flex-[2] border border-cyan-300/40 bg-cyan-300 py-3 font-mono text-[10px] font-mono tracking-widest font-bold uppercase tracking-widest text-black transition hover:bg-cyan-200"
              >
                Restore This Copy
              </div>
            </div>
          </div>
        </div>
      )}

      
    </>
  );
}
