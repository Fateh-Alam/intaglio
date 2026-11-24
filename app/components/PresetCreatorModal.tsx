"use client";

import React, { useEffect, useState } from "react";
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

const SETTING_CATEGORIES: SettingCategory[] = [
  {
    id: "exposure",
    label: "Exposure & Tone",
    description: "Exposure, contrast, highlights, shadows, whites, blacks, highlight protection",
    keys: [
      "brightness",
      "contrast",
      "highlights",
      "shadows",
      "whites",
      "blacks",
      "protectHighlights",
    ],
  },
  {
    id: "color",
    label: "Color & Temperature",
    description: "Temperature, tint, vibrance, saturation",
    keys: ["temperature", "tint", "vibrance", "saturation"],
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
    label: "Color Mixer",
    description: "Per-color hue, saturation, luminance, and skin protection",
    keys: [
      "safeSkinEnabled",
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
    label: "Film & Lens Effects",
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
    id: "film-response",
    label: "Film Response",
    description: "Toe, shoulder, density curve, color crossover, tonal desaturation",
    keys: [
      "filmToeStrength",
      "filmToeLength",
      "filmShoulderStrength",
      "filmShoulderLength",
      "filmGamma",
      "colorCrossover",
      "lumaDesat",
    ],
  },
  {
    id: "creative-stack",
    label: "Creative Effect Stack",
    description: "Effect layers, their order, colors and settings",
    keys: ["creativeEffects"],
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
    description: "Distortion and perspective keystone",
    keys: ["lensDistortion", "keystoneH", "keystoneV"],
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
    description: "Layer adjustments and mask stacks",
    keys: ["adjustmentLayers", "masks"],
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
    SETTING_CATEGORIES.map((c) => c.id)
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  const handleSelectAll = () => setSelectedCategories(SETTING_CATEGORIES.map((c) => c.id));
  const handleSelectNone = () => setSelectedCategories([]);

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
    setStep(1);
    setPresetName("");
    setPresetDescription("");
    setSelectedCategories(SETTING_CATEGORIES.map((c) => c.id));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-creator-title"
        className="ui-root relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[18px] bg-[var(--ui-panel)] ring-1 ring-inset ring-[var(--ui-line-strong)] shadow-[var(--ui-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--ui-line)] px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)]">
              <IconDeviceFloppy size={19} stroke={1.8} />
            </div>
            <div>
              <h2 id="recipe-creator-title" className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--ui-text)]">
                Create Etch Look Recipe
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--ui-accent-strong)]">
                {step === 1
                  ? "Step 1 of 3 · Name your recipe"
                  : step === 2
                    ? "Step 2 of 3 · Select settings"
                    : "Step 3 of 3 · Review & save"}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close recipe creator"
            onClick={onClose}
            className="ui-focus grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[var(--ui-text-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Step 1: Name & Description */}
        {step === 1 && (
          <div className="ui-scroll space-y-5 overflow-y-auto px-6 py-5">
            <div className="flex items-start gap-2.5 rounded-[12px] bg-white/[0.03] p-3.5 ring-1 ring-inset ring-[var(--ui-line)]">
              <IconInfoCircle size={16} stroke={1.8} className="mt-0.5 shrink-0 text-[var(--ui-accent-strong)]" />
              <p className="text-[12.5px] leading-relaxed text-[var(--ui-text-2)]">
                A <strong className="font-semibold text-[var(--ui-text)]">.{FORMAT.recipeExtension}</strong> file is an Etch Look Recipe that stores your chosen settings to reuse on other photos. Save a <strong className="font-semibold text-[var(--ui-text)]">.{FORMAT.archiveExtension}</strong> project to preserve the full session.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="recipe-name" className="mb-1.5 block text-[11.5px] font-medium text-[var(--ui-text-2)]">
                  Recipe Name
                </label>
                <input
                  id="recipe-name"
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g., Late Autumn"
                  className="h-10 w-full rounded-[10px] bg-black/30 px-3.5 text-[13px] text-[var(--ui-text)] outline-none ring-1 ring-inset ring-[var(--ui-line)] placeholder:text-[var(--ui-text-3)] focus:ring-[var(--ui-accent)]"
                />
              </div>
              <div>
                <label htmlFor="recipe-description" className="mb-1.5 block text-[11.5px] font-medium text-[var(--ui-text-2)]">
                  Description (Optional)
                </label>
                <textarea
                  id="recipe-description"
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="A warm, film-inspired look for portraits…"
                  rows={2}
                  className="w-full resize-none rounded-[10px] bg-black/30 px-3.5 py-2.5 text-[13px] text-[var(--ui-text)] outline-none ring-1 ring-inset ring-[var(--ui-line)] placeholder:text-[var(--ui-text-3)] focus:ring-[var(--ui-accent)]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="ui-focus flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] bg-[var(--ui-accent)] text-[13px] font-semibold text-white transition-colors hover:bg-[var(--ui-accent-strong)]"
            >
              Next: Select Settings <IconChevronRight size={15} stroke={2} />
            </button>
          </div>
        )}

        {/* Step 2: Select Categories */}
        {step === 2 && (
          <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12.5px] text-[var(--ui-text-2)]">
                Choose which settings to include:
              </p>
              <div className="flex items-center gap-2 text-[11.5px] font-medium">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="ui-focus rounded px-1.5 py-0.5 text-[var(--ui-accent-strong)] hover:underline"
                >
                  All
                </button>
                <span className="text-[var(--ui-text-3)]">·</span>
                <button
                  type="button"
                  onClick={handleSelectNone}
                  className="ui-focus rounded px-1.5 py-0.5 text-[var(--ui-text-3)] hover:text-[var(--ui-text)]"
                >
                  None
                </button>
              </div>
            </div>

            <div className="ui-scroll max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {SETTING_CATEGORIES.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <button
                    type="button"
                    key={category.id}
                    aria-pressed={isSelected}
                    onClick={() => handleToggleCategory(category.id)}
                    className={`ui-focus flex w-full items-center justify-between gap-3 rounded-[10px] p-3 text-left ring-1 ring-inset transition-colors ${
                      isSelected
                        ? "bg-[var(--ui-accent-soft)] ring-[var(--ui-accent)]/45"
                        : "bg-white/[0.025] ring-[var(--ui-line)] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-[12.5px] font-medium ${isSelected ? "text-[var(--ui-text)]" : "text-[var(--ui-text-2)]"}`}>
                        {category.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--ui-text-3)]">
                        {category.description}
                      </p>
                    </div>
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-[6px] ring-1 ring-inset transition-colors ${
                        isSelected
                          ? "bg-[var(--ui-accent)] text-white ring-transparent"
                          : "bg-black/30 ring-[var(--ui-line-strong)]"
                      }`}
                    >
                      {isSelected && <IconCheck size={13} stroke={2.4} />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="ui-focus h-10 flex-1 rounded-[10px] bg-[var(--ui-control)] text-[12.5px] font-medium text-[var(--ui-text-2)] ring-1 ring-inset ring-[var(--ui-line)] transition-colors hover:bg-[var(--ui-control-hover)] hover:text-[var(--ui-text)]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={selectedCategories.length === 0}
                className="ui-focus flex h-10 flex-1 items-center justify-center gap-1 rounded-[10px] bg-[var(--ui-accent)] text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--ui-accent-strong)] disabled:pointer-events-none disabled:opacity-40"
              >
                Next <IconChevronRight size={15} stroke={2} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Save */}
        {step === 3 && (
          <div className="ui-scroll space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-3 rounded-[12px] bg-white/[0.03] p-4 ring-1 ring-inset ring-[var(--ui-line)]">
              <div>
                <p className="text-[11px] font-medium text-[var(--ui-text-3)]">Recipe Name</p>
                <p className="mt-0.5 text-[14px] font-semibold text-[var(--ui-text)]">
                  {presetName || "Untitled Recipe"}
                </p>
              </div>
              {presetDescription && (
                <div>
                  <p className="text-[11px] font-medium text-[var(--ui-text-3)]">Description</p>
                  <p className="mt-0.5 text-[12.5px] text-[var(--ui-text-2)]">{presetDescription}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] font-medium text-[var(--ui-text-3)]">Included Settings</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedCategories.map((catId) => {
                    const cat = SETTING_CATEGORIES.find((c) => c.id === catId);
                    return (
                      <span
                        key={catId}
                        className="rounded-full bg-[var(--ui-accent-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ui-accent-strong)]"
                      >
                        {cat?.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-[12px] bg-[var(--ui-accent-soft)] p-3.5 ring-1 ring-inset ring-[var(--ui-accent)]/25">
              <p className="text-[12px] leading-relaxed text-[var(--ui-text-2)]">
                <strong className="font-semibold text-[var(--ui-text)]">How to use:</strong> Saved as a{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-[var(--ui-text)]">
                  .{FORMAT.recipeExtension}
                </code>{" "}
                file. Drag it onto Etch or choose Load .{FORMAT.recipeExtension} in the File menu to apply it to any photo.
              </p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="ui-focus h-10 flex-1 rounded-[10px] bg-[var(--ui-control)] text-[12.5px] font-medium text-[var(--ui-text-2)] ring-1 ring-inset ring-[var(--ui-line)] transition-colors hover:bg-[var(--ui-control-hover)] hover:text-[var(--ui-text)]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="ui-focus flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[var(--ui-accent)] text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--ui-accent-strong)]"
              >
                <IconDeviceFloppy size={15} stroke={2} /> Save Recipe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
