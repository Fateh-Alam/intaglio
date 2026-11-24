"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, PanInfo } from "framer-motion";

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

  // Billing Block
  billingBlockEnabled: boolean;
  billingBlockText: string;

  // Positioning
  subtitleX: number;
  subtitleY: number;
  dateX: number;
  dateY: number;
  billingX: number;
  billingY: number;

  // Common
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  opacity: number;
  textAlign: "left" | "center" | "right" | "justify";
  
  // Custom Shadow Physics
  shadowColor: string;
  shadowBlur: number;
  shadowDistance: number;

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
  billingBlockEnabled: false,
  billingBlockText: "ETCH STUDIO PRESENTS  ·  DIRECTED BY YOUR NAME\nPHOTOGRAPHY BY YOUR NAME  ·  GRADED IN ETCH",
  subtitleX: 0,
  subtitleY: 30, // Percentage from bottom
  dateX: 0,
  dateY: 10,
  billingX: 0,
  billingY: 5,
  fontSize: 1,
  letterSpacing: 0,
  lineHeight: 1.2,
  opacity: 1,
  textAlign: "center",
  shadowColor: "rgba(0,0,0,0.8)",
  shadowBlur: 20,
  shadowDistance: 4,
  customFontEnabled: false,
  customFontName: "Inter",
  customFontWeight: "400",
  customFontStyle: "normal",
  customTextTransform: "none",
  customFontVariant: "normal",
};

