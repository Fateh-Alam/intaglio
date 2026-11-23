import React from 'react';
import { useEditorState } from '../hooks/useEditorState';
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react';

export function ExportMatchIndicator() {
  const { settings } = useEditorState();

  // Heuristics for potential export mismatch (e.g. extreme halation or blur radiuses on low-end GPUs)
  const isHighRisk = 
    (settings.halationRadius > 4.0 && settings.halation > 0.5) ||
    (settings.bloomRadius > 4.0 && settings.bloom > 0.5) ||
    (settings.lensDistortion > 0.8) ||
    (settings.aberration > 0.015);

  if (isHighRisk) {
    return (
      <div 
        className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400"
      >
        <IconAlertTriangle size={14} className="shrink-0" />
        <span className="text-[10px] font-mono tracking-widest uppercase">
          Hardware Limit Warning: Effects may differ slightly on export.
        </span>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded text-green-400"
    >
      <IconCheck size={14} className="shrink-0" />
      <span className="text-[10px] font-mono tracking-widest uppercase">
        Etch will export image exactly as edited
      </span>
    </div>
  );
}
