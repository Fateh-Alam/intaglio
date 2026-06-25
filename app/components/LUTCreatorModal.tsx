"use client";

import React, { useState, useCallback } from "react";
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

// Predefined LUT presets
const LUT_PRESETS: { name: string; adjustments: LUTAdjustments }[] = [
  {
    name: "Neutral",
    adjustments: { lift: 0, gamma: 0, gain: 0, saturation: 1 },
  },
  {
    name: "Low Evening",
    adjustments: { lift: -0.05, gamma: 0.1, gain: -0.1, saturation: 0.9 },
  },
  {
    name: "Faded Film",
    adjustments: { lift: 0.1, gamma: -0.05, gain: -0.15, saturation: 0.8 },
  },
  {
    name: "High Contrast",
    adjustments: { lift: -0.1, gamma: 0, gain: 0.15, saturation: 1.1 },
  },
  {
    name: "Cool Tone",
    adjustments: {
      lift: 0,
      gamma: 0,
      gain: 0,
      saturation: 0.95,
      tempShift: -0.1,
    },
  },
  {
    name: "Warm Tone",
    adjustments: {
      lift: 0,
      gamma: 0,
      gain: 0,
      saturation: 1.0,
      tempShift: 0.1,
    },
  },
];

// Generate a simple 3D LUT based on adjustments
function generateLUT(
  size: number,
  adjustments: Partial<LUTAdjustments>
): number[] {
  const {
    lift = 0,
    gamma = 0,
    gain = 0,
    saturation = 1,
    tempShift = 0,
  } = adjustments;
  const lut: number[] = [];

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        // Normalize to 0-1
        let rn = r / (size - 1);
        let gn = g / (size - 1);
        let bn = b / (size - 1);

        // Apply lift (shadows)
        rn = rn + lift * (1 - rn);
        gn = gn + lift * (1 - gn);
        bn = bn + lift * (1 - bn);

        // Apply gamma (midtones)
        const gammaVal = 1 / (1 + gamma);
        rn = Math.pow(Math.max(0, rn), gammaVal);
        gn = Math.pow(Math.max(0, gn), gammaVal);
        bn = Math.pow(Math.max(0, bn), gammaVal);

        // Apply gain (highlights)
        rn = rn * (1 + gain);
        gn = gn * (1 + gain);
        bn = bn * (1 + gain);

        // Apply temperature shift
        rn = rn + tempShift * 0.5;
        bn = bn - tempShift * 0.5;

        // Apply saturation
        const luminance = 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
        rn = luminance + saturation * (rn - luminance);
        gn = luminance + saturation * (gn - luminance);
        bn = luminance + saturation * (bn - luminance);

        // Clamp values
        rn = Math.max(0, Math.min(1, rn));
        gn = Math.max(0, Math.min(1, gn));
        bn = Math.max(0, Math.min(1, bn));

        lut.push(rn, gn, bn);
      }
    }
  }

  return lut;
}

// Convert LUT to .cube file format
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

  const LUT_SIZE = 17; // Standard LUT size

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
    const lut = generateLUT(LUT_SIZE, {
      lift,
      gamma,
      gain,
      saturation,
      tempShift,
    });
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
    const lut = generateLUT(LUT_SIZE, {
      lift,
      gamma,
      gain,
      saturation,
      tempShift,
    });
    onApplyLUT(lut);
    onClose();
  }, [lift, gamma, gain, saturation, tempShift, onApplyLUT, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/5 bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400">
              <IconPalette size={20} />
            </div>
            <div>
              <h2 className="text-xl font-light text-white">3D LUT Creator</h2>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">
                Build & Export .cube Files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* LUT Name */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">
              LUT Name
            </label>
            <input
              type="text"
              value={lutName}
              onChange={(e) => setLutName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500/50 transition"
            />
          </div>

          {/* Presets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-mono uppercase tracking-widest text-gray-500">
                Quick Presets
              </label>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-[10px] font-mono uppercase text-gray-500 hover:text-white transition"
              >
                <IconRefresh size={12} /> Reset
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LUT_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono uppercase transition ${
                    activePreset === preset.name
                      ? "bg-violet-500/20 border border-violet-500/50 text-violet-400"
                      : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Adjustments */}
          <div className="space-y-4">
            <label className="text-xs font-mono uppercase tracking-widest text-gray-500">
              Adjustments
            </label>

            {/* Lift (Shadows) */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400">Lift (Shadows)</span>
                <span className="text-xs text-gray-500 font-mono">
                  {lift > 0 ? "+" : ""}
                  {(lift * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="-0.3"
                max="0.3"
                step="0.01"
                value={lift}
                onChange={(e) => {
                  setLift(parseFloat(e.target.value));
                  setActivePreset(null);
                }}
                className="w-full accent-violet-500"
              />
            </div>

            {/* Gamma (Midtones) */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400">Gamma (Midtones)</span>
                <span className="text-xs text-gray-500 font-mono">
                  {gamma > 0 ? "+" : ""}
                  {(gamma * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.01"
                value={gamma}
                onChange={(e) => {
                  setGamma(parseFloat(e.target.value));
                  setActivePreset(null);
                }}
                className="w-full accent-violet-500"
              />
            </div>

            {/* Gain (Highlights) */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400">Gain (Highlights)</span>
                <span className="text-xs text-gray-500 font-mono">
                  {gain > 0 ? "+" : ""}
                  {(gain * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="-0.3"
                max="0.3"
                step="0.01"
                value={gain}
                onChange={(e) => {
                  setGain(parseFloat(e.target.value));
                  setActivePreset(null);
                }}
                className="w-full accent-violet-500"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400">Saturation</span>
                <span className="text-xs text-gray-500 font-mono">
                  {(saturation * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={saturation}
                onChange={(e) => {
                  setSaturation(parseFloat(e.target.value));
                  setActivePreset(null);
                }}
                className="w-full accent-violet-500"
              />
            </div>

            {/* Temperature Shift */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400">Temperature</span>
                <span className="text-xs text-gray-500 font-mono">
                  {tempShift > 0 ? "Warm" : tempShift < 0 ? "Cool" : "Neutral"}{" "}
                  {tempShift !== 0 &&
                    `(${tempShift > 0 ? "+" : ""}${(tempShift * 100).toFixed(0)}%)`}
                </span>
              </div>
              <input
                type="range"
                min="-0.3"
                max="0.3"
                step="0.01"
                value={tempShift}
                onChange={(e) => {
                  setTempShift(parseFloat(e.target.value));
                  setActivePreset(null);
                }}
                className="w-full accent-violet-500"
              />
            </div>
          </div>

          {/* Preview Gradient */}
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-2 block">
              Preview
            </label>
            <div className="h-16 rounded-xl overflow-hidden border border-white/10 relative">
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
        <div className="sticky bottom-0 flex gap-3 p-6 border-t border-white/5 bg-[#0a0a0a]">
          <button
            onClick={handleExportCube}
            className="flex-1 py-3 flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition font-mono text-sm uppercase"
          >
            <IconDownload size={16} /> Export .cube
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 flex items-center justify-center gap-2 rounded-xl bg-violet-500 border border-violet-400 text-white hover:bg-violet-400 transition font-mono text-sm uppercase"
          >
            <IconWand size={16} /> Apply to Image
          </button>
        </div>
      </div>
    </div>
  );
}
