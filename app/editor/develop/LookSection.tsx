"use client";

import React from "react";
import { IconChevronRight, IconFileImport, IconPhotoSearch, IconSparkles, IconX } from "@tabler/icons-react";
import { Section } from "../../ui/Section";
import { DevSlider } from "../../ui/DevSlider";
import { IconButton } from "../../ui/Controls";
import { FILM_EMULATIONS } from "../../lib/filmEmulations";
import { useEditorState } from "../hooks/useEditorState";
import type { Develop, DevelopKey } from "./useDevelop";

export const LOOK_KEYS: readonly DevelopKey[] = ["filmEmulation", "filmEmulationStrength", "lutStrength"];

interface SectionProps {
  dev: Develop;
  open: boolean;
  onToggle: (solo: boolean) => void;
  onBrowse: () => void;
}

function ActionRow({ icon, title, subtitle, onClick, as = "button", children }: { icon: React.ReactNode; title: string; subtitle: string; onClick?: () => void; as?: "button" | "label"; children?: React.ReactNode }) {
  const className = "ui-focus group/action flex w-full cursor-pointer items-center gap-3 rounded-[9px] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05]";
  const body = (
    <>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-white/[0.05] text-[var(--ui-text-2)] group-hover/action:text-[var(--ui-text)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium text-[var(--ui-text)]">{title}</span>
        <span className="block truncate text-[11px] text-[var(--ui-text-3)]">{subtitle}</span>
      </span>
      {children}
    </>
  );
  return as === "label" ? <label className={className}>{body}</label> : <button type="button" onClick={onClick} className={className}>{body}</button>;
}

/** The look stack: film stock and creative LUT, each with an amount. */
export function LookSection({ dev, open, onToggle, onBrowse }: SectionProps) {
  const { settings, documentAssets, handleLutUpload, handlePaletteHeist, setIsLUTCreatorOpen, updateSettings } = useEditorState();
  if (dev.local) return null;
  const film = FILM_EMULATIONS.find((item) => item.id === settings.filmEmulation) ?? FILM_EMULATIONS[0];
  const hasFilm = film.id !== "none";
  const lutAsset = documentAssets.find((asset) => asset.kind === "lut");
  const lutName = lutAsset?.lutMetadata?.title || lutAsset?.originalName?.replace(/\.cube$/i, "") || "Custom LUT";
  const modified = hasFilm || Boolean(settings.lutTexture);

  return (
    <Section
      title="Look"
      open={open}
      onToggle={onToggle}
      modified={modified}
      onReset={() => updateSettings({ filmEmulation: "none", filmEmulationStrength: 1, lutTexture: null, lutStrength: 0 }, "Remove Look")}
    >
      <button
        type="button"
        onClick={onBrowse}
        className="ui-focus group/film flex w-full items-center gap-3 rounded-[10px] bg-white/[0.035] p-2 text-left ring-1 ring-inset ring-[var(--ui-line)] transition-colors hover:bg-white/[0.06]"
      >
        <span className="h-9 w-9 shrink-0 rounded-[7px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]" style={{ background: film.swatch }} />
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] uppercase tracking-[0.08em] text-[var(--ui-text-3)]">Film</span>
          <span className="block truncate text-[12.5px] font-medium text-[var(--ui-text)]">{hasFilm ? film.name : "None"}</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[var(--ui-text-3)] group-hover/film:text-[var(--ui-text-2)]">
          Browse <IconChevronRight size={14} />
        </span>
      </button>
      {hasFilm && (
        <DevSlider
          label="Amount"
          value={settings.filmEmulationStrength}
          defaultValue={1}
          min={0}
          max={1}
          format={(value) => `${Math.round(value * 100)}`}
          onChange={(value) => dev.set("filmEmulationStrength", value, "Film Amount")}
        />
      )}

      <div className="mt-3">
        {settings.lutTexture ? (
          <>
            <div className="flex items-center gap-3 rounded-[10px] bg-white/[0.035] p-2 ring-1 ring-inset ring-[var(--ui-line)]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[7px] bg-[conic-gradient(from_0deg,#ff5f57,#ffb547,#3ddc84,#5b9bff,#c45be0,#ff5f57)] text-[10px] font-bold text-black/70">LUT</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10.5px] uppercase tracking-[0.08em] text-[var(--ui-text-3)]">Creative LUT</span>
                <span className="block truncate text-[12.5px] font-medium text-[var(--ui-text)]">{lutName}</span>
              </span>
              <IconButton label="Remove LUT" size="sm" onClick={() => updateSettings({ lutTexture: null, lutStrength: 0 }, "Remove LUT")}>
                <IconX size={14} />
              </IconButton>
            </div>
            <DevSlider
              label="Amount"
              value={settings.lutStrength}
              defaultValue={1}
              min={0}
              max={1}
              format={(value) => `${Math.round(value * 100)}`}
              onChange={(value) => dev.set("lutStrength", value, "LUT Amount")}
            />
          </>
        ) : (
          <div className="-mx-1 space-y-0.5">
            <ActionRow as="label" icon={<IconFileImport size={16} stroke={1.75} />} title="Import LUT…" subtitle=".cube files from any app or camera">
              <input type="file" accept=".cube" className="hidden" onChange={handleLutUpload} />
            </ActionRow>
            <ActionRow as="label" icon={<IconPhotoSearch size={16} stroke={1.75} />} title="Match a photo…" subtitle="Borrow the colors of any reference image">
              <input type="file" accept="image/*" className="hidden" onChange={handlePaletteHeist} />
            </ActionRow>
            <ActionRow icon={<IconSparkles size={16} stroke={1.75} />} title="Create a LUT…" subtitle="Build a look from lift, gamma and gain" onClick={() => setIsLUTCreatorOpen(true)} />
          </div>
        )}
      </div>
    </Section>
  );
}
