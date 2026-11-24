import React from "react";
import { useEditorState } from "../hooks/useEditorState";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";

export function ExportMatchIndicator() {
  const { settings } = useEditorState();

  const isHighRisk =
    (settings.halationRadius > 4.0 && settings.halation > 0.5) ||
    (settings.bloomRadius > 4.0 && settings.bloom > 0.5) ||
    settings.lensDistortion > 0.8 ||
    settings.aberration > 0.015;

  if (isHighRisk) {
    return (
      <div className="flex items-center gap-2 rounded-[10px] bg-[var(--ui-warn)]/10 px-3 py-2 text-[12px] text-[var(--ui-warn)] ring-1 ring-inset ring-[var(--ui-warn)]/25">
        <IconAlertTriangle size={15} stroke={1.8} className="shrink-0" />
        <span>Extreme radius effects may differ slightly on low-memory GPUs.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-[10px] bg-[var(--ui-success)]/10 px-3 py-2 text-[12px] text-[var(--ui-success)] ring-1 ring-inset ring-[var(--ui-success)]/20">
      <IconCheck size={15} stroke={2} className="shrink-0" />
      <span>Etch will export image exactly as edited.</span>
    </div>
  );
}
