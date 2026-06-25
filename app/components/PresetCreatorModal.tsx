"use client";

import React, { useState } from "react";
import {
  IconX,
  IconDeviceFloppy,
  IconInfoCircle,
  IconCheck,
  IconChevronRight,
} from "@tabler/icons-react";
import type { EditorSettings, SerializableEditorSettings } from "../types/editor";
import { FORMAT } from "../lib/brand";

interface PresetCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EditorSettings;
  onSave: (presetData: PresetData) => void;
}

interface PresetData {
  version: string;
  name: string;
  description: string;
  created: string;
  categories: string[];
  settings: Partial<SerializableEditorSettings>;
}

interface SettingCategory {
  id: string;
  label: string;
  description: string;
  keys: (keyof SerializableEditorSettings)[];
}

// Setting categories for the preset - ALL settings except LUT textures
const SETTING_CATEGORIES: SettingCategory[] = [
  {
    id: "exposure",
    label: "Exposure & Tone",
    description: "Brightness, contrast, highlights, shadows, whites, blacks",
    keys: [
      "brightness",
      "contrast",
      "highlights",
      "shadows",
      "whites",
      "blacks",
    ],
  },
  {
    id: "color",
    label: "Color & Temperature",
    description: "Temperature, tint, vibrance, teal-orange",
    keys: ["temperature", "tint", "vibrance", "tealOrange"],
  },
  {
    id: "curves",
    label: "Tone Curves",
    description: "Master and RGB curve adjustments",
    keys: ["curvePoints"],
  },
  {
    id: "grading",
    label: "Color Grading",
    description: "Shadow, midtone, and highlight color wheels",
    keys: ["colorGrading"],
  },
  {
    id: "hsl",
    label: "HSL Panel",
    description: "Per-color hue, saturation, and luminance adjustments",
    keys: [
      "targetHue",
      "hueShift",
      "hslRedHue",
      "hslRedSat",
      "hslRedLum",
      "hslOrangeHue",
      "hslOrangeSat",
      "hslOrangeLum",
      "hslYellowHue",
      "hslYellowSat",
      "hslYellowLum",
      "hslGreenHue",
      "hslGreenSat",
      "hslGreenLum",
      "hslAquaHue",
      "hslAquaSat",
      "hslAquaLum",
      "hslBlueHue",
      "hslBlueSat",
      "hslBlueLum",
      "hslPurpleHue",
      "hslPurpleSat",
      "hslPurpleLum",
      "hslMagentaHue",
      "hslMagentaSat",
      "hslMagentaLum",
    ],
  },
  {
    id: "effects",
    label: "Creative Effects",
    description: "Grain, vignette, sharpness, dehaze, chromatic aberration",
    keys: [
      "grain",
      "vignette",
      "sharpness",
      "dehaze",
      "aberration",
      "structure",
      "filmBorder",
      "skinProtect",
    ],
  },
  {
    id: "halation",
    label: "Halation & Bloom",
    description: "Film-like light bleed and soft glow",
    keys: [
      "halation",
      "halationThreshold",
      "halationRadius",
      "bloom",
      "bloomThreshold",
      "bloomRadius",
    ],
  },
  {
    id: "lens",
    label: "Lens Corrections",
    description: "Distortion, keystone, tilt-shift",
    keys: [
      "lensDistortion",
      "keystoneH",
      "keystoneV",
      "tiltShiftAmount",
      "tiltShiftPosition",
      "tiltShiftAngle",
    ],
  },
  {
    id: "transform",
    label: "Transform",
    description: "Rotation and zoom",
    keys: ["rotate", "zoom"],
  },
  {
    id: "film",
    label: "Film Emulation",
    description: "Film stock presets and strength",
    keys: ["filmEmulation", "filmEmulationStrength"],
  },
  {
    id: "godlight",
    label: "Directional Light",
    description: "Guided light position, color, falloff, and edge glow",
    keys: [
      "godLightStrength",
      "godLightX",
      "godLightY",
      "godLightColorR",
      "godLightColorG",
      "godLightColorB",
      "godLightSpecular",
      "godLightRim",
      "godLightFalloff",
    ],
  },
  {
    id: "anamorphic",
    label: "Anamorphic",
    description: "Anamorphic distortion and streaks",
    keys: ["anamorphicDistortion", "anamorphicStreaks"],
  },
  {
    id: "masking",
    label: "Masking",
    description: "Radial, linear, and luminosity masks",
    keys: [
      "radialMaskEnabled",
      "radialMaskX",
      "radialMaskY",
      "radialMaskRadius",
      "radialMaskFeather",
      "radialMaskInvert",
      "radialMaskExposure",
      "radialMaskContrast",
      "radialMaskSaturation",
      "linearMaskEnabled",
      "linearMaskAngle",
      "linearMaskPosition",
      "linearMaskFeather",
      "linearMaskExposure",
      "linearMaskContrast",
      "luminosityMaskEnabled",
      "luminosityMaskTarget",
      "luminosityMaskRange",
      "luminosityMaskExposure",
      "luminosityMaskSaturation",
    ],
  },
];

