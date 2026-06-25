"use client";

import React, { useEffect } from "react";

/**
 * CinematicTextOverlay: Renders the film-emulation text over the image.
 * Handles extensive typography styles and dynamic font loading.
 */
export interface TextOverlaySettings {
  // Subtitle
  subtitleEnabled: boolean;
  subtitleText: string;
  subtitleStyle:
    | "blade_runner"
    | "interstellar"
    | "sicario"
    | "dune"
    | "arrival"
    | "revenant"
    | "oppenheimer"
    | "the_batman"
    | "joker"
    | "nineteen17"
    | "mad_max"
    | "her"
    | "matrix"
    | "fight_club"
    | "pulp_fiction"
    | "lost_in_translation"
    | "barbie"
    | "drive";

  // Date/Location
  dateEnabled: boolean;
  dateText: string;
  locationText: string;

  // Common
  fontSize: number;
  letterSpacing: number;
  opacity: number;

  // Custom Font & Typography
  customFontEnabled: boolean;
  customFontName: string;
  customFontWeight: string; // "100" to "900"
  customFontStyle: "normal" | "italic";
  customTextTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  customFontVariant: "normal" | "small-caps";
}

export const DEFAULT_TEXT_OVERLAY: TextOverlaySettings = {
  subtitleEnabled: false,
  subtitleText: "",
  subtitleStyle: "blade_runner",
  dateEnabled: false,
  dateText: new Date()
    .toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase(),
  locationText: "",
  fontSize: 1,
  letterSpacing: 0,
  opacity: 1,
  customFontEnabled: false,
  customFontName: "Inter",
  customFontWeight: "400",
  customFontStyle: "normal",
  customTextTransform: "none",
  customFontVariant: "normal",
};

