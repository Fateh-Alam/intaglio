"use client";
import { useState } from 'react';
import { useEditorState } from '../hooks/useEditorState';
import AdvancedGraphPanel from './AdvancedGraphPanel';
import { GradingScopes } from './GradingScopes';
import { bakeGradeLut } from '../render/bakeGradeLut';
import { Button, Segmented } from '../../ui/Controls';
import { DevSlider } from '../../ui/DevSlider';
import { SubHeading } from '../../ui/Section';
import { IconChevronLeft, IconDownload, IconFileImport, IconSparkles } from '@tabler/icons-react';

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
      const link = document.createElement('a'); link.href = url; link.download = `etch-color-grade-${size}.cube`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(`Exported ${size}³ color grade.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBaking(false); }
  };
  return <div className="flex h-full flex-col">
    <div className="border-b border-[var(--ui-line)] px-3 pb-3 pt-2.5">
      <div className="mb-2.5 flex h-8 items-center gap-1">
        <button type="button" aria-label="Back to Edit" onClick={onClose} className="ui-focus -ml-1 flex h-8 items-center gap-1 rounded-[8px] pl-1 pr-2.5 text-[12px] font-medium text-[var(--ui-text-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]">
          <IconChevronLeft size={15} stroke={2} /> Edit
        </button>
        <h2 className="flex-1 text-right text-[12.5px] font-semibold tracking-[-0.01em] text-[var(--ui-text)]">Pro grading</h2>
      </div>
      <Segmented size="md" value={tab} onChange={setTab} options={[{ id: 'graph', label: 'Graph' }, { id: 'scopes', label: 'Scopes' }, { id: 'lut', label: 'LUT Studio' }]} />
    </div>
    <div className="ui-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
    {tab === 'graph' && <AdvancedGraphPanel graph={editor.gradeGraph} onGraphChange={editor.setGradeGraph} settings={editor.settings} updateSetting={editor.updateSetting} />}
    {tab === 'scopes' && <GradingScopes sample={editor.histogram?.scopeSample} />}
    {tab === 'lut' && <section className="space-y-5">
      <div>
        <SubHeading>Creative look</SubHeading>
        <p className="mb-3 text-[11.5px] leading-relaxed text-[var(--ui-text-3)]">Import a .cube look from any app or camera, or author a new one from lift, gamma, gain and saturation.</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="ui-focus flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] bg-[var(--ui-control)] text-[12px] font-medium text-[var(--ui-text)] ring-1 ring-inset ring-[var(--ui-line)] transition-colors hover:bg-[var(--ui-control-hover)] focus-within:ring-[var(--ui-accent)]">
            <IconFileImport size={14} stroke={1.8} /> Import .cube
            <input type="file" accept=".cube" onChange={editor.handleLutUpload} className="sr-only" />
          </label>
          <Button icon={<IconSparkles size={14} stroke={1.8} />} onClick={() => editor.setIsLUTCreatorOpen(true)}>Author LUT…</Button>
        </div>
        {editor.settings.lutTexture && <div className="mt-3"><DevSlider label="LUT amount" value={editor.settings.lutStrength} defaultValue={1} min={0} max={1} onChange={value => editor.updateSetting('lutStrength', value)} format={value => `${Math.round(value * 100)}%`} /></div>}
      </div>
      <div className="border-t border-[var(--ui-line)] pt-4">
        <SubHeading>Bake this grade</SubHeading>
        <p className="mb-3 text-[11.5px] leading-relaxed text-[var(--ui-text-3)]">Saves Develop, curves, color wheels, mixer, LUT and film as a .cube, in graph order with bypass and opacity. sRGB in and out.</p>
        <label className="mb-3 flex h-8 items-center justify-between text-[12px] text-[var(--ui-text-2)]">Lattice size
          <select aria-label="LUT lattice size" value={size} onChange={event => setSize(Number(event.target.value) as 33 | 65)} className="ui-focus h-7 rounded-[7px] bg-[var(--ui-control)] px-2 text-[12px] text-[var(--ui-text)] ring-1 ring-inset ring-[var(--ui-line)]">
            <option value={33}>33³ · standard</option><option value={65}>65³ · fine</option>
          </select>
        </label>
        <Button variant="primary" className="w-full" disabled={baking} onClick={exportGrade} icon={<IconDownload size={14} stroke={2} />}>{baking ? 'Baking…' : 'Export color grade .cube'}</Button>
        {message && <p role="status" className="mt-2 text-[11.5px] text-[var(--ui-text-2)]">{message}</p>}
        <p className="mt-3 rounded-[8px] bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-[var(--ui-text-3)] ring-1 ring-inset ring-white/[0.04]">Not included: geometry, masks and plates, halation, bloom, optical effects (including grain), sharpening, creative effects, text and watermark. They depend on position or neighboring pixels, which a 3D LUT cannot store.</p>
      </div>
    </section>}
    </div>
  </div>;
}
