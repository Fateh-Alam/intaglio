"use client";
import { useEffect, useRef, useState } from 'react';
import type { HistogramData } from '../../types/editor';

export function GradingScopes({ sample }: { sample?: HistogramData['scopeSample'] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'waveform' | 'rgb' | 'vectorscope'>('waveform');
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    const size = 256;
    context.fillStyle = '#101411'; context.fillRect(0, 0, size, size);
    context.strokeStyle = '#ffffff25'; context.lineWidth = 1;
    if (mode === 'vectorscope') {
      for (const radius of [32, 64, 96, 120]) { context.beginPath(); context.arc(128, 128, radius, 0, Math.PI * 2); context.stroke(); }
      context.beginPath(); context.moveTo(128, 8); context.lineTo(128, 248); context.moveTo(8, 128); context.lineTo(248, 128); context.stroke();
      // Positive Cr and negative Cb: approximate skin hue reference, not a target saturation.
      context.strokeStyle = '#d6a84890'; context.beginPath(); context.moveTo(128,128); context.lineTo(69,23); context.stroke();
    } else {
      context.font = '10px monospace'; context.fillStyle = '#ffffff80';
      for (const level of [0, 25, 50, 75, 100]) { const y = 255 - level * 2.55; context.beginPath(); context.moveTo(0,y); context.lineTo(256,y); context.stroke(); context.fillText(String(level), 4, Math.max(10,y-3)); }
    }
    if (!sample) return;
    const { pixels, width, height } = sample;
    context.globalCompositeOperation = 'screen';
    for (let i = 0; i < width * height; i++) {
      if (pixels[i*4+3] === 0) continue;
      const r = pixels[i*4]/255, g = pixels[i*4+1]/255, b = pixels[i*4+2]/255;
      const y = .2126*r+.7152*g+.0722*b;
      if (mode === 'vectorscope') {
        const cb = (b-y)/1.8556, cr = (r-y)/1.5748;
        context.fillStyle = `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},0.13)`;
        context.fillRect(128+cb*240,128-cr*240,1.5,1.5);
      } else {
        const x = (i % width) / Math.max(1,width-1)*255;
        if (mode === 'rgb') {
          [r,g,b].forEach((v,c) => { context.fillStyle = ['#ff545420','#62ff8520','#629aff20'][c]; context.fillRect(x,(1-v)*255,1,1.5); });
        } else { context.fillStyle = '#b3e8c220'; context.fillRect(x,(1-y)*255,1,1.5); }
      }
    }
    context.globalCompositeOperation = 'source-over';
  }, [sample, mode]);
  return <section aria-label="Color scopes" className="space-y-2">
    <label className="flex items-center justify-between text-xs">Scope<select aria-label="Scope type" value={mode} onChange={event => setMode(event.target.value as typeof mode)} className="rounded bg-[var(--ui-surface)] p-2"><option value="waveform">Luma waveform</option><option value="rgb">RGB waveform</option><option value="vectorscope">Vectorscope</option></select></label>
    <canvas ref={canvas} width={256} height={256} role="img" aria-label={`${mode} of the graded image`} className="aspect-square w-full rounded border border-[var(--ui-line)]" />
    <p className="text-[11px] text-[var(--ui-text-3)]">{sample ? 'Display-referred · sampled preview · 0–100% signal' : 'Open a photo to see its color signal.'}{mode === 'vectorscope' && ' · Gold: skin hue reference'}</p>
  </section>;
}
