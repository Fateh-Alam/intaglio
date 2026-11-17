"use client";

import React, { useEffect, useRef } from "react";
import type { HistogramData } from "../../types/editor";

const WIDTH = 176;

/**
 * Loupe navigator: the whole graded frame with the visible region outlined.
 * Click or drag to move the loupe.
 */
export function Navigator({ sample, window: shown, onCenter }: {
  sample?: HistogramData["scopeSample"];
  window: { x0: number; y0: number; x1: number; y1: number };
  onCenter: (cx: number, cy: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sample) return;
    // Read back from WebGL, so rows are bottom-up.
    const { pixels, width, height } = sample;
    const rows = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) rows.set(pixels.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.putImageData(new ImageData(rows, width, height), 0, 0);
  }, [sample]);

  if (!sample) return null;
  const height = Math.round(WIDTH * sample.height / sample.width);

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onCenter((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  };

  return (
    <div className="ui-glass pointer-events-auto absolute right-4 top-4 z-30 hidden rounded-[12px] p-1.5 sm:block" data-export-ignore="true">
      <div
        role="group"
        aria-label="Navigator"
        className="relative cursor-pointer touch-none overflow-hidden rounded-[7px]"
        style={{ width: WIDTH, height }}
        onPointerDown={(event) => {
          event.stopPropagation();
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          move(event);
        }}
        onPointerMove={(event) => { if (dragging.current) move(event); }}
        onPointerUp={(event) => {
          dragging.current = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
        <div
          data-testid="navigator-view"
          className="pointer-events-none absolute rounded-[2px] border border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          style={{
            left: `${shown.x0 * 100}%`,
            top: `${shown.y0 * 100}%`,
            width: `${(shown.x1 - shown.x0) * 100}%`,
            height: `${(shown.y1 - shown.y0) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
