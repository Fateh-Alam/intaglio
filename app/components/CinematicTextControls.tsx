"use client";

import React from "react";
import {
  IconTypography,
  IconItalic,
  IconLetterCase,
  IconLetterCaseUpper,
  IconLetterCaseLower,
  IconX,
  IconSpacingHorizontal,
  IconEye,
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconArrowAutofitHeight,
  IconShadow,
  IconUpload,
} from "@tabler/icons-react";
import Toggle from "./Toggle";
import CustomSelect from "./CustomSelect";
import FontSelector from "./FontSelector";
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

const VISUAL_STYLES: ReadonlyArray<{
  id: TextOverlaySettings["subtitleStyle"];
  label: string;
  swatch: string;
  tracking: number;
}> = [
  { id: "blade_runner", label: "Neon 2049", swatch: "#fdba74", tracking: 0.1 },
  { id: "interstellar", label: "Orbit", swatch: "#ffffff", tracking: 0.2 },
  { id: "sicario", label: "Frontier", swatch: "#fbbf24", tracking: 0.1 },
  { id: "dune", label: "Sands", swatch: "#f4e4c9", tracking: 0.15 },
  { id: "arrival", label: "Monolith", swatch: "#d4d4d8", tracking: 0.2 },
  { id: "revenant", label: "Wilderness", swatch: "#d6d3d1", tracking: 0.15 },
  { id: "oppenheimer", label: "Atomic", swatch: "#ffffff", tracking: 0.15 },
  { id: "the_batman", label: "Crimson", swatch: "#ef4444", tracking: 0.05 },
  { id: "joker", label: "Acid Serif", swatch: "#a3e635", tracking: 0.0 },
  { id: "nineteen17", label: "Trench", swatch: "#d4c5a9", tracking: 0.2 },
  { id: "mad_max", label: "Fury", swatch: "#f97316", tracking: 0.12 },
  { id: "her", label: "Blush", swatch: "#fda4af", tracking: 0.15 },
  { id: "matrix", label: "Phosphor", swatch: "#4ade80", tracking: 0.25 },
  { id: "fight_club", label: "Rebel", swatch: "#f472b6", tracking: 0.05 },
  { id: "pulp_fiction", label: "Pulp", swatch: "#facc15", tracking: 0.1 },
  { id: "lost_in_translation", label: "Midnight", swatch: "#94a3b8", tracking: 0.15 },
  { id: "barbie", label: "Pop Pink", swatch: "#ec4899", tracking: 0.05 },
  { id: "drive", label: "Nightrun", swatch: "#e879f9", tracking: 0.1 },
];

const FIELD_CLASS =
  "w-full rounded-[8px] bg-black/30 px-2.5 py-1.5 text-[12px] text-[var(--ui-text)] outline-none ring-1 ring-inset ring-[var(--ui-line)] placeholder:text-[var(--ui-text-3)] focus:ring-[var(--ui-accent)] transition-colors";

interface CinematicTextControlsProps {
  textOverlay: TextOverlaySettings;
  setTextOverlay: React.Dispatch<React.SetStateAction<TextOverlaySettings>>;
  onFontUpload?: (file: File) => Promise<void>;
}

