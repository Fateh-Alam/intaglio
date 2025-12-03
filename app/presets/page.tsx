"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Download, Eye } from "lucide-react";

// Define some actual cinematic presets
const PRESETS = [
  {
    id: "noir",
    name: "Film Noir",
    description:
      "High contrast shadows, crushed blacks, and dramatic lighting reminiscent of 1940s crime thrillers.",
    tags: ["Dramatic", "B&W", "Classic"],
    settings: {
      contrast: 0.4,
      brightness: -0.15,
      tealOrange: 0,
      temperature: -0.1,
      tint: 0,
      skinProtect: 0,
      grain: 0.08,
      vignette: 0.5,
      halation: 0,
      sharpness: 0.15,
      dehaze: 0.2,
      aberration: 0,
      structure: 0.25,
      filmBorder: false,
      falseColor: false,
      anamorphicDistortion: 0,
      anamorphicStreaks: 0,
      godLightStrength: 0,
      godLightX: 0.5,
      godLightY: 0.5,
      lutTexture: null,
      lutStrength: 0,
      targetHue: 0,
      hueShift: 0,
      rotate: 0,
      zoom: 1,
      wiperActive: false,
    },
  },
  {
    id: "teal-orange",
    name: "Blockbuster",
    description:
      "The signature Hollywood look: teal shadows, orange skin tones. Perfect for action and drama.",
    tags: ["Cinematic", "Popular", "Action"],
    settings: {
      contrast: 0.25,
      brightness: 0.05,
      tealOrange: 0.6,
      temperature: 0.15,
      tint: -0.05,
      skinProtect: 0.8,
      grain: 0.04,
      vignette: 0.25,
      halation: 0.15,
      sharpness: 0.2,
      dehaze: 0.15,
      aberration: 0.002,
      structure: 0.15,
      filmBorder: false,
      falseColor: false,
      anamorphicDistortion: 0.05,
      anamorphicStreaks: 0.1,
      godLightStrength: 0,
      godLightX: 0.5,
      godLightY: 0.5,
      lutTexture: null,
      lutStrength: 0,
      targetHue: 0,
      hueShift: 0,
      rotate: 0,
      zoom: 1,
      wiperActive: false,
    },
  },
  {
    id: "blade-runner",
    name: "Neon Noir",
    description:
      "Cyberpunk aesthetics with lifted blacks, amber highlights, and atmospheric haze.",
    tags: ["Sci-Fi", "Atmospheric", "Moody"],
    settings: {
      contrast: 0.15,
      brightness: -0.1,
      tealOrange: 0.35,
      temperature: 0.25,
      tint: -0.15,
      skinProtect: 0.6,
      grain: 0.12,
      vignette: 0.3,
      halation: 0.35,
      sharpness: 0.05,
      dehaze: -0.2,
      aberration: 0.003,
      structure: 0,
      filmBorder: false,
      falseColor: false,
      anamorphicDistortion: 0.08,
      anamorphicStreaks: 0.25,
      godLightStrength: 0,
      godLightX: 0.5,
      godLightY: 0.5,
      lutTexture: null,
      lutStrength: 0,
      targetHue: 0,
      hueShift: 0,
      rotate: 0,
      zoom: 1,
      wiperActive: false,
    },
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    description:
      "Warm, glowing tones that simulate the magic hour before sunset.",
    tags: ["Warm", "Natural", "Portrait"],
    settings: {
      contrast: 0.1,
      brightness: 0.12,
      tealOrange: 0.25,
      temperature: 0.35,
      tint: 0.05,
      skinProtect: 1.0,
      grain: 0.02,
      vignette: 0.15,
      halation: 0.25,
      sharpness: 0.1,
      dehaze: 0.1,
      aberration: 0,
      structure: 0.1,
      filmBorder: false,
      falseColor: false,
      anamorphicDistortion: 0,
      anamorphicStreaks: 0,
      godLightStrength: 0.4,
      godLightX: 0.7,
      godLightY: 0.3,
      lutTexture: null,
      lutStrength: 0,
      targetHue: 0,
      hueShift: 0,
      rotate: 0,
      zoom: 1,
      wiperActive: false,
    },
  },
  {
    id: "wes-anderson",
    name: "Pastel Dream",
    description:
      "Desaturated pastels with perfect symmetry and deliberate composition.",
    tags: ["Quirky", "Stylized", "Soft"],
    settings: {
      contrast: 0.2,
      brightness: 0.08,
      tealOrange: 0.15,
      temperature: 0.05,
      tint: 0.08,
      skinProtect: 0.9,
      grain: 0.06,
      vignette: 0.1,
      halation: 0.1,
      sharpness: 0.25,
      dehaze: 0.25,
      aberration: 0,
      structure: 0.2,
      filmBorder: true,
      falseColor: false,
      anamorphicDistortion: 0,
      anamorphicStreaks: 0,
      godLightStrength: 0,
      godLightX: 0.5,
      godLightY: 0.5,
      lutTexture: null,
      lutStrength: 0,
      targetHue: 0,
      hueShift: 0,
      rotate: 0,
      zoom: 1,
      wiperActive: false,
    },
  },
  {
    id: "horror",
    name: "Horror",
    description:
      "Desaturated, cool tones with crushed shadows for unsettling atmospheres.",
    tags: ["Dark", "Cool", "Suspense"],
    settings: {
      contrast: 0.35,
      brightness: -0.2,
      tealOrange: 0.4,
      temperature: -0.25,
      tint: -0.1,
      skinProtect: 0.3,
      grain: 0.15,
      vignette: 0.6,
      halation: 0,
      sharpness: 0,
      dehaze: 0.3,
      aberration: 0.004,
      structure: 0.3,
      filmBorder: false,
      falseColor: false,
      anamorphicDistortion: 0,
      anamorphicStreaks: 0,
      godLightStrength: 0,
      godLightX: 0.5,
      godLightY: 0.5,
      lutTexture: null,
      lutStrength: 0,
      targetHue: 0,
      hueShift: 0,
      rotate: 0,
      zoom: 1,
      wiperActive: false,
    },
  },
];

