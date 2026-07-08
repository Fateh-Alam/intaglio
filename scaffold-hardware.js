const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'app', 'components', 'landing');

// Remove old WebGL file
if (fs.existsSync(path.join(dir, 'LensTunnel.tsx'))) {
  fs.unlinkSync(path.join(dir, 'LensTunnel.tsx'));
}

// 1. CameraLens.tsx - The Optical Glass Layers
const lensCode = `
"use client";

import { motion, MotionValue, useTransform } from "framer-motion";

export function CameraLens({ scrollY }: { scrollY: MotionValue<number> }) {
  // We simulate moving THROUGH the lens by scaling up concentric rings.
  // The closer the ring, the faster it scales (parallax).
  
  const scale1 = useTransform(scrollY, [0, 0.4], [1, 15]);
  const scale2 = useTransform(scrollY, [0.05, 0.45], [1, 12]);
  const scale3 = useTransform(scrollY, [0.1, 0.5], [1, 9]);
  
  const opacity = useTransform(scrollY, [0, 0.4, 0.5], [1, 1, 0]);

  return (
    <motion.div 
      className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none bg-[#0a0a0a]"
      style={{ opacity }}
    >
      {/* Front Element */}
      <motion.div 
        className="absolute rounded-full border border-white/5 flex items-center justify-center shadow-[inset_0_0_100px_rgba(255,255,255,0.02)]"
        style={{ width: "80vmin", height: "80vmin", scale: scale1 }}
      >
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(150,200,255,0.05)_45deg,transparent_90deg,rgba(255,200,150,0.03)_180deg,transparent_270deg)] animate-[spin_40s_linear_infinite]" />
      </motion.div>

      {/* Middle Element */}
      <motion.div 
        className="absolute rounded-full border border-white/10 flex items-center justify-center shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-[2px]"
        style={{ width: "50vmin", height: "50vmin", scale: scale2 }}
      >
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent_50%)]" />
      </motion.div>

      {/* Rear Element */}
      <motion.div 
        className="absolute rounded-full border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.9)] backdrop-blur-[4px] bg-black/20"
        style={{ width: "30vmin", height: "30vmin", scale: scale3 }}
      >
        {/* Anti-reflective coating glow */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_70%_70%,rgba(100,150,255,0.1),transparent_60%)]" />
      </motion.div>
    </motion.div>
  );
}
`;

// 2. ApertureIris.tsx - High fidelity SVG Blades
const apertureCode = `
"use client";

import { motion, MotionValue, useTransform } from "framer-motion";

export function ApertureIris({ scrollY }: { scrollY: MotionValue<number> }) {
  // Aperture closes tightly between 0.2 and 0.4
  const rotation = useTransform(scrollY, [0.2, 0.4], [0, 65]);
  const opacity = useTransform(scrollY, [0.2, 0.4, 0.6, 0.65], [0, 1, 1, 0]);
  const scale = useTransform(scrollY, [0.2, 0.6], [1, 3]);

  // 9 Blades
  const blades = Array.from({ length: 9 });

  return (
    <motion.div 
      className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none"
      style={{ opacity, scale }}
    >
      <div className="relative w-[50vmin] h-[50vmin]">
        {blades.map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 origin-center"
            style={{ rotate: i * 40 }}
          >
            <motion.div 
              className="absolute top-1/2 left-1/2 w-[120%] h-[120%] -translate-y-1/2 origin-[0%_50%] bg-[#111] shadow-[-10px_0_20px_rgba(0,0,0,0.8)] border-l border-white/5"
              style={{ rotate: rotation }}
            />
          </motion.div>
        ))}
        {/* Central hole opening */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_30px_rgba(0,0,0,1)] pointer-events-none mix-blend-multiply" />
      </div>
    </motion.div>
  );
}
`;

// 3. ShutterMechanism.tsx - Focal Plane Shutter
const shutterCode = `
"use client";

import { motion, MotionValue, useTransform } from "framer-motion";

export function ShutterMechanism({ scrollY }: { scrollY: MotionValue<number> }) {
  // Mechanical shutter snaps shut briefly to reveal the sensor.
  // Happens between 0.48 and 0.52
  const topCurtainY = useTransform(scrollY, [0.48, 0.49, 0.51, 0.52], ["-100%", "0%", "0%", "100%"]);
  const bottomCurtainY = useTransform(scrollY, [0.48, 0.49, 0.51, 0.52], ["100%", "0%", "0%", "-100%"]);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none overflow-hidden flex flex-col">
      <motion.div 
        className="w-full h-1/2 bg-[#1a1a1a] border-b-2 border-[#333] shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-end"
        style={{ y: topCurtainY }}
      >
         <div className="w-full h-4 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_4px)]" />
      </motion.div>
      <motion.div 
        className="w-full h-1/2 bg-[#1a1a1a] border-t-2 border-[#333] shadow-[0_-10px_30px_rgba(0,0,0,0.8)] flex items-start"
        style={{ y: bottomCurtainY }}
      >
         <div className="w-full h-4 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_4px)]" />
      </motion.div>
    </div>
  );
}
`;

