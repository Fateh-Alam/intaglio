"use client";

import { useState } from "react";
import type { EditorSettings } from "../../types/editor";
import type { GradeGraph } from "../../types/document";
import { compileGradeGraph, moveGradeNode } from "../render/compileGradeGraph";
import { GradeGraphWorkspace } from "./GradeGraphWorkspace";

const settingByNode: Partial<Record<string, keyof EditorSettings>> = { develop: "contrast", oklch: "tealOrange", film: "filmEmulationStrength", halation: "halation", bloom: "bloom", optical: "vignette", sharpen: "sharpness" };

export default function AdvancedGraphPanel({ graph, onGraphChange, settings, updateSetting }: { graph: GradeGraph; onGraphChange: (graph: GradeGraph) => void; settings: EditorSettings; updateSetting: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void }): React.ReactElement {
  const [view, setView] = useState<'layers' | 'nodes'>('layers');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("develop");
  const selectedNode = graph.nodes.find(node => node.id === selectedNodeId);
  const required = selectedNode && ['source', 'geometry', 'display-transform', 'output'].includes(selectedNode.kind);
  let error = '';
  try { compileGradeGraph(graph); } catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
  const selectedSetting = selectedNode ? settingByNode[selectedNode.kind === 'oklch-mixer' ? 'oklch' : selectedNode.kind] : undefined;
  const effectiveSettings = { ...settings, ...selectedNode?.params };
  const selectedValue = selectedSetting && typeof effectiveSettings[selectedSetting] === "number" ? effectiveSettings[selectedSetting] as number : null;
  return (
    <div className="space-y-4">
      <div><h3 className="text-sm font-semibold uppercase tracking-widest text-white">Grade Graph</h3><p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">Serial grading · shared with Edit controls</p></div>
      <label className="block text-xs">Selected node<select aria-label="Selected grade node" className="mt-2 w-full rounded bg-[var(--ui-surface)] p-2" value={selectedNodeId ?? ''} onChange={event => setSelectedNodeId(event.target.value)}>{graph.nodes.map(node => <option key={node.id} value={node.id}>{node.name}{node.enabled ? '' : ' · bypassed'}</option>)}</select></label>
      <div className="flex gap-2" aria-label="Grade view">{(['layers', 'nodes'] as const).map(mode => <button key={mode} aria-pressed={view === mode} onClick={() => setView(mode)} className={`ui-focus rounded border px-3 py-1 text-xs ${view === mode ? 'border-[var(--ui-accent)] text-[var(--ui-text)]' : 'border-[var(--ui-line)] text-[var(--ui-text-3)]'}`}>{mode === 'layers' ? 'Layers' : 'Nodes'}</button>)}</div>
      {view === 'layers' ? <ol aria-label="Grade layers" className="overflow-hidden rounded border border-[var(--ui-line)]">{(error ? graph.nodes : compileGradeGraph(graph).filter(node => node.id !== '__legacy-lut')).map((node, index) => <li key={node.id}><button onClick={() => setSelectedNodeId(node.id)} aria-pressed={selectedNodeId === node.id} className={`ui-focus flex w-full items-center gap-2 border-b border-[var(--ui-line)] px-3 py-1.5 text-left text-xs ${selectedNodeId === node.id ? 'bg-white/10' : 'hover:bg-white/5'}`}><span className="w-5 font-mono text-[10px] text-[var(--ui-text-3)]">{String(index+1).padStart(2,'0')}</span><span className="flex-1">{node.name}</span><span className="text-[10px] text-[var(--ui-text-3)]">{node.enabled ? `${Math.round(node.opacity*100)}%` : 'Bypassed'}</span></button></li>)}</ol> : <GradeGraphWorkspace graph={graph} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} onMoveNode={(id, position) => onGraphChange({ ...graph, nodes: graph.nodes.map((node) => node.id === id ? { ...node, position } : node) })} />}
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      {selectedNode && <fieldset className="space-y-3 rounded border border-white/10 p-3" disabled={Boolean(required)}>
        <legend className="px-1 text-xs">{selectedNode.name}{required ? ' · required stage' : ''}</legend>
        {!error && <div className="flex gap-2"><button className="ui-focus rounded border border-white/15 px-2 py-1 text-xs" disabled={required || compileGradeGraph(graph).findIndex(node => node.id === selectedNode.id) <= 2} onClick={() => onGraphChange(moveGradeNode(graph, selectedNode.id, -1))}>Move earlier</button><button className="ui-focus rounded border border-white/15 px-2 py-1 text-xs" disabled={required || compileGradeGraph(graph).findIndex(node => node.id === selectedNode.id) >= compileGradeGraph(graph).length - 3} onClick={() => onGraphChange(moveGradeNode(graph, selectedNode.id, 1))}>Move later</button></div>}
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedNode.enabled} onChange={event => onGraphChange({ ...graph, nodes: graph.nodes.map(node => node.id === selectedNode.id ? { ...node, enabled: event.target.checked } : node) })} /> Enabled</label>
        <label className="block text-xs">Opacity · {Math.round(selectedNode.opacity * 100)}%<input aria-label="Node opacity" className="mt-2 w-full" type="range" min="0" max="1" step="0.01" value={selectedNode.opacity} onChange={event => onGraphChange({ ...graph, nodes: graph.nodes.map(node => node.id === selectedNode.id ? { ...node, opacity: Number(event.target.value) } : node) })} /></label>
      </fieldset>}
      {selectedSetting && selectedValue !== null && <label className="block border border-white/10 bg-black/20 p-3"><span className="font-mono text-[9px] uppercase tracking-widest text-white/50">{selectedSetting}</span><input className="mt-3 w-full" type="range" min={selectedSetting === "contrast" || selectedSetting === "tealOrange" ? -1 : 0} max="1" step="0.01" value={selectedValue} onChange={(event) => {
        const value = Number(event.target.value);
        if (selectedNode && selectedSetting in selectedNode.params) onGraphChange({ ...graph, nodes: graph.nodes.map(node => node.id === selectedNode.id ? { ...node, params: { ...node.params, [selectedSetting]: value } } as typeof node : node) });
        else updateSetting(selectedSetting, value as never);
      }} /></label>}
    </div>
  );
}
