"use client";

import React, { useId, useRef, useState } from "react";
import { Tooltip } from "./Tooltip";

export interface DevSliderProps {
  label: string;
  /** Accessible slider name when the visible label is abbreviated (e.g. "Lum"). */
  ariaLabel?: string;
  value: number;
  min: number;
  max: number;
  defaultValue?: number;
  /** Keyboard step in internal units (Shift ×10, Alt ÷10). */
  step?: number;
  onChange: (value: number) => void;
  /** Fired once when an interaction ends: pointer up, Enter, key up, reset. */
  onCommit?: (value: number) => void;
  /** Displayed value text; defaults to a signed −100…100 style scale. */
  format?: (value: number) => string;
  /** Converts typed text back to internal units. */
  parse?: (text: string) => number | null;
  /** CSS background for a semantic track (e.g. a temperature gradient). */
  track?: string;
  hint?: string;
  disabled?: boolean;
  /** Quiet explanation shown when this control depends on another control being active. */
  disabledHint?: string;
  /** Render disabledHint inline under the track (defaults to true; set false to avoid repeating on paired sliders). */
  showDisabledCaption?: boolean;
}

const FINE_DRAG = 0.1;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function defaultFormat(value: number, min: number, max: number): string {
  const span = Math.max(Math.abs(min), Math.abs(max));
  const scaled = span <= 1.0001 ? value * 100 : value;
  const digits = span <= 1.0001 || span >= 20 ? 0 : 2;
  const text = scaled.toFixed(digits);
  if (Number(text) === 0) return (0).toFixed(digits);
  return min < 0 && scaled > 0 ? `+${text}` : text;
}

function defaultParse(text: string, min: number, max: number): number | null {
  const parsed = Number.parseFloat(text.replace(/[^\d.+-]/g, ""));
  if (!Number.isFinite(parsed)) return null;
  const span = Math.max(Math.abs(min), Math.abs(max));
  return span <= 1.0001 ? parsed / 100 : parsed;
}

/**
 * The Develop slider. Click the track to jump, drag the thumb relatively,
 * hold Alt for fine control, double-click to reset, click the number to type.
 */
