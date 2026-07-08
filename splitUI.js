const fs = require('fs');

const pageContent = fs.readFileSync('app/editor/page.tsx', 'utf-8');

// The layout is roughly:
// <div className="... md:flex"> (Left Sidebar) -> lines 2174 to 2563
// <div ... className="... min-w-0 ... bg-[#11100d] ..."> (Center Canvas) -> lines 2566 to 2977
// <div className="... w-[360px] ... flex-col ..."> (Right Sidebar) -> lines 2980 to 4426
// Let's use regex to grab the blocks. Since JS regex can be tricky with nested brackets, we will use known start strings.

const lines = pageContent.split('\n');

const leftSidebarStart = lines.findIndex(l => l.includes('{/* LEFT SIDEBAR - MODULES & ANALYZER */}'));
const centerCanvasStart = lines.findIndex(l => l.includes('{/* CENTER - EDITOR CANVAS */}'));
const rightSidebarStart = lines.findIndex(l => l.includes('{/* RIGHT SIDEBAR - CONTROLS */}'));
const mobileBarsStart = lines.findIndex(l => l.includes('{/* BOTTOM MOBILE NAVIGATION */}'));

const leftSidebarContent = lines.slice(leftSidebarStart, centerCanvasStart - 1).join('\n');
const centerCanvasContent = lines.slice(centerCanvasStart, rightSidebarStart - 1).join('\n');
const rightSidebarContent = lines.slice(rightSidebarStart, mobileBarsStart - 1).join('\n');

// A function to apply Ormond design to class names
function applyOrmond(code) {
  return code
    .replace(/bg-black\/30/g, 'bg-[var(--ormond-panel-soft)]')
    .replace(/bg-\[\#11100d\]/g, 'bg-[var(--ormond-charcoal-2)]')
    .replace(/bg-white\/5/g, 'bg-[rgba(231,223,208,0.045)]')
    .replace(/border-white\/10/g, 'border-[var(--ormond-line)]')
    .replace(/border-white\/5/g, 'border-[var(--ormond-line)]')
    .replace(/text-white\/35/g, 'text-[rgba(231,223,208,0.48)]')
    .replace(/text-white\/45/g, 'text-[rgba(231,223,208,0.58)]')
    .replace(/text-white\/85/g, 'text-[var(--ormond-paper)]')
    .replace(/text-gray-400/g, 'text-[rgba(231,223,208,0.58)]')
    .replace(/text-gray-300/g, 'text-[rgba(231,223,208,0.72)]')
    .replace(/text-gray-500/g, 'text-[rgba(231,223,208,0.38)]')
    .replace(/font-semibold/g, 'font-medium')
    .replace(/uppercase tracking-\[0\.35em\]/g, 'ormond-label')
    .replace(/uppercase tracking-\[0\.45em\]/g, 'ormond-label');
}

fs.writeFileSync('app/editor/components/EditorLeftSidebar.tsx', `
import React from 'react';
import { useEditorState } from '../hooks/useEditorState';
import Image from 'next/image';
import { EDITOR_MODULES, AUXILIARY_MODULES, getEditorModuleLabel, COMPOSITION_GUIDES, PERFORMANCE_MODES } from '../pageTypes';
// .. add missing imports ..

export function EditorLeftSidebar() {
  const editorState = useEditorState();
  const { isFocusMode, isLeftSidebarOpen, setIsLeftSidebarOpen, activeTab, handleTabChange, histogram, setIsHistogramHelpOpen, imageInfo, assetMetadata } = editorState;
  return (
    <>
      ${applyOrmond(leftSidebarContent)}
    </>
  );
}
`);

fs.writeFileSync('app/editor/components/EditorWorkspaceCanvas.tsx', `
import React, { useRef } from 'react';
import { useEditorState } from '../hooks/useEditorState';
import Image from 'next/image';
// .. add missing imports ..

export function EditorWorkspaceCanvas() {
  const editorState = useEditorState();
  const { isMobileControlsExpanded, setIsMobileControlsExpanded, imageName, activeVirtualCopyId, activeTab, getEditorModuleLabel, performanceMode, compositionGuide, imageInfo, isFocusMode, isCommandBarOpen, setIsCommandBarOpen, handleSaveProjectSession, isRightSidebarOpen, setIsRightSidebarOpen, compareEnabled, compareSplit, setCompareSplit, imageSrc, settings, textOverlay, assetMetadata, updateSetting, brushMaskData, brushMaskExposure, brushMaskContrast, brushMaskSaturation, brushMaskTemperature, brushMaskClarity, setBrushMaskData, setImageBounds, roiMode, imageBounds, setSourceROI, setMatchROI, setSettings } = editorState;
  
  const containerRef = useRef(null);

  return (
    <>
      ${applyOrmond(centerCanvasContent)}
    </>
  );
}
`);

fs.writeFileSync('app/editor/components/EditorRightSidebar.tsx', `
import React from 'react';
import { useEditorState } from '../hooks/useEditorState';
// .. add missing imports ..

export function EditorRightSidebar() {
  const editorState = useEditorState();
  const { isFocusMode, isRightSidebarOpen, isMobileControlsExpanded, setIsMobileControlsExpanded, activeTab, handleTabChange, updateSetting, settings, toneCurveTexture, setSettings, updateSettings, brushMaskActive, setBrushMaskActive, brushSize, setBrushSize, brushFeather, setBrushFeather, brushErasing, setBrushErasing, brushMaskExposure, setBrushMaskExposure, brushMaskContrast, setBrushMaskContrast, brushMaskSaturation, setBrushMaskSaturation, brushMaskTemperature, setBrushMaskTemperature, brushMaskClarity, setBrushMaskClarity, brushMaskData, setBrushMaskData, roiMode, setRoiMode, sourceROI, matchROI } = editorState;
  
  return (
    <>
      ${applyOrmond(rightSidebarContent)}
    </>
  );
}
`);

console.log('UI split into components successfully.');