// Curated title typography presets (internal IDs kept stable for saved projects).
export const FILM_STYLES = {
  blade_runner: {
    name: "NEON 2049",
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
    name: "ORBIT",
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
    name: "FRONTIER",
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
    name: "SANDS",
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
    name: "MONOLITH",
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
    name: "WILDERNESS",
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
  oppenheimer: {
    name: "ATOMIC",
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
    name: "CRIMSON",
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
    name: "ACID SERIF",
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
    name: "TRENCH",
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
    name: "FURY",
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
    name: "BLUSH",
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
    name: "PHOSPHOR",
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
    name: "REBEL",
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
    name: "PULP",
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
    name: "MIDNIGHT",
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
    name: "POP PINK",
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
    name: "NIGHTRUN",
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
  setSettings,
}: {
  settings: TextOverlaySettings;
  setSettings?: React.Dispatch<React.SetStateAction<TextOverlaySettings>>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedElement, setSelectedElement] = useState<"subtitle" | "date" | "billing" | null>(null);

  // Dynamically load Google Font
  useEffect(() => {
    if (!settings) return;
    const { customFontEnabled, customFontName, customFontWeight, customFontStyle } = settings;
    if (customFontEnabled && customFontName) {
      const fontName = customFontName.trim();
      if (!fontName) return;

      const weight = customFontWeight || "400";
      const isItalic = customFontStyle === "italic";
      const axisParam = isItalic ? `1,${weight}` : `0,${weight}`;

      const link = document.createElement("link");
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}:ital,wght@${axisParam}&display=swap`;
      link.crossOrigin = "anonymous";
      link.rel = "stylesheet";
      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    }
  }, [settings]);

  if (!settings) return null;
  if (!settings.subtitleEnabled && !settings.dateEnabled && !settings.billingBlockEnabled) return null;

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


  // Drag Handlers
  const handleDragEnd = (element: "subtitle" | "date" | "billing", info: PanInfo) => {
    if (!setSettings) return;
    setSettings((prev) => ({
      ...prev,
      [`${element}X`]: prev[`${element}X` as keyof TextOverlaySettings] as number + info.offset.x,
      [`${element}Y`]: prev[`${element}Y` as keyof TextOverlaySettings] as number + info.offset.y,
    }));
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10 overflow-hidden select-none"
      style={{ opacity: settings.opacity }}
      onPointerDown={() => setSelectedElement(null)}
    >
      {/* Cinematic gradient - bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[35%] pointer-events-none"
        style={{ background: style.gradient }}
      />

      {/* Date/Location - Film Metadata */}
      {settings.dateEnabled && (settings.dateText || settings.locationText) && (
        <motion.div 
          drag
          dragMomentum={false}
          onDragEnd={(_, info) => handleDragEnd("date", info)}
          onPointerDown={(e) => {
            e.stopPropagation();
            setSelectedElement("date");
          }}
          className={`absolute cursor-move ${
            selectedElement === "date" 
              ? "ring-1 ring-white/50 ring-dashed bg-white/5" 
              : "hover:ring-1 hover:ring-white/20"
          }`}
          animate={{ x: settings.dateX, y: settings.dateY }}
          style={{ 
            left: '50%', top: '20%', translateX: '-50%', translateY: '-50%',
            textAlign: settings.textAlign || 'center',
            padding: '8px'
          }}
        >
          {selectedElement === "date" && (
            <>
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white" />
            </>
          )}
          <span
            style={{
              fontFamily: style.metaFont,
              fontSize: `${baseFontSize * 0.55}rem`,
              color: style.metaColor,
              letterSpacing: style.metaTracking,
              textTransform: "uppercase",
              textShadow: style.metaShadow,
              fontWeight: 500,
              mixBlendMode: "screen",
              opacity: 0.9,
            }}
          >
            {settings.dateText}
            {settings.dateText && settings.locationText && (
              <span style={{ opacity: 0.4, margin: "0 0.8em" }}>—</span>
            )}
            {settings.locationText}
          </span>
        </motion.div>
      )}

      {/* Main Title/Subtitle */}
      {settings.subtitleEnabled && settings.subtitleText && (
        <motion.div
          drag
          dragMomentum={false}
          onDragEnd={(_, info) => handleDragEnd("subtitle", info)}
          onPointerDown={(e) => {
            e.stopPropagation();
            setSelectedElement("subtitle");
          }}
          className={`absolute cursor-move w-full flex justify-center ${
            selectedElement === "subtitle" 
              ? "ring-1 ring-white/50 ring-dashed bg-white/5" 
              : "hover:ring-1 hover:ring-white/20"
          }`}
          animate={{ x: settings.subtitleX, y: settings.subtitleY }}
          style={{ 
            left: 0, bottom: '25%', 
            textAlign: settings.textAlign || 'center',
            padding: '16px 0'
          }}
        >
          {selectedElement === "subtitle" && (
            <>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />
            </>
          )}
          <span
            style={{
              fontFamily: titleFontFamily,
              fontSize: `${baseFontSize * 2.2}rem`,
              lineHeight: settings.lineHeight || 1.1,
              display: "inline-block",
              mixBlendMode: "screen",
              ...titleStyle,
              ...(settings.customFontEnabled && {
                textShadow: `${settings.shadowDistance}px ${settings.shadowDistance}px ${settings.shadowBlur}px ${settings.shadowColor}`
              })
            }}
          >
            {settings.subtitleText.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </span>
        </motion.div>
      )}

      {/* Billing Block */}
      {settings.billingBlockEnabled && settings.billingBlockText && (
        <motion.div
          drag
          dragMomentum={false}
          onDragEnd={(_, info) => handleDragEnd("billing", info)}
          onPointerDown={(e) => {
            e.stopPropagation();
            setSelectedElement("billing");
          }}
          className={`absolute cursor-move w-full flex justify-center ${
            selectedElement === "billing" 
              ? "ring-1 ring-white/50 ring-dashed bg-white/5" 
              : "hover:ring-1 hover:ring-white/20"
          }`}
          animate={{ x: settings.billingX, y: settings.billingY }}
          style={{ bottom: '10%', padding: '16px 0' }}
        >
          {selectedElement === "billing" && (
            <>
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white" />
            </>
          )}
          <div
            style={{
              fontFamily: "'Univers', 'Steelfish', 'Oswald', 'Bebas Neue', sans-serif",
              fontSize: `${baseFontSize * 0.45}rem`,
              color: style.metaColor,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textShadow: style.metaShadow,
              textAlign: "center",
              transform: "scaleY(1.8) scaleX(0.85)", // Squish it vertically like classic billing blocks
              lineHeight: 1.1,
              maxWidth: "85%",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "0.4em 1em",
              mixBlendMode: "screen",
              opacity: 0.85,
            }}
          >
            {settings.billingBlockText.split('\n').map((line, lineIdx) => (
              <div key={lineIdx} className="w-full flex justify-center flex-wrap gap-x-4 gap-y-2">
                {line.split('  ').map((segment, segIdx) => {
                  const match = segment.match(/^(.*? BY|.*? OF .*?|STARRING)(.*)$/i);
                  if (match) {
                    return (
                      <span key={segIdx} className="flex items-end gap-1">
                        <span style={{ fontSize: '0.55em', opacity: 0.85, paddingBottom: '0.25em', fontWeight: 400 }}>{match[1].trim()}</span>
                        <span style={{ fontWeight: 700, fontSize: '1.2em' }}>{match[2].trim()}</span>
                      </span>
                    );
                  }
                  return <span key={segIdx} style={{ fontWeight: 700 }}>{segment.trim()}</span>;
                })}
              </div>
            ))}
          </div>
        </motion.div>
      )}

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
