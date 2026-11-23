"use client";

import React from "react";
import { Section, SubHeading } from "../../ui/Section";
import { Switch } from "../../ui/Controls";
import { Param, type Develop, type DevelopKey } from "./useDevelop";
import { TRACK, formatEv, parseNumber } from "./tracks";

export const BASIC_KEYS: readonly DevelopKey[] = [
  "temperature", "tint", "brightness", "contrast", "highlights", "shadows", "whites", "blacks",
  "structure", "dehaze", "vibrance", "saturation", "protectHighlights",
];

const BASE_DEVELOP_TONE_KEYS: readonly DevelopKey[] = [
  "temperature", "tint", "brightness", "contrast", "highlights", "shadows", "whites", "blacks",
  "dehaze", "vibrance", "saturation",
  "filmToeStrength", "filmShoulderStrength", "filmGamma", "colorCrossover", "lumaDesat",
];

interface SectionProps {
  dev: Develop;
  open: boolean;
  onToggle: (solo: boolean) => void;
}

export function BasicSection({ dev, open, onToggle }: SectionProps) {
  const protectDisabled = !dev.values.protectHighlights && dev.isDefault(BASE_DEVELOP_TONE_KEYS);
  return (
    <Section title="Basic" open={open} onToggle={onToggle} modified={!dev.isDefault(BASIC_KEYS)} onReset={() => dev.reset(BASIC_KEYS, "Reset Basic")}>
      <SubHeading>White balance</SubHeading>
      <Param dev={dev} k="temperature" label="Temperature" min={-1} max={1} track={TRACK.temperature}
        hint="Makes the photo warmer (yellow) or cooler (blue). Use it to remove color casts from the light." />
      <Param dev={dev} k="tint" label="Tint" min={-1} max={1} track={TRACK.tint}
        hint="Balances green against magenta, for example under fluorescent light." />

      <SubHeading>Tone</SubHeading>
      <Param dev={dev} k="brightness" label="Exposure" min={-5} max={5} step={0.05} format={formatEv} parse={parseNumber}
        hint="Overall brightness in stops. +1 doubles the light, −1 halves it." />
      <Param dev={dev} k="contrast" label="Contrast" min={-1} max={1}
        hint="Separation between light and dark tones, pivoting around mid-grey." />
      <Param dev={dev} k="highlights" label="Highlights" min={-1} max={1}
        hint="Recover (−) or brighten (+) the brightest areas without touching the shadows." />
      <Param dev={dev} k="shadows" label="Shadows" min={-1} max={1}
        hint="Open up (+) or deepen (−) the dark areas without touching the highlights." />
      <Param dev={dev} k="whites" label="Whites" min={-1} max={1}
        hint="Sets how bright the very brightest tones become." />
      <Param dev={dev} k="blacks" label="Blacks" min={-1} max={1}
        hint="Sets how deep the very darkest tones become." />
      {dev.supports("protectHighlights") && (
        <Switch
          label="Protect highlights"
          hint="Gently holds back the brightest tones so strong edits don't clip them to white."
          disabled={protectDisabled}
          disabledHint="Adjust Exposure or tone first"
          checked={Boolean(dev.values.protectHighlights)}
          onChange={(value) => dev.set("protectHighlights", value, "Protect Highlights")}
        />
      )}

      <SubHeading>Presence</SubHeading>
      <Param dev={dev} k="structure" label="Clarity" min={-1} max={1}
        hint="Midtone contrast that adds punch and texture. Negative values soften." />
      <Param dev={dev} k="dehaze" label="Dehaze" min={-1} max={1}
        hint="Cuts through haze and atmosphere. Negative values add a soft, misty glow." />
      <Param dev={dev} k="vibrance" label="Vibrance" min={-1} max={1} track={TRACK.vibrance}
        hint="Boosts muted colors more than already-vivid ones. Gentle on skin tones." />
      <Param dev={dev} k="saturation" label="Saturation" min={-1} max={1} track={TRACK.saturation}
        hint="Changes the intensity of every color equally, without shifting hue or brightness." />
    </Section>
  );
}
