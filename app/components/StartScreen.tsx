"use client";

import React from "react";
import {
  IconPhoto,
  IconMovie,
  IconSparkles,
  IconPalette,
  IconWand,
  IconBrandGithub,
  IconKeyboard,
} from "@tabler/icons-react";

interface StartScreenProps {
  onOpenImage: () => void;
  onOpenVideo: () => void;
  onTrySample: () => void;
}

// Sample images to try
const SAMPLE_IMAGES = [
  {
    id: "portrait",
    name: "Portrait",
    url: "/samples/portrait.jpg",
    description: "Test skin tones & color grading",
  },
  {
    id: "landscape",
    name: "Landscape",
    url: "/samples/landscape.jpg",
    description: "Perfect for cinematic looks",
  },
  {
    id: "urban",
    name: "Urban",
    url: "/samples/urban.jpg",
    description: "High contrast city scene",
  },
];

export default function StartScreen({
  onOpenImage,
  onOpenVideo,
  onTrySample,
}: StartScreenProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#0a0a0a] to-[#050505] p-8">
      {/* Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-amber-500/5 rounded-full blur-[150px]" />

      {/* Hero Section */}
      <div className="relative text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-mono uppercase tracking-widest mb-6">
          <IconSparkles size={12} />
          v2.5 Physics Update
        </div>
        <h1 className="text-4xl md:text-5xl font-extralight text-white mb-3 tracking-tight">
          Nyvarra <span className="text-amber-500">Studio</span>
        </h1>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Professional color grading in your browser.
        </p>
      </div>

      {/* Main Actions */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-12">
        {/* Open Image */}
        <button
          onClick={onOpenImage}
          className="group flex flex-col items-center justify-center p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all duration-300"
        >
          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500 mb-4 group-hover:scale-110 transition-transform">
            <IconPhoto size={28} />
          </div>
          <h3 className="text-white font-medium mb-1">Open Image</h3>
          <p className="text-gray-600 text-xs">JPG, PNG, WebP</p>
        </button>

        {/* Try Sample */}
        <button
          onClick={onTrySample}
          className="group flex flex-col items-center justify-center p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all duration-300"
        >
          <div className="p-4 rounded-2xl bg-violet-500/10 text-violet-400 mb-4 group-hover:scale-110 transition-transform">
            <IconWand size={28} />
          </div>
          <h3 className="text-white font-medium mb-1">Try Sample</h3>
          <p className="text-gray-600 text-xs">Jump right in</p>
        </button>

        {/* Extract Frame from Video */}
        <button
          onClick={onOpenVideo}
          className="group flex flex-col items-center justify-center p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-500/50 hover:bg-rose-500/5 transition-all duration-300"
        >
          <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-400 mb-4 group-hover:scale-110 transition-transform">
            <IconMovie size={28} />
          </div>
          <h3 className="text-white font-medium mb-1">Extract Frame</h3>
          <p className="text-gray-600 text-xs">From video file</p>
        </button>
      </div>

      {/* Features Preview */}
      <div className="relative flex flex-wrap justify-center gap-4 text-[11px] text-gray-600 mb-8">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5">
          <IconPalette size={14} className="text-amber-500/60" />
          Halation & Bloom
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5">
          <IconSparkles size={14} className="text-violet-500/60" />
          Film Emulation
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5">
          <IconWand size={14} className="text-cyan-500/60" />
          3D LUT Creator
        </div>
      </div>

      {/* Keyboard Shortcut Hint */}
      <div className="relative flex items-center gap-2 text-gray-700 text-[10px] font-mono uppercase tracking-widest">
        <IconKeyboard size={14} />
        Press{" "}
        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-500">
          Ctrl+O
        </kbd>{" "}
        to open
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 flex items-center gap-4 text-gray-700 text-xs">
        <span>Runs Locally on Your Device.</span>
      </div>
    </div>
  );
}
