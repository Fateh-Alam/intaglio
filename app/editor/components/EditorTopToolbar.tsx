import React from 'react';
import Image from 'next/image';
import { useEditorState } from '../hooks/useEditorState';
import { EDITOR_MODULES, AUXILIARY_MODULES } from '../pageTypes';
import { 
  IconDeviceFloppy, 
  IconFileCode, 
  IconUpload, 
  IconArrowBackUp, 
  IconArrowForwardUp, 
  IconFocus2, 
  IconDownload,
  IconBooks
} from "@tabler/icons-react";

export function EditorTopToolbar() {
  const {
    activeTab,
    handleTabChange,
    handleUndo,
    handleRedo,
    handleUpload,
    handleSaveProjectSession,
    openProjectPicker,
    setIsExportModalOpen,
    isPresetsBarOpen,
    setIsPresetsBarOpen,
    setIsFocusMode,
    isFocusMode,
    imageName
  } = useEditorState();

  if (isFocusMode && !isPresetsBarOpen) return null;

  return (
    <div className="relative z-40 flex h-12 w-full items-center justify-between border-b border-[var(--intaglio-line)] bg-[#0d0c0a] px-4 shadow-sm">
      
      {/* LEFT: Branding & File Actions */}
      <div className="flex items-center gap-4 w-1/3">
        <div className="relative h-5 w-5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
          <Image src="/logo.svg" alt="Intaglio" fill className="object-contain" />
        </div>
        
        <div className="h-3 w-px bg-[var(--intaglio-line)] mx-1" />
        
        <div className="flex items-center gap-1">
          <label className="group p-1 cursor-pointer text-[rgba(231,223,208,0.5)] transition-colors hover:text-[var(--intaglio-paper)] rounded hover:bg-white/5" title="Import Image">
            <IconUpload size={14} strokeWidth={1.5} />
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
          <button onClick={openProjectPicker} className="p-1 text-[rgba(231,223,208,0.5)] transition-colors hover:text-cyan-600 rounded hover:bg-white/5" title="Open Archive">
            <IconFileCode size={14} strokeWidth={1.5} />
          </button>
          <button onClick={handleSaveProjectSession} className="p-1 text-[rgba(231,223,208,0.5)] transition-colors hover:text-[var(--intaglio-brass)] rounded hover:bg-white/5" title="Save Archive">
            <IconDeviceFloppy size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* CENTER: Document Name */}
      <div className="flex items-center justify-center w-1/3">
        <div className="truncate max-w-[200px] text-[10px] font-mono tracking-widest text-[rgba(231,223,208,0.7)] uppercase bg-[#1a1815] px-4 py-1 rounded-full border border-white/5">
          {imageName}
        </div>
      </div>

      {/* RIGHT: Global Actions (Undo/Redo, Presets, Export) */}
      <div className="flex items-center justify-end gap-2 w-1/3">
        <div className="flex items-center mr-2">
          <button onClick={handleUndo} className="p-1.5 text-[rgba(231,223,208,0.5)] hover:text-white rounded hover:bg-white/5 transition-colors" title="Undo">
            <IconArrowBackUp size={14} />
          </button>
          <button onClick={handleRedo} className="p-1.5 text-[rgba(231,223,208,0.5)] hover:text-white rounded hover:bg-white/5 transition-colors" title="Redo">
            <IconArrowForwardUp size={14} />
          </button>
        </div>
        
        <div className="h-3 w-px bg-[var(--intaglio-line)] mr-1" />

        <button 
          onClick={() => setIsPresetsBarOpen(!isPresetsBarOpen)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-[9px] font-mono tracking-widest uppercase transition-all border ${
            isPresetsBarOpen 
              ? "bg-[var(--intaglio-brass)]/10 border-[var(--intaglio-brass)] text-[var(--intaglio-brass)]" 
              : "bg-transparent border-[var(--intaglio-line)] text-[rgba(231,223,208,0.7)] hover:border-[rgba(231,223,208,0.3)]"
          }`}
        >
          <IconBooks size={12} />
          Presets
        </button>

        <button 
          onClick={() => setIsFocusMode(true)}
          className="p-1 text-[rgba(231,223,208,0.5)] hover:text-[var(--intaglio-brass)] rounded hover:bg-white/5 transition-colors"
          title="Focus Mode (Hide UI)"
        >
          <IconFocus2 size={14} />
        </button>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="ml-2 flex items-center gap-1.5 bg-[var(--intaglio-brass)] px-4 py-1 text-[9px] font-mono tracking-widest uppercase font-bold text-black transition-all hover:bg-white rounded-sm"
        >
          <IconDownload size={12} strokeWidth={2} />
          Export
        </button>
      </div>
    </div>
  );
}
