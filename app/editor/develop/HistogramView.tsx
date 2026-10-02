"use client";

import React, { useEffect, useRef } from "react";
import type { HistogramData } from "../../types/editor";
import { Tooltip } from "../../ui/Tooltip";

const HEIGHT = 96;
const CLIP_THRESHOLD = 0.1;

interface HistogramViewProps {
  histogram: HistogramData | null;
  showClipping: boolean;
  onToggleClipping: () => void;
  caption: string;
}

function drawChannel(context: CanvasRenderingContext2D, bins: number[], peak: number, width: number, height: number, color: string) {
  const step = width / (bins.length - 1);
  context.beginPath();
  context.moveTo(0, height);
  for (let i = 0; i < bins.length; i++) {
    // Average neighbours lightly so the shape reads as a smooth tone distribution.
    const value = ((bins[i - 1] ?? bins[i]) + bins[i] * 2 + (bins[i + 1] ?? bins[i])) / 4;
    context.lineTo(i * step, height - Math.min(1, Math.sqrt(value / peak)) * (height - 4));
  }
  context.lineTo(width, height);
  context.closePath();
  context.fillStyle = color;
  context.fill();
}

/** RGB histogram with clipping warnings, drawn additively so overlaps read as white. */
export function HistogramView({ histogram, showClipping, onToggleClipping, caption }: HistogramViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(HEIGHT * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, HEIGHT);
    if (!histogram) return;
    let peak = 0;
    for (const channel of histogram.rgb) for (let i = 2; i < channel.length - 2; i++) peak = Math.max(peak, channel[i]);
    if (peak <= 0) return;
    context.globalCompositeOperation = "lighter";
    drawChannel(context, histogram.rgb[0], peak, width, HEIGHT, "rgba(255, 74, 74, 0.55)");
    drawChannel(context, histogram.rgb[1], peak, width, HEIGHT, "rgba(70, 214, 110, 0.5)");
    drawChannel(context, histogram.rgb[2], peak, width, HEIGHT, "rgba(70, 130, 255, 0.6)");
    context.globalCompositeOperation = "source-over";
  }, [histogram]);

  const shadowClip = (histogram?.shadowClipPct ?? 0) > CLIP_THRESHOLD;
  const highlightClip = (histogram?.highlightClipPct ?? 0) > CLIP_THRESHOLD;

  const triangle = (side: "left" | "right", clipped: boolean, label: string) => (
    <Tooltip content={`${label} clipping ${showClipping ? "shown" : "hidden"}`} shortcut="J" side="bottom">
      <button
        type="button"
        aria-pressed={showClipping}
        aria-label={`${label} clipping`}
        onClick={onToggleClipping}
        className="ui-focus grid h-5 w-5 place-items-center rounded-[4px] hover:bg-white/[0.08]"
      >
        <svg width="9" height="7" viewBox="0 0 9 7" aria-hidden>
          <path
            d={side === "left" ? "M0 0 L9 0 L0 7 Z" : "M0 0 L9 0 L9 7 Z"}
            fill={clipped ? (side === "left" ? "#5b9bff" : "#ff5f57") : showClipping ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.22)"}
          />
        </svg>
      </button>
    </Tooltip>
  );

  return (
    <div className="px-3 pb-2 pt-3">
      <div className="relative overflow-hidden rounded-[10px] bg-black/35 ring-1 ring-inset ring-[var(--ui-line)]">
        <canvas ref={canvasRef} className="block w-full" style={{ height: HEIGHT }} aria-label="Histogram" role="img" />
        <div className="absolute inset-x-1 top-1 flex justify-between">
          {triangle("left", shadowClip, "Shadow")}
          {triangle("right", highlightClip, "Highlight")}
        </div>
        {!histogram && <div className="absolute inset-0 grid place-items-center text-[11px] text-[var(--ui-text-3)]">Reading tones…</div>}
      </div>
      <div className="ui-num mt-1.5 truncate px-0.5 text-center text-[11px] text-[var(--ui-text-3)]">{caption}</div>
    </div>
  );
}
