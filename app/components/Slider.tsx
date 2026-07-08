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
    amber: "bg-[var(--intaglio-brass)]",
    purple: "bg-[var(--intaglio-copper)]",
    cyan: "bg-[var(--intaglio-brass)]",
    orange: "bg-[var(--intaglio-copper)]",
    green: "bg-[var(--intaglio-brass)]",
  };

  return (
    <div className="group relative space-y-2 py-1">
      <div className="flex items-center justify-between gap-3 text-white/60 transition group-hover:text-white/90">
        <div className="flex items-center gap-2">
          <span className="text-white/40 transition group-hover:text-white/80">
            {icon}
          </span>
          <label className="text-xs font-medium text-white/80">
            {label}
          </label>
        </div>
        <div className="flex items-center gap-2">
          {isModified && (
            <div role="button"
              onClick={() => onChange(defaultValue)}
              className="px-2 py-0.5 text-[10px] font-medium text-white/40 transition hover:text-white md:opacity-0 md:group-hover:opacity-100"
            >
              Reset
            </div>
          )}
          <span
            className={`min-w-[36px] text-right font-mono text-xs font-medium ${
              isModified ? "text-blue-400" : "text-white/50"
            }`}
          >
            {value.toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="relative h-4 flex items-center">
        {/* Background track */}
        <div className="absolute left-0 right-0 h-1.5 rounded-full bg-white/10 transition-colors group-hover:bg-white/[0.15]" />

        {/* Center zero indicator for bipolar sliders */}
        {bipolar && (
          <div
            className="absolute h-2.5 w-0.5 rounded-full bg-white/30 top-1/2 -translate-y-1/2 z-10"
            style={{ left: `${centerPercentage}%` }}
          />
        )}

        {/* Value track */}
        {bipolar ? (
          value >= 0 ? (
            <div
              className={`absolute h-1.5 rounded-full ${accentColors[accentColor] || "bg-blue-500"} transition-all duration-150`}
              style={{
                left: `${centerPercentage}%`,
                width: `${percentage - centerPercentage}%`,
              }}
            />
          ) : (
            <div
              className={`absolute h-1.5 rounded-full ${accentColors[accentColor] || "bg-blue-500"} transition-all duration-150`}
              style={{
                left: `${percentage}%`,
                width: `${centerPercentage - percentage}%`,
              }}
            />
          )
        ) : (
          <div
            className={`absolute left-0 h-1.5 rounded-full ${accentColors[accentColor] || "bg-blue-500"} transition-all duration-150`}
            style={{ width: `${percentage}%` }}
          />
        )}

        {/* Thumb indicator - Native Circular Thumb */}
        <div
          className="pointer-events-none absolute h-3.5 w-3.5 rounded-full -translate-x-1/2 bg-white shadow-md border border-black/10 transition-transform md:scale-90 md:group-hover:scale-110 z-20"
          style={{ left: `${percentage}%` }}
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
        className="absolute bottom-0 left-0 right-0 h-full w-full opacity-0 cursor-pointer touch-pan-y"
      />
    </div>
  );
};

export default Slider;
