"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { readPreference, writePreference } from "../../ui/storage";
import type { EditorSettings } from "../../types/editor";
import type { CropDraft } from "../crop/useCrop";

export type LeftTab = "looks" | "history" | "versions" | "info";
export type RightMode = "develop" | "masks" | "text";
export type Surround = "black" | "dark" | "medium";
export type CompareMode = "off" | "split" | "before";

export const SURROUND_COLORS: Record<Surround, string> = {
  black: "#050505",
  dark: "#141415",
  medium: "#3a3a3c",
};

interface ShellState {
  leftOpen: boolean;
  setLeftOpen: (open: boolean) => void;
  leftTab: LeftTab;
  setLeftTab: (tab: LeftTab) => void;
  /** Opens the left panel on a tab, or closes it if that tab is already showing. */
  toggleLeft: (tab: LeftTab) => void;
  rightMode: RightMode;
  setRightMode: (mode: RightMode) => void;
  cropDraft: CropDraft | null;
  setCropDraft: React.Dispatch<React.SetStateAction<CropDraft | null>>;
  panelsHidden: boolean;
  setPanelsHidden: (hidden: boolean) => void;
  showClipping: boolean;
  setShowClipping: (show: boolean) => void;
  surround: Surround;
  setSurround: (surround: Surround) => void;
  compare: CompareMode;
  setCompare: (mode: CompareMode) => void;
  splitPosition: number;
  setSplitPosition: (position: number) => void;
  /** Temporary settings shown while hovering a look or history step; never saved. */
  preview: EditorSettings | null;
  setPreview: React.Dispatch<React.SetStateAction<EditorSettings | null>>;
  /** Mask component being edited on the canvas (inside the active adjustment). */
  selectedComponentId: string | null;
  setSelectedComponentId: (id: string | null) => void;
  showMaskOverlay: boolean;
  setShowMaskOverlay: (show: boolean) => void;
  /** Eyedropper target while picking a luminance or color range from the photo. */
  picking: "luminosity" | "colorRange" | null;
  setPicking: (mode: "luminosity" | "colorRange" | null) => void;
}

const ShellContext = createContext<ShellState | null>(null);

const SURROUND_KEY = "intaglio.ui.surround";

/** View-only UI state for the editor shell. Never affects rendered pixels or exports. */
export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>("looks");
  const [rightMode, setRightMode] = useState<RightMode>("develop");
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [panelsHidden, setPanelsHidden] = useState(false);
  const [showClipping, setShowClipping] = useState(false);
  const [surround, setSurroundState] = useState<Surround>(() =>
    readPreference<Surround>(SURROUND_KEY, "dark", (value): value is Surround => typeof value === "string" && value in SURROUND_COLORS));
  const [compare, setCompare] = useState<CompareMode>("off");
  const [splitPosition, setSplitPosition] = useState(0.5);
  const [preview, setPreview] = useState<EditorSettings | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [showMaskOverlay, setShowMaskOverlay] = useState(true);
  const [picking, setPicking] = useState<"luminosity" | "colorRange" | null>(null);

  const value = useMemo<ShellState>(() => ({
    leftOpen,
    setLeftOpen,
    leftTab,
    setLeftTab,
    toggleLeft: (tab) => {
      if (leftOpen && leftTab === tab) setLeftOpen(false);
      else {
        setLeftTab(tab);
        setLeftOpen(true);
      }
    },
    rightMode,
    setRightMode,
    cropDraft,
    setCropDraft,
    panelsHidden,
    setPanelsHidden,
    showClipping,
    setShowClipping,
    surround,
    setSurround: (next) => {
      setSurroundState(next);
      writePreference(SURROUND_KEY, next);
    },
    compare,
    setCompare,
    splitPosition,
    setSplitPosition,
    preview,
    setPreview,
    selectedComponentId,
    setSelectedComponentId,
    showMaskOverlay,
    setShowMaskOverlay,
    picking,
    setPicking,
  }), [leftOpen, leftTab, rightMode, cropDraft, panelsHidden, showClipping, surround, compare, splitPosition, preview, selectedComponentId, showMaskOverlay, picking]);

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellState {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell must be used inside ShellProvider.");
  return value;
}
