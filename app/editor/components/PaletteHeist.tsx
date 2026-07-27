import React from "react";
import type { HistogramData } from "../../types/editor";
import { IconCopy, IconDownload } from "@tabler/icons-react";

export function PaletteHeist({
  histogram,
}: {
  histogram: HistogramData | null;
}) {
  if (!histogram || !histogram.palette || histogram.palette.length === 0) {
    return null;
  }

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
  };

  const handleExportPalette = () => {
    const paletteStr = histogram.palette.join("\n");
    const blob = new Blob([paletteStr], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nyvarra_palette.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3 p-4 border-b border-white/5 bg-[#14130f]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
          Palette Heist
        </span>
        <button
          onClick={handleExportPalette}
          className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[var(--intaglio-brass)] hover:text-white"
        >
          <IconDownload className="intaglio-icon"/>
          Export
        </button>
      </div>

      <div className="flex gap-2 w-full h-[40px]">
        {histogram.palette.map((hex, index) => (
          <div
            key={index}
            className="group relative flex-1 cursor-pointer overflow-hidden rounded-sm transition-all hover:flex-[1.5]"
            style={{ backgroundColor: hex }}
            onClick={() => handleCopyHex(hex)}
            title={`Copy ${hex}`}
          >
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <span className="font-mono text-[9px] tracking-wider text-white">
                {hex}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