// 4. SensorCore.tsx - CSS Photosite Array
const sensorCode = `
"use client";

import { motion, MotionValue, useTransform } from "framer-motion";

export function SensorCore({ scrollY }: { scrollY: MotionValue<number> }) {
  // Sensor becomes visible after shutter (0.5), scales up to fill vision.
  const opacity = useTransform(scrollY, [0.49, 0.51, 0.7, 0.8], [0, 1, 1, 0]);
  const scale = useTransform(scrollY, [0.5, 0.8], [0.8, 2]);
  
  // Scanning line simulating data readout
  const scanlineY = useTransform(scrollY, [0.5, 0.7], ["-20%", "120%"]);

  return (
    <motion.div 
      className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none bg-[#050505]"
      style={{ opacity }}
    >
      <motion.div 
        className="relative w-[100vw] h-[100vh] flex items-center justify-center"
        style={{ scale }}
      >
        {/* Sensor Substrate / Motherboard Texture */}
        <div className="absolute w-[80vw] h-[60vw] max-w-[800px] max-h-[600px] bg-[#111] border-[4px] border-[#333] rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center">
          
          {/* Inner Sensor Die */}
          <div className="relative w-[90%] h-[85%] bg-[#080808] border border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,1)] overflow-hidden">
            
            {/* The Bayer Grid - Rendered efficiently via CSS patterns */}
            <div 
              className="absolute inset-0 mix-blend-screen opacity-60"
              style={{
                backgroundImage: \`
                  repeating-linear-gradient(to right, transparent, transparent 1px, rgba(0,0,0,0.9) 1px, rgba(0,0,0,0.9) 4px),
                  repeating-linear-gradient(to bottom, transparent, transparent 1px, rgba(0,0,0,0.9) 1px, rgba(0,0,0,0.9) 4px),
                  linear-gradient(45deg, rgba(255,40,40,0.4) 25%, transparent 25%, transparent 75%, rgba(40,40,255,0.4) 75%),
                  linear-gradient(45deg, rgba(40,255,40,0.4) 25%, transparent 25%, transparent 75%, rgba(40,255,40,0.4) 75%)
                \`,
                backgroundSize: '4px 4px, 4px 4px, 8px 8px, 8px 8px',
                backgroundPosition: '0 0, 0 0, 0 0, 4px 4px'
              }}
            />

            {/* Readout Scanline */}
            <motion.div 
              className="absolute left-0 right-0 h-[20%] bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent blur-md"
              style={{ top: scanlineY }}
            />
          </div>

          {/* Gold Contacts / Wiring */}
          <div className="absolute top-2 bottom-2 left-2 w-2 flex flex-col justify-between">
             {Array.from({length: 20}).map((_, i) => <div key={i} className="w-full h-1 bg-[#d4af37]/60" />)}
          </div>
          <div className="absolute top-2 bottom-2 right-2 w-2 flex flex-col justify-between">
             {Array.from({length: 20}).map((_, i) => <div key={i} className="w-full h-1 bg-[#d4af37]/60" />)}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
`;

