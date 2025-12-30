"use client";

import React from "react";
import Link from "next/link";
import "../landing.css";
import {
  ArrowLeft,
  GitCommit,
  Zap,
  Layers,
  Aperture,
  Wand2,
  History,
  Camera,
  SplitSquareHorizontal,
  Sliders,
  Type,
  Paintbrush,
  Monitor,
  Cpu,
  Smartphone,
} from "lucide-react";

export default function Changelog() {
  return (
    <div className="min-h-screen w-full bg-[#050505] text-white font-sans selection:bg-amber-500/30 selection:text-amber-100 overflow-x-hidden relative">
      {/* Film grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 w-full z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
              Back
            </span>
          </Link>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-500/80">
            Nyvarra // Changelog
          </div>
          <div className="w-8" /> {/* Spacer */}
        </div>
      </header>

      <main className="pt-32 pb-40 px-6 max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-20 animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-serif italic mb-6 bg-gradient-to-b from-white to-gray-600 bg-clip-text text-transparent">
            Evolution
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-gray-500">
            Building the digital darkroom
          </p>
        </div>

        {/* Timeline */}
        <div className="relative border-l border-white/10 ml-4 md:ml-12 pl-8 md:pl-16 space-y-24">
          {/* v2.0 ENTRY */}
          <div className="relative group animate-fade-in-up">
            {/* Node */}
            <div className="absolute -left-[37px] md:-left-[69px] top-2 h-4 w-4 md:h-5 md:w-5 rounded-full bg-[#050505] border-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)] group-hover:scale-125 transition-transform duration-500 z-10">
              <div className="absolute inset-0 bg-amber-500 animate-ping opacity-20 hover:opacity-0" />
            </div>

            {/* Date */}
            <div className="flex items-center gap-4 mb-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] px-3 py-1 bg-amber-900/20 text-amber-500 border border-amber-500/20 rounded">
                2025-12-31
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            {/* Content */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl md:p-10 backdrop-blur-sm group-hover:border-amber-500/30 transition-colors duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <Wand2
                  size={120}
                  strokeWidth={0.5}
                  className="text-amber-500 rotate-12"
                />
              </div>

              <h2 className="text-3xl md:text-4xl font-light text-white mb-2">
                v2.0.0
              </h2>
              <h3 className="text-xl font-serif italic text-gray-400 mb-8">
                The Cinematic Update
              </h3>

              <div className="space-y-6 relative z-10">
                <ChangeItem
                  icon={Type}
                  title="Advanced Typography Engine"
                  desc="Dynamic Google Fonts integration, character spacing (tracking), variable weight control (100-900), text transforms (Small Caps, Uppercase), and italic support."
                />
                <ChangeItem
                  icon={Wand2}
                  title="Expanded Film & Style Library"
                  desc="Added 6 new cinematic styles including Matrix, Fight Club, Barbie, Drive, Pulp Fiction, and Lost in Translation (18 Total)."
                />
                <ChangeItem
                  icon={Paintbrush}
                  title="Masking Studio"
                  desc="Precision local adjustments with Paint-to-Select Brush, Luminosity targeting (Shadows/Highlights), and Linear/Radial Gradient masks."
                />
                <ChangeItem
                  icon={Monitor}
                  title="Premium UI Overhaul"
                  desc="Replaced native browser inputs with custom animated Toggles and premium Select components. Removed all emojis for a strictly professional aesthetic."
                />
                <ChangeItem
                  icon={Smartphone}
                  title="Mobile Optimisation"
                  desc="Fully responsive, touch-first interface design. Optimised layout for phones and tablets with thumb-friendly sliders and collapsible panels."
                />
                <ChangeItem
                  icon={Cpu}
                  title="Algorithmic Core Rebuild"
                  desc="Completely re-engineered the color science engine to 32-bit floating point precision. Rewrote masking algorithms for sub-pixel accuracy and optimized GLSL shaders for 60fps realtime rendering."
                />
              </div>
            </div>
          </div>

          {/* v1.0 ENTRY */}
          <div className="relative group animate-fade-in-up">
            {/* Node */}
            <div className="absolute -left-[37px] md:-left-[69px] top-2 h-4 w-4 md:h-5 md:w-5 rounded-full bg-[#050505] border-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)] group-hover:scale-125 transition-transform duration-500 z-10">
              <div className="absolute inset-0 bg-amber-500 animate-ping opacity-20 hover:opacity-0" />
            </div>

            {/* Date */}
            <div className="flex items-center gap-4 mb-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] px-3 py-1 bg-amber-900/20 text-amber-500 border border-amber-500/20 rounded">
                2025-12-23
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            {/* Content */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl md:p-10 backdrop-blur-sm group-hover:border-amber-500/30 transition-colors duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <GitCommit
                  size={120}
                  strokeWidth={0.5}
                  className="text-amber-500 rotate-12"
                />
              </div>

              <h2 className="text-3xl md:text-4xl font-light text-white mb-2">
                v1.0.0
              </h2>
              <h3 className="text-xl font-serif italic text-gray-400 mb-8">
                The Creative Leap
              </h3>

              <div className="space-y-6 relative z-10">
                <ChangeItem
                  icon={Sliders}
                  title="Tone Curve Editor"
                  desc="Implemented full RGB channel control with Catmull-Rom logic for buttery smooth adjustments."
                />
                <ChangeItem
                  icon={Aperture}
                  title="Color Grading Wheels"
                  desc="3-way color wheels for Shadows, Midtones, and Highlights. Added luminance-preserving tinting and balance controls."
                />
                <ChangeItem
                  icon={History}
                  title="Time Travel"
                  desc="A complete history stack with undo/redo capability. Jump back to any point in your creative flow."
                />
                <ChangeItem
                  icon={SplitSquareHorizontal}
                  title="A/B Comparison"
                  desc="Snapshot system and split-screen wiper to compare your edit against previous versions or the original."
                />
                <ChangeItem
                  icon={Layers}
                  title="Lens Corrections"
                  desc="Optical distortion, H/V Keystone, and Tilt-Shift blur for architectural and creative control."
                />
              </div>
            </div>
          </div>

          {/* PILOT RUN ENTRY */}
          <div
            className="relative group animate-fade-in-up opacity-60 hover:opacity-100 transition-opacity"
            style={{ animationDelay: "0.3s" }}
          >
            {/* Node */}
            <div className="absolute -left-[37px] md:-left-[69px] top-2 h-4 w-4 md:h-5 md:w-5 rounded-full bg-[#050505] border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)] group-hover:scale-125 transition-transform duration-500 z-10" />

            {/* Date */}
            <div className="flex items-center gap-4 mb-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] px-3 py-1 bg-blue-900/20 text-blue-400 border border-blue-500/20 rounded">
                Genesis
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            {/* Content */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl md:p-10 backdrop-blur-sm group-hover:border-blue-500/30 transition-colors duration-500">
              <h2 className="text-2xl md:text-3xl font-light text-white mb-2">
                Pilot Run
              </h2>
              <h3 className="text-lg font-serif italic text-gray-400 mb-8">
                Foundation
              </h3>

              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                <SimpleItem text="Cinematic Neural Engine" />
                <SimpleItem text="Film Emulations (Portra, Ektar)" />
                <SimpleItem text="Masking System (Radial, Linear)" />
                <SimpleItem text="Palette Heist (Neural Match)" />
                <SimpleItem text="Text Overlays (Cinematic Fonts)" />
                <SimpleItem text="WebGL Shader Pipeline" />
                <SimpleItem text="Local Processing (Privacy)" />
                <SimpleItem text="32-Bit Floating Point Color" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-32 text-center">
          <div className="h-24 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent mx-auto mb-8" />
          <p className="font-mono text-[10px] text-gray-600 uppercase tracking-[0.2em]">
            End of Log
          </p>
        </div>
      </main>
    </div>
  );
}

// Sub-components
const ChangeItem = ({
  icon: Icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) => (
  <div className="flex gap-4 items-start group/item">
    <div className="mt-1 p-2 rounded-lg bg-white/5 text-gray-400 group-hover/item:text-amber-400 group-hover/item:bg-amber-500/10 transition-all">
      <Icon size={18} />
    </div>
    <div>
      <h4 className="text-gray-200 font-medium mb-1 group-hover/item:text-white transition-colors">
        {title}
      </h4>
      <p className="text-sm text-gray-500 leading-relaxed group-hover/item:text-gray-400 transition-colors">
        {desc}
      </p>
    </div>
  </div>
);

const SimpleItem = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3 text-sm text-gray-500">
    <div className="h-1.5 w-1.5 rounded-full bg-blue-500/50" />
    {text}
  </div>
);
