"use client";

import React, { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { Section, SubHeading } from "../../ui/Section";
import { Switch } from "../../ui/Controls";
import { Param, type Develop, type DevelopKey } from "./useDevelop";
import { formatDegrees, parseNumber } from "./tracks";

interface SectionProps {
  dev: Develop;
  open: boolean;
  onToggle: (solo: boolean) => void;
}

/** Progressive disclosure for precision controls. */
export function More({ children, label = "More" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="ui-focus flex h-6 items-center gap-1 rounded-[6px] px-1 text-[11px] font-medium text-[var(--ui-text-3)] transition-colors hover:text-[var(--ui-text-2)]"
      >
        {open ? "Less" : label}
        <IconChevronDown size={12} stroke={2} className="transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && <div className="animate-in fade-in slide-in-from-top-1 duration-200">{children}</div>}
    </div>
  );
}

const scaled = (factor: number, signed = false) => (value: number) => {
  const shown = Math.round(value * factor);
  return signed && shown > 0 ? `+${shown}` : `${shown}`;
};
const unscaled = (factor: number) => (text: string) => {
  const parsed = parseNumber(text);
  return parsed === null ? null : parsed / factor;
};

export const DETAIL_KEYS: readonly DevelopKey[] = ["sharpness"];

export function DetailSection({ dev, open, onToggle }: SectionProps) {
  return (
    <Section title="Detail" open={open} onToggle={onToggle} modified={!dev.isDefault(DETAIL_KEYS)} onReset={() => dev.reset(DETAIL_KEYS, "Reset Detail")}>
      <Param dev={dev} k="sharpness" label="Sharpening" min={0} max={1} format={scaled(100)} parse={unscaled(100)}
        hint="Crisps fine edges. Judge it at 100% zoom; a little goes a long way." />
    </Section>
  );
}

export const GEOMETRY_KEYS: readonly DevelopKey[] = ["rotate", "zoom", "lensDistortion", "keystoneV", "keystoneH", "anamorphicDistortion"];

export function GeometrySection({ dev, open, onToggle }: SectionProps) {
  return (
    <Section title="Geometry" open={open} onToggle={onToggle} modified={!dev.isDefault(GEOMETRY_KEYS)} onReset={() => dev.reset(GEOMETRY_KEYS, "Reset Geometry")}>
      <Param dev={dev} k="rotate" label="Straighten" min={-45} max={45} step={0.1} format={formatDegrees} parse={parseNumber}
        hint="Levels a tilted horizon. Hold Alt while dragging for tenth-of-a-degree precision." />
      <Param dev={dev} k="zoom" label="Scale" min={1} max={3} defaultValue={1} step={0.01}
        format={(value) => `${Math.round(value * 100)}%`} parse={(text) => { const parsed = parseNumber(text); return parsed === null ? null : parsed / 100; }}
        hint="Enlarges the photo to hide empty corners after straightening or perspective fixes." />
      <SubHeading>Lens & perspective</SubHeading>
      <Param dev={dev} k="lensDistortion" label="Distortion" min={-0.5} max={0.5} format={scaled(200, true)} parse={unscaled(200)}
        hint="Corrects barrel (−) or pincushion (+) bending of straight lines near the edges." />
      <Param dev={dev} k="keystoneV" label="Vertical" min={-0.5} max={0.5} format={scaled(200, true)} parse={unscaled(200)}
        hint="Straightens converging verticals, such as buildings shot from below." />
      <Param dev={dev} k="keystoneH" label="Horizontal" min={-0.5} max={0.5} format={scaled(200, true)} parse={unscaled(200)}
        hint="Corrects sideways perspective when the camera wasn't square to the subject." />
      <More>
        <Param dev={dev} k="anamorphicDistortion" label="Anamorphic squeeze" min={0} max={1} format={scaled(100)} parse={unscaled(100)}
          hint="Stretches the frame horizontally like an anamorphic cinema lens." />
      </More>
    </Section>
  );
}

export const EFFECTS_KEYS: readonly DevelopKey[] = [
  "vignette", "grain", "halation", "halationThreshold", "halationRadius", "bloom", "bloomThreshold", "bloomRadius",
  "anamorphicStreaks", "aberration", "filmBorder",
  "godLightStrength", "godLightX", "godLightY", "godLightColorR", "godLightColorG", "godLightColorB", "godLightSpecular", "godLightRim", "godLightFalloff",
];

const LIGHT_COLORS = [
  { id: "warm", label: "Warm", rgb: [1, 0.85, 0.7] },
  { id: "neutral", label: "Neutral", rgb: [1, 1, 1] },
  { id: "cool", label: "Cool", rgb: [0.8, 0.9, 1] },
] as const;

export function EffectsSection({ dev, open, onToggle }: SectionProps) {
  const v = dev.values;
  const lightColor = LIGHT_COLORS.find((color) => color.rgb[0] === v.godLightColorR && color.rgb[1] === v.godLightColorG && color.rgb[2] === v.godLightColorB)?.id;
  return (
    <Section title="Effects" open={open} onToggle={onToggle} modified={!dev.isDefault(EFFECTS_KEYS)} onReset={() => dev.reset(EFFECTS_KEYS, "Reset Effects")}>
      <Param dev={dev} k="vignette" label="Vignette" min={0} max={1} format={scaled(100)} parse={unscaled(100)}
        hint="Darkens the corners to draw the eye toward the center." />
      <Param dev={dev} k="grain" label="Grain" min={0} max={0.5} format={scaled(200)} parse={unscaled(200)}
        hint="Adds film-like grain. It is deterministic, so exports match the preview exactly." />

      <SubHeading>Glow</SubHeading>
      <Param dev={dev} k="halation" label="Halation" min={0} max={2} format={scaled(50)} parse={unscaled(50)}
        hint="The red-orange glow film gets around bright lights, from light bouncing inside the film." />
      <Param dev={dev} k="bloom" label="Bloom" min={0} max={1} format={scaled(100)} parse={unscaled(100)}
        hint="A soft, dreamy glow around the brightest parts of the photo." />
      <More>
        <Param dev={dev} k="halationThreshold" label="Halation threshold" min={0} max={1} defaultValue={0.7} format={scaled(100)} parse={unscaled(100)}
          hint="How bright a highlight must be before it starts to glow." />
        <Param dev={dev} k="halationRadius" label="Halation spread" min={0} max={3} defaultValue={1} step={0.01} format={(value) => value.toFixed(2)} parse={parseNumber}
          hint="How far the halation glow spreads." />
        <Param dev={dev} k="bloomThreshold" label="Bloom threshold" min={0} max={1} defaultValue={0.8} format={scaled(100)} parse={unscaled(100)} />
        <Param dev={dev} k="bloomRadius" label="Bloom spread" min={0} max={3} defaultValue={1} step={0.01} format={(value) => value.toFixed(2)} parse={parseNumber} />
      </More>

      <SubHeading>Lens character</SubHeading>
      <Param dev={dev} k="anamorphicStreaks" label="Anamorphic streaks" min={0} max={1} format={scaled(100)} parse={unscaled(100)}
        hint="Horizontal blue flare lines through bright lights, like a cinema lens." />
      <Param dev={dev} k="aberration" label="Color fringing" min={0} max={0.02} step={0.0005} format={scaled(5000)} parse={unscaled(5000)}
        hint="Adds vintage-lens color fringes toward the edges. This adds the effect; it does not remove it." />
      <Switch label="Film border" checked={Boolean(v.filmBorder)} onChange={(value) => dev.set("filmBorder", value, "Film Border")}
        hint="Frames the photo with a scanned-negative style border." />

      <SubHeading>Light beam</SubHeading>
      <Param dev={dev} k="godLightStrength" label="Strength" min={0} max={1} format={scaled(100)} parse={unscaled(100)}
        hint="Adds a soft directional beam of light, like sun through a window." />
      {v.godLightStrength > 0 && (
        <More label="Position & color">
          <Param dev={dev} k="godLightX" label="Position X" min={0} max={1} defaultValue={0.5} format={scaled(100)} parse={unscaled(100)} />
          <Param dev={dev} k="godLightY" label="Position Y" min={0} max={1} defaultValue={0.5} format={scaled(100)} parse={unscaled(100)} />
          <Param dev={dev} k="godLightFalloff" label="Falloff" min={0} max={3} defaultValue={1} step={0.01} format={(value) => value.toFixed(2)} parse={parseNumber} />
          <Param dev={dev} k="godLightSpecular" label="Shine" min={0} max={1} format={scaled(100)} parse={unscaled(100)} />
          <Param dev={dev} k="godLightRim" label="Rim glow" min={0} max={1} format={scaled(100)} parse={unscaled(100)} />
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {LIGHT_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                aria-pressed={lightColor === color.id}
                onClick={() => dev.patch({ godLightColorR: color.rgb[0], godLightColorG: color.rgb[1], godLightColorB: color.rgb[2] }, "Light Color")}
                className={`ui-focus flex h-7 items-center justify-center gap-1.5 rounded-[7px] text-[11.5px] transition-colors ${lightColor === color.id ? "bg-white/[0.1] text-[var(--ui-text)]" : "text-[var(--ui-text-2)] hover:bg-white/[0.05]"}`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: `rgb(${color.rgb.map((c) => Math.round(c * 255)).join(" ")})` }} />
                {color.label}
              </button>
            ))}
          </div>
        </More>
      )}
    </Section>
  );
}