export default function PresetCreatorModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: PresetCreatorModalProps) {
  const [step, setStep] = useState(1);
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    SETTING_CATEGORIES.map((c) => c.id) // All selected by default
  );

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSelectAll = () => {
    setSelectedCategories(SETTING_CATEGORIES.map((c) => c.id));
  };

  const handleSelectNone = () => {
    setSelectedCategories([]);
  };

  const copySetting = <K extends keyof SerializableEditorSettings>(
    target: Partial<SerializableEditorSettings>,
    source: EditorSettings,
    key: K
  ) => {
    target[key] = source[key];
  };

  const getSelectedSettings = () => {
    const selected: Partial<SerializableEditorSettings> = {};
    SETTING_CATEGORIES.forEach((category) => {
      if (selectedCategories.includes(category.id)) {
        category.keys.forEach((key) => {
          if (settings[key] !== undefined) {
            copySetting(selected, settings, key);
          }
        });
      }
    });
    return selected;
  };

  const handleSave = () => {
    const presetData: PresetData = {
      version: "2.5",
      name: presetName || "Untitled Preset",
      description: presetDescription,
      created: new Date().toISOString(),
      categories: selectedCategories,
      settings: getSelectedSettings(),
    };
    onSave(presetData);
    onClose();
    // Reset state
    setStep(1);
    setPresetName("");
    setPresetDescription("");
    setSelectedCategories(SETTING_CATEGORIES.map((c) => c.id));
  };

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
        className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-[100px] bg-amber-500/20" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all text-gray-400 hover:text-white"
        >
          <IconX size={18} />
        </button>

        {/* Header */}
        <div className="p-8 pb-0">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 bg-amber-500/15 text-amber-500">
            <IconDeviceFloppy size={28} />
          </div>
          <h2 className="text-2xl font-light text-white mb-2">
            Create Ormond Print Recipe
          </h2>
          <p className="text-sm font-mono uppercase tracking-[0.2em] text-amber-500 mb-4">
            {step === 1
              ? "Step 1: Name Your Recipe"
              : step === 2
                ? "Step 2: Select Settings"
                : "Step 3: Review & Save"}
          </p>
        </div>

        {/* Step 1: Name & Description */}
        {step === 1 && (
          <div className="p-8 space-y-6">
            {/* Explanation */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-start gap-3">
                <IconInfoCircle
                  className="text-amber-500 shrink-0 mt-0.5"
                  size={18}
                />
                <div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    A{" "}
                    <strong className="text-amber-400">
                      .{FORMAT.recipeExtension}
                    </strong>{" "}
                    file is an Ormond Print Recipe. It stores selected edit
                    settings so you can carry the same treatment to other
                    photographs. Use an Ormond Archive{" "}
                    <strong className="text-cyan-300">
                      .{FORMAT.archiveExtension}
                    </strong>{" "}
                    when you want to preserve the entire editing session.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">
                  Recipe Name
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g., Late Autumn"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="A warm, film-inspired look for portraits..."
                  rows={2}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 transition resize-none"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-xl font-mono text-sm uppercase tracking-widest bg-amber-500/15 text-amber-500 border border-amber-500/30 hover:bg-amber-500/25 transition flex items-center justify-center gap-2"
            >
              Next: Select Settings <IconChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Select Categories */}
        {step === 2 && (
          <div className="p-8 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-400">
                Choose which settings to include:
              </p>
              <div className="flex gap-2 text-[10px] font-mono uppercase">
                <button
                  onClick={handleSelectAll}
                  className="text-amber-500 hover:underline"
                >
                  All
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={handleSelectNone}
                  className="text-gray-500 hover:underline"
                >
                  None
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {SETTING_CATEGORIES.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => handleToggleCategory(category.id)}
                    className={`w-full p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className={`text-sm font-medium ${isSelected ? "text-amber-400" : "text-gray-300"}`}
                        >
                          {category.label}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {category.description}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                          isSelected
                            ? "bg-amber-500 border-amber-500"
                            : "border-gray-600"
                        }`}
                      >
                        {isSelected && (
                          <IconCheck size={14} className="text-black" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl font-mono text-sm uppercase tracking-widest bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={selectedCategories.length === 0}
                className={`flex-1 py-3 rounded-xl font-mono text-sm uppercase tracking-widest transition flex items-center justify-center gap-2 ${
                  selectedCategories.length > 0
                    ? "bg-amber-500/15 text-amber-500 border border-amber-500/30 hover:bg-amber-500/25"
                    : "bg-gray-800 text-gray-600 border border-gray-700 cursor-not-allowed"
                }`}
              >
                Next <IconChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Save */}
        {step === 3 && (
          <div className="p-8 space-y-6">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                  Recipe Name
                </p>
                <p className="text-white">{presetName || "Untitled Recipe"}</p>
              </div>
              {presetDescription && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                    Description
                  </p>
                  <p className="text-gray-400 text-sm">{presetDescription}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                  Included Settings
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedCategories.map((catId) => {
                    const cat = SETTING_CATEGORIES.find((c) => c.id === catId);
                    return (
                      <span
                        key={catId}
                        className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px]"
                      >
                        {cat?.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <p className="text-sm text-blue-300 leading-relaxed">
                <strong>How to use:</strong> Your recipe will be saved as a{" "}
                <code className="bg-blue-500/20 px-1 rounded">
                  .{FORMAT.recipeExtension}
                </code>{" "}
                file. To apply it later, choose Load .{FORMAT.recipeExtension}{" "}
                in the sidebar or drag the file onto the editor. Full sessions
                are saved as Ormond Archive{" "}
                <code className="bg-blue-500/20 px-1 rounded">
                  .{FORMAT.archiveExtension}
                </code>{" "}
                files.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-xl font-mono text-sm uppercase tracking-widest bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl font-mono text-sm uppercase tracking-widest bg-amber-500 text-black border border-amber-400 hover:bg-amber-400 transition flex items-center justify-center gap-2"
              >
                <IconDeviceFloppy size={16} /> Save Recipe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
