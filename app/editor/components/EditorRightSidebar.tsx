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
import * as THREE from "three";
import VideoGradingPanel from "../../components/VideoGradingPanel";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLOR_LABELS, WATERMARK_POSITIONS, DEFAULT_ASSET_METADATA, DEFAULT_WATERMARK, getImageFileInfo, EXPORT_RECIPES } from "../pageTypes";
import { getEditorModuleLabel } from '../pageTypes';
import { TutorialTrigger } from '../../components/TutorialModal';
import { useEditorState } from '../hooks/useEditorState';
import { IconUpload, IconMovie, IconPhoto, IconEye, IconDeviceFloppy, IconDownload, IconAdjustmentsHorizontal, IconHistory, IconLayersIntersect, IconInfoCircle, IconX, IconCircle, IconChartLine, IconTypography, IconArrowsMaximize, IconSparkles, IconCamera, IconRotateClockwise, IconZoomIn, IconSun, IconContrast, IconPalette, IconAperture, IconBolt, IconBulb, IconMapPin, IconDeviceDesktop, IconPerspective, IconDroplet, IconChevronRight, IconFileCode, IconCircles, IconMoon, IconCircleFilled, IconChevronLeft } from "@tabler/icons-react";
import Slider from "../../components/Slider";
import ControlGroup from "../../components/ControlGroup";

