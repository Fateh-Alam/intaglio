"use client";

import React, { useEffect, useRef } from "react";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconClock,
  IconRestore,
  IconGitBranch,
  IconX,
} from "@tabler/icons-react";

export interface HistoryState {
  id: string;
  timestamp: number;
  action: string;
  settings: any; // Snapshot of settings
  thumbnail?: string; // Data URL
}

interface Branch {
  id: string;
  name: string;
  settings: any;
  timestamp: number;
}

interface HistoryPanelProps {
  history: HistoryState[];
  currentIndex: number;
  onUndo: () => void;
  onRedo: () => void;
  onJumpToState: (index: number) => void;
  onClearHistory: () => void;
  branches?: Branch[];
  onCreateBranch?: () => void;
  onRestoreBranch?: (id: string) => void;
  onDeleteBranch?: (id: string) => void;
}

export default function HistoryPanel({
  history,
  currentIndex,
  onUndo,
  onRedo,
  onJumpToState,
  onClearHistory,
  branches,
  onCreateBranch,
  onRestoreBranch,
  onDeleteBranch,
}: HistoryPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active item
  useEffect(() => {
    if (scrollRef.current) {
      const activeItem = scrollRef.current.children[
        currentIndex
      ] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentIndex, history.length]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-widest text-white/80 flex items-center gap-2">
          <IconClock size={14} className="text-amber-500" />
          Edit History
        </h3>
        <button
          onClick={onClearHistory}
          className="text-[10px] text-gray-500 hover:text-red-400 transition uppercase tracking-wider"
        >
          Clear
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-black/20">
        <button
          onClick={onUndo}
          disabled={currentIndex <= 0}
          className={`flex-1 py-1.5 flex items-center justify-center gap-2 rounded transition ${
            currentIndex > 0
              ? "bg-white/5 hover:bg-white/10 text-gray-200"
              : "opacity-30 cursor-not-allowed text-gray-600"
          }`}
          title="Undo (Ctrl+Z)"
        >
          <IconArrowBackUp size={14} />
          <span className="text-[10px] font-mono uppercase">Undo</span>
        </button>
        <button
          onClick={onRedo}
          disabled={currentIndex >= history.length - 1}
          className={`flex-1 py-1.5 flex items-center justify-center gap-2 rounded transition ${
            currentIndex < history.length - 1
              ? "bg-white/5 hover:bg-white/10 text-gray-200"
              : "opacity-30 cursor-not-allowed text-gray-600"
          }`}
          title="Redo (Ctrl+Y)"
        >
          <span className="text-[10px] font-mono uppercase">Redo</span>
          <IconArrowForwardUp size={14} />
        </button>
      </div>

      {/* Branch/Snapshot Section */}
      {onCreateBranch && branches && branches.length > 0 && (
        <div className="p-3 border-b border-white/5 bg-black/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
              Branches
            </span>
            <button
              onClick={onCreateBranch}
              className="text-[10px] text-amber-500 hover:text-amber-400 transition font-mono uppercase"
            >
              + New
            </button>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition group"
              >
                <button
                  onClick={() => onRestoreBranch && onRestoreBranch(branch.id)}
                  className="flex items-center gap-2 text-[11px] text-gray-300 hover:text-white transition flex-1 text-left"
                >
                  <IconGitBranch size={12} className="text-cyan-500" />
                  <span className="truncate">{branch.name}</span>
                </button>
                <button
                  onClick={() => onDeleteBranch && onDeleteBranch(branch.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition"
                >
                  <IconX size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Branch Button (if no branches yet) */}
      {onCreateBranch && (!branches || branches.length === 0) && (
        <div className="p-3 border-b border-white/5">
          <button
            onClick={onCreateBranch}
            className="w-full py-2 flex items-center justify-center gap-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono uppercase hover:bg-cyan-500/20 transition"
          >
            <IconGitBranch size={14} />
            Create Branch
          </button>
        </div>
      )}

      {/* List */}
      <div
        className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-2"
        ref={scrollRef}
      >
        <div className="space-y-1">
          {history.map((state, index) => {
            const isActive = index === currentIndex;
            const isFuture = index > currentIndex;

            return (
              <button
                key={state.id}
                onClick={() => onJumpToState(index)}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition group ${
                  isActive
                    ? "bg-amber-500/10 border border-amber-500/30"
                    : isFuture
                      ? "opacity-40 hover:opacity-70 grayscale"
                      : "hover:bg-white/5 border border-transparent hover:border-white/5"
                }`}
              >
                {/* Visual Indicator */}
                <div
                  className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-gray-700"}`}
                />

                {state.thumbnail && (
                  <div className="w-8 h-8 rounded bg-black/50 overflow-hidden relative border border-white/10 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={state.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div
                    className={`text-[11px] font-medium truncate ${isActive ? "text-amber-100" : "text-gray-400 group-hover:text-gray-200"}`}
                  >
                    {state.action}
                  </div>
                  <div className="text-[9px] text-gray-600 mt-0.5 font-mono">
                    {new Date(state.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>

                {isActive && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconRestore size={12} className="text-amber-500/70" />
                  </div>
                )}
              </button>
            );
          })}

          {history.length === 0 && (
            <div className="text-center py-8 text-gray-600 text-[10px] font-mono uppercase tracking-widest">
              No history yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
