"use client";

import { useState } from "react";
import type { EditorSettings } from "../../types/editor";
import type { GradeGraph } from "../../types/document";
import { GradeGraphWorkspace } from "./GradeGraphWorkspace";

const settingByNode: Partial<Record<string, keyof EditorSettings>> = { develop: "contrast", oklch: "tealOrange", film: "filmEmulationStrength", halation: "halation", bloom: "bloom", optical: "vignette", sharpen: "sharpness" };

export default function AdvancedGraphPanel({ graph, onGraphChange, settings, updateSetting }: { graph: GradeGraph; onGraphChange: (graph: GradeGraph) => void; settings: EditorSettings; updateSetting: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void }): React.ReactElement {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("develop");
  const selectedSetting = selectedNodeId ? settingByNode[selectedNodeId] : undefined;
  const selectedValue = selectedSetting && typeof settings[selectedSetting] === "number" ? settings[selectedSetting] as number : null;
  return (
    <div className="space-y-4">
      <div><h3 className="text-sm font-semibold uppercase tracking-widest text-white">Advanced Grade Graph</h3><p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">Synchronized with Process and Plate controls</p></div>
      <GradeGraphWorkspace graph={graph} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} onMoveNode={(id, position) => onGraphChange({ ...graph, nodes: graph.nodes.map((node) => node.id === id ? { ...node, position } : node) })} />
      {selectedSetting && selectedValue !== null && <label className="block border border-white/10 bg-black/20 p-3"><span className="font-mono text-[9px] uppercase tracking-widest text-white/50">{selectedSetting}</span><input className="mt-3 w-full" type="range" min={selectedSetting === "contrast" || selectedSetting === "tealOrange" ? -1 : 0} max="1" step="0.01" value={selectedValue} onChange={(event) => updateSetting(selectedSetting, Number(event.target.value) as never)} /></label>}
    </div>
  );
}
