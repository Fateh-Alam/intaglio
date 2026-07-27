
"use client";

import { motion, MotionValue, useTransform } from "framer-motion";
import { ReactNode } from "react";
import Link from "next/link";
import { IconCamera, IconBook } from "@tabler/icons-react";

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
      className={`fixed inset-0 z-30 flex flex-col justify-center px-6 md:px-24 pointer-events-none ${alignClass}`}
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
              <IconCamera className="intaglio-icon"/>
            </Link>
            <Link href="/presets" className="intaglio-button px-8 py-4 text-sm">
              View Recipes
              <IconBook className="intaglio-icon"/>
            </Link>
          </div>
        </div>
      </motion.div>
    </>
  );
}
