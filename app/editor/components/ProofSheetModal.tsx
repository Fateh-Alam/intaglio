import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { IconX, IconLayoutGrid } from '@tabler/icons-react';
import { useEditorState } from '../hooks/useEditorState';
import { ExportEngine } from '../render/ExportEngine';
import { EditorSettings } from '../../types/editor';
import { cropSize } from '../../lib/cropGeometry';

const VARIABLES = [
  { id: 'exposure', label: 'Exposure (Brightness)', key: 'brightness', steps: [-0.15, -0.05, 0, 0.05, 0.15] },
  { id: 'contrast', label: 'Development (Contrast)', key: 'contrast', steps: [-0.3, -0.15, 0, 0.15, 0.3] },
  { id: 'temperature', label: 'Temperature', key: 'temperature', steps: [-0.2, -0.1, 0, 0.1, 0.2] },
  { id: 'grain', label: 'Grain Size', key: 'grain', steps: [0, 0.1, 0.2, 0.3, 0.4] },
  { id: 'halation', label: 'Halation', key: 'halation', steps: [0, 0.15, 0.3, 0.45, 0.6] },
];

export function ProofSheetModal() {
  const {
    isProofSheetOpen,
    setIsProofSheetOpen,
    settings,
    gradeGraph,
    updateSetting,
    imageSrc,
    textOverlay,
    watermark,
    imageInfo,
  } = useEditorState();

  const [activeVariable, setActiveVariable] = useState(VARIABLES[0]);
  const [proofs, setProofs] = useState<{ url: string; label: string; delta: number; targetValue: number }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const engineRef = useRef<ExportEngine | null>(null);

  useEffect(() => {
    if (!isProofSheetOpen) return;

    let isActive = true;
    const controller = new AbortController();
    const generatedUrls: string[] = [];
    const generateProofs = async () => {
      setIsGenerating(true);
      setProofs([]);

      if (!engineRef.current) {
        engineRef.current = new ExportEngine();
      }
      
      const textureLoader = new THREE.TextureLoader();
      let texture: THREE.Texture;
      try {
        texture = await new Promise((resolve, reject) => {
          textureLoader.load(imageSrc || '', resolve, undefined, reject);
        });
      } catch {
        if (isActive) setIsGenerating(false);
        return;
      }

      try {
        const newProofs: { url: string; label: string; delta: number; targetValue: number }[] = [];
        const currentValue = settings[activeVariable.key as keyof EditorSettings];
        if (typeof currentValue !== "number") return;

        const sourceWidth = imageInfo?.width ?? ((texture.image as { width?: number }).width ?? 600);
        const sourceHeight = imageInfo?.height ?? ((texture.image as { height?: number }).height ?? 600);
        const cropped = cropSize(sourceWidth, sourceHeight, settings.crop);
        const proofScale = 600 / Math.max(cropped.width, cropped.height);
        const proofWidth = Math.max(1, Math.round(cropped.width * proofScale));
        const proofHeight = Math.max(1, Math.round(cropped.height * proofScale));

        // Generate five non-destructive deltas through the same render request as export.
        for (const step of activeVariable.steps) {
          if (!isActive) break;
          const variationSettings: EditorSettings = { ...settings };
          const targetValue = currentValue + step;
          variationSettings[activeVariable.key as keyof EditorSettings] = targetValue as never;
          const blob = await engineRef.current.exportImage(texture, variationSettings, {
            gradeGraph,
            format: 'image/jpeg', quality: 0.9, width: proofWidth, height: proofHeight,
            overlays: { text: textOverlay, watermark }, signal: controller.signal,
          });
          if (!isActive) break;
          const url = URL.createObjectURL(blob);
          generatedUrls.push(url);
          const label = step === 0 ? 'Current' : `${step > 0 ? '+' : ''}${step}`;
          newProofs.push({ url, label, delta: step, targetValue });
          setProofs([...newProofs]);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.error("Proof generation failed", error);
      } finally {
        texture.dispose();
        if (isActive) setIsGenerating(false);
      }
    };

    generateProofs();

    return () => {
      isActive = false;
      controller.abort();
      // cleanup object urls on unmount/change
      generatedUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [gradeGraph, isProofSheetOpen, activeVariable, imageInfo, imageSrc, settings, textOverlay, watermark]);

  useEffect(() => () => engineRef.current?.dispose(), []);

  if (!isProofSheetOpen) return null;

  const handleApply = (value: number) => {
    updateSetting(activeVariable.key as keyof EditorSettings, value as never);
    setIsProofSheetOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden border border-white/5 bg-[#151515] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/5 p-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.28em] text-white/50">
              <IconLayoutGrid className="intaglio-icon" /> Proof Sheets
            </div>
            <h3 className="mt-2 text-xl font-light text-white">Select Variation</h3>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              className="bg-transparent border border-white/10 text-white text-xs px-3 py-2 uppercase tracking-widest outline-none"
              value={activeVariable.id}
              onChange={(e) => setActiveVariable(VARIABLES.find(v => v.id === e.target.value) || VARIABLES[0])}
            >
              {VARIABLES.map(v => (
                <option key={v.id} value={v.id} className="bg-[#151515] text-white">{v.label}</option>
              ))}
            </select>
            
            <div
              role="button"
              onClick={() => setIsProofSheetOpen(false)}
              className="border border-white/5 bg-[var(--intaglio-panel-soft)] p-2 text-white/50 transition hover:border-white/25 hover:text-white cursor-pointer"
            >
              <IconX className="intaglio-icon" />
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-5 gap-4">
            {activeVariable.steps.map((step, i) => {
              const proof = proofs.find(p => p.delta === step);
              const isCurrent = step === 0;

              return (
                <div 
                  key={i} 
                  className={`relative flex flex-col gap-3 group cursor-pointer ${isCurrent ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => proof && !isCurrent && handleApply(proof.targetValue)}
                >
                  <div className={`aspect-[4/5] bg-black/50 border transition-colors ${isCurrent ? 'border-amber-500/50' : 'border-white/10 group-hover:border-white/40'} overflow-hidden relative flex items-center justify-center`}>
                    {proof ? (
                      <>
                        {/* Proofs are local object URLs generated at runtime, so Next Image optimization cannot apply. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={proof.url} className="max-h-full max-w-full object-contain" alt={`${activeVariable.label} ${proof.label}`} />
                      </>
                    ) : (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                    )}
                  </div>
                  <div className="text-center font-mono text-[10px] tracking-widest text-white/60 uppercase">
                    {step === 0 ? '0.0 (Base)' : (step > 0 ? '+' : '') + step}
                    {isCurrent && ' (Current)'}
                  </div>
                </div>
              );
            })}
          </div>
          
          {isGenerating && (
            <div className="mt-8 text-center text-xs font-mono tracking-widest text-amber-500/70 animate-pulse">
              Generating Proofs...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
