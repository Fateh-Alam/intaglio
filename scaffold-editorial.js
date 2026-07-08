const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'app', 'components', 'landing');

// 1. Delete the old "pathetic" CSS hardware components
const toDelete = ['CameraLens.tsx', 'ApertureIris.tsx', 'SensorCore.tsx', 'ShutterMechanism.tsx', 'CameraJourney.tsx'];
toDelete.forEach(file => {
  const p = path.join(dir, file);
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

// 2. EditorialParallax.tsx - The Premium Experience
const editorialCode = `
"use client";

import { useScroll, useTransform, motion, MotionValue } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, BookOpen } from "lucide-react";
import { ShaderVeil } from "./ShaderVeil";
import { CameraHUD } from "./CameraHUD";

function ParallaxImage({ 
  src, 
  scrollY, 
  start, 
  end 
}: { 
  src: string; 
  scrollY: MotionValue<number>; 
  start: number; 
  end: number;
}) {
  const y = useTransform(scrollY, [start, end], ["0%", "50%"]);
  const opacity = useTransform(scrollY, [start, start + 0.1, end - 0.1, end], [0, 1, 1, 0]);
  const scale = useTransform(scrollY, [start, end], [1.05, 1]);

  return (
    <motion.div 
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black"
      style={{ opacity }}
    >
      <motion.div className="relative w-full h-[120vh] -top-[10vh]" style={{ y, scale }}>
        <Image 
          src={src} 
          alt="Macro Camera Detail" 
          fill 
          priority
          className="object-cover opacity-80"
          sizes="100vw"
        />
        {/* Deep cinematic vignette and gradient over the image */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-transparent to-[#0a0a0a]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,10,10,0.8)_100%)]" />
      </motion.div>
    </motion.div>
  );
}

function EditorialSection({ 
  scrollY, 
  start, 
  end, 
  eyebrow,
  title,
  body,
  align = "left"
}: { 
  scrollY: MotionValue<number>; 
  start: number; 
  end: number;
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  align?: "left" | "center" | "right";
}) {
  // Narrower visibility window so text fades in and out distinctly per section
  const opacity = useTransform(scrollY, [start + 0.1, start + 0.2, end - 0.2, end - 0.1], [0, 1, 1, 0]);
  const y = useTransform(scrollY, [start + 0.1, start + 0.2, end - 0.2, end - 0.1], [40, 0, 0, -40]);

  const alignClass = align === "center" ? "items-center text-center mx-auto" : align === "left" ? "items-start text-left ml-auto mr-auto lg:ml-24 lg:mr-auto" : "items-end text-right ml-auto mr-auto lg:mr-24 lg:ml-auto";

  return (
    <div className="h-[200vh] w-full flex items-center">
       <motion.div 
          className={\`w-full max-w-4xl px-8 flex flex-col \${alignClass} relative z-30\`}
          style={{ opacity, y }}
       >
         <p className="intaglio-label mb-6 text-[#e2ae65] tracking-[0.4em] uppercase text-sm drop-shadow-md">{eyebrow}</p>
         <h2 className="font-intaglio-serif text-6xl md:text-8xl font-light leading-[1.1] text-white mb-8 drop-shadow-2xl">
           {title}
         </h2>
         <p className="text-xl md:text-2xl text-white/80 max-w-2xl font-light leading-relaxed drop-shadow-lg">
           {body}
         </p>
       </motion.div>
    </div>
  );
}

export function EditorialParallax() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // The page is massive: 4 sections * 200vh + intro/outro = ~1000vh
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div ref={containerRef} className="relative w-full bg-[#0a0a0a]">
      {/* 1. Background Cinematic Shader */}
      <ShaderVeil scrollY={scrollYProgress} />
      <div className="intaglio-grain pointer-events-none fixed inset-0 z-50 opacity-[0.06]" />

      {/* 2. Parallax Image Sequences */}
      <ParallaxImage src="/landing/dial.jpg" scrollY={scrollYProgress} start={0} end={0.25} />
      <ParallaxImage src="/landing/lens.jpg" scrollY={scrollYProgress} start={0.2} end={0.5} />
      <ParallaxImage src="/landing/aperture.jpg" scrollY={scrollYProgress} start={0.45} end={0.75} />
      <ParallaxImage src="/landing/sensor.jpg" scrollY={scrollYProgress} start={0.7} end={1.0} />

      {/* 3. The HUD Overlay */}
      <CameraHUD scrollY={scrollYProgress} />

      {/* 4. The Editorial Content Layer */}
      <div className="relative z-20 w-full pt-[50vh]">
        
        {/* Intro */}
        <motion.div 
          className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative -top-[20vh]"
          style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
        >
          <h1 className="font-intaglio-serif text-7xl md:text-[12rem] font-light leading-[0.85] text-white drop-shadow-2xl">
            Intaglio
          </h1>
          <p className="mt-8 text-xl text-[#e2ae65] uppercase tracking-[0.5em] font-light">
            The Instrument
          </p>
        </motion.div>

        {/* Sections tied to Images */}
        {/* Dial Section (0 to 0.25) */}
        <EditorialSection 
          scrollY={scrollYProgress} start={0} end={0.25} align="left"
          eyebrow="01 / The Chassis"
          title={<>Machined for<br/><span className="italic text-white/70">precision.</span></>}
          body="Every tool in Intaglio is designed to feel physical. No abstract sliders, no endless menus. Just the absolute controls needed to develop the impossible."
        />

        {/* Lens Section (0.25 to 0.5) */}
        <EditorialSection 
          scrollY={scrollYProgress} start={0.25} end={0.5} align="right"
          eyebrow="02 / The Optics"
          title={<>Perfect<br/><span className="italic text-white/70">imperfection.</span></>}
          body="Chromatic aberration, anamorphic flaring, and geometric distortion aren't just stamped on. They are mathematically calculated through a true optical pipeline."
        />

        {/* Aperture Section (0.5 to 0.75) */}
        <EditorialSection 
          scrollY={scrollYProgress} start={0.5} end={0.75} align="left"
          eyebrow="03 / The Light"
          title={<>Total<br/><span className="italic text-white/70">restraint.</span></>}
          body="The interface stays quiet until the image asks for a decision. A darkroom built for maximum focus, allowing you to sculpt light with absolute intent."
        />

        {/* Sensor Section (0.75 to 1.0) */}
        <EditorialSection 
          scrollY={scrollYProgress} start={0.75} end={0.95} align="center"
          eyebrow="04 / The Engine"
          title={<>Raw<br/><span className="italic text-white/70">power.</span></>}
          body="A massive 60fps rendering engine using half-float precision. Dithered gradients. The data is yours to shape, with recipes that mimic the true chemical structure of film."
        />

        {/* Outro / Call to Action */}
        <motion.div 
          className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent"
          style={{ 
            opacity: useTransform(scrollYProgress, [0.85, 0.95], [0, 1]),
            y: useTransform(scrollYProgress, [0.85, 0.95], [100, 0])
          }}
        >
          <div className="max-w-3xl">
            <h2 className="font-intaglio-serif text-6xl md:text-9xl font-light leading-tight text-white mb-12">
              Enter the<br/><span className="italic">darkroom.</span>
            </h2>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link href="/editor" className="intaglio-button intaglio-button-primary px-10 py-5 text-sm tracking-widest uppercase">
                Open Darkroom
                <Camera size={16} />
              </Link>
              <Link href="/presets" className="intaglio-button px-10 py-5 text-sm tracking-widest uppercase">
                View Recipes
                <BookOpen size={16} />
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(dir, 'EditorialParallax.tsx'), editorialCode);
console.log('Editorial parallax scaffolded.');

// 3. Update app/page.tsx
const pageCode = `
import { EditorialParallax } from "./components/landing/EditorialParallax";

export default function Home() {
  return (
    <main className="bg-[#0a0a0a] min-h-screen selection:bg-[#e2ae65]/30">
      <EditorialParallax />
    </main>
  );
}
`;

fs.writeFileSync('app/page.tsx', pageCode);
console.log('page.tsx updated.');
