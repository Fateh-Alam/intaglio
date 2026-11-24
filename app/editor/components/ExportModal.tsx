import React, { useEffect } from "react";
import { IconDownload, IconX } from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import { EXPORT_RECIPES } from "../pageTypes";
import type { ExportRecipe } from "../pageTypes";
import { ExportMatchIndicator } from "./ExportMatchIndicator";

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

  useEffect(() => {
    if (!isExportModalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsExportModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExportModalOpen, setIsExportModalOpen]);

  const applyExportRecipe = (recipe: ExportRecipe) => {
    setActiveExportRecipeId(recipe.id);
    setExportFormat(recipe.format);
    setExportQuality(recipe.quality);
    setExportScale(recipe.scale);
  };

  if (!isExportModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onClick={() => setIsExportModalOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        className="ui-root relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[18px] bg-[var(--ui-panel)] ring-1 ring-inset ring-[var(--ui-line-strong)] shadow-[var(--ui-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--ui-line)] px-6 py-5">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-accent-strong)]">
              <IconDownload size={14} stroke={1.8} />
              Delivery
            </div>
            <h3 id="export-modal-title" className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-[var(--ui-text)]">
              Export Image
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close export modal"
            onClick={() => setIsExportModalOpen(false)}
            className="ui-focus grid h-8 w-8 place-items-center rounded-[8px] text-[var(--ui-text-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="ui-scroll space-y-5 overflow-y-auto px-6 py-5">
          {/* Recipes */}
          <div className="space-y-2.5">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ui-text-3)]">
              Export presets
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EXPORT_RECIPES.map((recipe) => {
                const active = activeExportRecipeId === recipe.id;
                return (
                  <button
                    type="button"
                    key={recipe.id}
                    aria-pressed={active}
                    onClick={() => applyExportRecipe(recipe)}
                    className={`ui-focus rounded-[12px] p-3 text-left ring-1 ring-inset transition-colors ${
                      active
                        ? "bg-[var(--ui-accent-soft)] ring-[var(--ui-accent)]/50"
                        : "bg-white/[0.025] ring-[var(--ui-line)] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12.5px] font-semibold text-[var(--ui-text)]">
                        {recipe.name}
                      </span>
                      <span
                        className={`ui-num shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                          active
                            ? "bg-[var(--ui-accent)]/20 text-[var(--ui-accent-strong)]"
                            : "bg-white/[0.06] text-[var(--ui-text-2)]"
                        }`}
                      >
                        {recipe.format.split("/")[1].toUpperCase().replace("JPEG", "JPG")} · {recipe.scale}x
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--ui-text-2)]">
                      {recipe.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ui-text-3)]">
              Format
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(["image/jpeg", "image/png", "image/webp"] as const).map((fmt) => {
                const active = exportFormat === fmt;
                return (
                  <button
                    type="button"
                    key={fmt}
                    aria-pressed={active}
                    onClick={() => {
                      setActiveExportRecipeId(null);
                      setExportFormat(fmt);
                    }}
                    className={`ui-focus h-9 rounded-[10px] text-[12.5px] font-semibold ring-1 ring-inset transition-colors ${
                      active
                        ? "bg-[var(--ui-accent)] text-white ring-transparent"
                        : "bg-[var(--ui-control)] text-[var(--ui-text-2)] ring-[var(--ui-line)] hover:bg-[var(--ui-control-hover)] hover:text-[var(--ui-text)]"
                    }`}
                  >
                    {fmt.split("/")[1].toUpperCase().replace("JPEG", "JPG")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="export-quality-range" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ui-text-3)]">
                Quality
              </label>
              <span className="ui-num text-[12px] font-medium text-[var(--ui-accent-strong)]">
                {exportQuality}%
              </span>
            </div>
            <input
              id="export-quality-range"
              type="range"
              min="10"
              max="100"
              value={exportQuality}
              onChange={(e) => {
                setActiveExportRecipeId(null);
                setExportQuality(Number(e.target.value));
              }}
              className="w-full accent-[var(--ui-accent)]"
            />
          </div>

          {/* Scale */}
          <div className="space-y-2">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ui-text-3)]">
              Scale factor
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[0.5, 1, 2, 4].map((scale) => {
                const active = exportScale === scale;
                return (
                  <button
                    type="button"
                    key={scale}
                    aria-pressed={active}
                    onClick={() => {
                      setActiveExportRecipeId(null);
                      setExportScale(scale);
                    }}
                    className={`ui-focus ui-num h-8 rounded-[8px] text-[12px] font-medium ring-1 ring-inset transition-colors ${
                      active
                        ? "bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)] ring-[var(--ui-accent)]/50"
                        : "bg-[var(--ui-control)] text-[var(--ui-text-2)] ring-[var(--ui-line)] hover:bg-[var(--ui-control-hover)] hover:text-[var(--ui-text)]"
                    }`}
                  >
                    {scale}x
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parity & Safety */}
          <ExportMatchIndicator />

          {exportSafetyWarnings.length > 0 && (
            <div className="space-y-2">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ui-text-3)]">
                Export safety
              </span>
              <div className="space-y-2">
                {exportSafetyWarnings.map((warning) => (
                  <div
                    key={`${warning.title}-${warning.detail}`}
                    className={`rounded-[10px] p-3 ring-1 ring-inset ${
                      warning.tone === "warn"
                        ? "bg-[var(--ui-warn)]/10 ring-[var(--ui-warn)]/25"
                        : "bg-[var(--ui-accent-soft)] ring-[var(--ui-accent)]/25"
                    }`}
                  >
                    <div
                      className={`text-[12px] font-semibold ${
                        warning.tone === "warn" ? "text-[var(--ui-warn)]" : "text-[var(--ui-accent-strong)]"
                      }`}
                    >
                      {warning.title}
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--ui-text-2)]">
                      {warning.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[var(--ui-line)] bg-[var(--ui-chrome)]/60 px-6 py-4">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(false)}
            className="ui-focus h-10 flex-1 rounded-[10px] bg-[var(--ui-control)] px-4 text-[12.5px] font-medium text-[var(--ui-text-2)] ring-1 ring-inset ring-[var(--ui-line)] transition-colors hover:bg-[var(--ui-control-hover)] hover:text-[var(--ui-text)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="ui-focus h-10 flex-1 rounded-[10px] bg-[var(--ui-accent)] px-4 text-[12.5px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset] transition-colors hover:bg-[var(--ui-accent-strong)]"
          >
            Export Single
          </button>
          <button
            type="button"
            onClick={handleCarouselExport}
            className="ui-focus h-10 flex-[1.6] rounded-[10px] bg-white px-4 text-[12.5px] font-semibold text-[#0c0c0d] transition-colors hover:bg-[#ececee]"
          >
            Export Carousel (3 Slides)
          </button>
        </div>
      </div>
    </div>
  );
}
