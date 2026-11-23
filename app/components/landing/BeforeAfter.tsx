"use client";

import React, { useCallback, useRef, useState } from "react";

/** Drag, click or use the arrow keys to compare two renders of the same photo. */
export function BeforeAfter({ before, after, beforeLabel, afterLabel, alt, priority }: {
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
  alt: string;
  priority?: boolean;
}) {
  const [position, setPosition] = useState(0.5);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const moveTo = useCallback((clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setPosition(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)));
  }, []);

  return (
    <div
      ref={frame}
      className="group relative aspect-[4/5] w-full touch-pan-y select-none overflow-hidden rounded-[20px] bg-[#111] shadow-[0_50px_120px_-40px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.06)]"
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event.clientX);
      }}
      onPointerMove={(event) => { if (dragging.current) moveTo(event.clientX); }}
      onPointerUp={(event) => {
        dragging.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={alt} className="absolute inset-0 h-full w-full object-cover" draggable={false} fetchPriority={priority ? "high" : undefined} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={before}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${(1 - position) * 100}% 0 0)` }}
        draggable={false}
      />

      <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">{beforeLabel}</span>
      <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">{afterLabel}</span>

      <div
        role="slider"
        tabIndex={0}
        aria-label={`Compare ${beforeLabel.toLowerCase()} and ${afterLabel.toLowerCase()}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position * 100)}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.1 : 0.03;
          if (event.key === "ArrowLeft") { event.preventDefault(); setPosition((value) => Math.max(0, value - step)); }
          if (event.key === "ArrowRight") { event.preventDefault(); setPosition((value) => Math.min(1, value + step)); }
          if (event.key === "Home") { event.preventDefault(); setPosition(0); }
          if (event.key === "End") { event.preventDefault(); setPosition(1); }
        }}
        className="absolute inset-y-0 z-10 w-10 -translate-x-1/2 cursor-ew-resize outline-none focus-visible:[&>span:last-child]:ring-2 focus-visible:[&>span:last-child]:ring-[#5b9bff]"
        style={{ left: `${position * 100}%` }}
      >
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.5)]" />
        <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#111] shadow-[0_6px_24px_rgba(0,0,0,0.45)] transition-transform group-active:scale-95">
          <svg width="16" height="12" viewBox="0 0 14 10" aria-hidden>
            <path d="M4 1 L0.8 5 L4 9 M10 1 L13.2 5 L10 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}