export const FILM_RESPONSE_KEYS: readonly DevelopKey[] = ["filmToeStrength", "filmShoulderStrength", "filmGamma", "colorCrossover", "lumaDesat"];

export function FilmResponseSection({ dev, open, onToggle }: SectionProps) {
  return (
    <Section title="Film Response" open={open} onToggle={onToggle} modified={!dev.isDefault(FILM_RESPONSE_KEYS)} onReset={() => dev.reset(FILM_RESPONSE_KEYS, "Reset Film Response")}>
      <p className="mb-2 text-[11.5px] leading-relaxed text-[var(--ui-text-3)]">
        Shape tones the way film does: soft toes, gentle shoulders, and color that shifts with brightness.
      </p>
      <Param dev={dev} k="filmToeStrength" label="Toe" min={0} max={1} format={scaled(100)} parse={unscaled(100)}
        hint="Softens how shadows fall into black, like film's toe." />
      <Param dev={dev} k="filmShoulderStrength" label="Shoulder" min={0} max={1} format={scaled(100)} parse={unscaled(100)}
        hint="Rolls highlights off gently instead of clipping, like film's shoulder." />
      <Param dev={dev} k="filmGamma" label="Density" min={0.5} max={1.5} defaultValue={1} step={0.01} format={(value) => value.toFixed(2)} parse={parseNumber}
        hint="Overall film density curve. Above 1 is denser and moodier; below 1 is lighter and flatter." />
      <Param dev={dev} k="colorCrossover" label="Color crossover" min={0} max={1} format={scaled(100)} parse={unscaled(100)}
        hint="Cool shadows and warm highlights, as in cross-processed film." />
      <Param dev={dev} k="lumaDesat" label="Tonal desaturation" min={0} max={1} format={scaled(100)} parse={unscaled(100)}
        hint="Lets color fade in deep shadows and bright highlights, as on film." />
    </Section>
  );
}
