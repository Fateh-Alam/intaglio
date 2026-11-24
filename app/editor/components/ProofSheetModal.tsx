import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { IconX, IconLayoutGrid } from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import { ExportEngine } from "../render/ExportEngine";
import { EditorSettings } from "../../types/editor";
import { cropSize } from "../../lib/cropGeometry";

const VARIABLES = [
  { id: "exposure", label: "Exposure (Brightness)", key: "brightness", steps: [-0.15, -0.05, 0, 0.05, 0.15] },
  { id: "contrast", label: "Development (Contrast)", key: "contrast", steps: [-0.3, -0.15, 0, 0.15, 0.3] },
  { id: "temperature", label: "Temperature", key: "temperature", steps: [-0.2, -0.1, 0, 0.1, 0.2] },
  { id: "grain", label: "Grain Size", key: "grain", steps: [0, 0.1, 0.2, 0.3, 0.4] },
  { id: "halation", label: "Halation", key: "halation", steps: [0, 0.15, 0.3, 0.45, 0.6] },
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsProofSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isProofSheetOpen, setIsProofSheetOpen]);

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
          textureLoader.load(imageSrc || "", resolve, undefined, reject);
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

        for (const step of activeVariable.steps) {
          if (!isActive) break;
          const variationSettings: EditorSettings = { ...settings };
          const targetValue = currentValue + step;
          variationSettings[activeVariable.key as keyof EditorSettings] = targetValue as never;
          const blob = await engineRef.current.exportImage(texture, variationSettings, {
            gradeGraph,
            format: "image/jpeg",
            quality: 0.9,
            width: proofWidth,
            height: proofHeight,
            overlays: { text: textOverlay, watermark },
            signal: controller.signal,
          });
          if (!isActive) break;
          const url = URL.createObjectURL(blob);
          generatedUrls.push(url);
          const label = step === 0 ? "Current" : `${step > 0 ? "+" : ""}${step}`;
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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={() => setIsProofSheetOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="proof-sheet-title"
        className="ui-root relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[18px] bg-[var(--ui-panel)] ring-1 ring-inset ring-[var(--ui-line-strong)] shadow-[var(--ui-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--ui-line)] px-6 py-5">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-accent-strong)]">
              <IconLayoutGrid size={14} stroke={1.8} />
              Proof Sheets
            </div>
            <h3 id="proof-sheet-title" className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-[var(--ui-text)]">
              Select Variation
            </h3>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              aria-label="Proof sheet variable"
              className="ui-focus h-9 rounded-[9px] bg-[var(--ui-control)] px-3 text-[12px] font-medium text-[var(--ui-text)] ring-1 ring-inset ring-[var(--ui-line)] outline-none"
              value={activeVariable.id}
              onChange={(e) => setActiveVariable(VARIABLES.find((v) => v.id === e.target.value) || VARIABLES[0])}
            >
              {VARIABLES.map((v) => (
                <option key={v.id} value={v.id} className="bg-[var(--ui-panel)] text-[var(--ui-text)]">
                  {v.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              aria-label="Close proof sheet"
              onClick={() => setIsProofSheetOpen(false)}
              className="ui-focus grid h-9 w-9 place-items-center rounded-[9px] text-[var(--ui-text-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>

        <div className="ui-scroll overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            {activeVariable.steps.map((step, i) => {
              const proof = proofs.find((p) => p.delta === step);
              const isCurrent = step === 0;

              return (
                <button
                  type="button"
                  key={i}
                  disabled={isCurrent || !proof}
                  onClick={() => proof && !isCurrent && handleApply(proof.targetValue)}
                  className={`ui-focus group flex flex-col gap-2.5 rounded-[12px] text-left transition-opacity ${
                    isCurrent ? "cursor-default opacity-75" : "cursor-pointer"
                  }`}
                >
                  <div
                    className={`relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[12px] bg-black/50 ring-1 ring-inset transition-all ${
                      isCurrent
                        ? "ring-[var(--ui-accent)]"
                        : "ring-[var(--ui-line)] group-hover:ring-white/35"
                    }`}
                  >
                    {proof ? (
                      <>
                        {/* Proofs are local object URLs generated at runtime, so Next Image optimization cannot apply. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proof.url}
                          className="max-h-full max-w-full object-contain"
                          alt={`${activeVariable.label} ${proof.label}`}
                        />
                      </>
                    ) : (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--ui-accent)]" />
                    )}
                  </div>
                  <div className="ui-num w-full text-center text-[11.5px] font-medium text-[var(--ui-text-2)]">
                    {step === 0 ? "0.0 · Current" : `${step > 0 ? "+" : ""}${step}`}
                  </div>
                </button>
              );
            })}
          </div>

          {isGenerating && (
            <div className="mt-6 text-center text-[12px] text-[var(--ui-accent-strong)] animate-pulse">
              Generating proofs…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
