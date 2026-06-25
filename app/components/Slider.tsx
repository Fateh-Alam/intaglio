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
  accentColor = "amber",
  bipolar = false,
}: {
  label: string;
  value: number;
  defaultValue?: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  icon: React.ReactNode;
  accentColor?: string;
  bipolar?: boolean;
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const isModified = Math.abs(value - defaultValue) > 0.001;

  // For bipolar sliders (e.g., -1 to 1), calculate center position
  const centerPercentage = bipolar ? ((0 - min) / (max - min)) * 100 : 0;

  const accentColors: Record<string, string> = {
    amber: "bg-[var(--ormond-brass)]",
    purple: "bg-[var(--ormond-oxblood)]",
    cyan: "bg-[var(--ormond-green)]",
    orange: "bg-[var(--ormond-copper)]",
    green: "bg-[var(--ormond-olive)]",
  };

  return (
    <div className="group relative space-y-2">
      <div className="flex items-center justify-between gap-3 text-[rgba(231,223,208,0.58)] transition group-hover:text-[rgba(231,223,208,0.86)]">
        <div className="flex items-center gap-2">
          <span className="text-[rgba(231,223,208,0.35)] transition group-hover:text-[rgba(231,223,208,0.62)]">
            {icon}
          </span>
          <label className="font-mono text-[10px] font-medium uppercase tracking-[0.18em]">
            {label}
          </label>
        </div>
        <div className="flex items-center gap-2">
          {isModified && (
            <button
              onClick={() => onChange(defaultValue)}
              className="border border-[var(--ormond-line)] bg-black/20 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-[rgba(231,223,208,0.42)] transition hover:border-[var(--ormond-line-strong)] hover:text-[var(--ormond-paper)] md:opacity-0 md:group-hover:opacity-100"
            >
              Reset
            </button>
          )}
          <span
            className={`min-w-[48px] border px-2 py-1 text-right font-mono text-[10px] tracking-wider ${
              isModified
                ? "border-[rgba(176,138,82,0.38)] bg-[rgba(176,138,82,0.12)] text-[var(--ormond-paper)]"
                : "border-[var(--ormond-line)] bg-black/20 text-[rgba(231,223,208,0.42)]"
            }`}
          >
            {value.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="relative h-2 overflow-hidden bg-[rgba(231,223,208,0.1)] transition group-hover:bg-[rgba(231,223,208,0.14)]">
        {/* Background track */}
        <div className="absolute inset-0" />

        {/* Center zero indicator for bipolar sliders */}
        {bipolar && (
          <div
            className="absolute bottom-0 top-0 z-10 w-px bg-[rgba(231,223,208,0.34)]"
            style={{ left: `${centerPercentage}%` }}
          />
        )}

        {/* Value track */}
        {bipolar ? (
          // Bipolar: fill from center
          value >= 0 ? (
            <div
              className={`absolute bottom-0 top-0 ${accentColors[accentColor] || accentColors.amber} transition-all duration-150`}
              style={{
                left: `${centerPercentage}%`,
                width: `${percentage - centerPercentage}%`,
              }}
            />
          ) : (
            <div
              className={`absolute bottom-0 top-0 ${accentColors[accentColor] || accentColors.amber} transition-all duration-150`}
              style={{
                left: `${percentage}%`,
                width: `${centerPercentage - percentage}%`,
              }}
            />
          )
        ) : (
          // Regular: fill from left
          <div
            className={`absolute bottom-0 left-0 top-0 ${accentColors[accentColor] || accentColors.amber} transition-all duration-150`}
            style={{ width: `${percentage}%` }}
          />
        )}

        {/* Thumb indicator - always visible on mobile */}
        <div
          className="pointer-events-none absolute top-1/2 h-3.5 w-1.5 -translate-y-1/2 bg-[var(--ormond-paper)] shadow-lg shadow-black/50 transition-opacity md:opacity-0 md:group-hover:opacity-100"
          style={{ left: `calc(${percentage}% - 3px)` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onDoubleClick={() => onChange(defaultValue)}
        className="absolute bottom-0 left-0 right-0 h-10 md:h-6 opacity-0 cursor-pointer touch-pan-y"
      />
    </div>
  );
};

export default Slider;