export function DevSlider({
  label,
  ariaLabel,
  value,
  min,
  max,
  defaultValue = 0,
  step,
  onChange,
  onCommit,
  format,
  parse,
  track,
  hint,
  disabled,
  disabledHint,
  showDisabledCaption = true,
}: DevSliderProps) {
  const id = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startValue: number; width: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  // Props lag behind emitted values during a drag; commit the latest emitted one.
  const latestRef = useRef(value);

  const safeValue = Number.isFinite(value) ? value : defaultValue;
  const range = max - min || 1;
  const keyStep = step ?? range / 200;
  const pct = ((clamp(safeValue, min, max) - min) / range) * 100;
  const defaultPct = ((clamp(defaultValue, min, max) - min) / range) * 100;
  const changed = Math.abs(safeValue - defaultValue) > 1e-9;
  const text = format ? format(safeValue) : defaultFormat(safeValue, min, max);

  const emit = (next: number) => {
    const clamped = clamp(next, min, max);
    latestRef.current = clamped;
    if (clamped !== safeValue) onChange(clamped);
    return clamped;
  };

  const reset = () => {
    if (disabled) return;
    onChange(defaultValue);
    onCommit?.(defaultValue);
  };

  const valueAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return safeValue;
    return min + clamp((clientX - rect.left) / rect.width, 0, 1) * range;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0 || event.detail > 1) return;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const onThumb = (event.target as HTMLElement).dataset.thumb === "true";
    const start = onThumb ? safeValue : emit(valueAt(event.clientX));
    dragRef.current = { startX: event.clientX, startValue: start, width: rect.width };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const factor = event.altKey ? FINE_DRAG : 1;
    emit(drag.startValue + ((event.clientX - drag.startX) / drag.width) * range * factor);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
    onCommit?.(latestRef.current);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const multiplier = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
    const deltas: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    if (event.key in deltas) {
      event.preventDefault();
      emit(safeValue + deltas[event.key] * keyStep * multiplier);
    } else if (event.key === "Home") {
      event.preventDefault();
      emit(min);
    } else if (event.key === "End") {
      event.preventDefault();
      emit(max);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      reset();
    }
  };

  const onKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown", "Home", "End"].includes(event.key)) onCommit?.(latestRef.current);
  };

  const commitText = () => {
    if (editing === null) return;
    const parsed = parse ? parse(editing) : defaultParse(editing, min, max);
    setEditing(null);
    if (parsed === null) return;
    const next = clamp(parsed, min, max);
    onChange(next);
    onCommit?.(next);
  };

  const fillLeft = Math.min(pct, defaultPct);
  const fillWidth = Math.abs(pct - defaultPct);
  const showTick = defaultPct > 0.5 && defaultPct < 99.5;

  const effectiveHint = disabled && disabledHint ? disabledHint : hint;
  const labelNode = (
    <label
      htmlFor={id}
      onDoubleClick={reset}
      className={`truncate text-[12px] transition-colors ${disabled ? "cursor-not-allowed text-[var(--ui-text-3)]" : `cursor-default ${changed ? "text-[var(--ui-text)]" : "text-[var(--ui-text-2)]"} group-hover/slider:text-[var(--ui-text)]`}`}
    >
      {label}
    </label>
  );

  return (
    <div className="group/slider relative py-[3px]">
      <div className={disabled ? "opacity-45" : ""}>
        <div className="flex h-[18px] items-center justify-between gap-3">
          {effectiveHint ? <Tooltip content={effectiveHint} side="left">{labelNode}</Tooltip> : labelNode}
          {editing !== null && !disabled ? (
            <input
              autoFocus
              value={editing}
              onChange={(event) => setEditing(event.target.value)}
              onBlur={commitText}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitText();
                if (event.key === "Escape") setEditing(null);
              }}
              className="ui-num h-[18px] w-[56px] rounded-[4px] bg-[var(--ui-control)] px-1.5 text-right text-[12px] text-[var(--ui-text)] outline-none ring-1 ring-[var(--ui-accent)]"
            />
          ) : (
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => !disabled && setEditing(text.replace(/^\+/, ""))}
              onDoubleClick={reset}
              className={`ui-num h-[18px] min-w-[44px] rounded-[4px] px-1 text-right text-[12px] transition-colors ${disabled ? "cursor-not-allowed text-[var(--ui-text-3)]" : `hover:bg-white/[0.06] ${changed ? "text-[var(--ui-text)]" : "text-[var(--ui-text-3)]"}`}`}
            >
              {text}
            </button>
          )}
        </div>
        <div
          id={id}
          ref={trackRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={ariaLabel ?? label}
          aria-disabled={disabled ? "true" : undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={safeValue}
          aria-valuetext={text}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={reset}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          className={`group/track relative h-[16px] touch-none outline-none ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div
            className={`absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full ${track ? "h-[4px] opacity-80" : "h-[3px] bg-white/[0.09]"}`}
            style={track ? { background: track } : undefined}
          />
          {!track && fillWidth > 0 && (
            <div
              className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[var(--ui-accent)] opacity-80"
              style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
            />
          )}
          {showTick && (
            <div className="absolute top-1/2 h-[7px] w-px -translate-x-1/2 -translate-y-1/2 bg-white/25" style={{ left: `${defaultPct}%` }} />
          )}
          <div
            data-thumb="true"
            className={`absolute top-1/2 h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5f5f7] shadow-[0_1px_3px_rgba(0,0,0,0.6),0_0_0_0.5px_rgba(0,0,0,0.5)] transition-[transform,box-shadow] duration-150 ${disabled ? "" : "group-hover/track:scale-110 group-focus-visible/track:ring-2 group-focus-visible/track:ring-[var(--ui-accent)]"} ${dragging ? "scale-110" : ""}`}
            style={{ left: `${pct}%`, transitionTimingFunction: "var(--ui-ease)" }}
          />
        </div>
      </div>
      {disabled && disabledHint && showDisabledCaption && (
        <p className="mb-1.5 mt-0.5 text-[10.5px] leading-tight text-[var(--ui-text-3)]">{disabledHint}</p>
      )}
    </div>
  );
}