// 5. CameraHUD.tsx - Updated to be even more photorealistic
const hudCode = `
"use client";

import React from "react";
import { motion, useTransform, MotionValue } from "framer-motion";
import { BatteryMedium, Focus, Video, Layers, Crosshair, Sun } from "lucide-react";

function MotionNumber({ value, prefix = "", suffix = "", decimal = 0 }: { value: MotionValue<number>; prefix?: string; suffix?: string; decimal?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    return value.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = prefix + latest.toFixed(decimal) + suffix;
      }
    });
  }, [value, prefix, suffix, decimal]);
  return <span ref={ref}>{prefix + value.get().toFixed(decimal) + suffix}</span>;
}

export function CameraHUD({ scrollY }: { scrollY: MotionValue<number> }) {
  const iso = useTransform(scrollY, [0.3, 0.6], [100, 12800]);
  const shutterSpeed = useTransform(scrollY, [0.1, 0.4], [125, 8000]);
  const fStop = useTransform(scrollY, [0.1, 0.4], [1.4, 16]);
  
  // Metering jumps around
  const expComp = useTransform(scrollY, [0, 0.2, 0.4, 0.6, 0.8], [0, -1.3, 0.7, -0.3, 0]);

  const hudOpacity = useTransform(scrollY, [0, 0.02, 0.8, 0.9], [0, 1, 1, 0]);
  const bracketScale = useTransform(scrollY, [0, 0.2], [1.02, 1]);
  const bracketBlur = useTransform(scrollY, [0, 0.2], ["blur(4px)", "blur(0px)"]);

  return (
    <motion.div 
      className="pointer-events-none fixed inset-0 z-40 p-4 md:p-8 text-[#0a84ff] uppercase tracking-[0.2em] font-mono text-[10px] sm:text-[11px]"
      style={{ opacity: hudOpacity, textShadow: "0 0 10px rgba(10,132,255,0.4)" }}
    >
      <motion.div 
        className="absolute inset-4 md:inset-8 border border-[#0a84ff]/20"
        style={{ scale: bracketScale, filter: bracketBlur }}
      >
        <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#0a84ff]/80 rounded-tl-sm" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#0a84ff]/80 rounded-tr-sm" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-[#0a84ff]/80 rounded-bl-sm" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-[#0a84ff]/80 rounded-br-sm" />
        
        {/* Focusing Box */}
        <div className="absolute top-1/2 left-1/2 w-16 h-12 border border-[#30d158]/60 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(48,209,88,0.3)]">
          <Crosshair size={12} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#30d158]/80" />
        </div>
      </motion.div>

      <div className="absolute top-8 left-12 right-12 flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 font-bold"><Video size={14} className="text-red-500 animate-pulse" /> REC</span>
          <span>RAW (UNCOMPRESSED)</span>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <BatteryMedium size={16} className="text-white" />
            <span className="text-white">100%</span>
          </div>
          <span>SLOT 1</span>
        </div>
      </div>

      <div className="absolute bottom-8 left-12 right-12 flex justify-between items-end">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-6 text-[13px] font-bold text-white">
            <MotionNumber value={iso} prefix="ISO " />
            <MotionNumber value={shutterSpeed} prefix="1/" />
            <MotionNumber value={fStop} prefix="F" decimal={1} />
          </div>
          
          {/* Exposure Meter */}
          <div className="h-1.5 w-64 bg-white/10 relative mt-2 rounded-full overflow-hidden">
             <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#30d158] z-10" />
             <div className="absolute top-0 bottom-0 right-1/4 w-px bg-white/40" />
             <div className="absolute top-0 bottom-0 left-1/4 w-px bg-white/40" />
             
             {/* The tick */}
             <motion.div 
               className="absolute top-0 bottom-0 w-[2px] bg-[#30d158]"
               style={{ 
                 left: "50%",
                 x: useTransform(expComp, [-3, 3], ["-128px", "128px"]) 
               }}
             />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-white/80">
          <span className="flex items-center gap-1.5"><Sun size={12} /> AWB</span>
          <span className="flex items-center gap-1.5"><Focus size={12} /> AF-C</span>
        </div>
      </div>
    </motion.div>
  );
}
`;

