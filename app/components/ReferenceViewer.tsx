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

  // Handle dragging
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

    const handleMouseUp = () => {
      setIsDragging(false);
    };

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
    if (file) {
      onUploadReference(file);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  if (!isOpen) return null;

  const displayUrl = showOriginal ? originalUrl : referenceUrl;

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden ${
        isDragging
          ? "cursor-grabbing"
          : isPinned
            ? "cursor-default"
            : "cursor-grab"
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: 320,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/60 border-b border-white/5">
        <div className="flex items-center gap-2">
          <IconPhoto className="intaglio-icon text-amber-500"/>
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
            Reference
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div role="button" tabIndex={0}
            onClick={() => setIsPinned(!isPinned)}
            className={`p-1.5 rounded-lg transition ${
              isPinned
                ? "bg-amber-500/20 text-amber-400"
                : "hover:bg-white/10 text-gray-500 hover:text-white"
            }`}
            title={isPinned ? "Unpin" : "Pin position"}
          >
            {isPinned ? <IconPinFilled className="intaglio-icon"/> : <IconPin className="intaglio-icon"/>}
          </div>
          <div role="button" tabIndex={0}
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition"
          >
            <IconX className="intaglio-icon"/>
          </div>
        </div>
      </div>

      {/* Image Area */}
      <div
        className="relative bg-black/40 overflow-hidden"
        style={{ height: 200 }}
      >
        {displayUrl ? (
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="Reference"
              className="max-w-full max-h-full object-contain pointer-events-none select-none"
              draggable={false}
            />
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-white/5 transition">
            <IconPhoto className="intaglio-icon text-gray-600 mb-2"/>
            <span className="text-xs text-gray-500">
              Click to upload reference
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/60 border-t border-white/5">
        <div className="flex items-center gap-1">
          <div role="button" tabIndex={0}
            onClick={handleZoomOut}
            aria-disabled={zoom <= 0.5}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <IconZoomOut className="intaglio-icon"/>
          </div>
          <span className="text-[10px] text-gray-500 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <div role="button" tabIndex={0}
            onClick={handleZoomIn}
            aria-disabled={zoom >= 3}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <IconZoomIn className="intaglio-icon"/>
          </div>
        </div>

        {originalUrl && (
          <div role="button" tabIndex={0}
            onClick={() => setShowOriginal(!showOriginal)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono uppercase transition ${
              showOriginal
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"
            }`}
          >
            <IconRefresh className="intaglio-icon"/>
            {showOriginal ? "Original" : "Reference"}
          </div>
        )}

        {!referenceUrl && (
          <label className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-[10px] font-mono uppercase cursor-pointer hover:bg-amber-500/30 transition border border-amber-500/30">
            <IconPhoto className="intaglio-icon"/>
            Upload
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}
