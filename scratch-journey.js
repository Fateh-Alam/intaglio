const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'app', 'components', 'landing');

// 1. CameraHUD.tsx
const hudCode = `
"use client";

import { motion, useTransform, MotionValue } from "framer-motion";
import { BatteryMedium, Focus, Aperture, Video, Layers } from "lucide-react";

export function CameraHUD({ scrollY }: { scrollY: MotionValue<number> }) {
  // HUD Elements react to scroll
  // The ISO starts at 100 and ramps up as we hit the sensor
  const iso = useTransform(scrollY, [0.3, 0.5], [100, 6400]);
  const shutterSpeed = useTransform(scrollY, [0.1, 0.4], [125, 8000]);
  const fStop = useTransform(scrollY, [0.1, 0.2, 0.3], [1.4, 8, 16]);

  const hudOpacity = useTransform(scrollY, [0, 0.02, 0.7, 0.8], [0, 1, 1, 0]);

  // Viewfinder borders close in slightly
  const bracketScale = useTransform(scrollY, [0, 0.1], [1.05, 1]);

  return (
    <motion.div 
      className="pointer-events-none fixed inset-0 z-40 p-4 md:p-8 mix-blend-difference text-[var(--intaglio-silver)] uppercase tracking-[0.2em] font-mono text-[10px]"
      style={{ opacity: hudOpacity }}
    >
      <motion.div 
        className="absolute inset-4 md:inset-8 border border-white/10"
        style={{ scale: bracketScale }}
      >
        {/* Corner Brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/40" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/40" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/40" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/40" />
        
        {/* Center Crosshair */}
        <div className="absolute top-1/2 left-1/2 w-8 h-px bg-white/20 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-px h-8 bg-white/20 -translate-x-1/2 -translate-y-1/2" />
      </motion.div>

      {/* Top Bar */}
      <div className="absolute top-8 left-12 right-12 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><Video size={12} className="text-red-500 animate-pulse" /> RAW + JPEG</span>
          <span>4:3</span>
        </div>
        <div className="flex items-center gap-4">
          <BatteryMedium size={14} className="text-white/70" />
          <span>100%</span>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-8 left-12 right-12 flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <motion.span>ISO {useTransform(iso, v => Math.floor(v))}</motion.span>
            <motion.span>1/{useTransform(shutterSpeed, v => Math.floor(v))}</motion.span>
            <motion.span>F/{useTransform(fStop, v => v.toFixed(1))}</motion.span>
          </div>
          <div className="h-1 w-48 bg-white/10 relative mt-2">
             <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white" />
             <div className="absolute top-0 bottom-0 right-1/4 w-px bg-white/40" />
             <div className="absolute top-0 bottom-0 left-1/4 w-px bg-white/40" />
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <span className="flex items-center gap-1.5"><Focus size={12} /> AF-S</span>
          <span className="flex items-center gap-1.5"><Layers size={12} /> MF</span>
          <span>AEL</span>
        </div>
      </div>
    </motion.div>
  );
}
`;