// Oscar-level film style presets
export const FILM_STYLES = {
  blade_runner: {
    name: "BLADE RUNNER 2049",
    titleFont: "var(--font-bebas), 'Bebas Neue', Impact, sans-serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#ffffff",
    metaColor: "rgba(255, 200, 100, 0.9)",
    titleWeight: "400",
    titleTracking: "0.25em",
    metaTracking: "0.4em",
    textTransform: "uppercase" as const,
    shadow: "0 0 60px rgba(255, 150, 50, 0.3), 0 4px 20px rgba(0,0,0,0.9)",
    metaShadow: "0 0 40px rgba(255, 150, 50, 0.2), 0 2px 10px rgba(0,0,0,0.8)",
    gradient:
      "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
  },
  interstellar: {
    name: "INTERSTELLAR",
    titleFont: "var(--font-inter), system-ui, sans-serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#ffffff",
    metaColor: "rgba(255, 255, 255, 0.6)",
    titleWeight: "100",
    titleTracking: "0.3em",
    metaTracking: "0.5em",
    textTransform: "uppercase" as const,
    shadow: "0 2px 40px rgba(0,0,0,0.95), 0 0 80px rgba(0,0,0,0.6)",
    metaShadow: "0 2px 20px rgba(0,0,0,0.9)",
    gradient: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
  },
  sicario: {
    name: "SICARIO",
    titleFont: "var(--font-bebas), 'Bebas Neue', Impact, sans-serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#f5f5f5",
    metaColor: "#d4a855",
    titleWeight: "400",
    titleTracking: "0.15em",
    metaTracking: "0.35em",
    textTransform: "uppercase" as const,
    shadow: "0 3px 15px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.5)",
    metaShadow: "0 2px 10px rgba(0,0,0,0.9)",
    gradient:
      "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
  },
  dune: {
    name: "DUNE",
    titleFont: "var(--font-playfair), 'Playfair Display', Georgia, serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#f4e4c9",
    metaColor: "rgba(244, 228, 201, 0.7)",
    titleWeight: "400",
    titleTracking: "0.4em",
    metaTracking: "0.6em",
    textTransform: "uppercase" as const,
    shadow: "0 0 80px rgba(244, 180, 100, 0.15), 0 4px 30px rgba(0,0,0,0.9)",
    metaShadow: "0 0 40px rgba(244, 180, 100, 0.1), 0 2px 15px rgba(0,0,0,0.8)",
    gradient:
      "linear-gradient(to top, rgba(20,15,10,0.9) 0%, rgba(20,15,10,0.4) 50%, transparent 100%)",
  },
  arrival: {
    name: "ARRIVAL",
    titleFont: "var(--font-inter), system-ui, sans-serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#ffffff",
    metaColor: "rgba(255, 255, 255, 0.5)",
    titleWeight: "300",
    titleTracking: "0.2em",
    metaTracking: "0.4em",
    textTransform: "none" as const,
    shadow: "0 2px 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.5)",
    metaShadow: "0 2px 15px rgba(0,0,0,0.85)",
    gradient:
      "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)",
  },
  revenant: {
    name: "THE REVENANT",
    titleFont: "var(--font-playfair), 'Playfair Display', Georgia, serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#e8e0d5",
    metaColor: "rgba(232, 224, 213, 0.6)",
    titleWeight: "400",
    titleTracking: "0.08em",
    metaTracking: "0.3em",
    textTransform: "none" as const,
    shadow: "0 3px 25px rgba(0,0,0,0.95), 0 0 50px rgba(0,0,0,0.4)",
    metaShadow: "0 2px 12px rgba(0,0,0,0.9)",
    gradient:
      "linear-gradient(to top, rgba(15,20,15,0.85) 0%, rgba(15,20,15,0.3) 60%, transparent 100%)",
  },
  // NEW STYLES
  oppenheimer: {
    name: "OPPENHEIMER",
    titleFont: "var(--font-bebas), 'Bebas Neue', Impact, sans-serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#ffffff",
    metaColor: "rgba(255, 255, 255, 0.5)",
    titleWeight: "400",
    titleTracking: "0.08em",
    metaTracking: "0.3em",
    textTransform: "uppercase" as const,
    shadow: "0 0 0 rgba(0,0,0,0), 0 4px 20px rgba(0,0,0,0.98)",
    metaShadow: "0 2px 10px rgba(0,0,0,0.95)",
    gradient:
      "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 40%, transparent 100%)",
  },
  the_batman: {
    name: "THE BATMAN",
    titleFont: "var(--font-bebas), 'Bebas Neue', Impact, sans-serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#dc2626",
    metaColor: "rgba(220, 38, 38, 0.7)",
    titleWeight: "400",
    titleTracking: "0.15em",
    metaTracking: "0.35em",
    textTransform: "uppercase" as const,
    shadow: "0 0 80px rgba(220, 38, 38, 0.4), 0 4px 30px rgba(0,0,0,0.95)",
    metaShadow: "0 0 40px rgba(220, 38, 38, 0.3), 0 2px 15px rgba(0,0,0,0.9)",
    gradient:
      "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(10,0,0,0.5) 50%, transparent 100%)",
  },
  joker: {
    name: "JOKER",
    titleFont: "var(--font-playfair), 'Playfair Display', Georgia, serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#84cc16",
    metaColor: "rgba(250, 204, 21, 0.8)",
    titleWeight: "700",
    titleTracking: "0.05em",
    metaTracking: "0.25em",
    textTransform: "none" as const,
    shadow: "0 0 60px rgba(132, 204, 22, 0.3), 0 4px 25px rgba(0,0,0,0.95)",
    metaShadow: "0 0 30px rgba(250, 204, 21, 0.2), 0 2px 12px rgba(0,0,0,0.9)",
    gradient:
      "linear-gradient(to top, rgba(5,10,5,0.9) 0%, rgba(5,10,5,0.4) 50%, transparent 100%)",
  },
  nineteen17: {
    name: "1917",
    titleFont: "var(--font-bebas), 'Bebas Neue', Impact, sans-serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#d4c5a9",
    metaColor: "rgba(180, 160, 120, 0.8)",
    titleWeight: "400",
    titleTracking: "0.2em",
    metaTracking: "0.4em",
    textTransform: "uppercase" as const,
    shadow: "0 3px 20px rgba(0,0,0,0.95), 0 0 40px rgba(100,80,50,0.2)",
    metaShadow: "0 2px 12px rgba(0,0,0,0.9)",
    gradient:
      "linear-gradient(to top, rgba(30,28,20,0.9) 0%, rgba(30,28,20,0.4) 50%, transparent 100%)",
  },
  mad_max: {
    name: "MAD MAX",
    titleFont: "var(--font-bebas), 'Bebas Neue', Impact, sans-serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#f97316",
    metaColor: "rgba(251, 191, 36, 0.9)",
    titleWeight: "400",
    titleTracking: "0.12em",
    metaTracking: "0.3em",
    textTransform: "uppercase" as const,
    shadow: "0 0 80px rgba(249, 115, 22, 0.4), 0 4px 25px rgba(0,0,0,0.95)",
    metaShadow: "0 0 40px rgba(251, 191, 36, 0.3), 0 2px 15px rgba(0,0,0,0.9)",
    gradient:
      "linear-gradient(to top, rgba(20,10,0,0.9) 0%, rgba(20,10,0,0.4) 50%, transparent 100%)",
  },
  her: {
    name: "HER",
    titleFont: "var(--font-inter), system-ui, sans-serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#fda4af",
    metaColor: "rgba(253, 164, 175, 0.6)",
    titleWeight: "300",
    titleTracking: "0.15em",
    metaTracking: "0.35em",
    textTransform: "none" as const,
    shadow: "0 0 50px rgba(253, 164, 175, 0.2), 0 3px 20px rgba(0,0,0,0.8)",
    metaShadow:
      "0 0 30px rgba(253, 164, 175, 0.15), 0 2px 10px rgba(0,0,0,0.7)",
    gradient:
      "linear-gradient(to top, rgba(40,20,25,0.85) 0%, rgba(40,20,25,0.3) 60%, transparent 100%)",
  },
  matrix: {
    name: "THE MATRIX",
    titleFont: "var(--font-inter), monospace, sans-serif",
    metaFont: "var(--font-inter), monospace, sans-serif",
    titleColor: "#4ade80",
    metaColor: "rgba(74, 222, 128, 0.8)",
    titleWeight: "400",
    titleTracking: "0.25em",
    metaTracking: "0.4em",
    textTransform: "uppercase" as const,
    shadow: "0 0 20px rgba(74, 222, 128, 0.6), 0 4px 15px rgba(0,0,0,0.9)",
    metaShadow: "0 0 10px rgba(74, 222, 128, 0.4), 0 2px 8px rgba(0,0,0,0.9)",
    gradient:
      "linear-gradient(to top, rgba(0,20,0,0.95) 0%, rgba(0,20,0,0.4) 60%, transparent 100%)",
  },
  fight_club: {
    name: "FIGHT CLUB",
    titleFont: "var(--font-bebas), 'Bebas Neue', Helvetica, sans-serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#f472b6",
    metaColor: "rgba(244, 114, 182, 0.8)",
    titleWeight: "700",
    titleTracking: "0.05em",
    metaTracking: "0.25em",
    textTransform: "uppercase" as const,
    shadow: "0 0 40px rgba(244, 114, 182, 0.4), 0 4px 20px rgba(0,0,0,0.9)",
    metaShadow: "0 2px 10px rgba(0,0,0,0.9)",
    gradient:
      "linear-gradient(to top, rgba(20,5,10,0.95) 0%, rgba(20,5,10,0.5) 60%, transparent 100%)",
  },
  pulp_fiction: {
    name: "PULP FICTION",
    titleFont: "var(--font-bebas), 'Bebas Neue', Impact, sans-serif",
    metaFont: "var(--font-bebas), 'Bebas Neue', sans-serif",
    titleColor: "#fbbf24",
    metaColor: "#ef4444",
    titleWeight: "400",
    titleTracking: "0.1em",
    metaTracking: "0.2em",
    textTransform: "uppercase" as const,
    shadow: "3px 3px 0px #000000, 0 0 40px rgba(0,0,0,0.5)",
    metaShadow: "2px 2px 0px #000000",
    gradient:
      "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)",
  },
  lost_in_translation: {
    name: "LOST IN TRANSLATION",
    titleFont: "var(--font-inter), system-ui, sans-serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#cbd5e1",
    metaColor: "rgba(203, 213, 225, 0.7)",
    titleWeight: "200",
    titleTracking: "0.15em",
    metaTracking: "0.3em",
    textTransform: "none" as const,
    shadow: "0 0 30px rgba(255,100,200,0.2), 0 2px 15px rgba(0,0,0,0.9)",
    metaShadow: "0 2px 10px rgba(0,0,0,0.9)",
    gradient:
      "linear-gradient(to top, rgba(10,5,20,0.9) 0%, rgba(10,5,20,0.4) 60%, transparent 100%)",
  },
  barbie: {
    name: "BARBIE",
    titleFont: "var(--font-playfair), 'Playfair Display', serif",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#ec4899",
    metaColor: "rgba(255, 255, 255, 0.9)",
    titleWeight: "700",
    titleTracking: "0.05em",
    metaTracking: "0.25em",
    textTransform: "uppercase" as const,
    shadow: "2px 2px 0px #fff, 0 0 60px rgba(236, 72, 153, 0.4)",
    metaShadow: "0 2px 10px rgba(0,0,0,0.5)",
    gradient:
      "linear-gradient(to top, rgba(255,192,203,0.3) 0%, transparent 100%)",
  },
  drive: {
    name: "DRIVE",
    titleFont: "var(--font-bebas), 'Brush Script MT', cursive",
    metaFont: "var(--font-inter), system-ui, sans-serif",
    titleColor: "#ec4899",
    metaColor: "#3b82f6",
    titleWeight: "400",
    titleTracking: "0.1em",
    metaTracking: "0.2em",
    textTransform: "none" as const,
    shadow: "0 0 20px #ec4899, 0 0 60px #ec4899, 2px 2px 0 #000",
    metaShadow: "0 0 10px #3b82f6",
    gradient:
      "linear-gradient(to top, rgba(20,0,20,0.9) 0%, rgba(0,0,10,0.5) 60%, transparent 100%)",
  },
};

