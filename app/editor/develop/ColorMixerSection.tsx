"use client";

import React, { useState } from "react";
import { Section } from "../../ui/Section";
import { Segmented, Switch } from "../../ui/Controls";
import { DevSlider } from "../../ui/DevSlider";
import type { EditorSettings } from "../../types/editor";
import type { Develop, DevelopKey } from "./useDevelop";
import { MIXER_BANDS, hueTrack, lumTrack, satTrack, swatch, type MixerBand } from "./tracks";

type Mode = "hue" | "sat" | "lum" | "band";

const PROPERTY = { hue: "Hue", sat: "Sat", lum: "Lum" } as const;
const PROPERTY_LABEL = { hue: "Hue", sat: "Saturation", lum: "Luminance" } as const;

const keyFor = (band: MixerBand, property: keyof typeof PROPERTY) => `hsl${band}${PROPERTY[property]}` as keyof EditorSettings;

const MIXER_BAND_KEYS: readonly DevelopKey[] = MIXER_BANDS.flatMap((band) =>
  (["hue", "sat", "lum"] as const).map((property) => keyFor(band.id, property))
);

export const MIXER_KEYS: readonly DevelopKey[] = [
  ...MIXER_BAND_KEYS,
  "safeSkinEnabled",
  "skinProtect",
];

const TRACKS = { hue: hueTrack, sat: satTrack, lum: lumTrack };

interface SectionProps {
  dev: Develop;
  open: boolean;
  onToggle: (solo: boolean) => void;
}

export function ColorMixerSection({ dev, open, onToggle }: SectionProps) {
  const [mode, setMode] = useState<Mode>("hue");
  const [band, setBand] = useState<MixerBand>("Red");

  const slider = (bandId: MixerBand, property: keyof typeof PROPERTY, label: string) => {
    const key = keyFor(bandId, property);
    const hue = MIXER_BANDS.find((item) => item.id === bandId)?.hue ?? 0;
    return (
      <DevSlider
        key={`${bandId}-${property}`}
        label={label}
        value={Number(dev.values[key] ?? 0)}
        min={-1}
        max={1}
        track={TRACKS[property](hue)}
        onChange={(value) => dev.set(key, value as never, `${bandId} ${PROPERTY_LABEL[property]}`)}
      />
    );
  };

  return (
    <Section title="Color Mixer" open={open} onToggle={onToggle} modified={!dev.isDefault(MIXER_KEYS)} onReset={() => dev.reset(MIXER_KEYS, "Reset Color Mixer")}>
      <Segmented
        value={mode}
        onChange={setMode}
        className="mb-3"
        options={[
          { id: "hue", label: "Hue", hint: "Shift each color toward its neighbours" },
          { id: "sat", label: "Saturation", hint: "Make each color more or less intense" },
          { id: "lum", label: "Luminance", hint: "Make each color brighter or darker" },
          { id: "band", label: "Color", hint: "Adjust one color at a time" },
        ]}
      />

      {mode === "band" ? (
        <>
          <div role="radiogroup" aria-label="Color" className="mb-3 flex items-center justify-between px-0.5">
            {MIXER_BANDS.map((item) => {
              const selected = item.id === band;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={item.id}
                  title={item.id}
                  onClick={() => setBand(item.id)}
                  className={`ui-focus h-[22px] w-[22px] rounded-full transition-transform duration-150 ${selected ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[var(--ui-panel)]" : "hover:scale-110"}`}
                  style={{ background: swatch(item.hue) }}
                />
              );
            })}
          </div>
          {slider(band, "hue", "Hue")}
          {slider(band, "sat", "Saturation")}
          {slider(band, "lum", "Luminance")}
        </>
      ) : (
        MIXER_BANDS.map((item) => slider(item.id, mode, item.id))
      )}

      {dev.supports("safeSkinEnabled") && (
        <div className="mt-3 border-t border-[var(--ui-line)] pt-2">
          <Switch
            label="Protect skin tones"
            hint="Keeps faces natural while you push oranges and reds. Works on skin hue and chroma, not just a color range."
            disabled={!dev.values.safeSkinEnabled && dev.isDefault(MIXER_BAND_KEYS)}
            disabledHint="Adjust a color slider first"
            checked={Boolean(dev.values.safeSkinEnabled)}
            onChange={(value) => dev.set("safeSkinEnabled", value, "Protect Skin Tones")}
          />
        </div>
      )}
    </Section>
  );
}
