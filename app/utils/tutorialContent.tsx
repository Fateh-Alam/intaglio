import React from "react";
import {
  IconSun,
  IconPalette,
  IconChartLine,
  IconCircles,
  IconCircle,
  IconMovie,
  IconSparkles,
  IconLayersIntersect,
  IconTypography,
  IconArrowsMaximize,
  IconHistory,
  IconCamera,
} from "@tabler/icons-react";
import { TutorialContent } from "../components/TutorialModal";
import { STORAGE_KEYS } from "../lib/brand";

export const TUTORIAL_CONTENT: Record<string, TutorialContent> = {
  basic: {
    id: "basic",
    title: "Exposure & Contrast",
    subtitle: "The Foundation",
    description:
      "Master the fundamentals of image editing. Adjust brightness to control overall luminance, and contrast to enhance the difference between light and dark areas.",
    tips: [
      "Start with brightness to fix overall exposure",
      "Use contrast sparingly — a little goes a long way",
      "Watch your histogram to avoid clipping",
    ],
    icon: <IconSun className="intaglio-icon"/>,
    accentColor: "#f59e0b",
  },

  color: {
    id: "color",
    title: "Color Temperature",
    subtitle: "Warm & Cool Tones",
    description:
      "Shape the mood of your image with color temperature and tint. Push toward warm light or cooler shade with restraint.",
    tips: [
      "Temperature affects the warm/cool balance",
      "Tint corrects green/magenta color casts",
      "Color separation can be subtle and still readable",
    ],
    icon: <IconPalette className="intaglio-icon"/>,
    accentColor: "#a855f7",
  },

  curves: {
    id: "curves",
    title: "Tone Curves",
    subtitle: "Precision Control",
    description:
      "The most powerful tool for tonal control. Create custom contrast curves, lift shadows, roll off highlights, and manipulate individual RGB channels.",
    tips: [
      "Click to add control points, drag to adjust",
      "S-curves add contrast, inverse-S reduces it",
      "Use RGB channels for creative color grading",
    ],
    icon: <IconChartLine className="intaglio-icon"/>,
    accentColor: "#3b82f6",
  },

  grading: {
    id: "grading",
    title: "Color Wheels",
    subtitle: "Hollywood Grading",
    description:
      "Professional 3-way color grading with separate control over shadows, midtones, and highlights. Drag the wheel to tint, use the slider for luminance.",
    tips: [
      "Shadows: Tint the darkest parts of the image",
      "Midtones: Affect skin tones and general color",
      "Highlights: Add warmth or cool to bright areas",
    ],
    icon: <IconCircles className="intaglio-icon"/>,
    accentColor: "#a855f7",
  },

  hsl: {
    id: "hsl",
    title: "HSL Panel",
    subtitle: "Per-Color Control",
    description:
      "Fine-tune specific colors in your image. Adjust the hue, saturation, and luminance of individual color ranges for precise creative control.",
    tips: [
      "Target specific colors without affecting others",
      "Red/Orange channels affect skin tones",
      "Shift hues for creative color transformations",
    ],
    icon: <IconCircle className="intaglio-icon"/>,
    accentColor: "#06b6d4",
  },

  films: {
    id: "films",
    title: "Film Emulations",
    subtitle: "Analog Soul",
    description:
      "Recreate the look of classic film stocks instantly. From Portrait 400's warm skin tones to Tungsten 800T's halation — bring analog character to digital images.",
    tips: [
      "Portrait 400: Warm, creamy skin tones",
      "Tungsten 800T: Night tungsten halation",
      "Velvet 50: Punchy, saturated landscapes",
    ],
    icon: <IconMovie className="intaglio-icon"/>,
    accentColor: "#f97316",
  },

  effects: {
    id: "effects",
    title: "Creative Effects",
    subtitle: "The Secret Sauce",
    description:
      "Add character with grain, halation, vignette, and more. These subtle effects transform clinical digital images into something with soul.",
    tips: [
      "Grain adds texture and breaks up digital smoothness",
      "Halation creates that dreamy highlight glow",
      "Vignette draws focus to your subject",
    ],
    icon: <IconSparkles className="intaglio-icon"/>,
    accentColor: "#06b6d4",
  },

  masking: {
    id: "masking",
    title: "Masking Tools",
    subtitle: "Selective Editing",
    description:
      "Apply adjustments to specific areas. Use radial masks for spotlight effects, linear gradients for skies, and luminosity masks for targeted tonal control.",
    tips: [
      "Radial masks: Perfect for subject isolation",
      "Linear gradients: Ideal for sky/ground blends",
      "Luminosity: Target shadows, mids, or highlights",
    ],
    icon: <IconLayersIntersect className="intaglio-icon"/>,
    accentColor: "#f97316",
  },

  text: {
    id: "text",
    title: "Editorial Text",
    subtitle: "Captions & Titles",
    description:
      "Add quiet titles, captions, and date/location notes with precise placement.",
    tips: [
      "Enable subtitles for movie poster effects",
      "Add date/location for documentary style",
      "Adjust opacity for seamless integration",
    ],
    icon: <IconTypography className="intaglio-icon"/>,
    accentColor: "#22c55e",
  },

  transform: {
    id: "transform",
    title: "Transform & Lens",
    subtitle: "Geometry Control",
    description:
      "Correct perspective, fix lens distortion, and apply creative geometric effects like tilt-shift for miniature effects.",
    tips: [
      "Keystone corrects converging lines",
      "Lens distortion fixes barrel/pincushion",
      "Tilt-shift creates selective focus",
    ],
    icon: <IconArrowsMaximize className="intaglio-icon"/>,
    accentColor: "#f59e0b",
  },

  history: {
    id: "history",
    title: "Edit History",
    subtitle: "Time Travel",
    description:
      "Never lose your work. Every adjustment is tracked, letting you undo, redo, or jump back to any point in your editing session.",
    tips: [
      "Cmd/Ctrl+Z to undo, Shift+Z to redo",
      "Click any history state to jump back",
      "Clear history to start fresh",
    ],
    icon: <IconHistory className="intaglio-icon"/>,
    accentColor: "#f43f5e",
  },

  snapshots: {
    id: "snapshots",
    title: "A/B Comparison",
    subtitle: "Before & After",
    description:
      "Save snapshots of your edit at any point. Compare different versions side-by-side with our split-screen wiper to find your favorite look.",
    tips: [
      "Take snapshots before major changes",
      "Click Compare to activate split-screen",
      "Drag the wiper to reveal before/after",
    ],
    icon: <IconCamera className="intaglio-icon"/>,
    accentColor: "#22c55e",
  },
};

// LocalStorage helpers
const STORAGE_KEY = STORAGE_KEYS.tutorialsSeen;

export function getSeenTutorials(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function markTutorialSeen(tabId: string): void {
  if (typeof window === "undefined") return;
  try {
    const seen = getSeenTutorials();
    seen[tabId] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  } catch {
    // Ignore storage errors
  }
}

export function resetTutorials(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
