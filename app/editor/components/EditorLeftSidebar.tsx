import React from 'react';
import Image from 'next/image';
import { useEditorState } from '../hooks/useEditorState';
import { EDITOR_MODULES, AUXILIARY_MODULES } from '../pageTypes';
import { IconUpload, IconDeviceFloppy, IconFileCode } from "@tabler/icons-react";
import { STILL_FILE_ACCEPT } from '../../lib/rawDecoder';

export function EditorLeftSidebar() {
  const {
    activeTab,
    handleTabChange,
    isFocusMode,
    handleUpload,
    handleSaveProjectSession,
    openProjectPicker,
  } = useEditorState();

  if (isFocusMode) return null;

  return (
    <div className="relative z-30 hidden w-[72px] flex-col border-r border-[var(--intaglio-line)] bg-[#0d0c0a] md:flex shadow-[4px_0_24px_rgba(0,0,0,0.8)]">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-[var(--intaglio-line)] bg-transparent">
        <div className="relative h-8 w-8 opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
          <Image src="/logo.svg" alt="Intaglio" fill className="object-contain" />
        </div>
      </div>

      {/* Main Rail */}
      <div className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden py-6 flex flex-col items-center gap-1.5">
        {EDITOR_MODULES.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`group relative flex h-14 w-14 cursor-pointer flex-col items-center justify-center gap-1 transition-colors duration-200 ${
                isActive
                  ? "bg-[#161410] text-[var(--intaglio-brass)]"
                  : "text-white/30 hover:bg-[#13110e] hover:text-white/80"
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 1.5 : 1.25} className={`transition-transform duration-300 group-active:scale-95`} />
              
              <span className={`intaglio-label transition-opacity duration-200 ${isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100 absolute left-16 bg-[#0a0908] px-3 py-1.5 border border-[var(--intaglio-line)] z-50 pointer-events-none whitespace-nowrap shadow-2xl text-[var(--intaglio-paper)]"}`}>
                {item.shortLabel}
              </span>
              
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--intaglio-brass)]" />
              )}
            </div>
          );
        })}

        <div className="w-10 h-px bg-[var(--intaglio-line)] my-4 opacity-50" />

        {AUXILIARY_MODULES.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`group relative flex h-12 w-14 cursor-pointer flex-col items-center justify-center transition-colors duration-200 ${
                isActive
                  ? "bg-[#161410] text-[var(--intaglio-paper)]"
                  : "text-white/30 hover:bg-[#13110e] hover:text-white/80"
              }`}
            >
              <item.icon size={18} strokeWidth={isActive ? 1.5 : 1.25} className="transition-transform duration-300 group-active:scale-95" />
              
              <span className={`intaglio-label transition-opacity opacity-0 group-hover:opacity-100 absolute left-16 bg-[#0a0908] px-3 py-1.5 border border-[var(--intaglio-line)] z-50 pointer-events-none whitespace-nowrap shadow-2xl text-[var(--intaglio-paper)]`}>
                {item.shortLabel}
              </span>

              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--intaglio-paper)] opacity-50" />
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col items-center gap-1.5 border-t border-[var(--intaglio-line)] bg-transparent py-4">
        <label className="group relative flex h-12 w-14 cursor-pointer items-center justify-center text-white/30 transition-colors hover:bg-[#13110e] hover:text-[var(--intaglio-paper)]">
          <IconUpload className="intaglio-icon"/>
          <input type="file" accept={STILL_FILE_ACCEPT} onChange={handleUpload} className="hidden" />
          <span className="absolute left-16 whitespace-nowrap border border-[var(--intaglio-line)] bg-[#0a0908] px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-[var(--intaglio-paper)] opacity-0 shadow-2xl transition-opacity group-hover:opacity-100 z-50 pointer-events-none">
            Import Image
          </span>
        </label>
        
        <div
          onClick={handleSaveProjectSession}
          className="group relative flex h-12 w-14 cursor-pointer items-center justify-center text-white/30 transition-colors hover:bg-[#13110e] hover:text-[var(--intaglio-brass)]"
        >
          <IconDeviceFloppy className="intaglio-icon"/>
          <span className="absolute left-16 whitespace-nowrap border border-[var(--intaglio-line)] bg-[#0a0908] px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-[var(--intaglio-paper)] opacity-0 shadow-2xl transition-opacity group-hover:opacity-100 z-50 pointer-events-none">
            Save Archive
          </span>
        </div>
        
        <div
          onClick={openProjectPicker}
          className="group relative flex h-12 w-14 cursor-pointer items-center justify-center text-white/30 transition-colors hover:bg-[#13110e] hover:text-cyan-600"
        >
          <IconFileCode className="intaglio-icon"/>
          <span className="absolute left-16 whitespace-nowrap border border-[var(--intaglio-line)] bg-[#0a0908] px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-[var(--intaglio-paper)] opacity-0 shadow-2xl transition-opacity group-hover:opacity-100 z-50 pointer-events-none">
            Open Archive
          </span>
        </div>
      </div>
    </div>
  );
}
