"use client";

import React from "react";
import type { ColorGradingSettings, ColorGradingValue } from "../../types/editor";
import { Section } from "../../ui/Section";
import { DevSlider } from "../../ui/DevSlider";
import { GradeWheel } from "../../ui/GradeWheel";
import type { Develop } from "./useDevelop";

type Zone = "shadows" | "midtones" | "highlights";

const ZONE_LABEL: Record<Zone, string> = { shadows: "Shadows", midtones: "Midtones", highlights: "Highlights" };

interface SectionProps {
  dev: Develop;
  open: boolean;
  onToggle: (solo: boolean) => void;
}

export function ColorGradingSection({ dev, open, onToggle }: SectionProps) {
  if (!dev.supports("colorGrading")) return null;
  const grading = dev.values.colorGrading;

  const update = (next: ColorGradingSettings, label: string) => dev.set("colorGrading", next, label);
  const setZone = (zone: Zone, value: Partial<ColorGradingValue>) =>
    update({ ...grading, [zone]: { ...grading[zone], ...value } }, `${ZONE_LABEL[zone]} Grade`);

  const hasZoneEdit =
    grading.shadows.s > 0 || grading.shadows.l !== 0 ||
    grading.midtones.s > 0 || grading.midtones.l !== 0 ||
    grading.highlights.s > 0 || grading.highlights.l !== 0;
  const balanceDisabled = !hasZoneEdit && grading.balance === 0;

  const zone = (id: Zone, size: number) => (
    <div className="flex flex-col" style={{ width: size }}>
      <GradeWheel size={size} label={ZONE_LABEL[id]} value={grading[id]} onChange={(value) => setZone(id, value)} />
      <DevSlider
        label="Lum"
        ariaLabel={`${ZONE_LABEL[id]} luminance`}
        hint={`Brightens or darkens the ${ZONE_LABEL[id].toLowerCase()}.`}
        value={grading[id].l}
        min={-1}
        max={1}
        track="linear-gradient(90deg, #111113, #6b6b6f 50%, #f2f2f4)"
        onChange={(value) => setZone(id, { l: value })}
      />
    </div>
  );

  return (
    <Section title="Color Grading" open={open} onToggle={onToggle} modified={!dev.isDefault(["colorGrading"])} onReset={() => dev.reset(["colorGrading"], "Reset Color Grading")}>
      <p className="mb-3 text-[11.5px] leading-relaxed text-[var(--ui-text-3)]">
        Tint shadows, midtones and highlights separately. Drag from the center; hold Shift to change only strength.
      </p>
      <div className="flex justify-center">{zone("midtones", 132)}</div>
      <div className="mt-3 flex justify-between gap-3">
        {zone("shadows", 116)}
        {zone("highlights", 116)}
      </div>
      <div className="mt-3 border-t border-[var(--ui-line)] pt-2">
        <DevSlider
          label="Balance"
          hint="Moves the split between shadows and highlights. Positive favours the highlight tint."
          disabled={balanceDisabled}
          disabledHint="Adjust a color wheel first"
          value={grading.balance}
          min={-1}
          max={1}
          onChange={(value) => update({ ...grading, balance: value }, "Grading Balance")}
        />
      </div>
    </Section>
  );
}
