"use client";

import React from "react";

const Slider = ({
  label,
  value,
  defaultValue = 0,
  min,
  max,
  step = 0.01,
  onChange,
  icon,
  bipolar = false,
}: {
  label: string;
  value: number;
  defaultValue?: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
  accentColor?: string;
  bipolar?: boolean;
}) => {
  const clamped = Math.min(max, Math.max(min, value));
  const percentage = ((clamped - min) / (max - min)) * 100;
  const isModified = Math.abs(value - defaultValue) > 0.001;
  const centerPercentage = bipolar ? ((0 - min) / (max - min)) * 100 : 0;

  return (
    <div className="group relative space-y-1.5 py-1">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--ui-text-2)] transition-colors group-hover:text-[var(--ui-text)]">
          {icon && <span className="text-[var(--ui-text-3)]">{icon}</span>}
          {label}
        </span>
        <div className="flex items-center gap-2">
          {isModified && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              className="ui-focus relative z-30 rounded px-1.5 py-0.5 text-[10.5px] text-[var(--ui-text-3)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
            >
              Reset
            </button>
          )}
          <span
            className={`ui-num min-w-[38px] text-right text-[11.5px] ${
              isModified ? "text-[var(--ui-accent-strong)]" : "text-[var(--ui-text-3)]"
            }`}
          >
            {value.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="relative flex h-4 items-center">
        <div className="absolute left-0 right-0 h-[3px] rounded-full bg-white/[0.12] transition-colors group-hover:bg-white/[0.18]" />

        {bipolar && (
          <div
            className="absolute top-1/2 z-10 h-2.5 w-px -translate-y-1/2 bg-white/30"
            style={{ left: `${centerPercentage}%` }}
          />
        )}

        {bipolar ? (
          value >= 0 ? (
            <div
              className="absolute h-[3px] rounded-full bg-[var(--ui-accent)]"
              style={{
                left: `${centerPercentage}%`,
                width: `${Math.max(0, percentage - centerPercentage)}%`,
              }}
            />
          ) : (
            <div
              className="absolute h-[3px] rounded-full bg-[var(--ui-accent)]"
              style={{
                left: `${percentage}%`,
                width: `${Math.max(0, centerPercentage - percentage)}%`,
              }}
            />
          )
        ) : (
          <div
            className="absolute left-0 h-[3px] rounded-full bg-[var(--ui-accent)]"
            style={{ width: `${percentage}%` }}
          />
        )}

        <div
          className="pointer-events-none absolute z-20 h-3 w-3 -translate-x-1/2 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-transform group-hover:scale-110"
          style={{ left: `${percentage}%` }}
        />

        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onDoubleClick={() => onChange(defaultValue)}
          className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0 touch-pan-y"
        />
      </div>
    </div>
  );
};

export default Slider;
