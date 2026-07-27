
"use client";

import { useScroll, motion, useTransform, MotionValue } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { IconCamera, IconBook, IconHexagon, IconTarget, IconLayersIntersect, IconBolt, IconAdjustmentsHorizontal, IconDatabase, IconArrowRight } from "@tabler/icons-react";
import { MasterShader } from "./MasterShader";
import { CameraHUD } from "./CameraHUD";

// A robust section component that keeps text on screen longer
function StickySection({ 
  scrollY, 
  start, 
  hang, 
  end, 
  eyebrow,
  title,
  body,
  align = "left",
  children
}: { 
  scrollY: MotionValue<number>; 
  start: number; 
  hang: number;
  end: number;
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
  align?: "left" | "center" | "right";
  children?: React.ReactNode;
}) {
  // Rapid fade in, massive hang time, rapid fade out
  const opacity = useTransform(scrollY, [start, start + 0.02, hang, end], [0, 1, 1, 0]);
  const y = useTransform(scrollY, [start, start + 0.05, hang, end], [100, 0, 0, -100]);
  const scale = useTransform(scrollY, [start, start + 0.05, hang, end], [0.95, 1, 1, 1.05]);
  const blur = useTransform(scrollY, [start, start + 0.02, hang, end], ["blur(20px)", "blur(0px)", "blur(0px)", "blur(20px)"]);

  const alignClass = align === "center" ? "items-center text-center mx-auto" : align === "left" ? "items-start text-left ml-auto mr-auto lg:ml-24 lg:mr-auto" : "items-end text-right ml-auto mr-auto lg:mr-24 lg:ml-auto";

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center">
       <motion.div 
          className={`w-full max-w-5xl px-8 flex flex-col ${alignClass} pointer-events-auto`}
          style={{ opacity, y, scale, filter: blur }}
       >
         <p className="intaglio-label mb-6 text-[#e2ae65] tracking-[0.4em] uppercase text-sm drop-shadow-md flex items-center gap-3">
            <IconHexagon className="intaglio-icon text-[#e2ae65]/50 animate-pulse"/>
            {eyebrow}
         </p>
         <h2 className="font-intaglio-serif text-6xl md:text-8xl font-light leading-[1.05] text-white mb-8 drop-shadow-2xl">
           {title}
         </h2>
         <div className="text-xl md:text-2xl text-white/80 max-w-3xl font-light leading-relaxed drop-shadow-lg mb-12">
           {body}
         </div>
         {children}
       </motion.div>
    </div>
  );
}

