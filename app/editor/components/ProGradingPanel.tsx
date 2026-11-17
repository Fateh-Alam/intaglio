"use client";
import { useState } from 'react';
import { useEditorState } from '../hooks/useEditorState';
import AdvancedGraphPanel from './AdvancedGraphPanel';
import { GradingScopes } from './GradingScopes';
import { bakeGradeLut } from '../render/bakeGradeLut';
import { Segmented } from '../../ui/Controls';

export function ProGradingPanel({ onClose }: { onClose: () => void }) {
  const editor = useEditorState();
  const [tab, setTab] = useState<'graph' | 'scopes' | 'lut'>('graph');
  const [size, setSize] = useState<33 | 65>(33);
  const [baking, setBaking] = useState(false);
  const [message, setMessage] = useState('');
  const exportGrade = async () => {
    setBaking(true); setMessage('');
    await new Promise(resolve => setTimeout(resolve, 30));
    try {
      const cube = bakeGradeLut(editor.settings, editor.gradeGraph, size);
      const url = URL.createObjectURL(new Blob([cube], { type: 'text/plain' }));
      const link = document.createElement('a'); link.href = url; link.download = `intaglio-color-grade-${size}.cube`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(`Exported ${size}³ color grade.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBaking(false); }
  };
  return <div className="ui-scroll h-full overflow-y-auto p-3 space-y-4">
    <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Pro grading</h2><button className="ui-focus rounded px-2 py-1 text-xs text-[var(--ui-accent)]" onClick={onClose}>Back to Edit</button></div>
    <Segmented value={tab} onChange={setTab} options={[{ id: 'graph', label: 'Graph' }, { id: 'scopes', label: 'Scopes' }, { id: 'lut', label: 'LUT Studio' }]} />
    {tab === 'graph' && <AdvancedGraphPanel graph={editor.gradeGraph} onGraphChange={editor.setGradeGraph} settings={editor.settings} updateSetting={editor.updateSetting} />}
    {tab === 'scopes' && <GradingScopes sample={editor.histogram?.scopeSample} />}
    {tab === 'lut' && <section className="space-y-4">
      <div><h3 className="text-sm font-medium">LUT Studio</h3><p className="mt-2 text-xs text-[var(--ui-text-3)]">Import a creative look or author a new one with lift, gamma, gain and saturation.</p></div>
      <label className="block text-xs">Import .cube<input type="file" accept=".cube" onChange={editor.handleLutUpload} className="mt-2 block w-full text-xs" /></label>
      {editor.settings.lutTexture && <label className="block text-xs">LUT amount · {Math.round(editor.settings.lutStrength*100)}%<input aria-label="LUT amount" type="range" min="0" max="1" step="0.01" value={editor.settings.lutStrength} onChange={event => editor.updateSetting('lutStrength',Number(event.target.value))} className="mt-2 w-full" /></label>}
      <button onClick={() => editor.setIsLUTCreatorOpen(true)} className="ui-focus w-full rounded-lg border border-[var(--ui-line)] px-3 py-3 text-xs">Author / export a new LUT…</button>
      <div className="space-y-3 border-t border-[var(--ui-line)] pt-4">
        <h4 className="text-xs font-medium">Bake the graph’s color grade</h4>
        <p className="text-[11px] text-[var(--ui-text-3)]">Develop, curves, color wheels, mixer, LUT and film, in graph order with bypass and opacity. sRGB input and output.</p>
        <label className="flex justify-between text-xs">Lattice size<select aria-label="LUT lattice size" value={size} onChange={event => setSize(Number(event.target.value) as 33 | 65)} className="rounded bg-[var(--ui-surface)] p-1"><option value={33}>33³ · standard</option><option value={65}>65³ · fine</option></select></label>
        <button disabled={baking} onClick={exportGrade} className="ui-focus w-full rounded-lg bg-[var(--ui-accent)] px-3 py-2 text-xs text-black disabled:opacity-50">{baking ? 'Baking…' : 'Export color grade .cube'}</button>
        <p className="text-[11px] text-[var(--ui-text-3)]">Excluded: geometry, masks and plates, halation, bloom, optical effects (including grain), sharpening, creative effects, text and watermark. These depend on position or neighboring pixels and cannot be stored in a 3D LUT.</p>
        {message && <p role="status" className="text-xs">{message}</p>}
      </div>
    </section>}
  </div>;
}
