const fs = require('fs');

const pageContent = fs.readFileSync('app/editor/page.tsx', 'utf-8');
const lines = pageContent.split('\n');

const homeStart = lines.findIndex(l => l.includes('export default function Home() {'));
const mainReturn = lines.findIndex((l, i) => i > homeStart && l.includes('if (!imageSrc) {'));

const stateContent = lines.slice(homeStart + 1, mainReturn).join('\n');

const hookCode = `
import React, { createContext, useContext, useState, useRef, useEffect, useMemo, useCallback } from "react";
import { DEFAULT_TEXT_OVERLAY, TextOverlaySettings } from "../components/CinematicTextOverlay";
import { FORMAT, STORAGE_KEYS } from "../lib/brand";
import { toPng } from "html-to-image";
import { solveCatmullRom } from "../utils/spline";
import * as THREE from "three";
import { parseCubeLUT } from "../utils/lutParser";
import { generatePaletteHeist2DLUT } from "../utils/colorTransfer";
import { TUTORIAL_CONTENT, getSeenTutorials, markTutorialSeen } from "../utils/tutorialContent";

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
} from "./pageTypes"; // We'll extract types to pageTypes.ts

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
  AssetMetadataSettings
} from "../types/editor";
import { HistoryState } from "../components/HistoryPanel";

// We create a Context that holds everything
export const EditorContext = createContext<any>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
${stateContent}

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
    imageBounds, setImageBounds
  };

  return <EditorContext.Provider value={editorState}>{children}</EditorContext.Provider>;
}

export const useEditorState = () => useContext(EditorContext);
`;

fs.writeFileSync('app/editor/hooks/useEditorState.tsx', hookCode);
console.log('Created EditorContext Provider');