// 6. JourneyContent.tsx - Clean typography syncs with optics
const contentCode = `
"use client";

import { motion, MotionValue, useTransform } from "framer-motion";
import { ReactNode } from "react";
import Link from "next/link";
import { Camera, BookOpen } from "lucide-react";

function ContentBlock({ 
  scrollY, 
  start, 
  end, 
  children,
  align = "center" 
}: { 
  scrollY: MotionValue<number>; 
  start: number; 
  end: number; 
  children: ReactNode;
  align?: "left" | "center" | "right";
}) {
  const opacity = useTransform(scrollY, [start, start + 0.05, end - 0.05, end], [0, 1, 1, 0]);
  const y = useTransform(scrollY, [start, start + 0.05, end - 0.05, end], [30, 0, 0, -30]);
  const blurValue = useTransform(scrollY, [start, start + 0.05, end - 0.05, end], ["blur(12px)", "blur(0px)", "blur(0px)", "blur(12px)"]);

  const alignClass = align === "center" ? "items-center text-center" : align === "left" ? "items-start text-left" : "items-end text-right";

  return (
    <motion.div 
      className={\`fixed inset-0 z-30 flex flex-col justify-center px-6 md:px-24 pointer-events-none \${alignClass}\`}
      style={{ opacity, y, filter: blurValue }}
    >
      <div className="max-w-4xl pointer-events-auto">
        {children}
      </div>
    </motion.div>
  );
}

export function JourneyContent({ scrollY }: { scrollY: MotionValue<number> }) {
  const outputOpacity = useTransform(scrollY, [0.85, 0.9], [0, 1]);
  const outputY = useTransform(scrollY, [0.85, 0.9], [50, 0]);

  return (
    <>
      <ContentBlock scrollY={scrollY} start={0} end={0.12} align="center">
        <p className="intaglio-label mb-6 text-[#0a84ff] tracking-[0.4em] uppercase">The Machine</p>
        <h1 className="font-intaglio-serif text-6xl md:text-9xl font-light leading-[0.85] text-[var(--intaglio-paper)]">
          Develop<br/><span className="italic opacity-70">the impossible.</span>
        </h1>
        <p className="mt-8 text-lg text-white/60 max-w-xl mx-auto font-light leading-relaxed">
          Scroll to enter the optical path.
        </p>
      </ContentBlock>

      <ContentBlock scrollY={scrollY} start={0.15} end={0.25} align="left">
        <h2 className="font-intaglio-serif text-5xl md:text-7xl font-light text-[var(--intaglio-paper)] mb-6">
          Absolute Clarity.
        </h2>
        <p className="text-xl text-white/70 max-w-lg leading-relaxed">
          No lag. No heavy engines. A hyper-optimized interface that feels like precision-machined hardware in your hands.
        </p>
      </ContentBlock>

      <ContentBlock scrollY={scrollY} start={0.28} end={0.42} align="right">
        <h2 className="font-intaglio-serif text-5xl md:text-7xl font-light text-[var(--intaglio-paper)] mb-6">
          Light Control.
        </h2>
        <p className="text-xl text-white/70 max-w-lg leading-relaxed ml-auto">
          The aperture closes. Focus snaps into place. 
          A darkroom built for maximum intent and zero distraction.
        </p>
      </ContentBlock>

      <ContentBlock scrollY={scrollY} start={0.52} end={0.7} align="center">
        <h2 className="font-intaglio-serif text-6xl md:text-8xl font-light text-white mb-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
          The Raw Data.
        </h2>
        <p className="text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-mono">
          [ UNCOMPRESSED DIGITAL READOUT ]<br/>
          Pixels mapped. Half-float precision processing.
        </p>
      </ContentBlock>

      <ContentBlock scrollY={scrollY} start={0.72} end={0.82} align="left">
        <h2 className="font-intaglio-serif text-5xl md:text-7xl font-light text-[var(--intaglio-paper)] mb-6">
          The Print.
        </h2>
        <p className="text-xl text-white/70 max-w-lg leading-relaxed">
          Tangible, permanent results. Recipes that mimic the chemical structure of film, ready for the feed or the gallery.
        </p>
      </ContentBlock>

      <motion.div 
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--intaglio-charcoal)] px-6 text-center"
        style={{ opacity: outputOpacity, y: outputY }}
      >
        <div className="absolute inset-0 intaglio-grain mix-blend-overlay opacity-30" />
        <div className="relative z-10 max-w-3xl">
          <p className="intaglio-label text-[var(--intaglio-brass)] mb-6 tracking-[0.3em] uppercase">
            Final Frame
          </p>
          <h2 className="font-intaglio-serif text-5xl md:text-8xl font-light leading-tight text-white mb-10">
            Enter the darkroom.
          </h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/editor" className="intaglio-button intaglio-button-primary px-8 py-4 text-sm">
              Open Darkroom
              <Camera size={16} />
            </Link>
            <Link href="/presets" className="intaglio-button px-8 py-4 text-sm">
              View Recipes
              <BookOpen size={16} />
            </Link>
          </div>
        </div>
      </motion.div>
    </>
  );
}
`;

// 7. CameraJourney.tsx - The Master Orchestrator
const journeyCode = `
"use client";

import { useScroll } from "framer-motion";
import { useRef } from "react";
import { CameraLens } from "./CameraLens";
import { ApertureIris } from "./ApertureIris";
import { ShutterMechanism } from "./ShutterMechanism";
import { SensorCore } from "./SensorCore";
import { CameraHUD } from "./CameraHUD";
import { JourneyContent } from "./JourneyContent";

export function CameraJourney() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // A 1000vh container ensures a long, extremely smooth scrubbable journey.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "1000vh" }}>
      {/* Background Hardware Elements */}
      <CameraLens scrollY={scrollYProgress} />
      <ApertureIris scrollY={scrollYProgress} />
      <ShutterMechanism scrollY={scrollYProgress} />
      <SensorCore scrollY={scrollYProgress} />
      
      {/* Overlay Elements */}
      <CameraHUD scrollY={scrollYProgress} />
      <JourneyContent scrollY={scrollYProgress} />
      
      {/* Persistent scroll indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 mix-blend-difference pointer-events-none flex flex-col items-center gap-2 opacity-50">
        <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-white to-white" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-white">Scroll</span>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(dir, 'CameraLens.tsx'), lensCode);
fs.writeFileSync(path.join(dir, 'ApertureIris.tsx'), apertureCode);
fs.writeFileSync(path.join(dir, 'ShutterMechanism.tsx'), shutterCode);
fs.writeFileSync(path.join(dir, 'SensorCore.tsx'), sensorCode);
fs.writeFileSync(path.join(dir, 'CameraHUD.tsx'), hudCode);
fs.writeFileSync(path.join(dir, 'JourneyContent.tsx'), contentCode);
fs.writeFileSync(path.join(dir, 'CameraJourney.tsx'), journeyCode);

console.log('All Hyper-Optimized Components Created');
