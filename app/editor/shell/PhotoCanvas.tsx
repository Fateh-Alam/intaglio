"use client";

import React, { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useEditorState } from "../hooks/useEditorState";
import { GridOverlay } from "../components/GridOverlay";
import { SURROUND_COLORS, useShell } from "./useShell";
import { CanvasToolbar } from "./CanvasToolbar";

const CinematicEditor = dynamic(() => import("../../components/CinematicEditor"), { ssr: false });

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

/** The photo surface: neutral surround, zoom/pan, compare split, and canvas overlays. */
export function PhotoCanvas() {
  const editor = useEditorState();
  const shell = useShell();
  const {
    settings, imageSrc, rawSource, setHistogram, textOverlay, setTextOverlay, watermark,
    brushMaskActive, brushSize, brushFeather, brushErasing, brushCanvas, setBrushCanvas, brushCanvasDirty, setBrushCanvasDirty,
    performanceMode, compositionGuide, activePlateId, updateSetting, imageBounds, setImageBounds, gridOverlayMode,
    roiMode, sourceROI, setSourceROI, rawProgress, cancelRawDecode,
  } = editor;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const splitDragRef = useRef(false);

  const split = shell.compare === "split" ? shell.splitPosition : shell.compare === "before" ? 2 : -1;
  const displaySettings = shell.preview ?? settings;

  const zoomTo = (next: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    setZoom(clamped);
    if (clamped === 1) setPan({ x: 0, y: 0 });
  };

  const onWheel = (event: React.WheelEvent) => {
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      zoomTo(zoom * Math.exp(-event.deltaY * 0.01));
    } else if (zoom !== 1) {
      setPan((current) => ({ x: current.x - event.deltaX, y: current.y - event.deltaY }));
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (brushMaskActive || roiMode !== "none" || event.button !== 0 || zoom === 1) return;
    panRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    setPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panRef.current) return;
    setPan({ x: event.clientX - panRef.current.x, y: event.clientY - panRef.current.y });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panRef.current) return;
    panRef.current = null;
    setPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const moveSplit = (clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    shell.setSplitPosition(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)));
  };

  const startRegion = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const startX = (event.clientX - rect.left) / rect.width;
    const startY = (event.clientY - rect.top) / rect.height;
    setSourceROI({ x: startX, y: startY, w: 0, h: 0 });
    const onMove = (moveEvent: MouseEvent) => {
      const x = Math.min(1, Math.max(0, (moveEvent.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (moveEvent.clientY - rect.top) / rect.height));
      setSourceROI({ x: Math.min(startX, x), y: Math.min(startY, y), w: Math.abs(x - startX), h: Math.abs(y - startY) });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden transition-colors duration-300"
      style={{ background: SURROUND_COLORS[shell.surround] }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {imageSrc && (
        <div className={`absolute inset-0 ${shell.panelsHidden ? "p-2" : "px-4 pb-[72px] pt-4"}`}>
        <div
          className="relative h-full w-full origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: brushMaskActive ? "crosshair" : zoom > 1 ? (panning ? "grabbing" : "grab") : "default",
          }}
        >
          <CinematicEditor
            settings={displaySettings}
            imageUrl={imageSrc}
            rawSource={rawSource}
            split={split}
            showClipping={shell.showClipping}
            onStatsUpdate={setHistogram}
            textOverlay={textOverlay}
            setTextOverlay={setTextOverlay}
            onCanvasReady={setBrushCanvas}
            watermark={watermark}
            brushMaskActive={brushMaskActive}
            brushSize={brushSize}
            brushFeather={brushFeather}
            brushErasing={brushErasing}
            brushCanvas={brushCanvas}
            brushCanvasDirty={brushCanvasDirty}
            performanceMode={performanceMode}
            compositionGuide={compositionGuide}
            onBrushMaskUpdate={() => setBrushCanvasDirty((value: number) => value + 1)}
            onBrushStrokeComplete={(stroke) => {
              const plate = settings.adjustmentLayers.find((layer) => layer.id === activePlateId);
              const brushMaskId = plate?.maskIds.find((id) => settings.masks.find((mask) => mask.id === id)?.type === "brush");
              if (!brushMaskId) return;
              updateSetting("masks", settings.masks.map((mask) => mask.id === brushMaskId && mask.type === "brush" ? { ...mask, params: { strokes: [...mask.params.strokes, stroke] } } : mask));
            }}
            onBoundsChange={setImageBounds}
          />

          {imageBounds && (
            <div
              ref={frameRef}
              className="pointer-events-none absolute"
              style={{ left: imageBounds.left, top: imageBounds.top, width: imageBounds.width, height: imageBounds.height }}
            >
              <AnimatePresence>
                {shell.compare !== "off" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 top-3 flex justify-between px-3">
                    <span className="ui-glass rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--ui-text)]">Before</span>
                    {shell.compare === "split" && <span className="ui-glass rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--ui-text)]">After</span>}
                  </motion.div>
                )}
              </AnimatePresence>
              {shell.compare === "split" && (
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label="Before and after divider"
                  aria-valuenow={Math.round(shell.splitPosition * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="pointer-events-auto absolute inset-y-0 z-10 w-6 -translate-x-1/2 cursor-ew-resize touch-none outline-none"
                  style={{ left: `${shell.splitPosition * 100}%` }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    splitDragRef.current = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (splitDragRef.current) moveSplit(event.clientX);
                  }}
                  onPointerUp={(event) => {
                    splitDragRef.current = false;
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowLeft") shell.setSplitPosition(Math.max(0, shell.splitPosition - 0.02));
                    if (event.key === "ArrowRight") shell.setSplitPosition(Math.min(1, shell.splitPosition + 0.02));
                  }}
                >
                  <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.6)]" />
                  <div className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                    <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden>
                      <path d="M4 1 L0.8 5 L4 9 M10 1 L13.2 5 L10 9" fill="none" stroke="#1a1a1c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )}

          <GridOverlay mode={gridOverlayMode} bounds={imageBounds} />

          {imageBounds && roiMode === "source" && (
            <div
              className="absolute z-20 cursor-crosshair ring-1 ring-inset ring-[var(--ui-accent)]/60"
              style={{ left: imageBounds.left, top: imageBounds.top, width: imageBounds.width, height: imageBounds.height }}
              onMouseDown={startRegion}
            >
              {sourceROI && (
                <div
                  className="absolute rounded-[2px] border border-white bg-white/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                  style={{ left: `${sourceROI.x * 100}%`, top: `${sourceROI.y * 100}%`, width: `${sourceROI.w * 100}%`, height: `${sourceROI.h * 100}%` }}
                />
              )}
            </div>
          )}
        </div>
        </div>
      )}

      <AnimatePresence>
        {shell.preview && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="ui-glass pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full px-3 py-1.5 text-[11.5px] font-medium"
          >
            Previewing — click to apply
          </motion.div>
        )}
      </AnimatePresence>

      {rawProgress && (
        <div role="status" aria-live="polite" className="absolute inset-0 z-[70] grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="ui-glass w-[min(380px,calc(100%-48px))] rounded-[16px] p-5">
            <div className="text-[13px] font-semibold">Developing RAW</div>
            <div className="mt-1 text-[12px] text-[var(--ui-text-2)]">{rawProgress.stage}</div>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[var(--ui-accent)] transition-[width] duration-300" style={{ width: `${Math.round(rawProgress.progress * 100)}%` }} />
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={cancelRawDecode} className="ui-focus rounded-[8px] px-3 py-1.5 text-[12px] text-[var(--ui-text-2)] hover:bg-white/10 hover:text-[var(--ui-text)]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {imageSrc && !shell.panelsHidden && <CanvasToolbar zoom={zoom} onZoom={zoomTo} />}
    </div>
  );
}
