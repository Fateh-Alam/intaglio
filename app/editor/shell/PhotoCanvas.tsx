"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useEditorState } from "../hooks/useEditorState";
import { GridOverlay } from "../components/GridOverlay";
import { SURROUND_COLORS, useShell } from "./useShell";
import { CanvasToolbar } from "./CanvasToolbar";
import { MaskCanvasTools } from "../masks/MaskCanvasTools";
import { rotateMasks, type MaskColorSampler } from "../../lib/maskGeometry";
import { FULL_CROP, isFullCrop } from "../../lib/cropGeometry";
import { useCrop } from "../crop/useCrop";
import { CropOverlay } from "../crop/CropOverlay";
import { Navigator } from "./Navigator";
import { clampCenter, FIT_LOUPE, fitScale, loupeLayout, magnification, MAX_SCALE, stepScale, type LoupeState } from "./loupe";

const CinematicEditor = dynamic(() => import("../../components/CinematicEditor"), { ssr: false });

const isTypingTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return Boolean(element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT" || element.isContentEditable));
};
/** Clicks on these never toggle the loupe. */
const INTERACTIVE = "button, a, input, textarea, select, [role='slider'], [role='switch'], [contenteditable='true'], .cursor-move";

/** The photo surface: neutral surround, zoom/pan, compare split, and canvas overlays. */
export function PhotoCanvas() {
  const editor = useEditorState();
  const shell = useShell();
  const { gradeGraph } = useEditorState();
  const crop = useCrop();
  const {
    settings, imageSrc, rawSource, histogram, setHistogram, textOverlay, setTextOverlay, watermark,
    performanceMode, compositionGuide, activePlateId, imageBounds, setImageBounds, gridOverlayMode,
    roiMode, sourceROI, setSourceROI, rawProgress, cancelRawDecode,
  } = editor;

  const [loupe, setLoupe] = useState<LoupeState>(FIT_LOUPE);
  const [outputSize, setOutputSize] = useState<{ width: number; height: number } | null>(null);
  const onOutputSize = useCallback((width: number, height: number) => setOutputSize((current) =>
    current?.width === width && current.height === height ? current : { width, height }), []);
  const gestureRef = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean; pan: boolean; pointerId: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const splitDragRef = useRef(false);
  const maskColorSamplerRef = useRef<MaskColorSampler | null>(null);

  const cropping = crop.draft !== null;
  const cropRotation = crop.draft?.rotation;
  const cropPreview = useMemo(() => cropRotation === undefined ? null : {
    ...settings,
    crop: FULL_CROP,
    rotate: cropRotation,
    masks: rotateMasks(settings.masks, cropRotation - settings.rotate, crop.aspect),
  }, [cropRotation, settings, crop.aspect]);
  const split = cropping ? -1 : shell.compare === "split" ? shell.splitPosition : shell.compare === "before" ? 2 : -1;
  const masksMode = !cropping && shell.rightMode === "masks";
  const maskOverlayPlateId = masksMode && (shell.showMaskOverlay || shell.picking) && !shell.preview && activePlateId !== "base" ? activePlateId : null;
  const displaySettings = cropPreview ?? shell.preview ?? settings;
  const displayedCrop = displaySettings.crop;

  // ── Loupe ──────────────────────────────────────────────────────────────
  // Zoom is stored as device pixels per image pixel (1 = 100%), so it means
  // the same thing after a window resize. The center is in image space.
  const dpr = typeof window === "undefined" ? 1 : Math.min(3, window.devicePixelRatio || 1);
  const fitCss = useMemo(() => imageBounds ? { width: imageBounds.width, height: imageBounds.height } : null, [imageBounds]);
  const viewSize = useMemo(() => imageBounds ? { width: imageBounds.left * 2 + imageBounds.width, height: imageBounds.top * 2 + imageBounds.height } : null, [imageBounds]);
  const fit = fitCss && outputSize ? fitScale(fitCss, outputSize, dpr) : 1;
  const zoom = cropping || !fitCss ? 1 : magnification(loupe, fit);
  const zoomed = zoom > 1.0001;
  const layout = useMemo(() => fitCss && viewSize ? loupeLayout(viewSize, fitCss, zoom, loupe.cx, loupe.cy) : null, [fitCss, viewSize, zoom, loupe.cx, loupe.cy]);
  const pan = layout?.pan ?? { x: 0, y: 0 };
  const view = useMemo(() => layout ? { zoom, cx: layout.cx, cy: layout.cy, pan: layout.pan } : undefined, [layout, zoom]);
  const currentScale = zoomed ? loupe.scale! : null;

  // A new photo or a new crop starts fitted.
  const cropKey = `${settings.crop.x},${settings.crop.y},${settings.crop.width},${settings.crop.height}`;
  const resetKey = `${imageSrc}|${cropKey}`;
  const [loupeKey, setLoupeKey] = useState(resetKey);
  if (loupeKey !== resetKey) {
    setLoupeKey(resetKey);
    setLoupe(FIT_LOUPE);
  }

  /** The image point under a client position, and that position relative to the viewport center. */
  const anchorAt = useCallback((clientX: number, clientY: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      px: (clientX - rect.left) / rect.width,
      py: (clientY - rect.top) / rect.height,
      dx: clientX - (rect.left + rect.width / 2 - pan.x),
      dy: clientY - (rect.top + rect.height / 2 - pan.y),
    };
  }, [pan.x, pan.y]);

  /** Zoom to `scale` (null = Fit), keeping the anchored image point under the cursor. */
  const zoomTo = useCallback((scale: number | null, anchor?: ReturnType<typeof anchorAt>) => {
    if (!fitCss || !viewSize || scale === null || scale <= fit * 1.001) {
      setLoupe(FIT_LOUPE);
      return;
    }
    const next = Math.min(MAX_SCALE, scale);
    const size = { width: fitCss.width * next / fit, height: fitCss.height * next / fit };
    const cx = anchor ? anchor.px - anchor.dx / size.width : layout?.cx ?? 0.5;
    const cy = anchor ? anchor.py - anchor.dy / size.height : layout?.cy ?? 0.5;
    setLoupe({ scale: next, ...clampCenter(cx, cy, size, viewSize) });
  }, [fit, fitCss, viewSize, layout]);

  const centerOn = useCallback((cx: number, cy: number) => {
    if (!layout || !viewSize || loupe.scale === null) return;
    setLoupe({ scale: loupe.scale, ...clampCenter(cx, cy, layout.photo, viewSize) });
  }, [layout, viewSize, loupe.scale]);

  /** Lightroom: Z and a click on the photo switch between Fit and 100%. */
  const toggleScale = useCallback((anchor?: ReturnType<typeof anchorAt>) => {
    if (zoomed) zoomTo(null);
    else zoomTo(fit < 1 ? 1 : stepScale(fit, fit, 1), anchor);
  }, [zoomed, zoomTo, fit]);

  // Wheel needs a non-passive listener so pinch and ⌘-scroll zoom the photo, not the page.
  const wheelRef = useRef({ cropping, zoomed, currentScale, fit, layout, zoomTo, anchorAt, viewSize });
  useEffect(() => { wheelRef.current = { cropping, zoomed, currentScale, fit, layout, zoomTo, anchorAt, viewSize }; });
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const onWheel = (event: WheelEvent) => {
      const state = wheelRef.current;
      if (state.cropping || !state.layout || !state.viewSize) return;
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        const from = state.currentScale ?? state.fit;
        state.zoomTo(from * Math.exp(-event.deltaY * 0.01), state.anchorAt(event.clientX, event.clientY));
      } else if (state.zoomed) {
        event.preventDefault();
        const { photo } = state.layout;
        const size = state.viewSize;
        setLoupe((current) => current.scale === null ? current : {
          scale: current.scale,
          ...clampCenter(state.layout!.cx + event.deltaX / photo.width, state.layout!.cy + event.deltaY / photo.height, photo, size),
        });
      }
    };
    surface.addEventListener("wheel", onWheel, { passive: false });
    return () => surface.removeEventListener("wheel", onWheel);
  }, []);

  // ⌘+ / ⌘− / ⌘0, Z, and Space to pan with any tool.
  useEffect(() => {
    if (!imageSrc) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || cropping) return;
      const key = event.key.toLowerCase();
      if (event.metaKey || event.ctrlKey) {
        if (event.altKey || event.shiftKey && key !== "+") return;
        if (key === "=" || key === "+") { event.preventDefault(); zoomTo(stepScale(currentScale ?? fit, fit, 1)); }
        else if (key === "-") { event.preventDefault(); if (currentScale !== null) zoomTo(stepScale(currentScale, fit, -1)); }
        else if (key === "0") { event.preventDefault(); zoomTo(null); }
        return;
      }
      if (event.altKey) return;
      if (key === "z" && !event.shiftKey) { event.preventDefault(); toggleScale(); }
      if (event.key === " " && zoomed && !(event.target as HTMLElement | null)?.closest?.("button, [role='slider'], [role='switch']")) {
        event.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => { if (event.key === " ") setSpaceHeld(false); };
    const onBlur = () => setSpaceHeld(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [imageSrc, cropping, zoomTo, toggleScale, currentScale, fit, zoomed]);

  const beginGesture = (event: React.PointerEvent<HTMLDivElement>, pan: boolean) => {
    gestureRef.current = { x: event.clientX, y: event.clientY, cx: layout?.cx ?? 0.5, cy: layout?.cy ?? 0.5, moved: false, pan, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  // Space-drag pans even over brush and mask tools.
  const onPointerDownCapture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!spaceHeld || !zoomed || cropping || event.button !== 0) return;
    event.stopPropagation();
    beginGesture(event, true);
    setPanning(true);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current || cropping || masksMode || roiMode !== "none" || event.button !== 0) return;
    if ((event.target as HTMLElement).closest?.(INTERACTIVE)) return;
    beginGesture(event, zoomed);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.moved && Math.hypot(dx, dy) > 3) {
      gesture.moved = true;
      if (gesture.pan) setPanning(true);
    }
    if (gesture.moved && gesture.pan && layout && viewSize && loupe.scale !== null) {
      setLoupe({ scale: loupe.scale, ...clampCenter(gesture.cx - dx / layout.photo.width, gesture.cy - dy / layout.photo.height, layout.photo, viewSize) });
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    setPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (gesture.moved || spaceHeld || event.type === "pointercancel") return;
    const anchor = anchorAt(event.clientX, event.clientY);
    if (anchor && anchor.px >= 0 && anchor.px <= 1 && anchor.py >= 0 && anchor.py <= 1) toggleScale(anchor);
  };

  const cursor = cropping ? undefined
    : (zoomed && (spaceHeld || (!masksMode && roiMode === "none"))) ? (panning ? "grabbing" : "grab")
    : (!masksMode && roiMode === "none" && imageBounds) ? "zoom-in"
    : undefined;

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
      ref={surfaceRef}
      onPointerDownCapture={onPointerDownCapture}
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
            transform: zoomed ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : undefined,
            cursor,
          }}
        >
          <CinematicEditor
            gradeGraph={gradeGraph}
            settings={displaySettings}
            imageUrl={imageSrc}
            rawSource={rawSource}
            split={split}
            showClipping={!cropping && shell.showClipping}
            onStatsUpdate={setHistogram}
            textOverlay={cropping ? undefined : textOverlay}
            setTextOverlay={setTextOverlay}
            watermark={watermark}
            performanceMode={performanceMode}
            compositionGuide={cropping ? "off" : compositionGuide}
            onBoundsChange={setImageBounds}
            maskOverlayPlateId={maskOverlayPlateId}
            maskColorSamplerRef={maskColorSamplerRef}
            pickingMaskColor={masksMode && shell.picking !== null}
            view={zoomed ? view : undefined}
            onOutputSize={onOutputSize}
          />

          {imageBounds && (
            <div
              ref={frameRef}
              data-testid="photo-frame"
              className="pointer-events-none absolute"
              style={{ left: imageBounds.left, top: imageBounds.top, width: imageBounds.width, height: imageBounds.height }}
            >
              {cropping && <CropOverlay crop={crop} />}
              {masksMode && !shell.preview && (
                <div className={isFullCrop(displayedCrop) ? "absolute inset-0" : "absolute inset-0 overflow-hidden"}>
                  <div className="absolute" style={{
                    left: -imageBounds.width * displayedCrop.x / displayedCrop.width,
                    top: -imageBounds.height * displayedCrop.y / displayedCrop.height,
                    width: imageBounds.width / displayedCrop.width,
                    height: imageBounds.height / displayedCrop.height,
                  }}>
                    <MaskCanvasTools
                      size={{ width: imageBounds.width / displayedCrop.width, height: imageBounds.height / displayedCrop.height }}
                      sampleColor={maskColorSamplerRef} crop={displayedCrop}
                    />
                  </div>
                </div>
              )}
              <AnimatePresence>
                {!cropping && shell.compare !== "off" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 top-3 flex justify-between px-3">
                    <span className="ui-glass rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--ui-text)]">Before</span>
                    {shell.compare === "split" && <span className="ui-glass rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--ui-text)]">After</span>}
                  </motion.div>
                )}
              </AnimatePresence>
              {!cropping && shell.compare === "split" && (
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

          {!cropping && <GridOverlay mode={gridOverlayMode} bounds={imageBounds} />}

          {!cropping && imageBounds && roiMode === "source" && (
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
        {!cropping && shell.preview && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="ui-glass pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full px-3 py-1.5 text-[11.5px] font-medium"
          >
            Preview
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

      {imageSrc && zoomed && layout && <Navigator sample={histogram?.scopeSample} window={layout.window} onCenter={centerOn} />}

      {imageSrc && !shell.panelsHidden && !cropping && <CanvasToolbar scale={currentScale} fit={fit} onZoom={(scale) => zoomTo(scale)} />}
    </div>
  );
}
