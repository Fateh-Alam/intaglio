"use client";

import type { AppCommand } from "../../types/editor";
import { useShell, type LeftTab } from "./useShell";
import { useSwitchRightMode } from "./useSwitchRightMode";
import { useCrop } from "../crop/useCrop";

/** View commands for the ⌘K palette; they mirror the shell's keyboard shortcuts. */
export function useShellCommands(): AppCommand[] {
  const shell = useShell();
  const switchMode = useSwitchRightMode();
  const crop = useCrop();
  const openLeft = (tab: LeftTab) => () => {
    shell.setPanelsHidden(false);
    shell.setPreview(null);
    shell.setLeftTab(tab);
    shell.setLeftOpen(true);
  };
  return [
    { id: "view-crop", title: crop.draft ? "Apply Crop" : "Crop & Straighten", section: "Develop", shortcut: "R", keywords: ["horizon", "aspect", "frame"], run: () => { if (crop.draft) crop.apply(); else crop.open(); } },
    { id: "view-before", title: "Show Before", section: "View", shortcut: "\\", keywords: ["compare", "original"], run: () => shell.setCompare(shell.compare === "before" ? "off" : "before") },
    { id: "view-split", title: "Before / After Split", section: "View", shortcut: "Y", keywords: ["compare", "wipe"], run: () => shell.setCompare(shell.compare === "split" ? "off" : "split") },
    { id: "view-clipping", title: shell.showClipping ? "Hide Clipping" : "Show Clipping", section: "View", shortcut: "J", keywords: ["highlights", "shadows", "blown"], run: () => shell.setShowClipping(!shell.showClipping) },
    { id: "view-histogram", title: shell.histogramVisible ? "Hide Histogram" : "Show Histogram", section: "View", shortcut: "H", keywords: ["histogram", "tones", "exposure", "scope", "rgb"], run: () => shell.setHistogramVisible(!shell.histogramVisible) },
    {
      id: "view-histogram-detach",
      title: shell.histogramVisible && shell.histogramDetached ? "Dock Histogram" : "Detach Histogram",
      section: "View",
      shortcut: "Shift+H",
      keywords: ["histogram", "float", "window", "move", "undock", "detach", "dock"],
      run: () => {
        if (!shell.histogramVisible) {
          shell.setHistogramVisible(true);
          shell.setHistogramDetached(true);
        } else {
          shell.setHistogramDetached(!shell.histogramDetached);
        }
      },
    },
    ...(shell.histogramVisible && shell.histogramDetached && shell.histogramPosition !== null
      ? [{
          id: "view-histogram-reset-position",
          title: "Reset Histogram Position",
          section: "View",
          keywords: ["histogram", "move", "float", "default", "reset"],
          run: () => shell.setHistogramPosition(null),
        }]
      : []),
    { id: "view-panels", title: shell.panelsHidden ? "Show Panels" : "Hide Panels", section: "View", shortcut: "Shift+F", keywords: ["focus", "fullscreen"], run: () => shell.setPanelsHidden(!shell.panelsHidden) },
    { id: "view-surround-black", title: "Background: Black", section: "View", keywords: ["surround"], run: () => shell.setSurround("black") },
    { id: "view-surround-dark", title: "Background: Dark Grey", section: "View", keywords: ["surround"], run: () => shell.setSurround("dark") },
    { id: "view-surround-medium", title: "Background: Medium Grey", section: "View", keywords: ["surround"], run: () => shell.setSurround("medium") },
    { id: "panel-edit", title: "Edit Whole Photo", section: "Develop", shortcut: "E", keywords: ["basic", "tone", "curve", "mixer", "grading"], run: () => switchMode("develop") },
    { id: "panel-masks", title: "Masks", section: "Local Adjustments", shortcut: "M", keywords: ["brush", "gradient", "radial", "local"], run: () => switchMode("masks") },
    { id: "panel-text", title: "Text & Watermark", section: "Output", shortcut: "T", keywords: ["title", "caption", "watermark"], run: () => switchMode("text") },
    { id: "panel-looks", title: "Browse Looks", section: "Looks", shortcut: "L", keywords: ["film", "preset", "recipe", "profile"], run: openLeft("looks") },
    { id: "panel-effects", title: "Browse Effects", section: "Looks", keywords: ["creative", "special effects", "studio looks"], run: shell.openEffects },
    { id: "panel-history", title: "History", section: "Workflow", keywords: ["undo", "steps"], run: openLeft("history") },
    { id: "panel-versions", title: "Versions & Snapshots", section: "Workflow", keywords: ["virtual copy", "snapshot", "compare"], run: openLeft("versions") },
    { id: "panel-info", title: "Rating & Info", section: "Workflow", keywords: ["metadata", "stars", "flag", "keywords"], run: openLeft("info") },
  ];
}
