"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconEyeOff, IconGripVertical, IconPictureInPictureOff } from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import { useShell } from "../shell/useShell";
import { Tooltip } from "../../ui/Tooltip";
import { HistogramPlot } from "./HistogramView";
import {
  clampHistogramPosition,
  defaultHistogramPosition,
  FLOATING_HISTOGRAM_FALLBACK_HEIGHT,
  FLOATING_HISTOGRAM_WIDTH,
  formatHistogramCaption,
  TOP_BAR_HEIGHT,
  type HistogramPosition,
  type ViewportSize,
} from "./histogramLayout";

const INTERACTIVE_SELECTOR = "button, a, input, select, textarea";

function readViewport(): ViewportSize {
  if (typeof window === "undefined") return { width: 1280, height: 800 };
  return { width: window.innerWidth, height: window.innerHeight };
}

function FloatingHistogramCard() {
  const { histogram, sourceCameraMetadata, imageInfo } = useEditorState();
  const shell = useShell();
  const panelRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportSize>(readViewport);
  const [panelSize, setPanelSize] = useState<ViewportSize>({
    width: FLOATING_HISTOGRAM_WIDTH,
    height: FLOATING_HISTOGRAM_FALLBACK_HEIGHT,
  });
  const [dragPosition, setDragPosition] = useState<HistogramPosition | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    latest: HistogramPosition;
  } | null>(null);

  useEffect(() => {
    const onResize = () => setViewport(readViewport());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const element = panelRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      // Layout size, not getBoundingClientRect: the panel scales in from 96%,
      // and a mid-animation measurement would shift the default and reset positions.
      const width = Math.round(element.offsetWidth);
      const height = Math.round(element.offsetHeight);
      if (width <= 0 || height <= 0) return;
      setPanelSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const topInset = shell.panelsHidden ? 0 : TOP_BAR_HEIGHT;
  const resolvedPosition = dragPosition
    ? clampHistogramPosition(dragPosition, viewport, panelSize, topInset)
    : shell.histogramPosition
      ? clampHistogramPosition(shell.histogramPosition, viewport, panelSize, topInset)
      : defaultHistogramPosition(viewport, panelSize, topInset);

  const isDragging = dragPosition !== null;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;
    event.stopPropagation();
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - resolvedPosition.x,
      offsetY: event.clientY - resolvedPosition.y,
      latest: resolvedPosition,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragPosition(resolvedPosition);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = clampHistogramPosition(
      { x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY },
      viewport,
      panelSize,
      topInset,
    );
    drag.latest = next;
    setDragPosition(next);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const finalPosition = drag.latest;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragPosition(null);
    shell.setHistogramPosition(finalPosition);
  };

  const onHandleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 32 : 12;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -step;
    else if (event.key === "ArrowRight") dx = step;
    else if (event.key === "ArrowUp") dy = -step;
    else if (event.key === "ArrowDown") dy = step;
    else return;
    event.preventDefault();
    shell.setHistogramPosition(
      clampHistogramPosition(
        { x: resolvedPosition.x + dx, y: resolvedPosition.y + dy },
        viewport,
        panelSize,
        topInset,
      ),
    );
  };

  const caption = formatHistogramCaption(
    sourceCameraMetadata,
    imageInfo ? { width: imageInfo.width, height: imageInfo.height } : null,
  );

  return (
    <motion.div
      ref={panelRef}
      role="region"
      aria-label="Floating histogram"
      data-testid="histogram-floating"
      data-export-ignore="true"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        left: resolvedPosition.x,
        top: resolvedPosition.y,
        width: FLOATING_HISTOGRAM_WIDTH,
        maxWidth: "calc(100vw - 24px)",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`ui-glass fixed z-[45] select-none touch-none rounded-[12px] p-2.5 ring-1 ring-inset ${
        isDragging
          ? "cursor-grabbing ring-[var(--ui-accent)]/50"
          : "cursor-grab ring-[var(--ui-line-strong)]"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div
          tabIndex={0}
          role="group"
          aria-label="Drag histogram handle"
          data-testid="histogram-drag-handle"
          onKeyDown={onHandleKeyDown}
          className="ui-focus flex min-w-0 flex-1 items-center gap-1 rounded-[6px] py-0.5 pr-1 text-[var(--ui-text-2)]"
        >
          <IconGripVertical size={13} stroke={1.8} className="shrink-0 text-[var(--ui-text-3)]" aria-hidden />
          <span className="truncate text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ui-text-2)]">
            Histogram
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Tooltip content="Dock histogram" shortcut="⇧H" side="bottom">
            <button
              type="button"
              aria-label="Dock histogram"
              onClick={() => shell.setHistogramDetached(false)}
              className="ui-focus grid h-6 w-6 cursor-pointer place-items-center rounded-[6px] text-[var(--ui-text-3)] transition-colors hover:bg-white/[0.08] hover:text-[var(--ui-text)]"
            >
              <IconPictureInPictureOff size={14} stroke={1.7} />
            </button>
          </Tooltip>
          <Tooltip content="Hide histogram" shortcut="H" side="bottom">
            <button
              type="button"
              aria-label="Hide histogram"
              onClick={() => shell.setHistogramVisible(false)}
              className="ui-focus grid h-6 w-6 cursor-pointer place-items-center rounded-[6px] text-[var(--ui-text-3)] transition-colors hover:bg-white/[0.08] hover:text-[var(--ui-text)]"
            >
              <IconEyeOff size={14} stroke={1.7} />
            </button>
          </Tooltip>
        </div>
      </div>

      <HistogramPlot
        histogram={histogram}
        showClipping={shell.showClipping}
        onToggleClipping={() => shell.setShowClipping(!shell.showClipping)}
        caption={caption}
      />
    </motion.div>
  );
}

/** Movable floating histogram overlay, shown when detached and visible. */
export function FloatingHistogram() {
  const shell = useShell();
  const open = shell.histogramVisible && shell.histogramDetached && !shell.panelsHidden;
  return (
    <AnimatePresence>
      {open && <FloatingHistogramCard key="floating-histogram" />}
    </AnimatePresence>
  );
}
