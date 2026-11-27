"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { IconArrowDown, IconArrowUp, IconChevronRight, IconEye, IconEyeOff, IconMovie, IconPlayerPause, IconPlayerPlay, IconRotate2, IconTrash } from "@tabler/icons-react";
import { hasAnimatedEffects } from "../render/videoExport";
import { Button, IconButton, Switch } from "../../ui/Controls";
import { DevSlider } from "../../ui/DevSlider";
import { useEditorState } from "../hooks/useEditorState";
import { useShell } from "../shell/useShell";
import type { EditorSettings } from "../../types/editor";
import { EFFECT_BY_ID, type EffectDefinition } from "./catalog";
import { DITHER_METHODS, DITHER_PALETTES, isDiffusionMethod, type CreativeEffect } from "./settings";

const field = "ui-focus min-w-0 rounded-[7px] bg-[var(--ui-control)] px-2 text-[12px] text-[var(--ui-text)] ring-1 ring-inset ring-[var(--ui-line)]";
const percent = (value: number) => `${Math.round(value * 100)}%`;

function ColorControl({ name, value, onChange }: { name: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex min-w-0 items-center justify-between gap-1 rounded-[7px] bg-[var(--ui-control)] px-2 py-1 text-[11px] text-[var(--ui-text-2)]">
      <span className="truncate">{name}</span>
      <input className="ui-focus h-6 w-6 cursor-pointer rounded" type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function LayerControls({ layer, definition, change, playing, togglePlayback }: {
  layer: CreativeEffect;
  definition: EffectDefinition;
  change: (patch: Partial<CreativeEffect>, label: string) => void;
  playing: boolean;
  togglePlayback: () => void;
}) {
  const custom = layer.customPalette;
  const diffusion = Boolean(definition.palette && isDiffusionMethod(layer.dither));
  return (
    <div className="px-2.5 pb-2 pt-0.5">
      <DevSlider label="Opacity" min={0} max={1} step={0.01} value={layer.opacity} defaultValue={1} format={percent}
        onChange={(opacity) => change({ opacity }, "Opacity")} />
      {definition.controls.map(({ key, label, initial }) => {
        if (diffusion && (key === "phase" || key === "angle")) return null;
        if (layer.effect === "pixel-sort" && key === "angle") return (
          <label key={key} className="mt-1 flex items-center justify-between gap-2 text-[11px] text-[var(--ui-text-2)]">
            Direction
            <select className={`${field} h-7`} value={layer.angle} onChange={(event) => change({ angle: Number(event.target.value) }, "Direction")}>
              <option value={0}>Left to right</option><option value={180}>Right to left</option>
              <option value={90}>Top to bottom</option><option value={-90}>Bottom to top</option>
            </select>
          </label>
        );
        const min = key === "size" ? 1 : key === "angle" ? -180 : 0;
        const max = key === "size" ? 120 : key === "angle" ? 180 : 1;
        const format = key === "angle" ? (value: number) => `${Math.round(value)}°` : key === "size" ? undefined : percent;
        return (
          <DevSlider key={key} label={label} min={min} max={max} step={max > 1 ? 1 : 0.01} value={layer[key]} defaultValue={initial} format={format}
            onChange={(value) => change({ [key]: value }, label)} />
        );
      })}
      {layer.enabled && !diffusion && definition.controls.some(({ key }) => key === "phase") && (
        <Button className="mt-1 w-full" icon={playing ? <IconPlayerPause size={13} /> : <IconPlayerPlay size={13} />} onClick={togglePlayback}>
          {playing ? "Freeze frame" : "Play effect"}
        </Button>
      )}
      {definition.colors && (() => {
        const slots = definition.colorSlots ?? { shadow: "Color 1", light: "Color 2" };
        const dual = Boolean(slots.shadow && slots.light);
        return (
          <div className={`mt-2 grid gap-1.5 ${dual ? "grid-cols-2" : "grid-cols-1"}`}>
            {slots.shadow && <ColorControl name={slots.shadow} value={layer.shadow} onChange={(shadow) => change({ shadow }, slots.shadow!)} />}
            {slots.light && <ColorControl name={slots.light} value={layer.light} onChange={(light) => change({ light }, slots.light!)} />}
          </div>
        );
      })()}
      {definition.glyphs && (
        <label className="mt-2 flex flex-col gap-1 text-[11px] text-[var(--ui-text-2)]">
          {layer.effect === "studio-frame" || layer.effect === "stamp-ink" ? "Caption" : "Character ramp"}
          <input type="text" maxLength={64} value={layer.glyphs} className={`${field} h-7 font-mono`}
            onChange={(event) => change({ glyphs: event.target.value }, "Characters")} />
        </label>
      )}
      {definition.palette && (
        <div className="mt-2 grid gap-1.5">
          <label className="grid gap-1 text-[11px] text-[var(--ui-text-2)]">
            Dither method
            <select className={`${field} h-7 w-full`} value={layer.dither}
              onChange={(event) => change({ dither: event.target.value as CreativeEffect["dither"] }, "Dither method")}>
              {Object.entries(DITHER_METHODS).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[11px] text-[var(--ui-text-2)]">
            Palette
            <select className={`${field} h-7 w-full`} value={layer.palette}
              onChange={(event) => change({ palette: event.target.value as CreativeEffect["palette"] }, "Palette")}>
              {Object.entries(DITHER_PALETTES).map(([id, palette]) => <option value={id} key={id}>{palette.name}</option>)}
            </select>
          </label>
          {layer.palette === "custom" && (
            <div className="grid gap-1">
              {custom.map((color, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div className="flex-1">
                    <ColorControl name={`Custom color ${index + 1}`} value={color}
                      onChange={(value) => change({ customPalette: custom.map((old, slot) => slot === index ? value : old) }, "Palette color")} />
                  </div>
                  <IconButton label={`Remove color ${index + 1}`} size="sm" disabled={custom.length <= 2}
                    onClick={() => change({ customPalette: custom.filter((_, slot) => slot !== index) }, "Remove color")}>
                    <IconTrash size={14} />
                  </IconButton>
                </div>
              ))}
              <Button disabled={custom.length >= 16} onClick={() => change({ customPalette: [...custom, "#808080"] }, "Add color")}>Add color</Button>
            </div>
          )}
        </div>
      )}
      {(definition.palette || (definition.glyphs && layer.effect !== "studio-frame" && layer.effect !== "stamp-ink")) && (
        <Switch label="Invert tone mapping" checked={layer.invert} onChange={(invert) => change({ invert }, "Invert tone mapping")} />
      )}
    </div>
  );
}

export function CreativeEffectsStack({ dockRef, clearLibraryPreview }: {
  dockRef: Ref<HTMLElement>;
  clearLibraryPreview: () => void;
}) {
  const { settings, updateSettings } = useEditorState();
  const { setPreview, setVideoExportOpen } = useShell();
  const reduceMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const phaseRef = useRef(0);
  const previewRef = useRef<EditorSettings | null>(null);

  const stack = settings.creativeEffects;
  const editingLayer = stack.some((layer) => layer.id === activeId);

  const clearPreview = () => {
    clearLibraryPreview();
    setPlayingId(null);
    if (previewRef.current) {
      const activePreview = previewRef.current;
      setPreview((current) => current === activePreview ? null : current);
      previewRef.current = null;
    }
  };

  useEffect(() => {
    if (!playingId) return;
    const selected = settings.creativeEffects.find((layer) => layer.id === playingId && layer.enabled);
    if (!selected) return;
    const started = performance.now();
    const tick = () => {
      const phase = (selected.phase + (performance.now() - started) / 3600) % 1;
      phaseRef.current = phase;
      const candidate = {
        ...settings,
        creativeEffects: settings.creativeEffects.map((layer) => layer.id === playingId ? { ...layer, phase } : layer),
      };
      const previous = previewRef.current;
      previewRef.current = candidate;
      setPreview((current) => current === previous || current === null ? candidate : current);
    };
    const stop = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPlayingId(null);
    };
    tick();
    const timer = window.setInterval(tick, 83);
    window.addEventListener("keydown", stop);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", stop);
      const activePreview = previewRef.current;
      if (activePreview) setPreview((current) => current === activePreview ? null : current);
      previewRef.current = null;
    };
  }, [playingId, setPreview, settings]);

  const modify = (label: string, apply: (layers: CreativeEffect[]) => CreativeEffect[]) => {
    clearPreview();
    updateSettings((current) => ({ creativeEffects: apply(current.creativeEffects) }), label);
  };

  const move = (id: string, direction: -1 | 1) => modify("Reorder creative effects", (layers) => {
    const index = layers.findIndex((layer) => layer.id === id);
    const next = layers.slice();
    if (index >= 0 && next[index + direction]) [next[index], next[index + direction]] = [next[index + direction], next[index]];
    return next;
  });

  return (
    <motion.section ref={dockRef} aria-label="Applied effects"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      className={`absolute inset-x-2 bottom-2 z-20 flex min-h-0 flex-col rounded-[12px] border border-[var(--ui-line-strong)] bg-[var(--ui-raised)] px-2 pb-2 shadow-[0_8px_22px_rgba(0,0,0,0.45)] ${editingLayer ? "max-h-[74%]" : "max-h-[min(52%,12rem)]"}`}>
      <div className="flex min-h-8 shrink-0 items-center gap-1 pl-1">
        <h2 className="min-w-0 flex-1 text-[12px] font-semibold text-[var(--ui-text)]">Applied effects</h2>
        {hasAnimatedEffects(settings) && (
          <IconButton label="Export as video…" size="sm" tooltipSide="top" onClick={() => { clearPreview(); setVideoExportOpen(true); }}>
            <IconMovie size={15} stroke={1.8} />
          </IconButton>
        )}
        {stack.length > 0 && (
          <IconButton label="Clear applied effects" size="sm" tooltipSide="top" onClick={() => modify("Clear creative effects", () => [])}>
            <IconRotate2 size={14} />
          </IconButton>
        )}
      </div>
      {stack.length > 0 && (
        <ol className="ui-scroll min-h-0 space-y-1 overflow-y-auto overscroll-contain" aria-label="Creative effect stack">
          {stack.map((layer, index) => {
            const definition = EFFECT_BY_ID.get(layer.effect)!;
            const expanded = layer.id === activeId;
            const change = (patch: Partial<CreativeEffect>, label: string) =>
              modify(`${definition.name} · ${label}`, (layers) => layers.map((item) => item.id === layer.id ? { ...item, ...patch } : item));
            return (
              <motion.li key={layer.id}
                layout={reduceMotion ? false : "position"}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.16 }}
                className="min-w-0 rounded-[8px] border border-[var(--ui-line)] bg-black/10">
                <div className="flex min-w-0 items-center px-1">
                  <span aria-hidden="true" className="ml-1 w-4 shrink-0 text-center text-[10px] tabular-nums text-[var(--ui-text-2)]">{index + 1}</span>
                  <IconButton label={`${layer.enabled ? "Hide" : "Show"} ${definition.name}`} size="sm" tooltipSide="top"
                    onClick={() => change({ enabled: !layer.enabled }, layer.enabled ? "Hide" : "Show")}>
                    {layer.enabled ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                  </IconButton>
                  <button type="button" aria-expanded={expanded} onClick={() => {
                    clearPreview();
                    setActiveId(expanded ? null : layer.id);
                  }}
                    className={`ui-focus flex min-w-0 flex-1 items-center gap-1 rounded-[5px] px-1 py-1.5 text-left text-[11.5px] ${layer.enabled ? "text-[var(--ui-text)]" : "text-[var(--ui-text-2)]"}`}>
                    <span className="truncate">{definition.name}</span>
                    <IconChevronRight size={12} aria-hidden="true" className={`shrink-0 text-[var(--ui-text-2)] ${expanded ? "rotate-90" : ""}`} />
                  </button>
                  <IconButton label={`Move ${definition.name} up`} size="sm" tooltipSide="top" disabled={index === 0} onClick={() => move(layer.id, -1)}><IconArrowUp size={13} /></IconButton>
                  <IconButton label={`Move ${definition.name} down`} size="sm" tooltipSide="top" disabled={index === stack.length - 1} onClick={() => move(layer.id, 1)}><IconArrowDown size={13} /></IconButton>
                  <IconButton label={`Remove ${definition.name}`} size="sm" tooltipSide="top" onClick={() => modify(`Remove ${definition.name}`, (layers) => layers.filter(({ id }) => id !== layer.id))}><IconTrash size={13} /></IconButton>
                </div>
                {expanded && (
                  <LayerControls key={layer.id} layer={layer} definition={definition} change={change} playing={playingId === layer.id}
                    togglePlayback={() => {
                      if (playingId === layer.id) change({ phase: phaseRef.current }, "Freeze frame");
                      else {
                        clearPreview();
                        setPlayingId(layer.id);
                      }
                    }} />
                )}
              </motion.li>
            );
          })}
        </ol>
      )}
    </motion.section>
  );
}