export default function CinematicTextControls({
  textOverlay,
  setTextOverlay,
  onFontUpload,
}: CinematicTextControlsProps) {
  return (
    <div className="space-y-1">
      {/* 1. Content Section */}
      <ControlGroup title="Content">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="overlay-title-input" className="text-[12px] text-[var(--ui-text-2)]">
                Title
              </label>
              <Toggle
                ariaLabel="Show title"
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
              id="overlay-title-input"
              type="text"
              placeholder="Title text"
              value={textOverlay.subtitleText}
              onChange={(e) =>
                setTextOverlay((prev) => ({
                  ...prev,
                  subtitleText: e.target.value,
                }))
              }
              className={FIELD_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="overlay-date-input" className="text-[12px] text-[var(--ui-text-2)]">
                Date &amp; location
              </label>
              <Toggle
                ariaLabel="Show date and location"
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
              id="overlay-date-input"
              type="text"
              placeholder="Date (e.g., NOVEMBER 2026)"
              value={textOverlay.dateText}
              onChange={(e) =>
                setTextOverlay((prev) => ({
                  ...prev,
                  dateText: e.target.value,
                }))
              }
              className={FIELD_CLASS}
            />
            <input
              type="text"
              aria-label="Location"
              placeholder="Location (e.g., KYOTO, JAPAN)"
              value={textOverlay.locationText}
              onChange={(e) =>
                setTextOverlay((prev) => ({
                  ...prev,
                  locationText: e.target.value,
                }))
              }
              className={FIELD_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="overlay-credits-input" className="text-[12px] text-[var(--ui-text-2)]">
                Credit block
              </label>
              <Toggle
                ariaLabel="Show credit block"
                checked={textOverlay.billingBlockEnabled}
                onChange={(checked) =>
                  setTextOverlay((prev) => ({
                    ...prev,
                    billingBlockEnabled: checked,
                  }))
                }
              />
            </div>
            <textarea
              id="overlay-credits-input"
              placeholder="Credits text…"
              value={textOverlay.billingBlockText}
              rows={3}
              onChange={(e) =>
                setTextOverlay((prev) => ({
                  ...prev,
                  billingBlockText: e.target.value,
                }))
              }
              className={`${FIELD_CLASS} resize-none leading-relaxed`}
            />
          </div>
        </div>
      </ControlGroup>

      {/* 2. Title Style Presets */}
      <ControlGroup title="Title style">
        <div className="ui-scroll grid max-h-[200px] grid-cols-3 gap-1.5 overflow-y-auto pr-1">
          {VISUAL_STYLES.map((style) => {
            const active = textOverlay.subtitleStyle === style.id;
            return (
              <button
                type="button"
                key={style.id}
                aria-pressed={active}
                onClick={() =>
                  setTextOverlay((prev) => ({
                    ...prev,
                    subtitleStyle: style.id,
                    letterSpacing: style.tracking,
                  }))
                }
                className={`ui-focus flex items-center gap-1.5 rounded-[7px] px-2 py-1.5 text-left text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-[var(--ui-accent-soft)] text-[var(--ui-text)] ring-1 ring-inset ring-[var(--ui-accent)]/50"
                    : "bg-white/[0.03] text-[var(--ui-text-2)] ring-1 ring-inset ring-[var(--ui-line)] hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
                }`}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: style.swatch }}
                />
                <span className="truncate">{style.label}</span>
              </button>
            );
          })}
        </div>
      </ControlGroup>

      {/* 3. Typography & Appearance */}
      <ControlGroup title="Typography">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[var(--ui-text-2)]">Custom typography</span>
          <Toggle
            ariaLabel="Custom typography"
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
          <div className="space-y-2.5 pt-1">
            <FontSelector
              value={textOverlay.customFontName}
              fonts={POPULAR_FONTS}
              onChange={(val) =>
                setTextOverlay((prev) => ({
                  ...prev,
                  customFontName: val,
                }))
              }
            />

            <label className="ui-focus flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] bg-[var(--ui-control)] px-3 text-[12px] font-medium text-[var(--ui-text-2)] ring-1 ring-inset ring-[var(--ui-line)] transition-colors hover:bg-[var(--ui-control-hover)] hover:text-[var(--ui-text)]">
              <IconUpload size={14} stroke={1.8} />
              Embed font file
              <input
                type="file"
                accept=".woff2,.ttf,.otf,font/woff2,font/ttf,font/otf"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && onFontUpload) void onFontUpload(file);
                  event.target.value = "";
                }}
              />
            </label>

            <div className="grid grid-cols-2 gap-1.5">
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
              <button
                type="button"
                aria-pressed={textOverlay.customFontStyle === "italic"}
                onClick={() =>
                  setTextOverlay((prev) => ({
                    ...prev,
                    customFontStyle: prev.customFontStyle === "italic" ? "normal" : "italic",
                  }))
                }
                className={`ui-focus flex h-8 items-center justify-center gap-1.5 rounded-[8px] text-[12px] font-medium ring-1 ring-inset transition-colors ${
                  textOverlay.customFontStyle === "italic"
                    ? "bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)] ring-[var(--ui-accent)]/50"
                    : "bg-black/30 text-[var(--ui-text-2)] ring-[var(--ui-line)] hover:bg-white/[0.05] hover:text-[var(--ui-text)]"
                }`}
              >
                <IconItalic size={14} stroke={1.8} />
                Italic
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1 rounded-[8px] bg-black/30 p-0.5 ring-1 ring-inset ring-[var(--ui-line)]">
              {(
                [
                  { id: "none", label: "Normal case", icon: <IconX size={14} /> },
                  { id: "uppercase", label: "Uppercase", icon: <IconLetterCaseUpper size={14} /> },
                  { id: "lowercase", label: "Lowercase", icon: <IconLetterCaseLower size={14} /> },
                  { id: "capitalize", label: "Capitalize", icon: <IconLetterCase size={14} /> },
                ] as const
              ).map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  aria-label={opt.label}
                  aria-pressed={textOverlay.customTextTransform === opt.id}
                  onClick={() =>
                    setTextOverlay((prev) => ({
                      ...prev,
                      customTextTransform: opt.id,
                    }))
                  }
                  className={`ui-focus flex h-7 items-center justify-center rounded-[6px] transition-colors ${
                    textOverlay.customTextTransform === opt.id
                      ? "bg-white/[0.12] text-[var(--ui-text)]"
                      : "text-[var(--ui-text-3)] hover:bg-white/[0.04] hover:text-[var(--ui-text-2)]"
                  }`}
                >
                  {opt.icon}
                </button>
              ))}
            </div>

            <button
              type="button"
              aria-pressed={textOverlay.customFontVariant === "small-caps"}
              onClick={() =>
                setTextOverlay((prev) => ({
                  ...prev,
                  customFontVariant:
                    prev.customFontVariant === "small-caps" ? "normal" : "small-caps",
                }))
              }
              className={`ui-focus flex h-8 w-full items-center justify-center rounded-[8px] text-[12px] font-medium ring-1 ring-inset transition-colors ${
                textOverlay.customFontVariant === "small-caps"
                  ? "bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)] ring-[var(--ui-accent)]/50"
                  : "bg-black/30 text-[var(--ui-text-2)] ring-[var(--ui-line)] hover:bg-white/[0.05] hover:text-[var(--ui-text)]"
              }`}
            >
              Small Caps
            </button>
          </div>
        )}

        <Slider
          label="Size"
          value={textOverlay.fontSize}
          defaultValue={1}
          min={0.5}
          max={3}
          step={0.1}
          onChange={(v) => setTextOverlay((prev) => ({ ...prev, fontSize: v }))}
          icon={<IconTypography size={13} stroke={1.7} />}
        />

        <Slider
          label="Spacing"
          value={textOverlay.letterSpacing}
          defaultValue={0}
          min={-0.2}
          max={1.0}
          step={0.01}
          onChange={(v) => setTextOverlay((prev) => ({ ...prev, letterSpacing: v }))}
          icon={<IconSpacingHorizontal size={13} stroke={1.7} />}
        />

        <Slider
          label="Opacity"
          value={textOverlay.opacity}
          defaultValue={1}
          min={0}
          max={1}
          onChange={(v) => setTextOverlay((prev) => ({ ...prev, opacity: v }))}
          icon={<IconEye size={13} stroke={1.7} />}
        />

        {textOverlay.customFontEnabled && (
          <>
            <div className="space-y-2 border-t border-[var(--ui-line)] pt-3">
              <span className="block text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--ui-text-3)]">
                Layout
              </span>

              <div className="grid grid-cols-3 gap-1 rounded-[8px] bg-black/30 p-0.5 ring-1 ring-inset ring-[var(--ui-line)]">
                {(
                  [
                    { id: "left", label: "Align left", icon: <IconAlignLeft size={14} /> },
                    { id: "center", label: "Align center", icon: <IconAlignCenter size={14} /> },
                    { id: "right", label: "Align right", icon: <IconAlignRight size={14} /> },
                  ] as const
                ).map((opt) => (
                  <button
                    type="button"
                    key={opt.id}
                    aria-label={opt.label}
                    aria-pressed={textOverlay.textAlign === opt.id}
                    onClick={() =>
                      setTextOverlay((prev) => ({
                        ...prev,
                        textAlign: opt.id,
                      }))
                    }
                    className={`ui-focus flex h-7 items-center justify-center rounded-[6px] transition-colors ${
                      textOverlay.textAlign === opt.id
                        ? "bg-white/[0.12] text-[var(--ui-text)]"
                        : "text-[var(--ui-text-3)] hover:bg-white/[0.04] hover:text-[var(--ui-text-2)]"
                    }`}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>

              <Slider
                label="Line height"
                value={textOverlay.lineHeight || 1.2}
                defaultValue={1.2}
                min={0.5}
                max={2.5}
                step={0.05}
                onChange={(v) => setTextOverlay((prev) => ({ ...prev, lineHeight: v }))}
                icon={<IconArrowAutofitHeight size={13} stroke={1.7} />}
              />
            </div>

            <div className="space-y-2 border-t border-[var(--ui-line)] pt-3">
              <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--ui-text-3)]">
                <IconShadow size={13} stroke={1.7} /> Drop shadow
              </span>

              <input
                type="text"
                aria-label="Shadow color"
                placeholder="rgba(0,0,0,0.8)"
                value={textOverlay.shadowColor || "rgba(0,0,0,0.8)"}
                onChange={(e) =>
                  setTextOverlay((prev) => ({ ...prev, shadowColor: e.target.value }))
                }
                className={FIELD_CLASS}
              />

              <Slider
                label="Blur radius"
                value={textOverlay.shadowBlur ?? 20}
                defaultValue={20}
                min={0}
                max={100}
                step={1}
                onChange={(v) => setTextOverlay((prev) => ({ ...prev, shadowBlur: v }))}
                icon={<IconShadow size={13} stroke={1.7} />}
              />
              <Slider
                label="Distance"
                value={textOverlay.shadowDistance ?? 4}
                defaultValue={4}
                min={-50}
                max={50}
                step={1}
                bipolar
                onChange={(v) => setTextOverlay((prev) => ({ ...prev, shadowDistance: v }))}
                icon={<IconShadow size={13} stroke={1.7} />}
              />
            </div>
          </>
        )}
      </ControlGroup>
    </div>
  );
}
