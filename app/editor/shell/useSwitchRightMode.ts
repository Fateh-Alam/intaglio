"use client";

import { useEditorState } from "../hooks/useEditorState";
import { useShell, type RightMode } from "./useShell";

/** Edit adjusts the whole photo. Masks restores the last selection. */
export function useSwitchRightMode() {
  const shell = useShell();
  const { setActivePlateId, settings, activePlateId } = useEditorState();
  return (mode: RightMode) => {
    shell.setPicking(null);
    if (mode === "develop") setActivePlateId("base");
    if (mode === "masks" && !settings.adjustmentLayers.some((plate) => plate.id === activePlateId)) {
      const previous = settings.adjustmentLayers.find((plate) => plate.maskIds.some((id) => id === shell.selectedComponentId));
      const next = previous ?? settings.adjustmentLayers.at(-1);
      setActivePlateId(next?.id ?? "base");
      if (!previous) shell.setSelectedComponentId(next?.maskIds[0] ?? null);
    }
    shell.setRightMode(mode);
  };
}
