import React from "react";
import type { HistogramData } from "../../types/editor";
import { HistogramGraph, RgbParadeGraph, getColorCastLabel, ScopeMetric } from "./HistogramGraph";

export function AnalysisPanel({
  histogram,
  isExpanded = true,
}: {
  histogram: HistogramData | null;
  isExpanded?: boolean;
}) {
  if (!isExpanded) return null;

  return (
    <div className="flex flex-col gap-3 p-4 border-b border-white/5 bg-[#14130f]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
          Scopes & Analysis
        </span>
      </div>

      {/* Primary Histogram */}
      <div className="relative h-[120px] w-full overflow-hidden rounded-sm bg-black/40">
        <HistogramGraph data={histogram} />
      </div>
      
      {/* RGB Parade */}
      <div className="mt-1 relative h-[80px] w-full overflow-hidden rounded-sm bg-black/40">
        <RgbParadeGraph data={histogram} />
      </div>

      {/* Metrics Grid */}
      {histogram && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <ScopeMetric
            label="Shadow Clip"
            value={`${(histogram.shadowClipPct * 100).toFixed(1)}%`}
            tone={histogram.shadowClipPct > 0.05 ? "warn" : "neutral"}
          />
          <ScopeMetric
            label="Highlight Clip"
            value={`${(histogram.highlightClipPct * 100).toFixed(1)}%`}
            tone={histogram.highlightClipPct > 0.05 ? "warn" : "neutral"}
          />
          <ScopeMetric
            label="Contrast Ratio"
            value={(histogram.contrastP95P5 * 100).toFixed(1)}
            tone="neutral"
          />
          <ScopeMetric
            label="Color Cast"
            value={getColorCastLabel(histogram)}
            tone={getColorCastLabel(histogram) === "Neutral" ? "ok" : "warn"}
          />
        </div>
      )}
    </div>
  );
}