interface PresetCardProps {
  preset: (typeof PRESETS)[0];
  onDownload: () => void;
  onPreview: () => void;
}

const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  onDownload,
  onPreview,
}) => (
  <article className="group relative border border-white/10 bg-[#080808] p-6 transition-all duration-500 hover:bg-[#0a0a0a] hover:border-amber-500/30">
    {/* Hover glow */}
    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
      <div className="absolute -inset-24 bg-radial from-amber-900/20 via-transparent to-transparent blur-3xl" />
    </div>

    <div className="relative z-10">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="font-mono text-xl font-light tracking-wide text-white">
          {preset.name}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onPreview}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/5 border border-white/10"
            aria-label="Preview preset"
          >
            <Eye size={14} className="text-gray-400" />
          </button>
          <button
            onClick={onDownload}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/5 border border-white/10"
            aria-label="Download preset"
          >
            <Download size={14} className="text-amber-400" />
          </button>
        </div>
      </div>

      <p className="mb-4 text-sm font-light leading-relaxed text-gray-500 group-hover:text-gray-400 transition-colors">
        {preset.description}
      </p>

      <div className="flex flex-wrap gap-2">
        {preset.tags.map((tag) => (
          <span
            key={tag}
            className="border border-white/10 bg-black/40 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-gray-500"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  </article>
);

export default function PresetsPage() {
  const handleDownload = (preset: (typeof PRESETS)[0]) => {
    const json = JSON.stringify(preset.settings, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nyvarra-${preset.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = (preset: (typeof PRESETS)[0]) => {
    // Store preset in localStorage and redirect to editor
    localStorage.setItem(
      "nyvarra_preset_preview",
      JSON.stringify(preset.settings)
    );
    window.location.href = "/editor";
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#050505] text-white font-sans">
      {/* Film grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <nav className="fixed top-0 z-40 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative h-8 w-8">
                <Image
                  src="/logo.png"
                  alt="Nyvarra Logo"
                  fill
                  className="object-contain opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                />
              </div>
              <span className="font-mono text-xl font-light tracking-[0.3em] text-gray-200 transition-colors group-hover:text-white">
                NYVARRA
              </span>
            </Link>

            <Link
              href="/"
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-gray-400 transition-colors hover:text-white"
            >
              <ArrowLeft size={14} />
              Back
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-6 pt-32 pb-20">
          {/* Header */}
          <div className="mb-16 text-center">
            <span className="mb-6 inline-block border border-amber-900/50 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">
              Cinematic Looks
            </span>
            <h1 className="mb-8 font-serif text-5xl italic text-white md:text-7xl">
              Nyvarra Presets
            </h1>
            <p className="mx-auto max-w-2xl font-light leading-relaxed text-gray-400 text-lg">
              Professional-grade color presets inspired by cinema. Each one is a
              complete starting point for your grade. Download as JSON or
              preview in the editor.
            </p>
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PRESETS.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onDownload={() => handleDownload(preset)}
                onPreview={() => handlePreview(preset)}
              />
            ))}
          </div>

          {/* Coming Soon Section */}
          <div className="mt-20 border-t border-white/5 pt-20 text-center">
            <h2 className="mb-6 font-serif text-3xl italic text-white/60">
              More Coming Soon
            </h2>
            <p className="mx-auto max-w-xl text-sm font-light text-gray-500">
              We're constantly adding new presets inspired by classic films,
              master colorists, and modern cinematography. Follow us for
              updates.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
