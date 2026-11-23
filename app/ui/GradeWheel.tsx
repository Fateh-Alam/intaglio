"use client";

import React, { useEffect, useRef, useState } from "react";
import { oklabToSrgb8 } from "../utils/oklab";

/** Matches ColorWheelsPass: full strength pushes OKLab a/b by this much. */
const MAX_PUSH = 0.12;
const PREVIEW_L = 0.66;

export interface WheelValue {
  /** Hue as a fraction of a turn (OKLab a/b angle). */
  h: number;
  /** Push strength, 0 (none) to 1 (full). */
  s: number;
}

interface GradeWheelProps {
  value: WheelValue;
  size: number;
  label: string;
  onChange: (value: WheelValue) => void;
}

const cache = new Map<number, string>();

/** Paints each point as the exact OKLab push it applies to a mid-grey. */
function wheelImage(size: number): string {
  const cached = cache.get(size);
  if (cached) return cached;
  const scale = 2;
  const pixels = size * scale;
  const canvas = document.createElement("canvas");
  canvas.width = pixels;
  canvas.height = pixels;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const image = context.createImageData(pixels, pixels);
  const radius = pixels / 2;
  for (let y = 0; y < pixels; y++) {
    for (let x = 0; x < pixels; x++) {
      const dx = (x + 0.5 - radius) / radius;
      const dy = (radius - y - 0.5) / radius;
      const distance = Math.hypot(dx, dy);
      const index = (y * pixels + x) * 4;
      if (distance > 1) continue;
      const push = Math.min(distance, 1) * MAX_PUSH;
      const angle = Math.atan2(dy, dx);
      const [r, g, b] = oklabToSrgb8(PREVIEW_L, Math.cos(angle) * push, Math.sin(angle) * push);
      const edge = Math.min(1, (1 - distance) * radius);
      image.data[index] = r;
      image.data[index + 1] = g;
      image.data[index + 2] = b;
      image.data[index + 3] = Math.round(255 * edge);
    }
  }
  context.putImageData(image, 0, 0);
  const url = canvas.toDataURL();
  cache.set(size, url);
  return url;
}

/**
 * Color grading wheel. Drag anywhere to push color; hold Shift to change only
 * strength, Alt for fine control; double-click to reset.
 */
export function GradeWheel({ value, size, label, onChange }: GradeWheelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; start: WheelValue } | null>(null);
  const [image, setImage] = useState("");
  const [active, setActive] = useState(false);

  useEffect(() => {
    setImage(wheelImage(size));
  }, [size]);

  const angle = value.h * Math.PI * 2;
  const radius = size / 2;
  const puckX = radius + Math.cos(angle) * value.s * radius;
  const puckY = radius - Math.sin(angle) * value.s * radius;
  const [pr, pg, pb] = oklabToSrgb8(PREVIEW_L, Math.cos(angle) * value.s * MAX_PUSH, Math.sin(angle) * value.s * MAX_PUSH);

  const toValue = (dx: number, dy: number, shift: boolean): WheelValue => {
    const strength = Math.min(1, Math.hypot(dx, dy) / radius);
    if (shift) return { h: value.h, s: strength };
    const turn = Math.atan2(-dy, dx) / (Math.PI * 2);
    return { h: (turn + 1) % 1, s: strength };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.detail > 1) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const onPuck = (event.target as HTMLElement).dataset.puck === "true";
    const next = onPuck ? value : toValue(event.clientX - rect.left - radius, event.clientY - rect.top - radius, event.shiftKey);
    if (!onPuck) onChange(next);
    dragRef.current = { x: event.clientX, y: event.clientY, start: next };
    setActive(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const factor = event.altKey ? 0.15 : 1;
    const startAngle = drag.start.h * Math.PI * 2;
    const startX = Math.cos(startAngle) * drag.start.s * radius;
    const startY = -Math.sin(startAngle) * drag.start.s * radius;
    onChange(toValue(startX + (event.clientX - drag.x) * factor, startY + (event.clientY - drag.y) * factor, event.shiftKey));
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setActive(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.15 : event.altKey ? 0.01 : 0.05;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange({ h: value.h, s: Math.min(1, value.s + step) });
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      const nextS = Math.max(0, value.s - step);
      onChange({ h: nextS === 0 ? 0 : value.h, s: nextS });
    } else if (event.key === "End") {
      event.preventDefault();
      onChange({ h: value.h, s: 1 });
    } else if (event.key === "Home" || event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      onChange({ h: 0, s: 0 });
    } else if (event.key === "PageUp") {
      event.preventDefault();
      onChange({ h: (value.h + 1 / 24) % 1, s: value.s || 0.25 });
    } else if (event.key === "PageDown") {
      event.preventDefault();
      onChange({ h: (value.h - 1 / 24 + 1) % 1, s: value.s || 0.25 });
    }
  };

  const hueDegrees = Math.round(value.h * 360);
  const strength = Math.round(value.s * 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label={`${label} color`}
        aria-valuenow={strength}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={strength === 0 ? "Neutral" : `Hue ${hueDegrees}°, strength ${strength}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onDoubleClick={() => onChange({ h: 0, s: 0 })}
        className="ui-focus group/wheel relative cursor-crosshair touch-none rounded-full"
        style={{ width: size, height: size }}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full rounded-full" />
        )}
        <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_2px_12px_rgba(0,0,0,0.35)]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-black/30" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-black/30" />
        <div
          data-puck="true"
          className={`absolute h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.7)] transition-transform duration-150 ${active ? "scale-125" : "group-hover/wheel:scale-110"}`}
          style={{ left: puckX, top: puckY, background: `rgb(${pr} ${pg} ${pb})` }}
        />
      </div>
      <div className="flex w-full items-center justify-between px-0.5 text-[11px]">
        <span className="text-[var(--ui-text-2)]">{label}</span>
        <span className="ui-num text-[var(--ui-text-3)]">{strength === 0 ? "—" : `${hueDegrees}° · ${strength}`}</span>
      </div>
    </div>
  );
}