export function EditorRightSidebar() {
  const editorState = useEditorState();
  const {
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
    brushMaskData, setBrushMaskData,
    brushMaskExposure, setBrushMaskExposure,
    brushMaskContrast, setBrushMaskContrast,
    brushMaskSaturation, setBrushMaskSaturation,
    brushMaskTemperature, setBrushMaskTemperature,
    brushMaskClarity, setBrushMaskClarity,
    isVideoGradingOpen, setIsVideoGradingOpen,
    videoSrc, setVideoSrc,
    updateSetting,
    updateSettings,
    handleUndo,
    handleRedo,
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
    handleCompareSnapshot,
    handleDeleteVirtualCopy,
    handleTakeSnapshot,
    handleRestoreVirtualCopy,
    handleJumpToHistory,
    handleClearHistory,
    handleLoadPreset,
    fileInputRef,
    lutInputRef,
    appCommands,
    compareEnabled,
    compareSplit,
    setCompareSplit,
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
  } = editorState;
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
            <IconChevronRight size={14} />
          ) : (
            <IconChevronLeft size={14} />
          )}
        </div>
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
                className="custom-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto border-b border-white/5 bg-[rgba(20,19,15,0.8)] px-3 py-3 md:hidden backdrop-blur-md"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {[
                  { id: "basic", icon: <IconSun size={16} /> },
                  { id: "color", icon: <IconPalette size={16} /> },
                  { id: "curves", icon: <IconChartLine size={16} /> },
                  { id: "grading", icon: <IconCircles size={16} /> },
                  { id: "hsl", icon: <IconCircle size={16} /> },
                  { id: "films", icon: <IconMovie size={16} /> },
                  { id: "effects", icon: <IconSparkles size={16} /> },
                  { id: "masking", icon: <IconLayersIntersect size={16} /> },
                  { id: "text", icon: <IconTypography size={16} /> },
                  { id: "metadata", icon: <IconInfoCircle size={16} /> },
                  { id: "transform", icon: <IconArrowsMaximize size={16} /> },
                  { id: "history", icon: <IconHistory size={16} /> },
                  { id: "snapshots", icon: <IconCamera size={16} /> },
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
                          : "text-[rgba(231,223,208,0.4)] hover:bg-[rgba(231,223,208,0.05)] active:scale-95"
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
                  <div className="border border-white/5 px-2.5 py-1 text-[9px] font-mono font-medium uppercase tracking-widest text-[rgba(231,223,208,0.4)]">
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
                      <div role="button"
                        onClick={handleTakeSnapshot}
                        className="w-full py-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded font-mono text-xs font-medium hover:bg-green-500/20 transition flex items-center justify-center gap-2"
                      >
                        <IconCamera size={14} />
                        Take Snapshot
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {snapshots.map((snap: any) => (
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
                                <IconAdjustmentsHorizontal size={14} />
                              </div>
                              <div role="button"
                                onClick={() => {
                                  setSnapshots((prev: any) =>
                                    prev.filter((s: any) => s.id !== snap.id)
                                  );
                                  // Disable compare if deleting current?
                                }}
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
                                  : "bg-black/40 text-[rgba(231,223,208,0.38)] border-white/5 hover:bg-[rgba(231,223,208,0.045)]"
                              }`}
                            >
                              {channel}
                            </div>
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
                        <div role="button"
                          onClick={() =>
                            setRoiMode(roiMode === "source" ? "none" : "source")
                          }
                          className={`flex-1 py-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${roiMode === "source" ? "bg-amber-500 text-black border-amber-500" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}`}
                        >
                          <IconMapPin size={16} />
                          <span className="text-[9px] font-mono tracking-widest font-mono uppercase tracking-wider">
                            Select Region
                          </span>
                        </div>

                        {/* Steal Button */}
                        <label
                          className={`flex-[2] flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-900 to-blue-900 hover:from-purple-800 hover:to-blue-800 text-xs font-medium font-medium rounded-lg transition border border-white/20 cursor-pointer shadow-lg`}
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
                          <span className="text-[9px] font-mono tracking-widest text-amber-500 font-mono uppercase">
                            Region Active
                          </span>
                          <div role="button"
                            onClick={() => setSourceROI(null)}
                            className="text-white/40 hover:text-white"
                          >
                            <IconX size={12} />
                          </div>
                        </div>
                      )}

                      <p className="text-[9px] font-mono tracking-widest text-[rgba(231,223,208,0.38)] italic text-center">
                        Select a region of your image (optional) and upload a
                        reference to borrow its color balance.
                      </p>
                    </ControlGroup>

                    <ControlGroup title="LUT Cabinet">
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <label className="flex items-center justify-center gap-2 py-3 bg-[rgba(231,223,208,0.045)] hover:bg-white/10 text-xs font-medium font-medium rounded-lg transition border border-white/5 cursor-pointer">
                          <IconUpload size={14} /> Upload
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
                          <IconPalette size={14} /> Create
                        </div>
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
                        icon={<IconPalette size={14} />}
                      />
                    </ControlGroup>
                  </div>
                )}

                {/* HSL Panel Tab */}
                {activeTab === "hsl" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <p className="text-[11px] font-medium text-gray-600 text-center mb-2">
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
                      <p className="text-[9px] font-mono tracking-widest text-[rgba(231,223,208,0.38)] mb-4 text-center">
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
                              <h4 className={`text-[11px] font-medium ${isIntaglio ? "text-[var(--intaglio-brass)] font-bold" : "text-[rgba(231,223,208,0.58)] font-bold"}`}>
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
                                        <span className="text-[8px] text-[rgba(231,223,208,0.3)]">✕</span>
                                      </div>
                                      <span className="text-[10px] font-mono tracking-widest text-[rgba(231,223,208,0.5)]">NONE — ORIGINAL</span>
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
                                          <span className="text-[7px] font-mono tracking-widest text-[rgba(231,223,208,0.3)] uppercase">
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
                      <h4 className="text-[9px] font-mono tracking-widest font-bold text-red-400 mb-2 uppercase tracking-wider">
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

                      <h4 className="text-[9px] font-mono tracking-widest font-bold text-blue-400 mb-2 uppercase tracking-wider">
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
                        <span className="text-[10px] font-mono tracking-widest font-medium text-[rgba(231,223,208,0.58)]">
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
                    {/* BRUSH MASK - Lightroom Style */}
                    <ControlGroup title="Brush Mask (Paint to Select)">
                      <div className="flex gap-2 mb-4">
                        <div role="button"
                          onClick={() => {
                            setBrushMaskActive(!brushMaskActive);
                            setBrushErasing(false);
                          }}
                          className={`flex-1 py-3 text-[11px] font-medium font-medium rounded-lg transition border flex items-center justify-center gap-2 ${
                            brushMaskActive && !brushErasing
                              ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                              : "bg-white/5 border-white/10 text-[rgba(231,223,208,0.38)] hover:text-[rgba(231,223,208,0.72)]"
                          }`}
                        >
                          🖌️ Brush
                        </div>
                        <div role="button"
                          onClick={() => {
                            setBrushMaskActive(true);
                            setBrushErasing(true);
                          }}
                          className={`flex-1 py-3 text-[11px] font-medium font-medium rounded-lg transition border flex items-center justify-center gap-2 ${
                            brushMaskActive && brushErasing
                              ? "bg-red-500/20 border-red-500/50 text-red-400"
                              : "bg-white/5 border-white/10 text-[rgba(231,223,208,0.38)] hover:text-[rgba(231,223,208,0.72)]"
                          }`}
                        >
                          🧹 Eraser
                        </div>
                      </div>

                      {brushMaskActive && (
                        <p className="text-[9px] font-mono tracking-widest text-cyan-400/80 italic mb-4 text-center">
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

                      <div role="button"
                        onClick={() => {
                          window.__brushMaskClear?.();
                          setBrushMaskData("");
                        }}
                        className="w-full py-2 text-[11px] font-medium bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition mt-2"
                      >
                        Clear Mask
                      </div>

                      {brushMaskData && (
                        <div className="pt-3 border-t border-white/5 mt-3">
                          <p className="text-[11px] font-medium text-white/50 mb-3">
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

                    <div className="border-t border-white/5 pt-4">
                      <p className="text-[11px] font-medium text-gray-600 mb-4 text-center">
                        — Parametric Masks —
                      </p>
                    </div>

                    <ControlGroup title="Radial Gradient Mask">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-mono tracking-widest font-medium text-[rgba(231,223,208,0.58)]">
                          Enable
                        </span>
                        <div role="button"
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
                        </div>
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
                        <span className="text-[10px] font-mono tracking-widest font-medium text-[rgba(231,223,208,0.58)]">
                          Invert Mask
                        </span>
                        <div role="button"
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
                        </div>
                      </div>
                      <div className="pt-2 border-t border-white/5 mt-2">
                        <p className="text-[11px] font-medium text-white/50 mb-3">
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
                        <span className="text-[10px] font-mono tracking-widest font-medium text-[rgba(231,223,208,0.58)]">
                          Enable
                        </span>
                        <div role="button"
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
                        </div>
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
                        <p className="text-[11px] font-medium text-white/50 mb-3">
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
                        <span className="text-[10px] font-mono tracking-widest font-medium text-[rgba(231,223,208,0.58)]">
                          Enable
                        </span>
                        <div role="button"
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
                        </div>
                      </div>
                      <div className="flex justify-between mb-3">
                        <div role="button"
                          onClick={() =>
                            updateSetting("luminosityMaskTarget", 0.2)
                          }
                          className={`flex-1 py-2 mx-1 text-[11px] font-medium rounded ${settings.luminosityMaskTarget < 0.35 ? "bg-gray-800 border border-amber-500/50 text-amber-400" : "bg-gray-800/50 border border-white/5 text-[rgba(231,223,208,0.38)]"}`}
                        >
                          Shadows
                        </div>
                        <div role="button"
                          onClick={() =>
                            updateSetting("luminosityMaskTarget", 0.5)
                          }
                          className={`flex-1 py-2 mx-1 text-[11px] font-medium rounded ${settings.luminosityMaskTarget >= 0.35 && settings.luminosityMaskTarget <= 0.65 ? "bg-gray-600 border border-amber-500/50 text-amber-400" : "bg-gray-600/50 border border-white/5 text-[rgba(231,223,208,0.38)]"}`}
                        >
                          Mids
                        </div>
                        <div role="button"
                          onClick={() =>
                            updateSetting("luminosityMaskTarget", 0.8)
                          }
                          className={`flex-1 py-2 mx-1 text-[11px] font-medium rounded ${settings.luminosityMaskTarget > 0.65 ? "bg-gray-400 border border-amber-500/50 text-amber-900" : "bg-gray-400/50 border border-white/5 text-gray-600"}`}
                        >
                          Highlights
                        </div>
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
                        <p className="text-[11px] font-medium text-white/50 mb-3">
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
                          <span className="font-mono text-[11px] font-medium tracking-[0.28em] text-[rgba(231,223,208,0.48)]">
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
                                setAssetMetadata((prev: any) => ({
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
                        <div className="mb-2 font-mono text-[11px] font-medium tracking-[0.28em] text-[rgba(231,223,208,0.48)]">
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
                                setAssetMetadata((prev: any) => ({
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
                                  : "border-white/5 bg-white/[0.03] text-[rgba(231,223,208,0.48)] hover:border-white/25 hover:text-white/70"
                              }`}
                            >
                              {label}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4">
                        <div className="mb-2 font-mono text-[11px] font-medium tracking-[0.28em] text-[rgba(231,223,208,0.48)]">
                          Color Label
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {COLOR_LABELS.map((label) => (
                            <div role="button"
                              key={label.id}
                              onClick={() =>
                                setAssetMetadata((prev: any) => ({
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
                          <span className="mb-2 block font-mono text-[11px] font-medium tracking-[0.28em] text-[rgba(231,223,208,0.48)]">
                            Title
                          </span>
                          <input
                            value={assetMetadata.title}
                            onChange={(event) =>
                              setAssetMetadata((prev: any) => ({
                                ...prev,
                                title: event.target.value,
                              }))
                            }
                            className="w-full border border-white/5 bg-[#0a0908] px-3 py-2 text-[10px] font-mono tracking-widest text-[var(--intaglio-paper)] outline-none transition placeholder:text-[rgba(231,223,208,0.3)] focus:border-[var(--intaglio-brass)] focus:bg-white/5"
                            placeholder="Untitled"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block font-mono text-[11px] font-medium tracking-[0.28em] text-[rgba(231,223,208,0.48)]">
                            Caption
                          </span>
                          <textarea
                            value={assetMetadata.caption}
                            onChange={(event) =>
                              setAssetMetadata((prev: any) => ({
                                ...prev,
                                caption: event.target.value,
                              }))
                            }
                            rows={3}
                            className="w-full resize-none border border-white/5 bg-[#0a0908] px-3 py-2 text-[10px] font-mono tracking-widest leading-relaxed text-[var(--intaglio-paper)] outline-none transition placeholder:text-[rgba(231,223,208,0.3)] focus:border-[var(--intaglio-brass)] focus:bg-white/5"
                            placeholder="Delivery note or image caption"
                          />
                        </label>

                        <div className="grid grid-cols-1 gap-3">
                          <label className="block">
                            <span className="mb-2 block font-mono text-[11px] font-medium tracking-[0.28em] text-[rgba(231,223,208,0.48)]">
                              Creator
                            </span>
                            <input
                              value={assetMetadata.creator}
                              onChange={(event) =>
                                setAssetMetadata((prev: any) => ({
                                  ...prev,
                                  creator: event.target.value,
                                }))
                              }
                              className="w-full border border-white/5 bg-[#0a0908] px-3 py-2 text-[10px] font-mono tracking-widest text-[var(--intaglio-paper)] outline-none transition placeholder:text-[rgba(231,223,208,0.3)] focus:border-[var(--intaglio-brass)] focus:bg-white/5"
                              placeholder="Creator or studio"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-2 block font-mono text-[11px] font-medium tracking-[0.28em] text-[rgba(231,223,208,0.48)]">
                              Copyright
                            </span>
                            <input
                              value={assetMetadata.copyright}
                              onChange={(event) =>
                                setAssetMetadata((prev: any) => ({
                                  ...prev,
                                  copyright: event.target.value,
                                }))
                              }
                              className="w-full border border-white/5 bg-[#0a0908] px-3 py-2 text-[10px] font-mono tracking-widest text-[var(--intaglio-paper)] outline-none transition placeholder:text-[rgba(231,223,208,0.3)] focus:border-[var(--intaglio-brass)] focus:bg-white/5"
                              placeholder="All rights reserved"
                            />
                          </label>
                        </div>

                        <label className="block">
                          <span className="mb-2 block font-mono text-[11px] font-medium tracking-[0.28em] text-[rgba(231,223,208,0.48)]">
                            Keywords
                          </span>
                          <input
                            value={assetMetadata.keywords}
                            onChange={(event) =>
                              setAssetMetadata((prev: any) => ({
                                ...prev,
                                keywords: event.target.value,
                              }))
                            }
                            className="w-full border border-white/5 bg-[#0a0908] px-3 py-2 text-[10px] font-mono tracking-widest text-[var(--intaglio-paper)] outline-none transition placeholder:text-[rgba(231,223,208,0.3)] focus:border-[var(--intaglio-brass)] focus:bg-white/5"
                            placeholder="portrait, editorial, delivery"
                          />
                        </label>
                      </div>
                    </ControlGroup>

                    <ControlGroup title="Watermark">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono tracking-widest font-medium text-[rgba(231,223,208,0.58)]">
                          Enable delivery mark
                        </span>
                        <div role="button"
                          onClick={() =>
                            setWatermark((prev: any) => ({
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
                        <span className="mb-2 block font-mono text-[11px] font-medium tracking-[0.28em] text-[rgba(231,223,208,0.48)]">
                          Text
                        </span>
                        <input
                          value={watermark.text}
                          onChange={(event) =>
                            setWatermark((prev: any) => ({
                              ...prev,
                              text: event.target.value,
                            }))
                          }
                          className="w-full border border-white/5 bg-[#0a0908] px-3 py-2 text-[10px] font-mono tracking-widest text-[var(--intaglio-paper)] outline-none transition placeholder:text-[rgba(231,223,208,0.3)] focus:border-[var(--intaglio-brass)] focus:bg-white/5"
                          placeholder="PROOF"
                        />
                      </label>

                      <div className="pt-2">
                        <div className="mb-2 font-mono text-[11px] font-medium tracking-[0.28em] text-[rgba(231,223,208,0.48)]">
                          Position
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {WATERMARK_POSITIONS.map((position) => (
                            <div role="button"
                              key={position.id}
                              onClick={() =>
                                setWatermark((prev: any) => ({
                                  ...prev,
                                  position: position.id,
                                }))
                              }
                              className={`border px-2 py-2.5 text-left font-mono text-[11px] font-medium tracking-[0.18em] transition ${
                                watermark.position === position.id
                                  ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                                  : "border-white/5 bg-white/[0.03] text-[rgba(231,223,208,0.48)] hover:border-white/25 hover:text-white/70"
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
                            setWatermark((prev: any) => ({
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
                            setWatermark((prev: any) => ({
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
              <div className="hidden border-t border-white/5 bg-transparent p-4 md:block md:space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setIsPresetModalOpen(true)}
                    className="flex cursor-pointer items-center justify-center gap-2 py-2 bg-white/5 hover:bg-[var(--intaglio-brass)] hover:text-[#0d0c0a] text-[11px] font-medium font-medium transition-colors border border-white/5 hover:border-[var(--intaglio-brass)] text-[var(--intaglio-paper)]"
                  >
                    <IconDeviceFloppy size={12} /> Create .{FORMAT.recipeExtension}
                  </div>
                  <label className="flex items-center justify-center gap-2 py-2 bg-transparent hover:bg-white/5 text-[11px] font-medium font-medium transition-colors border border-white/5 cursor-pointer text-[rgba(231,223,208,0.5)] hover:text-[var(--intaglio-paper)]">
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
                  <div
                    onClick={handleCopySettings}
                    className="flex cursor-pointer items-center justify-center gap-2 py-2 bg-transparent hover:bg-white/5 text-[11px] font-medium font-medium transition-colors border border-white/5 text-[rgba(231,223,208,0.5)] hover:text-[var(--intaglio-paper)]"
                  >
                    Copy
                  </div>
                  <div
                    onClick={handlePasteSettings}
                    className={`flex cursor-pointer items-center justify-center gap-2 py-2 text-[11px] font-medium font-medium transition-colors border border-white/5 ${clipboard ? "bg-transparent hover:bg-white/5 text-[rgba(231,223,208,0.5)] hover:text-[var(--intaglio-paper)]" : "bg-[#0a0908] text-gray-700 cursor-not-allowed border-gray-800"}`}
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
      

      {/* Histogram Help Modal */}
      {isHistogramHelpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-8 max-w-md relative shadow-2xl">
            <div role="button"
              onClick={() => setIsHistogramHelpOpen(false)}
              className="absolute top-4 right-4 text-white/30 hover:text-white"
            >
              <IconX size={18} />
            </div>
            <h3 className="font-mono text-lg uppercase tracking-widest text-amber-500 mb-6 flex items-center gap-3">
              <IconChartLine /> Reading the Histogram
            </h3>
            <div className="space-y-4 text-sm font-light text-[rgba(231,223,208,0.72)] leading-relaxed">
              <p>
                The histogram shows the distribution of exposure in your image
                from shadows (left) to highlights (right).
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-mono tracking-widest font-mono uppercase tracking-wider text-white/40 my-4">
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
                <p className="text-sm font-light text-[rgba(231,223,208,0.58)]">
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
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-white/5 bg-[#151515] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/5 p-6">
              <div>
                <div className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.28em] text-amber-300/70">
                  <IconDownload size={15} /> Delivery
                </div>
                <h3 className="mt-2 text-xl font-light text-white">
                  Export Image
                </h3>
              </div>
              <div role="button"
                onClick={() => setIsExportModalOpen(false)}
                className="border border-white/5 bg-[var(--intaglio-panel-soft)] p-2 text-[rgba(231,223,208,0.48)] transition hover:border-white/25 hover:text-white"
              >
                <IconX size={18} />
              </div>
            </div>

            <div className="custom-scrollbar space-y-6 overflow-y-auto p-6">
              {/* Recipes */}
              <div className="space-y-3">
                <label className="text-[9px] font-mono tracking-widest font-mono uppercase tracking-widest text-white/40">
                  Export Recipes
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXPORT_RECIPES.map((recipe) => (
                    <div role="button"
                      key={recipe.id}
                      onClick={() => applyExportRecipe(recipe)}
                      className={`border p-3 text-left transition-all ${activeExportRecipeId === recipe.id ? "border-amber-500/60 bg-amber-500/10" : "border-white/5 bg-[var(--intaglio-panel-soft)] hover:border-white/25"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-mono tracking-widest font-mono uppercase tracking-[0.22em] text-white/80">
                          {recipe.name}
                        </span>
                        <span className="shrink-0 text-[9px] font-mono tracking-widest font-mono text-amber-400/80">
                          {recipe.format.split("/")[1].toUpperCase()} •{" "}
                          {recipe.scale}x
                        </span>
                      </div>
                      <p className="mt-2 text-[10px] font-mono tracking-widest leading-5 text-[rgba(231,223,208,0.58)]">
                        {recipe.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div className="space-y-3">
                <label className="text-[9px] font-mono tracking-widest font-mono uppercase tracking-widest text-white/40">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["image/jpeg", "image/png", "image/webp"] as const).map(
                    (fmt) => (
                      <div role="button"
                        key={fmt}
                        onClick={() => {
                          setActiveExportRecipeId(null);
                          setExportFormat(fmt);
                        }}
                        className={`border p-3 text-center transition-all ${exportFormat === fmt ? "border-white bg-white text-black" : "border-white/5 bg-[var(--intaglio-panel-soft)] text-white/60 hover:border-white/25"}`}
                      >
                        <div className="font-bold text-sm">
                          {fmt
                            .split("/")[1]
                            .toUpperCase()
                            .replace("JPEG", "JPG")}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Quality */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-[9px] font-mono tracking-widest font-mono uppercase tracking-widest text-white/40">
                    Quality
                  </label>
                  <span className="text-[9px] font-mono tracking-widest font-mono text-amber-500">
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
                <label className="text-[9px] font-mono tracking-widest font-mono uppercase tracking-widest text-white/40">
                  Scale factor
                </label>
                <div className="flex gap-2">
                  {[0.5, 1, 2, 4].map((scale) => (
                    <div role="button"
                      key={scale}
                      onClick={() => {
                        setActiveExportRecipeId(null);
                        setExportScale(scale);
                      }}
                      className={`flex-1 border p-2 font-mono text-[10px] font-mono tracking-widest transition-all ${exportScale === scale ? "border-amber-400/60 bg-amber-400/15 text-amber-200" : "border-white/5 bg-[var(--intaglio-panel-soft)] text-white/50 hover:border-white/25"}`}
                    >
                      {scale}x
                    </div>
                  ))}
                </div>
              </div>

              {exportSafetyWarnings.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[9px] font-mono tracking-widest font-mono uppercase tracking-widest text-white/40">
                    Export Safety
                  </label>
                  <div className="space-y-2">
                    {exportSafetyWarnings.map((warning: any) => (
                      <div
                        key={`${warning.title}-${warning.detail}`}
                        className={`border p-3 ${
                          warning.tone === "warn"
                            ? "border-amber-500/25 bg-amber-500/[0.06]"
                            : "border-cyan-500/20 bg-cyan-500/[0.04]"
                        }`}
                      >
                        <div
                          className={`font-mono text-[11px] font-medium tracking-[0.24em] ${
                            warning.tone === "warn"
                              ? "text-amber-300"
                              : "text-cyan-300"
                          }`}
                        >
                          {warning.title}
                        </div>
                        <p className="mt-1 text-[10px] font-mono tracking-widest leading-5 text-[rgba(231,223,208,0.58)]">
                          {warning.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-white/5 bg-[var(--intaglio-panel-soft)] p-6">
              <div role="button"
                onClick={() => setIsExportModalOpen(false)}
                className="flex-1 border border-white/5 bg-black/40 py-3 font-mono text-xs font-medium text-white/60 transition hover:border-white/25 hover:text-white"
              >
                Cancel
              </div>
              <div role="button"
                onClick={handleExport}
                className="flex-[2] border border-amber-400/40 bg-amber-400 py-3 font-mono text-[10px] font-mono tracking-widest font-bold uppercase tracking-widest text-black transition hover:bg-amber-300"
              >
                Export Image
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
                className="border border-white/5 bg-[var(--intaglio-panel-soft)] p-2 text-[rgba(231,223,208,0.48)] transition hover:border-white/25 hover:text-white"
              >
                <IconX size={18} />
              </div>
            </div>

            <div className="custom-scrollbar overflow-y-auto p-6">
              {editDiffs.length > 0 ? (
                <div className="space-y-2">
                  {editDiffs.map((diff: any) => (
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
                  <div className="font-mono text-[11px] font-medium tracking-[0.3em] text-[rgba(231,223,208,0.48)]">
                    No Differences
                  </div>
                  <p className="mt-3 text-sm text-[rgba(231,223,208,0.58)]">
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

