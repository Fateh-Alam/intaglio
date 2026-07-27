import React from "react";
import { IconDownload, IconX } from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import { EXPORT_RECIPES } from "../pageTypes";
import { ExportMatchIndicator } from './ExportMatchIndicator';

export function ExportModal() {
  const {
    isExportModalOpen,
    setIsExportModalOpen,
    exportFormat,
    setExportFormat,
    exportQuality,
    setExportQuality,
    exportScale,
    setExportScale,
    activeExportRecipeId,
    setActiveExportRecipeId,
    exportSafetyWarnings,
    handleExport,
    handleCarouselExport,
  } = useEditorState();

  const applyExportRecipe = (recipe: any) => {
    setActiveExportRecipeId(recipe.id);
    setExportFormat(recipe.format);
    setExportQuality(recipe.quality);
    setExportScale(recipe.scale);
  };

  if (!isExportModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-white/5 bg-[#151515] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/5 p-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.28em] text-amber-300/70">
              <IconDownload className="intaglio-icon" /> Delivery
            </div>
            <h3 className="mt-2 text-xl font-light text-white">Export Image</h3>
          </div>
          <div
            role="button"
            onClick={() => setIsExportModalOpen(false)}
            className="border border-white/5 bg-[var(--intaglio-panel-soft)] p-2 text-white/50 transition hover:border-white/25 hover:text-white cursor-pointer"
          >
            <IconX className="intaglio-icon" />
          </div>
        </div>

        <div className="custom-scrollbar space-y-6 overflow-y-auto p-6">
          {/* Recipes */}
          <div className="space-y-3">
            <label className="intaglio-label text-white/40">
              Export Recipes
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXPORT_RECIPES.map((recipe) => (
                <div
                  role="button"
                  key={recipe.id}
                  onClick={() => applyExportRecipe(recipe)}
                  className={`border p-3 text-left transition-all cursor-pointer ${
                    activeExportRecipeId === recipe.id
                      ? "border-amber-500/60 bg-amber-500/10"
                      : "border-white/5 bg-[var(--intaglio-panel-soft)] hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/80">
                      {recipe.name}
                    </span>
                    <span className="shrink-0 text-[9px] font-mono tracking-widest text-amber-400/80">
                      {recipe.format.split("/")[1].toUpperCase()} • {recipe.scale}x
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] font-mono tracking-widest leading-5 text-white/60">
                    {recipe.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-3">
            <label className="intaglio-label text-white/40">
              Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["image/jpeg", "image/png", "image/webp"] as const).map((fmt) => (
                <div
                  role="button"
                  key={fmt}
                  onClick={() => {
                    setActiveExportRecipeId(null);
                    setExportFormat(fmt);
                  }}
                  className={`border p-3 text-center transition-all cursor-pointer ${
                    exportFormat === fmt
                      ? "border-white bg-white text-black"
                      : "border-white/5 bg-[var(--intaglio-panel-soft)] text-white/60 hover:border-white/25"
                  }`}
                >
                  <div className="font-bold text-sm">
                    {fmt.split("/")[1].toUpperCase().replace("JPEG", "JPG")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="intaglio-label text-white/40">
                Quality
              </label>
              <span className="text-[9px] font-mono tracking-widest text-amber-500">
                {exportQuality}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={exportQuality}
              onChange={(e) => {
                setActiveExportRecipeId(null);
                setExportQuality(Number(e.target.value));
              }}
              className="w-full"
            />
          </div>

          {/* Scale */}
          <div className="space-y-3">
            <label className="intaglio-label text-white/40">
              Scale factor
            </label>
            <div className="flex gap-2">
              {[0.5, 1, 2, 4].map((scale) => (
                <div
                  role="button"
                  key={scale}
                  onClick={() => {
                    setActiveExportRecipeId(null);
                    setExportScale(scale);
                  }}
                  className={`flex-1 border p-2 text-center font-mono text-[10px] tracking-widest transition-all cursor-pointer ${
                    exportScale === scale
                      ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
                      : "border-white/5 bg-[var(--intaglio-panel-soft)] text-white/50 hover:border-white/25"
                  }`}
                >
                  {scale}x
                </div>
              ))}
            </div>
          </div>

          {/* Contextual Warnings */}
          <div className="space-y-3">
            <ExportMatchIndicator />
          </div>

          {exportSafetyWarnings.length > 0 && (
            <div className="space-y-3">
              <label className="intaglio-label text-white/40">
                Export Safety
              </label>
              <div className="space-y-2">
                {exportSafetyWarnings.map((warning: any) => (
                  <div
                    key={`${warning.title}-${warning.detail}`}
                    className={`border p-3 ${
                      warning.tone === "warn"
                        ? "border-amber-500/25 bg-amber-500/[0.06]"
                        : "border-cyan-500/20 bg-cyan-500/[0.04]"
                    }`}
                  >
                    <div
                      className={`font-mono text-[11px] font-medium tracking-[0.24em] ${
                        warning.tone === "warn" ? "text-amber-300" : "text-cyan-300"
                      }`}
                    >
                      {warning.title}
                    </div>
                    <p className="mt-1 text-[10px] font-mono tracking-widest leading-5 text-white/60">
                      {warning.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-white/5 bg-[var(--intaglio-panel-soft)] p-6">
          <div
            role="button"
            onClick={() => setIsExportModalOpen(false)}
            className="flex-1 border border-white/5 bg-black/40 py-3 text-center font-mono text-xs font-medium text-white/60 transition hover:border-white/25 hover:text-white cursor-pointer"
          >
            Cancel
          </div>
          <div
            role="button"
            onClick={handleExport}
            className="flex-1 border border-amber-400/40 bg-amber-400/10 py-3 text-center font-mono text-[10px] font-bold tracking-widest uppercase text-amber-400 transition hover:bg-amber-400 hover:text-black cursor-pointer"
          >
            Export Single
          </div>
          <div
            role="button"
            onClick={handleCarouselExport}
            className="flex-[2] border border-amber-400/40 bg-amber-400 py-3 text-center font-mono text-[10px] font-bold tracking-widest uppercase text-black transition hover:bg-amber-300 cursor-pointer"
          >
            Export Carousel (3 Slides)
          </div>
        </div>
      </div>
    </div>
  );
}
