"use client";

import React, { useState } from "react";
import { readPreference, writePreference } from "../../ui/storage";
import { useEditorState } from "../hooks/useEditorState";
import { useShell } from "../shell/useShell";
import { useDevelop } from "./useDevelop";
import { HistogramView } from "./HistogramView";
import { LookSection } from "./LookSection";
import { BasicSection } from "./BasicSection";
import { ToneCurveSection } from "./ToneCurveSection";
import { ColorMixerSection } from "./ColorMixerSection";
import { ColorGradingSection } from "./ColorGradingSection";
import { DetailSection, EffectsSection, FilmResponseSection, GeometrySection } from "./EffectsSections";

const SECTIONS = ["look", "basic", "curve", "mixer", "grading", "detail", "geometry", "effects", "film"] as const;
type SectionId = (typeof SECTIONS)[number];

const OPEN_KEY = "intaglio.develop.open";
const DEFAULT_OPEN: SectionId[] = ["look", "basic"];

function cameraCaption(metadata: Record<string, string | number | null>, size: { width: number; height: number } | null): string {
  const parts: string[] = [];
  if (typeof metadata.iso === "number") parts.push(`ISO ${metadata.iso}`);
  if (typeof metadata.focalLengthMm === "number") parts.push(`${Math.round(metadata.focalLengthMm)} mm`);
  if (typeof metadata.aperture === "number") parts.push(`ƒ/${metadata.aperture.toFixed(1).replace(/\.0$/, "")}`);
  if (typeof metadata.shutterSeconds === "number" && metadata.shutterSeconds > 0) {
    const seconds = metadata.shutterSeconds;
    parts.push(seconds >= 1 ? `${seconds.toFixed(1).replace(/\.0$/, "")} s` : `1/${Math.round(1 / seconds)} s`);
  }
  if (parts.length > 0) return parts.join("  ·  ");
  return size ? `${size.width} × ${size.height}` : "";
}

/**
 * The Develop sections in Lightroom's order. Used for the whole photo and,
 * inside the Masks panel, for the selected local adjustment.
 */
export function DevelopSections() {
  const shell = useShell();
  const dev = useDevelop();
  const [open, setOpen] = useState<Set<SectionId>>(() => new Set(
    readPreference<SectionId[]>(OPEN_KEY, DEFAULT_OPEN, (value): value is SectionId[] =>
      Array.isArray(value) && value.every((id) => (SECTIONS as readonly unknown[]).includes(id))),
  ));

  const toggle = (id: SectionId) => (solo: boolean) => {
    setOpen((current) => {
      const next = solo ? new Set<SectionId>(current.has(id) && current.size === 1 ? [] : [id]) : new Set(current);
      if (!solo) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      writePreference(OPEN_KEY, [...next]);
      return next;
    });
  };

  const props = (id: SectionId) => ({ dev, open: open.has(id), onToggle: toggle(id) });

  return (
    <>
      <LookSection {...props("look")} onBrowse={() => { shell.setLeftTab("looks"); shell.setLeftOpen(true); }} />
      <BasicSection {...props("basic")} />
      <ToneCurveSection {...props("curve")} />
      <ColorMixerSection {...props("mixer")} />
      <ColorGradingSection {...props("grading")} />
      {!dev.local && <DetailSection {...props("detail")} />}
      {!dev.local && <GeometrySection {...props("geometry")} />}
      {!dev.local && <EffectsSection {...props("effects")} />}
      <FilmResponseSection {...props("film")} />
    </>
  );
}

/** The right-hand Develop panel for the whole photo. */
export function DevelopPanel() {
  const { histogram, sourceCameraMetadata, imageInfo } = useEditorState();
  const shell = useShell();

  return (
    <div className="flex h-full flex-col">
      <HistogramView
        histogram={histogram}
        showClipping={shell.showClipping}
        onToggleClipping={() => shell.setShowClipping(!shell.showClipping)}
        caption={cameraCaption(sourceCameraMetadata, imageInfo ? { width: imageInfo.width, height: imageInfo.height } : null)}
      />
      <div className="ui-scroll min-h-0 flex-1 overflow-y-auto border-t border-[var(--ui-line)]">
        <DevelopSections />
        <p className="px-4 py-5 text-center text-[11px] leading-relaxed text-[var(--ui-text-3)]">
          Double-click any slider to reset it. Hold <kbd className="font-sans">⌥</kbd> while dragging for fine control. <kbd className="font-sans">⌥</kbd>-click a section to open only that one.
        </p>
      </div>
    </div>
  );
}