export default function CinematicTextOverlay({
  settings,
}: {
  settings: TextOverlaySettings;
}) {
  const {
    customFontEnabled,
    customFontName,
    customFontWeight,
    customFontStyle,
  } = settings;

  // Dynamically load Google Font
  useEffect(() => {
    if (customFontEnabled && customFontName) {
      const fontName = customFontName.trim();
      if (!fontName) return;

      // Construct Google Fonts URL with specific weight and style
      // Example: Family:ital,wght@0,400;0,700;1,400;1,700
      // For simplicity, we'll request the specific weight selected, plus italic if needed.
      // But standard Google Fonts API usually works best if we request a range or the specific combo.

      const weight = customFontWeight || "400";
      const isItalic = customFontStyle === "italic";

      // Requesting the specific variant
      // axis tag: ital,wght
      // values: 0,400 .. 1,400
      const axisParam = isItalic ? `1,${weight}` : `0,${weight}`;

      const link = document.createElement("link");
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(
        /\s+/g,
        "+"
      )}:ital,wght@${axisParam}&display=swap`;

      link.crossOrigin = "anonymous";
      link.rel = "stylesheet";
      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    }
  }, [
    customFontEnabled,
    customFontName,
    customFontWeight,
    customFontStyle,
  ]);

  if (!settings) return null;
  if (!settings.subtitleEnabled && !settings.dateEnabled) return null;

  const style = FILM_STYLES[settings.subtitleStyle];
  const baseFontSize = settings.fontSize;

  const titleFontFamily =
    settings.customFontEnabled && settings.customFontName
      ? `'${settings.customFontName}', sans-serif`
      : style.titleFont;

  const titleStyle = settings.customFontEnabled
    ? {
        fontWeight: settings.customFontWeight,
        fontStyle: settings.customFontStyle,
        textTransform: settings.customTextTransform,
        fontVariant: settings.customFontVariant,
        letterSpacing: `${settings.letterSpacing}em`,
        textShadow: style.shadow,
        color: style.titleColor,
      }
    : {
        fontWeight: style.titleWeight,
        fontStyle: "normal",
        textTransform: style.textTransform,
        fontVariant: "normal",
        letterSpacing: `${settings.letterSpacing}em`,
        textShadow: style.shadow,
        color: style.titleColor,
      };

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none"
      style={{ opacity: settings.opacity }}
    >
      {/* Cinematic gradient - bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[35%]"
        style={{ background: style.gradient }}
      />

      {/* Content Container */}
      <div className="absolute bottom-0 left-0 right-0 pb-[5%] px-[6%] text-center">
        {/* Date/Location - Film Metadata */}
        {settings.dateEnabled &&
          (settings.dateText || settings.locationText) && (
            <div className="mb-3">
              <span
                style={{
                  fontFamily: style.metaFont,
                  fontSize: `${baseFontSize * 0.55}rem`,
                  color: style.metaColor,
                  letterSpacing: style.metaTracking,
                  textTransform: "uppercase",
                  textShadow: style.metaShadow,
                  fontWeight: 400,
                }}
              >
                {settings.dateText}
                {settings.dateText && settings.locationText && (
                  <span style={{ opacity: 0.4, margin: "0 0.8em" }}>—</span>
                )}
                {settings.locationText}
              </span>
            </div>
          )}

        {/* Main Title/Subtitle */}
        {settings.subtitleEnabled && settings.subtitleText && (
          <div>
            <span
              style={{
                fontFamily: titleFontFamily,
                fontSize: `${baseFontSize * 2.2}rem`,
                lineHeight: 1.1,
                display: "inline-block",
                ...titleStyle, // Spread the computed styles
              }}
            >
              {settings.subtitleText}
            </span>
          </div>
        )}
      </div>

      {/* Subtle film grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