export function CameraJourney() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Expanded to 1500vh to fit all the new dense content sections comfortably
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div ref={containerRef} className="relative w-full bg-[#020202]" style={{ height: "1500vh" }}>
      
      {/* 1. The Mind-Bending Shader Background */}
      <MasterShader scrollY={scrollYProgress} />
      
      {/* Overlays */}
      <div className="intaglio-grain pointer-events-none fixed inset-0 z-50 opacity-[0.08]" />
      <CameraHUD scrollY={scrollYProgress} />

      {/* 2. The Dense Content Layer (Fixed Position Container) */}
      <div className="fixed inset-0 z-20 w-full h-screen pointer-events-none">
        
        {/* SECTION 0: Explosive Hero (0.0 to 0.08) */}
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-auto"
          style={{ 
            opacity: useTransform(scrollYProgress, [0, 0.06, 0.08], [1, 1, 0]),
            scale: useTransform(scrollYProgress, [0, 0.08], [1, 1.2]),
            filter: useTransform(scrollYProgress, [0, 0.06, 0.08], ["blur(0px)", "blur(0px)", "blur(30px)"])
          }}
        >
          {/* Elegant, cinematic title reveal */}
          <div className="mb-6">
            <motion.h1 
              className="font-intaglio-serif text-[15vw] md:text-[12rem] font-light leading-[0.8] text-white drop-shadow-2xl tracking-tighter"
              initial={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
            >
              Intaglio
            </motion.h1>
          </div>
          
          <motion.div 
            className="flex flex-col items-center gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            <p className="text-sm md:text-lg text-[#e2ae65] uppercase tracking-[0.5em] font-mono flex items-center gap-4">
              <span className="w-8 h-px bg-[#e2ae65]/50" />
              PURE OPTICS. RAW POWER.
              <span className="w-8 h-px bg-[#e2ae65]/50" />
            </p>
            <div className="flex gap-4">
               <Link href="/editor" className="intaglio-button intaglio-button-primary px-8 py-3 text-xs tracking-widest uppercase flex items-center gap-2">
                 <IconTarget className="intaglio-icon"/> Open Darkroom
               </Link>
            </div>
            
            <div className="absolute bottom-12 flex flex-col items-center gap-3 opacity-60 animate-pulse">
               <div className="w-px h-16 bg-gradient-to-b from-transparent to-white" />
               <span className="text-[10px] uppercase tracking-widest font-mono">Engage Optical Drive</span>
            </div>
          </motion.div>
        </motion.div>

        {/* SECTION 1: Philosophy (0.05 -> 0.18) */}
        <StickySection 
          scrollY={scrollYProgress} start={0.06} hang={0.16} end={0.18} align="left"
          eyebrow="01 / The Philosophy"
          title={<>Calculated<br/><span className="italic text-white/70">restraint.</span></>}
          body="The interface stays quiet until the image asks for a decision. Large previews, low visual noise, precise controls, and absolutely zero dashboard clutter."
        >
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 w-full max-w-4xl border-t border-white/10 pt-12">
             <div>
                <IconLayersIntersect className="intaglio-icon text-[#e2ae65] mb-4"/>
                <h3 className="text-white font-mono text-sm tracking-widest mb-2">FIDELITY</h3>
                <p className="text-sm text-white/60">Every effect is treated as a render decision, not a random overlay.</p>
             </div>
             <div>
                <IconTarget className="intaglio-icon text-[#e2ae65] mb-4"/>
                <h3 className="text-white font-mono text-sm tracking-widest mb-2">PRECISION</h3>
                <p className="text-sm text-white/60">Tools built for macro adjustments. Half-float accuracy.</p>
             </div>
             <div>
                <IconBolt className="intaglio-icon text-[#e2ae65] mb-4"/>
                <h3 className="text-white font-mono text-sm tracking-widest mb-2">WORKFLOW</h3>
                <p className="text-sm text-white/60">Import, develop, batch, and export without ever breaking focus.</p>
             </div>
           </div>
        </StickySection>

        {/* SECTION 2: Optical Pipeline (0.17 -> 0.35) */}
        <StickySection 
          scrollY={scrollYProgress} start={0.17} hang={0.33} end={0.35} align="right"
          eyebrow="02 / The Pipeline"
          title={<>Perfect<br/><span className="italic text-white/70">imperfection.</span></>}
          body={
             <>
               <p className="mb-6">Chromatic aberration, anamorphic flaring, and geometric distortion aren&apos;t just stamped on. They are mathematically calculated through a true optical pipeline.</p>
               <p className="text-[#e2ae65] font-mono text-sm tracking-widest opacity-80">{"/* GLSL SHADER PIPELINE ACTIVE */"}</p>
             </>
          }
        />

        {/* SECTION 3: The Mechanism (0.34 -> 0.52) */}
        <StickySection 
          scrollY={scrollYProgress} start={0.34} hang={0.50} end={0.52} align="left"
          eyebrow="03 / The Mechanism"
          title={<>Absolute<br/><span className="italic text-white/70">control.</span></>}
          body="A signed distance field calculating the exact edges of a 9-blade iris. Volumetric light calculated per-pixel. Total control over the hardware."
        >
          <div className="flex gap-4 mt-8">
             <Link href="/editor" className="intaglio-button px-6 py-3 text-xs tracking-widest uppercase">
               Test The Engine <IconArrowRight className="intaglio-icon inline ml-2"/>
             </Link>
          </div>
        </StickySection>

        {/* SECTION 4: Sensor Dynamics (0.51 -> 0.68) */}
        <StickySection 
          scrollY={scrollYProgress} start={0.51} hang={0.66} end={0.68} align="right"
          eyebrow="04 / Sensor Dynamics"
          title={<>Uncompressed<br/><span className="italic text-white/70">data.</span></>}
          body="An infinite grid of red, green, and blue sub-pixels. As you scroll, watch the readout wave scan across the array, capturing light in real-time."
        />

        {/* SECTION 5: Feature Matrix (0.67 -> 0.84) */}
        <StickySection 
          scrollY={scrollYProgress} start={0.67} hang={0.82} end={0.84} align="center"
          eyebrow="05 / Capabilities"
          title={<>The full<br/><span className="italic text-white/70">arsenal.</span></>}
          body=""
        >
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl mt-8">
              {[
                { i: <IconAdjustmentsHorizontal/>, t: "Node-Based Grading" },
                { i: <IconDatabase/>, t: "LUT Generation" },
                { i: <IconLayersIntersect/>, t: "Batch Processing" },
                { i: <IconTarget/>, t: "Film Emulation" },
                { i: <IconBolt/>, t: "GPU Acceleration" },
                { i: <IconHexagon/>, t: "Color Matrix" },
                { i: <IconBook/>, t: "Recipe Archiving" },
                { i: <IconCamera/>, t: "Tethered Capture" }
              ].map((item, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-6 flex flex-col items-center justify-center text-center hover:bg-white/10 transition-colors cursor-pointer">
                   <div className="text-[#e2ae65] mb-3">{item.i}</div>
                   <span className="font-mono text-xs text-white/80 tracking-widest">{item.t}</span>
                </div>
              ))}
           </div>
        </StickySection>

        {/* SECTION 6: The Result (0.83 -> 0.94) */}
        <StickySection 
          scrollY={scrollYProgress} start={0.83} hang={0.92} end={0.94} align="left"
          eyebrow="06 / The Result"
          title={<>Analog<br/><span className="italic text-white/70">soul.</span></>}
          body="Math turns back into feeling. Dithered gradients. Grain. Film-like density. The digital substrate dissolves into pure cinematic expression."
        />

        {/* SECTION 7: Massive Outro CTA (0.93 -> 1.0) */}
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-auto bg-[#020202]/90 backdrop-blur-xl"
          style={{ 
            opacity: useTransform(scrollYProgress, [0.93, 0.95], [0, 1])
          }}
        >
          <div className="max-w-4xl border border-white/10 bg-black/50 p-16 md:p-24 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#e2ae65] to-transparent opacity-50" />
            <h2 className="font-intaglio-serif text-6xl md:text-9xl font-light leading-[0.9] text-white mb-8 relative z-10">
              Enter the<br/><span className="italic">darkroom.</span>
            </h2>
            <p className="text-xl text-white/60 mb-12 font-light max-w-lg mx-auto">
              Your workflow is waiting. No subscriptions, no cloud rendering. Just raw performance on your local machine.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6 relative z-10">
              <Link href="/editor" className="intaglio-button intaglio-button-primary px-12 py-5 text-sm tracking-widest uppercase">
                Launch Application
                <IconArrowRight className="intaglio-icon"/>
              </Link>
              <Link href="/presets" className="intaglio-button px-12 py-5 text-sm tracking-widest uppercase">
                View Recipes
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
