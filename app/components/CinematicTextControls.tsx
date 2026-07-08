"use client";

import React from "react";
import {
  IconTypography,
  IconMapPin,
  IconMovie,
  IconItalic,
  IconLetterCase,
  IconLetterCaseUpper,
  IconLetterCaseLower,
  IconX,
  IconSpacingHorizontal,
  IconEye,
} from "@tabler/icons-react";
import Toggle from "./Toggle";
import CustomSelect from "./CustomSelect";
import { TextOverlaySettings } from "./CinematicTextOverlay";
import ControlGroup from "./ControlGroup";
import Slider from "./Slider";

const POPULAR_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Source Sans Pro",
  "Slabo 27px",
  "Raleway",
  "PT Sans",
  "Merriweather",
  "Roboto Slab",
  "Nunito",
  "Playfair Display",
  "Lora",
  "Ubuntu",
  "Poppins",
  "Titillium Web",
  "Bebas Neue",
  "Anton",
  "Quicksand",
  "Mukta",
  "Fjalla One",
  "Inconsolata",
  "Dosis",
  "Oxygen",
  "Lobster",
  "Pacifico",
  "Shadows Into Light",
  "Dancing Script",
  "Satisfy",
  "Great Vibes",
  "Crimson Text",
  "Cinzel",
  "Unbounded",
  "Outfit",
  "Space Grotesk",
  "Syne",
  "DM Sans",
  "Manrope",
];

interface CinematicTextControlsProps {
  textOverlay: TextOverlaySettings;
  setTextOverlay: React.Dispatch<React.SetStateAction<TextOverlaySettings>>;
}

