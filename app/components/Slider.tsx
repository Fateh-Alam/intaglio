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
  onChange: (v: any) => void;
  icon: React.ReactNode;
  accentColor?: string;
  bipolar?: boolean;
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const isModified = Math.abs(value - defaultValue) > 0.001;

  // For bipolar sliders (e.g., -1 to 1), calculate center position
  const centerPercentage = bipolar ? ((0 - min) / (max - min)) * 100 : 0;

  const accentColors: Record<string, string> = {
    amber: "bg-gradient-to-r from-amber-600 to-amber-400",
    purple: "bg-gradient-to-r from-purple-600 to-purple-400",
    cyan: "bg-gradient-to-r from-cyan-600 to-cyan-400",
    orange: "bg-gradient-to-r from-orange-600 to-orange-400",
    green: "bg-gradient-to-r from-green-600 to-green-400",
  };

  return (
    <div className="space-y-2 group relative">
      <div className="flex justify-between items-center text-gray-400 group-hover:text-gray-200 transition">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 group-hover:text-gray-400 transition">
            {icon}
          </span>
          <label className="font-mono text-[11px] font-medium">{label}</label>
        </div>
        <div className="flex items-center gap-2">
          {isModified && (
            <button
              onClick={() => onChange(defaultValue)}
              className="md:opacity-0 md:group-hover:opacity-100 text-[8px] uppercase tracking-widest px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded transition text-gray-500 hover:text-white"
            >
              Reset
            </button>
          )}
          <span
            className={`text-[10px] font-mono tracking-wider px-2 py-0.5 rounded ${isModified ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-gray-500"}`}
          >
            {value.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="relative h-3 md:h-2 bg-gray-800/80 rounded-full overflow-hidden group-hover:bg-gray-700/80 transition">
        {/* Background track */}
        <div className="absolute inset-0 rounded-full" />

        {/* Center zero indicator for bipolar sliders */}
        {bipolar && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/30 z-10"
            style={{ left: `${centerPercentage}%` }}
          />
        )}

        {/* Value track */}
        {bipolar ? (
          // Bipolar: fill from center
          value >= 0 ? (
            <div
              className={`absolute top-0 bottom-0 ${accentColors[accentColor] || accentColors.amber} rounded-r-full transition-all duration-150`}
              style={{
                left: `${centerPercentage}%`,
                width: `${percentage - centerPercentage}%`,
              }}
            />
          ) : (
            <div
              className={`absolute top-0 bottom-0 ${accentColors[accentColor] || accentColors.amber} rounded-l-full transition-all duration-150`}
              style={{
                left: `${percentage}%`,
                width: `${centerPercentage - percentage}%`,
              }}
            />
          )
        ) : (
          // Regular: fill from left
          <div
            className={`absolute top-0 bottom-0 left-0 ${accentColors[accentColor] || accentColors.amber} rounded-full transition-all duration-150`}
            style={{ width: `${percentage}%` }}
          />
        )}

        {/* Thumb indicator - always visible on mobile */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 md:w-3 md:h-3 bg-white rounded-full shadow-lg shadow-black/50 md:opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `calc(${percentage}% - 8px)` }}
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
