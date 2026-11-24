"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  IconX,
  IconPin,
  IconPinFilled,
  IconZoomIn,
  IconZoomOut,
  IconPhoto,
  IconRefresh,
} from "@tabler/icons-react";

interface ReferenceViewerProps {
  isOpen: boolean;
  onClose: () => void;
  referenceUrl: string | null;
  originalUrl: string | null;
  onUploadReference: (file: File) => void;
}

export default function ReferenceViewer({
  isOpen,
  onClose,
  referenceUrl,
  originalUrl,
  onUploadReference,
}: ReferenceViewerProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showOriginal, setShowOriginal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPinned) return;
    if ((e.target as HTMLElement).closest("button, input, label")) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadReference(file);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  if (!isOpen) return null;

  const displayUrl = showOriginal ? originalUrl : referenceUrl;

  return (
    <div
      ref={containerRef}
      className={`ui-root fixed z-50 overflow-hidden rounded-[14px] bg-[var(--ui-panel)] ring-1 ring-inset ring-[var(--ui-line-strong)] shadow-[var(--ui-shadow-pop)] ${
        isDragging ? "cursor-grabbing" : isPinned ? "cursor-default" : "cursor-grab"
      }`}
      style={{ left: position.x, top: position.y, width: 320 }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--ui-line)] bg-[var(--ui-chrome)]/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <IconPhoto size={15} stroke={1.8} className="text-[var(--ui-accent-strong)]" />
          <span className="text-[12px] font-medium text-[var(--ui-text)]">Reference</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={isPinned ? "Unpin reference" : "Pin reference"}
            aria-pressed={isPinned}
            onClick={() => setIsPinned(!isPinned)}
            className={`ui-focus grid h-7 w-7 place-items-center rounded-[7px] transition-colors ${
              isPinned
                ? "bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)]"
                : "text-[var(--ui-text-3)] hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
            }`}
            title={isPinned ? "Unpin" : "Pin position"}
          >
            {isPinned ? <IconPinFilled size={14} /> : <IconPin size={14} />}
          </button>
          <button
            type="button"
            aria-label="Close reference viewer"
            onClick={onClose}
            className="ui-focus grid h-7 w-7 place-items-center rounded-[7px] text-[var(--ui-text-3)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
          >
            <IconX size={14} />
          </button>
        </div>
      </div>

      {/* Image Area */}
      <div className="relative overflow-hidden bg-black/50" style={{ height: 200 }}>
        {displayUrl ? (
          <div
            className="flex h-full w-full items-center justify-center overflow-hidden"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="Reference"
              className="pointer-events-none max-h-full max-w-full select-none object-contain"
              draggable={false}
            />
          </div>
        ) : (
          <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5 transition-colors hover:bg-white/[0.04]">
            <IconPhoto size={20} stroke={1.6} className="text-[var(--ui-text-3)]" />
            <span className="text-[12px] text-[var(--ui-text-2)]">Click to upload reference</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between border-t border-[var(--ui-line)] bg-[var(--ui-chrome)]/80 px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out reference"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="ui-focus grid h-7 w-7 place-items-center rounded-[7px] text-[var(--ui-text-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)] disabled:pointer-events-none disabled:opacity-30"
          >
            <IconZoomOut size={14} />
          </button>
          <span className="ui-num w-10 text-center text-[11px] text-[var(--ui-text-3)]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoom in reference"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="ui-focus grid h-7 w-7 place-items-center rounded-[7px] text-[var(--ui-text-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)] disabled:pointer-events-none disabled:opacity-30"
          >
            <IconZoomIn size={14} />
          </button>
        </div>

        {originalUrl && (
          <button
            type="button"
            onClick={() => setShowOriginal(!showOriginal)}
            className={`ui-focus flex h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-[11px] font-medium ring-1 ring-inset transition-colors ${
              showOriginal
                ? "bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)] ring-[var(--ui-accent)]/40"
                : "bg-[var(--ui-control)] text-[var(--ui-text-2)] ring-[var(--ui-line)] hover:text-[var(--ui-text)]"
            }`}
          >
            <IconRefresh size={13} />
            {showOriginal ? "Original" : "Reference"}
          </button>
        )}

        {!referenceUrl && (
          <label className="ui-focus flex h-7 cursor-pointer items-center gap-1.5 rounded-[7px] bg-[var(--ui-accent-soft)] px-2.5 text-[11px] font-medium text-[var(--ui-accent-strong)] ring-1 ring-inset ring-[var(--ui-accent)]/40 transition-colors hover:bg-[var(--ui-accent)]/25">
            <IconPhoto size={13} />
            Upload
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );
}