export default function CinematicTextControls({
  textOverlay,
  setTextOverlay,
}: CinematicTextControlsProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* 1. Content Section */}
      <ControlGroup title="Content">
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                <IconMovie size={14} className="inline mr-2" />
                Title
              </label>
              <Toggle
                checked={textOverlay.subtitleEnabled}
                onChange={(checked) =>
                  setTextOverlay((prev) => ({
                    ...prev,
                    subtitleEnabled: checked,
                  }))
                }
              />
            </div>
            <input
              type="text"
              placeholder="Movie Title"
              value={textOverlay.subtitleText}
              onChange={(e) =>
                setTextOverlay((prev) => ({
                  ...prev,
                  subtitleText: e.target.value,
                }))
              }
              className="w-full bg-[#0a0908] border border-[var(--intaglio-line)] rounded-none px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--intaglio-paper)] font-mono placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 transition"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                <IconMapPin size={14} className="inline mr-2" />
                Location/Date
              </label>
              <Toggle
                checked={textOverlay.dateEnabled}
                onChange={(checked) =>
                  setTextOverlay((prev) => ({
                    ...prev,
                    dateEnabled: checked,
                  }))
                }
              />
            </div>
            <input
              type="text"
              placeholder="Date (e.g. MAY 2024)"
              value={textOverlay.dateText}
              onChange={(e) =>
                setTextOverlay((prev) => ({
                  ...prev,
                  dateText: e.target.value,
                }))
              }
              className="w-full bg-[#0a0908] border border-[var(--intaglio-line)] rounded-none px-3 py-2 text-[10px] font-mono tracking-widest text-[var(--intaglio-paper)] placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 transition mb-2"
            />
            <input
              type="text"
              placeholder="Location (e.g., LAHORE, PAKISTAN)"
              value={textOverlay.locationText}
              onChange={(e) =>
                setTextOverlay((prev) => ({
                  ...prev,
                  locationText: e.target.value,
                }))
              }
              className="w-full bg-[#0a0908] border border-[var(--intaglio-line)] rounded-none px-3 py-2 text-[10px] font-mono tracking-widest text-[var(--intaglio-paper)] placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 transition uppercase"
            />
          </div>
        </div>
      </ControlGroup>

      {/* 2. Visual Style Presets */}
      <ControlGroup title="Visual Style">
        <div className="grid grid-cols-4 gap-1 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
          {[
            {
              id: "blade_runner",
              label: "Blade Runner",
              color: "text-orange-300",
              tracking: 0.1,
            },
            {
              id: "interstellar",
              label: "Interstellar",
              color: "text-white",
              tracking: 0.2,
            },
            {
              id: "sicario",
              label: "Sicario",
              color: "text-amber-400",
              tracking: 0.1,
            },
            {
              id: "dune",
              label: "Dune",
              color: "text-amber-200",
              tracking: 0.15,
            },
            {
              id: "arrival",
              label: "Arrival",
              color: "text-gray-300",
              tracking: 0.2,
            },
            {
              id: "revenant",
              label: "Revenant",
              color: "text-stone-300",
              tracking: 0.15,
            },
            {
              id: "oppenheimer",
              label: "Oppenheimer",
              color: "text-white",
              tracking: 0.15,
            },
            {
              id: "the_batman",
              label: "The Batman",
              color: "text-red-500",
              tracking: 0.05,
            },
            {
              id: "joker",
              label: "Joker",
              color: "text-lime-400",
              tracking: 0.0,
            },
            {
              id: "nineteen17",
              label: "1917",
              color: "text-stone-400",
              tracking: 0.2,
            },
            {
              id: "mad_max",
              label: "Mad Max",
              color: "text-orange-500",
              tracking: 0.12,
            },
            {
              id: "her",
              label: "Her",
              color: "text-pink-300",
              tracking: 0.15,
            },
            {
              id: "matrix",
              label: "Matrix",
              color: "text-green-500",
              tracking: 0.25,
            },
            {
              id: "fight_club",
              label: "Fight Club",
              color: "text-pink-500",
              tracking: 0.05,
            },
            {
              id: "pulp_fiction",
              label: "Pulp Fiction",
              color: "text-yellow-500",
              tracking: 0.1,
            },
            {
              id: "lost_in_translation",
              label: "Lost in Tr.",
              color: "text-slate-400",
              tracking: 0.15,
            },
            {
              id: "barbie",
              label: "Barbie",
              color: "text-pink-400",
              tracking: 0.05,
            },
            {
              id: "drive",
              label: "Drive",
              color: "text-fuchsia-400",
              tracking: 0.1,
            },
          ].map((style) => (
            <div role="button" tabIndex={0}
              key={style.id}
              onClick={() =>
                setTextOverlay((prev) => ({
                  ...prev,
                  subtitleStyle:
                    style.id as TextOverlaySettings["subtitleStyle"],
                  letterSpacing: style.tracking,
                }))
              }
              className={`py-1.5 px-1 text-[8px] font-mono uppercase tracking-widest transition border border-[var(--intaglio-line)] rounded-none flex flex-col items-center justify-center gap-1 ${
                textOverlay.subtitleStyle === style.id
                  ? `bg-white/10 border-amber-500/50 ${style.color} ring-1 ring-amber-500/20`
                  : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10"
              }`}
            >
              <span className="truncate w-full text-center">{style.label}</span>
            </div>
          ))}
        </div>
      </ControlGroup>

      {/* 3. Typography & Appearance */}
      <ControlGroup title="Typography">
        {/* Font Override Toggle */}
        <div className="flex items-center justify-between mb-3 px-1">
          <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
            Custom Typography
          </label>
          <Toggle
            checked={textOverlay.customFontEnabled}
            onChange={(checked) =>
              setTextOverlay((prev) => ({
                ...prev,
                customFontEnabled: checked,
              }))
            }
          />
        </div>

        {textOverlay.customFontEnabled && (
          <div className="space-y-4 mb-4 pt-1 animate-in slide-in-from-top-2">
            {/* Font Family */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 z-10">
                <IconTypography size={14} />
              </div>
              <CustomSelect
                value={
                  POPULAR_FONTS.includes(textOverlay.customFontName)
                    ? textOverlay.customFontName
                    : "custom"
                }
                options={[
                  { value: "custom", label: "Type Custom Name..." },
                  ...POPULAR_FONTS.map((font) => ({
                    value: font,
                    label: font,
                  })),
                ]}
                onChange={(val) => {
                  if (val !== "custom") {
                    setTextOverlay((prev) => ({
                      ...prev,
                      customFontName: val,
                    }));
                  } else {
                    setTextOverlay((prev) => ({
                      ...prev,
                      customFontName: "",
                    }));
                  }
                }}
                className="pl-7" // Extra padding for the icon
              />
            </div>
            {/* Fallback input */}
            {(!POPULAR_FONTS.includes(textOverlay.customFontName) ||
              textOverlay.customFontName === "") && (
              <input
                type="text"
                placeholder="Type Google Font..."
                value={textOverlay.customFontName}
                onChange={(e) =>
                  setTextOverlay((prev) => ({
                    ...prev,
                    customFontName: e.target.value,
                  }))
                }
                className="w-full bg-[#0a0908] border border-[var(--intaglio-line)] rounded-none px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 transition"
              />
            )}

            {/* Weight & Style */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <CustomSelect
                  value={textOverlay.customFontWeight || "400"}
                  options={[
                    { value: "100", label: "Thin (100)" },
                    { value: "300", label: "Light (300)" },
                    { value: "400", label: "Regular (400)" },
                    { value: "500", label: "Medium (500)" },
                    { value: "700", label: "Bold (700)" },
                    { value: "900", label: "Black (900)" },
                  ]}
                  onChange={(val) =>
                    setTextOverlay((prev) => ({
                      ...prev,
                      customFontWeight: val,
                    }))
                  }
                />
              </div>
              <div role="button" tabIndex={0}
                onClick={() =>
                  setTextOverlay((prev) => ({
                    ...prev,
                    customFontStyle:
                      prev.customFontStyle === "italic" ? "normal" : "italic",
                  }))
                }
                className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg border transition ${
                  textOverlay.customFontStyle === "italic"
                    ? "bg-white/10 border-amber-500/50 text-amber-400"
                    : "bg-black/30 border-white/10 text-gray-400 hover:text-gray-200"
                }`}
              >
                <IconItalic size={14} /> Italic
              </div>
            </div>

            {/* Transform Row */}
            <div className="flex bg-[#0a0908] border border-[var(--intaglio-line)] rounded-none p-1 gap-1">
              {[
                { id: "none", icon: <IconX size={14} /> },
                {
                  id: "uppercase",
                  icon: <IconLetterCaseUpper size={14} />,
                },
                {
                  id: "lowercase",
                  icon: <IconLetterCaseLower size={14} />,
                },
                {
                  id: "capitalize",
                  icon: <IconLetterCase size={14} />,
                },
              ].map((opt) => (
                <div role="button" tabIndex={0}
                  key={opt.id}
                  onClick={() =>
                    setTextOverlay((prev) => ({
                      ...prev,
                      customTextTransform:
                        opt.id as TextOverlaySettings["customTextTransform"],
                    }))
                  }
                  className={`flex-1 py-1.5 flex items-center justify-center rounded transition ${
                    textOverlay.customTextTransform === opt.id
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {opt.icon}
                </div>
              ))}
            </div>
            {/* Small Caps */}
            <div className="">
              <div role="button" tabIndex={0}
                onClick={() =>
                  setTextOverlay((prev) => ({
                    ...prev,
                    customFontVariant:
                      prev.customFontVariant === "small-caps"
                        ? "normal"
                        : "small-caps",
                  }))
                }
                className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg border transition ${
                  textOverlay.customFontVariant === "small-caps"
                    ? "bg-white/10 border-amber-500/50 text-amber-400"
                    : "bg-black/30 border-white/10 text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="font-variant-small-caps">Small Caps</span>
              </div>
            </div>
          </div>
        )}

        {/* Size & Spacing Sliders - Always Visible */}
        <Slider
          label="Size"
          value={textOverlay.fontSize}
          min={0.5}
          max={3}
          step={0.1}
          onChange={(v) =>
            setTextOverlay((prev) => ({
              ...prev,
              fontSize: v,
            }))
          }
          icon={<IconTypography size={14} />}
        />

        <Slider
          label="Spacing"
          value={textOverlay.letterSpacing}
          min={-0.2}
          max={1.0}
          step={0.01}
          onChange={(v) =>
            setTextOverlay((prev) => ({
              ...prev,
              letterSpacing: v,
            }))
          }
          icon={<IconSpacingHorizontal size={14} />}
        />

        <div className="pt-2"></div>
        <Slider
          label="Opacity"
          value={textOverlay.opacity}
          min={0}
          max={1}
          onChange={(v) =>
            setTextOverlay((prev) => ({
              ...prev,
              opacity: v,
            }))
          }
          icon={<IconEye size={14} />}
        />
      </ControlGroup>
    </div>
  );
}