// 2. LensTunnel.tsx
const lensCode = `
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshTransmissionMaterial, Float, Environment, Lightformer } from "@react-three/drei";
import { MotionValue } from "framer-motion";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function GlassElements({ scrollY }: { scrollY: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null);
  const bladesRef = useRef<THREE.Group>(null);

  const numElements = 8;
  const elements = useMemo(() => {
    return Array.from({ length: numElements }).map((_, i) => ({
      z: -i * 15,
      scale: 1 + i * 0.5,
      thickness: 0.5 + Math.random() * 2,
      ior: 1.1 + Math.random() * 0.4,
    }));
  }, []);

  useFrame((state) => {
    const progress = scrollY.get(); // 0 to 1
    
    // Move the camera entirely through the lens
    state.camera.position.z = THREE.MathUtils.lerp(10, -120, progress);
    
    // Rotate the glass elements slightly
    if (group.current) {
      group.current.rotation.z = progress * Math.PI * 2;
    }

    // Aperture blades closing (progress 0.2 to 0.4)
    if (bladesRef.current) {
      const apertureProgress = Math.max(0, Math.min(1, (progress - 0.2) / 0.2));
      bladesRef.current.scale.setScalar(THREE.MathUtils.lerp(1, 0.1, apertureProgress));
      bladesRef.current.rotation.z = THREE.MathUtils.lerp(0, Math.PI / 4, apertureProgress);
    }
  });

  return (
    <>
      <group ref={group}>
        {elements.map((el, i) => (
          <Float key={i} speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <mesh position={[0, 0, el.z]}>
              <cylinderGeometry args={[el.scale * 4, el.scale * 4, el.thickness, 64]} />
              <MeshTransmissionMaterial 
                backside
                samples={4}
                thickness={el.thickness}
                chromaticAberration={1.5}
                anisotropy={0.3}
                distortion={0.5}
                distortionScale={0.3}
                temporalDistortion={0.1}
                ior={el.ior}
                color="#e5e5e5"
              />
            </mesh>
          </Float>
        ))}
      </group>

      {/* Aperture Mechanism */}
      <group ref={bladesRef} position={[0, 0, -45]}>
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} rotation={[0, 0, (i / 9) * Math.PI * 2]} position={[0, 0, 0]}>
            <planeGeometry args={[12, 12]} />
            <meshStandardMaterial color="#111" metalness={0.9} roughness={0.2} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </>
  );
}

export function LensTunnel({ scrollY }: { scrollY: MotionValue<number> }) {
  return (
    <div className="fixed inset-0 z-0 bg-[#050505]">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={0.2} />
        <spotLight position={[0, 0, -130]} intensity={5000} color="#ffaa55" distance={200} angle={0.5} penumbra={1} />
        <spotLight position={[0, 50, 0]} intensity={100} color="#55aaff" />
        
        <Environment resolution={256}>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <Lightformer intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
            <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[20, 0.1, 1]} />
            <Lightformer rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[20, 0.5, 1]} />
            <Lightformer rotation-y={-Math.PI / 2} position={[5, 1, -1]} scale={[20, 1, 1]} />
          </group>
        </Environment>

        <GlassElements scrollY={scrollY} />
      </Canvas>
    </div>
  );
}
`;

// 3. SensorCore.tsx
const sensorCode = `
"use client";

import { motion, MotionValue, useTransform } from "framer-motion";

export function SensorCore({ scrollY }: { scrollY: MotionValue<number> }) {
  // Sensor becomes visible around 0.5 to 0.7
  const opacity = useTransform(scrollY, [0.45, 0.5, 0.65, 0.7], [0, 1, 1, 0]);
  const scale = useTransform(scrollY, [0.45, 0.7], [2, 1]);

  return (
    <motion.div 
      className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none bg-black"
      style={{ opacity }}
    >
      <motion.div 
        className="relative w-[150vw] h-[150vh] flex flex-wrap opacity-80 mix-blend-screen"
        style={{ scale }}
      >
        {/* Procedural Bayer pattern grid via CSS */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: \`
              repeating-linear-gradient(to right, transparent, transparent 1px, rgba(0,0,0,0.8) 1px, rgba(0,0,0,0.8) 4px),
              repeating-linear-gradient(to bottom, transparent, transparent 1px, rgba(0,0,0,0.8) 1px, rgba(0,0,0,0.8) 4px),
              linear-gradient(45deg, rgba(255,0,0,0.5) 25%, transparent 25%, transparent 75%, rgba(0,0,255,0.5) 75%),
              linear-gradient(45deg, rgba(0,255,0,0.5) 25%, transparent 25%, transparent 75%, rgba(0,255,0,0.5) 75%)
            \`,
            backgroundSize: '8px 8px, 8px 8px, 16px 16px, 16px 16px',
            backgroundPosition: '0 0, 0 0, 0 0, 8px 8px',
            filter: 'blur(0.5px) contrast(1.5)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,black_80%)]" />
      </motion.div>
    </motion.div>
  );
}
`;

