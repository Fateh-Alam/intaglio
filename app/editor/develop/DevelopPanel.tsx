"use client";

import React, { useState } from "react";
import { IconLayersIntersect } from "@tabler/icons-react";
import { Button } from "../../ui/Controls";
import { readPreference, writePreference } from "../../ui/storage";
import { useEditorState } from "../hooks/useEditorState";
import { useShell } from "../shell/useShell";
import { useDevelop } from "./useDevelop";
import { HistogramView } from "./HistogramView";
import { formatHistogramCaption } from "./histogramLayout";
import { LookSection } from "./LookSection";
import { BasicSection } from "./BasicSection";
import { ToneCurveSection } from "./ToneCurveSection";
import { ColorMixerSection } from "./ColorMixerSection";
import { ColorGradingSection } from "./ColorGradingSection";
import { DetailSection, EffectsSection, FilmResponseSection, GeometrySection } from "./EffectsSections";

const SECTIONS = ["look", "basic", "curve", "mixer", "grading", "detail", "geometry", "effects", "film"] as const;
type SectionId = (typeof SECTIONS)[number];
type StoredSectionId = SectionId | "creative";

const OPEN_KEY = "intaglio.develop.open";
const DEFAULT_OPEN: SectionId[] = ["look", "basic"];

/**
 * The Develop sections in Lightroom's order. Used for the whole photo and,
 * inside the Masks panel, for the selected local adjustment.
 */
export function DevelopSections() {
  const shell = useShell();
  const dev = useDevelop();
  const [open, setOpen] = useState<Set<SectionId>>(() => new Set(
    readPreference<StoredSectionId[]>(OPEN_KEY, DEFAULT_OPEN, (value): value is StoredSectionId[] =>
      Array.isArray(value) && value.every((id) => id === "creative" || (SECTIONS as readonly unknown[]).includes(id)))
      .filter((id): id is SectionId => id !== "creative"),
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
      {!dev.local && (
        <div className="border-b border-[var(--ui-line)] px-3 py-1.5">
          <Button variant="ghost" className="w-full justify-start" icon={<IconLayersIntersect size={15} />} onClick={shell.openEffects}>
            Browse effects
          </Button>
        </div>
      )}
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
  const showDockedHistogram = shell.histogramVisible && !shell.histogramDetached;

  return (
    <div className="flex h-full flex-col">
      {showDockedHistogram && (
        <HistogramView
          histogram={histogram}
          showClipping={shell.showClipping}
          onToggleClipping={() => shell.setShowClipping(!shell.showClipping)}
          caption={formatHistogramCaption(sourceCameraMetadata, imageInfo ? { width: imageInfo.width, height: imageInfo.height } : null)}
          onDetach={() => shell.setHistogramDetached(true)}
          onHide={() => shell.setHistogramVisible(false)}
        />
      )}
      <div className={`ui-scroll min-h-0 flex-1 overflow-y-auto ${showDockedHistogram ? "border-t border-[var(--ui-line)]" : ""}`}>
        <DevelopSections />
        <p className="px-4 py-5 text-center text-[11px] leading-relaxed text-[var(--ui-text-3)]">
          Double-click any slider to reset it. Hold <kbd className="font-sans">⌥</kbd> while dragging for fine control. <kbd className="font-sans">⌥</kbd>-click a section to open only that one.
        </p>
      </div>
    </div>
  );
}
