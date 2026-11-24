"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { TextOverlaySettings } from "../../components/CinematicTextOverlay";
import RenderedOverlayCanvas from "../../components/RenderedOverlayCanvas";
import type { WatermarkSettings } from "../../types/editor";
import { ensureOverlayFonts } from "../render/overlayCompositor";
import { layoutTitles, type LayerLayout, type Measure } from "./titleEngine";
import { resolveTitles, type TitleDocument, type TitleLayer } from "./titleModel";

const NO_WATERMARK: WatermarkSettings = { enabled: false, text: "", position: "bottom-right", opacity: 0, size: 0 };
const SNAP = 0.012;
/** Classic broadcast safe areas: action safe 93%, title safe 90%. */
const SAFE = { action: 0.035, title: 0.05 };

export const TITLE_EDIT_EVENT = "etch:edit-title";

export interface TitleEditing {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showSafeGuides: boolean;
}

/** Titles drawn by the shared renderer, plus on-photo handles while the Text panel is open. */
export function TitleStage({ text, setText, watermark, width, height, editing }: {
  text: TextOverlaySettings;
  setText?: React.Dispatch<React.SetStateAction<TextOverlaySettings>>;
  watermark?: WatermarkSettings;
  width: number;
  height: number;
  editing?: TitleEditing | null;
}) {
  const titles = useMemo(() => resolveTitles(text), [text]);
  const [layouts, setLayouts] = useState<LayerLayout[]>([]);
  const [drag, setDrag] = useState<{ id: string; snapX: boolean; snapY: boolean } | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; x: number; y: number; pointer: number } | null>(null);

  // Measure with the same fonts the renderer uses so handles hug the glyphs.
  useEffect(() => {
    if (!editing || width <= 0 || height <= 0) return;
    let cancelled = false;
    void ensureOverlayFonts({ text, watermark: watermark ?? NO_WATERMARK }).then(() => {
      if (cancelled) return;
      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;
      const measure: Measure = (value, font) => { context.font = font; return context.measureText(value).width; };
      setLayouts(layoutTitles(titles, width, height, measure));
    });
    return () => { cancelled = true; };
  }, [editing, titles, text, watermark, width, height]);

  const update = (id: string, change: Partial<TitleLayer>) => {
    setText?.((current) => {
      const document = resolveTitles(current);
      const next: TitleDocument = { ...document, layers: document.layers.map((layer) => (layer.id === id ? { ...layer, ...change } : layer)) };
      return { ...current, titles: next };
    });
  };

  const layerById = (id: string) => titles.layers.find((layer) => layer.id === id);

  return (
    <>
      <RenderedOverlayCanvas text={text} watermark={watermark ?? NO_WATERMARK} />
      {editing && (
        <div
          className="absolute inset-0"
          data-export-ignore="true"
          onPointerDown={(event) => { if (event.target === event.currentTarget) editing.onSelect(null); }}
        >
          {(editing.showSafeGuides || drag) && (
            <>
              <div className="pointer-events-none absolute border border-dashed border-white/25" style={{ inset: `${SAFE.action * 100}%` }} />
              <div className="pointer-events-none absolute border border-white/30" style={{ inset: `${SAFE.title * 100}%` }} />
            </>
          )}
          {drag?.snapX && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--ui-accent)]" />}
          {drag?.snapY && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--ui-accent)]" />}

          {layouts.map((layout) => {
            const layer = layerById(layout.id);
            if (!layer) return null;
            const selected = editing.selectedId === layout.id;
            const pad = 6;
            return (
              <div
                key={layout.id}
                role="button"
                tabIndex={0}
                aria-label={`${layerName(layer)}: ${layer.text.split("\n")[0]}`}
                aria-pressed={selected}
                data-testid={`title-handle-${layout.id}`}
                className={`cursor-move absolute touch-none rounded-[4px] outline-none transition-[box-shadow] ${selected ? "shadow-[0_0_0_1px_var(--ui-accent),0_0_0_4px_rgba(91,155,255,0.18)]" : "hover:shadow-[0_0_0_1px_rgba(255,255,255,0.45)]"}`}
                style={{
                  left: layout.box.x - pad,
                  top: layout.box.y - pad,
                  width: layout.box.width + pad * 2,
                  height: layout.box.height + pad * 2,
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  editing.onSelect(layout.id);
                  dragRef.current = { id: layout.id, startX: event.clientX, startY: event.clientY, x: layer.x, y: layer.y, pointer: event.pointerId };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  const state = dragRef.current;
                  if (!state || state.pointer !== event.pointerId) return;
                  let x = state.x + (event.clientX - state.startX) / width;
                  let y = state.y + (event.clientY - state.startY) / height;
                  const snapX = Math.abs(x - 0.5) < SNAP;
                  const snapY = Math.abs(y - 0.5) < SNAP;
                  if (snapX) x = 0.5;
                  if (snapY) y = 0.5;
                  setDrag({ id: state.id, snapX, snapY });
                  update(state.id, { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) });
                }}
                onPointerUp={(event) => {
                  dragRef.current = null;
                  setDrag(null);
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onDoubleClick={() => window.dispatchEvent(new CustomEvent(TITLE_EDIT_EVENT, { detail: layout.id }))}
                onKeyDown={(event) => {
                  const step = event.shiftKey ? 0.02 : 0.004;
                  const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
                  const move = moves[event.key];
                  if (move) {
                    event.preventDefault();
                    update(layout.id, { x: Math.min(1, Math.max(0, layer.x + move[0])), y: Math.min(1, Math.max(0, layer.y + move[1])) });
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    window.dispatchEvent(new CustomEvent(TITLE_EDIT_EVENT, { detail: layout.id }));
                  } else if (event.key === "Escape") {
                    editing.onSelect(null);
                  }
                }}
              >
                {selected && (
                  <span className="pointer-events-none absolute -top-6 left-0 whitespace-nowrap rounded-[5px] bg-[var(--ui-accent)] px-1.5 py-0.5 text-[10.5px] font-medium text-white">
                    {layerName(layer)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export function layerName(layer: TitleLayer): string {
  switch (layer.kind) {
    case "title": return "Title";
    case "caption": return "Caption";
    case "dateline": return "Dateline";
    case "credits": return "Credits";
    default: return "Text";
  }
}
