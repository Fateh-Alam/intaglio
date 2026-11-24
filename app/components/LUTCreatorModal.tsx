"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  IconX,
  IconDownload,
  IconRefresh,
  IconPalette,
  IconWand,
} from "@tabler/icons-react";

interface LUTCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLUT: (lutData: number[]) => void;
}

interface LUTAdjustments {
  lift: number;
  gamma: number;
  gain: number;
  saturation: number;
  tempShift?: number;
}

const LUT_PRESETS: { name: string; adjustments: LUTAdjustments }[] = [
  { name: "Neutral", adjustments: { lift: 0, gamma: 0, gain: 0, saturation: 1 } },
  { name: "Low Evening", adjustments: { lift: -0.05, gamma: 0.1, gain: -0.1, saturation: 0.9 } },
  { name: "Faded Film", adjustments: { lift: 0.1, gamma: -0.05, gain: -0.15, saturation: 0.8 } },
  { name: "High Contrast", adjustments: { lift: -0.1, gamma: 0, gain: 0.15, saturation: 1.1 } },
  { name: "Cool Tone", adjustments: { lift: 0, gamma: 0, gain: 0, saturation: 0.95, tempShift: -0.1 } },
  { name: "Warm Tone", adjustments: { lift: 0, gamma: 0, gain: 0, saturation: 1.0, tempShift: 0.1 } },
];

function generateLUT(size: number, adjustments: Partial<LUTAdjustments>): number[] {
  const { lift = 0, gamma = 0, gain = 0, saturation = 1, tempShift = 0 } = adjustments;
  const lut: number[] = [];

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        let rn = r / (size - 1);
        let gn = g / (size - 1);
        let bn = b / (size - 1);

        rn = rn + lift * (1 - rn);
        gn = gn + lift * (1 - gn);
        bn = bn + lift * (1 - bn);

        const gammaVal = 1 / (1 + gamma);
        rn = Math.pow(Math.max(0, rn), gammaVal);
        gn = Math.pow(Math.max(0, gn), gammaVal);
        bn = Math.pow(Math.max(0, bn), gammaVal);

        rn = rn * (1 + gain);
        gn = gn * (1 + gain);
        bn = bn * (1 + gain);

        rn = rn + tempShift * 0.5;
        bn = bn - tempShift * 0.5;

        const luminance = 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
        rn = luminance + saturation * (rn - luminance);
        gn = luminance + saturation * (gn - luminance);
        bn = luminance + saturation * (bn - luminance);

        rn = Math.max(0, Math.min(1, rn));
        gn = Math.max(0, Math.min(1, gn));
        bn = Math.max(0, Math.min(1, bn));

        lut.push(rn, gn, bn);
      }
    }
  }

  return lut;
}

function lutToCube(lut: number[], size: number, title: string): string {
  let cube = `TITLE "${title}"\n`;
  cube += `LUT_3D_SIZE ${size}\n\n`;

  for (let i = 0; i < lut.length; i += 3) {
    cube += `${lut[i].toFixed(6)} ${lut[i + 1].toFixed(6)} ${lut[i + 2].toFixed(6)}\n`;
  }

  return cube;
}

