import React from 'react';
import Image from 'next/image';
import { useEditorState } from '../hooks/useEditorState';
import { 
  IconDeviceFloppy, 
  IconFileCode, 
  IconUpload, 
  IconArrowBackUp, 
  IconArrowForwardUp, 
  IconFocus2, 
  IconDownload,
  IconGridPattern,
  IconChartHistogram,
  IconLayoutGrid,
  IconFiles
} from "@tabler/icons-react";
import { AnalysisPanel } from './AnalysisPanel';
import { PaletteHeist } from './PaletteHeist';
import { STILL_FILE_ACCEPT } from '../../lib/rawDecoder';

export function EditorTopToolbar() {
  const {
    handleUndo,
    handleRedo,
    handleUpload,
    handleSaveProjectSession,
    openProjectPicker,
    setIsExportModalOpen,
    isProofSheetOpen,
    setIsProofSheetOpen,
    setIsBatchExportOpen,
    setIsFocusMode,
    isFocusMode,
    imageName,
    gridOverlayMode,
    setGridOverlayMode,
    isAnalysisOpen,
    setIsAnalysisOpen,
    histogram
  } = useEditorState();

  const cycleGridMode = () => {
    const modes: import("../../types/editor").GridOverlayMode[] = [
      "none",
      "1:1",
      "4:5",
      "9:16",
      "carousel-4:5-2",
      "carousel-4:5-3",
      "title-safe",
      "action-safe",
    ];
    const currentIndex = modes.indexOf(gridOverlayMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setGridOverlayMode(modes[nextIndex]);
  };

  if (isFocusMode && !isProofSheetOpen) return null;

  return (
    <div className="relative z-40 flex h-12 w-full items-center justify-between border-b border-[var(--intaglio-line)] bg-[#0d0c0a] px-4 shadow-sm">
      
      {/* LEFT: Branding & File Actions */}
      <div className="flex items-center gap-4 w-1/3">
        <div className="relative h-5 w-5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
          <Image src="/logo.svg" alt="Intaglio" fill className="object-contain" />
        </div>
        
        <div className="h-3 w-px bg-[var(--intaglio-line)] mx-1" />
        
        <div className="flex items-center gap-1">
          <label className="group p-1 cursor-pointer text-white/50 transition-colors hover:text-[var(--intaglio-paper)] rounded hover:bg-white/5" title="Import Image">
            <IconUpload className="intaglio-icon"/>
            <input type="file" accept={STILL_FILE_ACCEPT} onChange={handleUpload} className="hidden" />
          </label>
          <button onClick={openProjectPicker} className="p-1 text-white/50 transition-colors hover:text-cyan-600 rounded hover:bg-white/5" title="Open Archive">
            <IconFileCode className="intaglio-icon"/>
          </button>
          <button onClick={handleSaveProjectSession} className="p-1 text-white/50 transition-colors hover:text-[var(--intaglio-brass)] rounded hover:bg-white/5" title="Save Archive">
            <IconDeviceFloppy className="intaglio-icon"/>
          </button>
        </div>
      </div>

      {/* CENTER: Document Name */}
      <div className="flex items-center justify-center w-1/3">
        <div className="truncate max-w-[200px] text-[10px] font-mono tracking-widest text-white/70 uppercase bg-[#1a1815] px-4 py-1 rounded-full border border-white/5">
          {imageName}
        </div>
      </div>

      {/* RIGHT: Global Actions (Undo/Redo, Presets, Export) */}
      <div className="flex items-center justify-end gap-2 w-1/3">
        <div className="flex items-center mr-2">
          <button onClick={handleUndo} className="p-1.5 text-white/50 hover:text-white rounded hover:bg-white/5 transition-colors" title="Undo">
            <IconArrowBackUp className="intaglio-icon"/>
          </button>
          <button onClick={handleRedo} className="p-1.5 text-white/50 hover:text-white rounded hover:bg-white/5 transition-colors" title="Redo">
            <IconArrowForwardUp className="intaglio-icon"/>
          </button>
        </div>
        
        <div className="h-3 w-px bg-[var(--intaglio-line)] mr-1" />

        <button 
          onClick={() => setIsProofSheetOpen(!isProofSheetOpen)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded intaglio-label transition-all border ${
            isProofSheetOpen
              ? "bg-[var(--intaglio-brass)]/10 border-[var(--intaglio-brass)] text-[var(--intaglio-brass)]" 
              : "bg-transparent border-[var(--intaglio-line)] text-white/70 hover:border-[rgba(231,223,208,0.3)]"
          }`}
        >
          <IconLayoutGrid className="intaglio-icon"/>
          Proof Sheets
        </button>

        <button
          onClick={cycleGridMode}
          className={`p-1 flex items-center gap-1 rounded transition-colors ${
            gridOverlayMode !== "none"
              ? "text-[var(--intaglio-brass)] bg-white/10"
              : "text-white/50 hover:text-white hover:bg-white/5"
          }`}
          title={`Grid Overlay: ${gridOverlayMode}`}
        >
          <IconGridPattern className="intaglio-icon"/>
          {gridOverlayMode !== "none" && (
            <span className="text-[9px] font-mono tracking-widest">{gridOverlayMode.replace("carousel-", "")}</span>
          )}
        </button>

        <div className="relative">
          <button 
            onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
            className={`p-1 flex items-center gap-1 rounded transition-colors ${
              isAnalysisOpen 
                ? "text-[var(--intaglio-brass)] bg-white/10" 
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
            title="Analysis & Scopes"
          >
            <IconChartHistogram className="intaglio-icon"/>
          </button>
          
          {isAnalysisOpen && (
            <div className="absolute top-[calc(100%+12px)] right-0 w-80 bg-[#0d0c0a] border border-[var(--intaglio-line)] shadow-2xl z-50 p-4 max-h-[80vh] overflow-y-auto custom-scrollbar rounded flex flex-col gap-6">
              <AnalysisPanel histogram={histogram} />
              <PaletteHeist histogram={histogram} />
            </div>
          )}
        </div>

        <button 
          onClick={() => setIsFocusMode(true)}
          className="p-1 text-white/50 hover:text-[var(--intaglio-brass)] rounded hover:bg-white/5 transition-colors"
          title="Focus Mode (Hide UI)"
        >
          <IconFocus2 className="intaglio-icon"/>
        </button>

        <button
          onClick={() => setIsBatchExportOpen(true)}
          className="p-1 text-white/50 hover:text-[var(--intaglio-brass)] rounded hover:bg-white/5 transition-colors"
          title="Local Batch Export"
        >
          <IconFiles className="intaglio-icon"/>
        </button>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="ml-2 flex items-center gap-1.5 bg-[var(--intaglio-brass)] px-4 py-1 intaglio-label font-bold text-black transition-all hover:bg-white rounded-sm"
        >
          <IconDownload className="intaglio-icon"/>
          Export
        </button>
      </div>
    </div>
  );
}