// 4. JourneyContent.tsx
const contentCode = `
"use client";

import { motion, MotionValue, useTransform } from "framer-motion";
import { ReactNode } from "react";
import Link from "next/link";
import { Camera, BookOpen, Wand2 } from "lucide-react";

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
  const y = useTransform(scrollY, [start, start + 0.05, end - 0.05, end], [50, 0, 0, -50]);
  const scale = useTransform(scrollY, [start, start + 0.05, end - 0.05, end], [0.95, 1, 1, 1.05]);
  const blur = useTransform(scrollY, [start, start + 0.05, end - 0.05, end], ["blur(10px)", "blur(0px)", "blur(0px)", "blur(10px)"]);

  const alignClass = align === "center" ? "items-center text-center" : align === "left" ? "items-start text-left" : "items-end text-right";

  return (
    <motion.div 
      className={\`fixed inset-0 z-30 flex flex-col justify-center px-6 md:px-24 pointer-events-none \${alignClass}\`}
      style={{ opacity, y, scale, filter: blur }}
    >
      <div className="max-w-4xl pointer-events-auto">
        {children}
      </div>
    </motion.div>
  );
}

export function JourneyContent({ scrollY }: { scrollY: MotionValue<number> }) {
  // Output block at the very end
  const outputOpacity = useTransform(scrollY, [0.85, 0.9], [0, 1]);
  const outputY = useTransform(scrollY, [0.85, 0.9], [100, 0]);

  return (
    <>
      <ContentBlock scrollY={scrollY} start={0} end={0.12} align="center">
        <p className="intaglio-label mb-6 text-[var(--intaglio-brass)] tracking-[0.4em] uppercase">The Instrument</p>
        <h1 className="font-intaglio-serif text-6xl md:text-9xl font-light leading-[0.85] text-[var(--intaglio-paper)]">
          Develop<br/><span className="italic opacity-70">the impossible.</span>
        </h1>
        <p className="mt-8 text-lg text-white/60 max-w-xl mx-auto font-light leading-relaxed">
          Scroll to enter the optical path.
        </p>
      </ContentBlock>

      <ContentBlock scrollY={scrollY} start={0.15} end={0.28} align="left">
        <h2 className="font-intaglio-serif text-5xl md:text-7xl font-light text-[var(--intaglio-paper)] mb-6">
          Precision Glass.
        </h2>
        <p className="text-xl text-white/70 max-w-lg leading-relaxed">
          Every render pass is treated like a physical lens element. 
          Chromatic aberration, anamorphic flaring, and geometric distortion are 
          calculated mathematically, not stamped on.
        </p>
      </ContentBlock>

      <ContentBlock scrollY={scrollY} start={0.3} end={0.42} align="right">
        <h2 className="font-intaglio-serif text-5xl md:text-7xl font-light text-[var(--intaglio-paper)] mb-6">
          Absolute Restraint.
        </h2>
        <p className="text-xl text-white/70 max-w-lg leading-relaxed ml-auto">
          The aperture closes. The noise disappears. 
          A darkroom built for maximum focus and zero distraction.
        </p>
      </ContentBlock>

      <ContentBlock scrollY={scrollY} start={0.5} end={0.65} align="center">
        <h2 className="font-intaglio-serif text-6xl md:text-8xl font-light text-white mb-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
          The Sensor.
        </h2>
        <p className="text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-mono">
          [ 48,000,000 PIXELS RENDERING AT 60FPS ]<br/>
          Half-float precision. Dithered gradients. 
          The data is yours to shape.
        </p>
      </ContentBlock>

      <ContentBlock scrollY={scrollY} start={0.7} end={0.82} align="left">
        <h2 className="font-intaglio-serif text-5xl md:text-7xl font-light text-[var(--intaglio-paper)] mb-6">
          The Output.
        </h2>
        <p className="text-xl text-white/70 max-w-lg leading-relaxed">
          Recipes that look like they came from a secret studio.
          Export profiled for Instagram, portfolios, or archival prints.
        </p>
      </ContentBlock>

      {/* Final Call to action */}
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

// 5. CameraJourney.tsx
const journeyCode = `
"use client";

import { useScroll } from "framer-motion";
import { useRef } from "react";
import { CameraHUD } from "./CameraHUD";
import { LensTunnel } from "./LensTunnel";
import { SensorCore } from "./SensorCore";
import { JourneyContent } from "./JourneyContent";

export function CameraJourney() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "1000vh" }}>
      <LensTunnel scrollY={scrollYProgress} />
      <SensorCore scrollY={scrollYProgress} />
      <CameraHUD scrollY={scrollYProgress} />
      <JourneyContent scrollY={scrollYProgress} />
      
      {/* A small persistent scroll indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 mix-blend-difference pointer-events-none flex flex-col items-center gap-2 opacity-50">
        <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-white to-white" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-white">Scroll</span>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(componentsDir, 'CameraHUD.tsx'), hudCode);
fs.writeFileSync(path.join(componentsDir, 'LensTunnel.tsx'), lensCode);
fs.writeFileSync(path.join(componentsDir, 'SensorCore.tsx'), sensorCode);
fs.writeFileSync(path.join(componentsDir, 'JourneyContent.tsx'), contentCode);
fs.writeFileSync(path.join(componentsDir, 'CameraJourney.tsx'), journeyCode);

console.log('Components created successfully');