export default function LUTCreatorModal({
  isOpen,
  onClose,
  onApplyLUT,
}: LUTCreatorModalProps) {
  const [lutName, setLutName] = useState("Custom LUT");
  const [lift, setLift] = useState(0);
  const [gamma, setGamma] = useState(0);
  const [gain, setGain] = useState(0);
  const [saturation, setSaturation] = useState(1);
  const [tempShift, setTempShift] = useState(0);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const LUT_SIZE = 17;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleReset = () => {
    setLift(0);
    setGamma(0);
    setGain(0);
    setSaturation(1);
    setTempShift(0);
    setActivePreset(null);
  };

  const handlePreset = (preset: (typeof LUT_PRESETS)[0]) => {
    setLift(preset.adjustments.lift ?? 0);
    setGamma(preset.adjustments.gamma ?? 0);
    setGain(preset.adjustments.gain ?? 0);
    setSaturation(preset.adjustments.saturation ?? 1);
    setTempShift(preset.adjustments.tempShift ?? 0);
    setActivePreset(preset.name);
  };

  const handleExportCube = useCallback(() => {
    const lut = generateLUT(LUT_SIZE, { lift, gamma, gain, saturation, tempShift });
    const cubeContent = lutToCube(lut, LUT_SIZE, lutName);

    const blob = new Blob([cubeContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lutName.replace(/\s+/g, "_").toLowerCase()}.cube`;
    a.click();
    URL.revokeObjectURL(url);
  }, [lift, gamma, gain, saturation, tempShift, lutName]);

  const handleApply = useCallback(() => {
    const lut = generateLUT(LUT_SIZE, { lift, gamma, gain, saturation, tempShift });
    onApplyLUT(lut);
    onClose();
  }, [lift, gamma, gain, saturation, tempShift, onApplyLUT, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lut-creator-title"
        className="ui-root relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[18px] bg-[var(--ui-panel)] ring-1 ring-inset ring-[var(--ui-line-strong)] shadow-[var(--ui-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--ui-line)] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)]">
              <IconPalette size={19} stroke={1.8} />
            </div>
            <div>
              <h2 id="lut-creator-title" className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--ui-text)]">
                3D LUT Creator
              </h2>
              <p className="text-[12px] text-[var(--ui-text-2)]">
                Build &amp; export .cube files
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close LUT creator"
            onClick={onClose}
            className="ui-focus grid h-8 w-8 place-items-center rounded-[8px] text-[var(--ui-text-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="ui-scroll space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <label htmlFor="lut-name-input" className="mb-1.5 block text-[11.5px] font-medium text-[var(--ui-text-2)]">
              LUT Name
            </label>
            <input
              id="lut-name-input"
              type="text"
              value={lutName}
              onChange={(e) => setLutName(e.target.value)}
              className="h-10 w-full rounded-[10px] bg-black/30 px-3.5 text-[13px] text-[var(--ui-text)] outline-none ring-1 ring-inset ring-[var(--ui-line)] focus:ring-[var(--ui-accent)]"
            />
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ui-text-3)]">
                Quick presets
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="ui-focus flex items-center gap-1 rounded px-1.5 py-0.5 text-[11.5px] text-[var(--ui-text-3)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
              >
                <IconRefresh size={13} stroke={1.8} /> Reset
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LUT_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  aria-pressed={activePreset === preset.name}
                  onClick={() => handlePreset(preset)}
                  className={`ui-focus h-8 rounded-[8px] px-3 text-[12px] font-medium ring-1 ring-inset transition-colors ${
                    activePreset === preset.name
                      ? "bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)] ring-[var(--ui-accent)]/50"
                      : "bg-[var(--ui-control)] text-[var(--ui-text-2)] ring-[var(--ui-line)] hover:bg-[var(--ui-control-hover)] hover:text-[var(--ui-text)]"
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3.5">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ui-text-3)]">
              Adjustments
            </span>

            {[
              { label: "Lift (Shadows)", value: lift, min: -0.3, max: 0.3, set: setLift, text: `${lift > 0 ? "+" : ""}${(lift * 100).toFixed(0)}%` },
              { label: "Gamma (Midtones)", value: gamma, min: -0.5, max: 0.5, set: setGamma, text: `${gamma > 0 ? "+" : ""}${(gamma * 100).toFixed(0)}%` },
              { label: "Gain (Highlights)", value: gain, min: -0.3, max: 0.3, set: setGain, text: `${gain > 0 ? "+" : ""}${(gain * 100).toFixed(0)}%` },
              { label: "Saturation", value: saturation, min: 0, max: 2, set: setSaturation, text: `${(saturation * 100).toFixed(0)}%` },
              {
                label: "Temperature",
                value: tempShift,
                min: -0.3,
                max: 0.3,
                set: setTempShift,
                text: `${tempShift > 0 ? "Warm" : tempShift < 0 ? "Cool" : "Neutral"}${tempShift !== 0 ? ` (${tempShift > 0 ? "+" : ""}${(tempShift * 100).toFixed(0)}%)` : ""}`,
              },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span className="text-[var(--ui-text-2)]">{row.label}</span>
                  <span className="ui-num text-[var(--ui-text-3)]">{row.text}</span>
                </div>
                <input
                  type="range"
                  aria-label={row.label}
                  min={row.min}
                  max={row.max}
                  step="0.01"
                  value={row.value}
                  onChange={(e) => {
                    row.set(parseFloat(e.target.value));
                    setActivePreset(null);
                  }}
                  className="w-full accent-[var(--ui-accent)]"
                />
              </div>
            ))}
          </div>

          <div>
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ui-text-3)]">
              Preview
            </span>
            <div className="relative h-14 overflow-hidden rounded-[10px] ring-1 ring-inset ring-[var(--ui-line)]">
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, 
                    hsl(${tempShift > 0 ? 30 : 220}, ${saturation * 50}%, ${10 + lift * 50}%), 
                    hsl(${tempShift > 0 ? 30 : 220}, ${saturation * 30}%, ${50 + gamma * 20}%), 
                    hsl(${tempShift > 0 ? 30 : 220}, ${saturation * 40}%, ${90 + gain * 10}%)
                  )`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 border-t border-[var(--ui-line)] bg-[var(--ui-chrome)]/60 px-6 py-4">
          <button
            type="button"
            onClick={handleExportCube}
            className="ui-focus flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[var(--ui-control)] text-[12.5px] font-medium text-[var(--ui-text)] ring-1 ring-inset ring-[var(--ui-line)] transition-colors hover:bg-[var(--ui-control-hover)]"
          >
            <IconDownload size={15} stroke={1.8} /> Export .cube
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="ui-focus flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[var(--ui-accent)] text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--ui-accent-strong)]"
          >
            <IconWand size={15} stroke={1.8} /> Apply to Image
          </button>
        </div>
      </div>
    </div>
  );
}
