"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  MeshDistortMaterial,
  MeshTransmissionMaterial,
  Float,
  Environment,
  Lightformer,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";
import {
  Aperture,
  Wand2,
  Layers,
  Sun,
  Palette,
  Scan,
  MonitorPlay,
  Download,
  Film,
  LucideIcon,
} from "lucide-react";
import "./landing.css";

// ===========================
// 3D COMPONENTS
// ===========================

const OilBackground: React.FC = () => {
  const sphereRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (sphereRef.current) {
      sphereRef.current.rotation.x = t * 0.02;
      sphereRef.current.rotation.z = t * 0.03;
    }
  });

  return (
    <group>
      {/* Main dark crude-like mass */}
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh ref={sphereRef} position={[0, 0, -5]} scale={5}>
          <sphereGeometry args={[1, 128, 128]} />
          <MeshDistortMaterial
            color="#050505"
            envMapIntensity={2}
            clearcoat={1}
            clearcoatRoughness={0}
            metalness={0.1}
            roughness={0.1}
            distort={0.4}
            speed={0.8}
          />
        </mesh>
      </Float>

      {/* Warm / cool blobs */}
      <Float speed={2} rotationIntensity={1} floatIntensity={1}>
        <mesh position={[4, -3, -4]} scale={2}>
          <sphereGeometry args={[1, 64, 64]} />
          <MeshDistortMaterial
            color="#4a3b2a"
            distort={0.3}
            speed={2}
            roughness={0.4}
            metalness={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      </Float>

      <Float speed={1.5} rotationIntensity={1} floatIntensity={1}>
        <mesh position={[-4, 3, -6]} scale={2.5}>
          <sphereGeometry args={[1, 64, 64]} />
          <MeshDistortMaterial
            color="#1a2b3c"
            distort={0.5}
            speed={1.5}
            roughness={0.4}
            metalness={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      </Float>

      {/* Studio dust particles */}
      <Sparkles
        count={100}
        scale={10}
        size={2}
        speed={0.4}
        opacity={0.5}
        color="#ffffff"
      />
    </group>
  );
};

const HeroLens: React.FC = () => {
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.rotation.x = time * 0.05;
      mesh.current.rotation.y = time * 0.1;
    }
  });

  return (
    <Float floatIntensity={0.5} rotationIntensity={0.2} speed={2}>
      <mesh ref={mesh} scale={1.4} position={[0, 0, 0]}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshTransmissionMaterial
          backside
          samples={8}
          resolution={1024}
          thickness={2.5}
          roughness={0.05}
          anisotropy={0.1}
          chromaticAberration={0.06}
          color="#ffffff"
          distortion={0.2}
          distortionScale={0.5}
          temporalDistortion={0.1}
        />
      </mesh>
    </Float>
  );
};

const Lighting: React.FC = () => {
  return (
    <group>
      <ambientLight intensity={0.1} />

      {/* Rim Light (Cool) */}
      <spotLight
        position={[-10, 10, -5]}
        angle={0.2}
        penumbra={1}
        intensity={2}
        color="#cceeff"
      />

      {/* Key Light (Warm) */}
      <spotLight
        position={[10, 0, 5]}
        angle={0.5}
        penumbra={1}
        intensity={1.5}
        color="#ffeedd"
      />

      {/* Environment */}
      <Environment resolution={512}>
        <group rotation={[-Math.PI / 4, -0.3, 0]}>
          <Lightformer
            intensity={4}
            rotation-x={Math.PI / 2}
            position={[0, 5, -9]}
            scale={[10, 10, 1]}
          />
          <Lightformer
            intensity={2}
            rotation-y={Math.PI / 2}
            position={[-5, 1, -1]}
            scale={[20, 0.1, 1]}
            color="#ffaa00"
          />
          <Lightformer
            intensity={2}
            rotation-y={Math.PI / 2}
            position={[-5, -1, -1]}
            scale={[20, 0.5, 1]}
          />
          <Lightformer
            intensity={2}
            rotation-y={-Math.PI / 2}
            position={[10, 1, 0]}
            scale={[8, 1, 1]}
            color="#5599ff"
          />
        </group>
      </Environment>
    </group>
  );
};

// ===========================
// UI COMPONENTS
// ===========================

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
  tag?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  desc,
  tag,
}) => (
  <div className="group relative border border-white/10 bg-black/40 p-8 backdrop-blur-sm transition-all duration-700 hover:border-white/30 overflow-hidden">
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 opacity-60" />

    <div className="relative z-10">
      <div className="mb-6 flex items-start justify-between">
        <div className="text-gray-400 transition-colors duration-500 group-hover:text-amber-100">
          <Icon size={28} strokeWidth={1} />
        </div>
        {tag && (
          <span className="border border-amber-500/30 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-amber-500/80">
            {tag}
          </span>
        )}
      </div>
      <h3 className="mb-3 text-2xl font-light tracking-wide text-gray-200">
        {title}
      </h3>
      <p className="border-t border-white/5 pt-4 text-sm font-light leading-7 text-gray-500 transition-colors group-hover:text-gray-400">
        {desc}
      </p>
    </div>
  </div>
);

interface SectionHeadingProps {
  children: React.ReactNode;
  subtitle: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({
  children,
  subtitle,
}) => (
  <div className="mb-20 text-center md:text-left">
    <h2 className="mb-6 font-serif text-4xl font-light italic tracking-tight text-white md:text-6xl">
      {children}
    </h2>
    <div className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-amber-600 to-transparent md:mx-0" />
    <p className="max-w-2xl font-light leading-relaxed text-gray-400 text-lg">
      {subtitle}
    </p>
  </div>
);

// ===========================
// MAIN PAGE
// ===========================

const NyvarraLanding: React.FC = () => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  React.useEffect(() => {
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = "smooth";

    // Setup intersection observer for fade-in animations
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" }
    );

    // Observe all sections
    const sections = document.querySelectorAll("section[id]");
    sections.forEach((section) => {
      section.classList.add("opacity-0");
      observerRef.current?.observe(section);
    });

    return () => {
      document.documentElement.style.scrollBehavior = "auto";
      observerRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#050505] text-white font-sans">
      {/* Film grain overlay (from slider inspo) */}
      <div
        className="pointer-events-none fixed inset-0 z-40 opacity-[0.08] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 3D BACKGROUND – OIL + LENS */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 35 }}
          gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <color attach="background" args={["#020202"]} />
          <Lighting />
          <OilBackground />
          <HeroLens />
          <fog attach="fog" args={["#020202", 4, 12]} />
        </Canvas>
      </div>

      {/* CONTENT OVERLAY */}
      <div className="relative z-30 w-full">
        {/* NAVBAR */}
        <nav className="fixed top-0 z-40 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
            <div className="group flex cursor-pointer items-center gap-3">
              <div className="relative h-8 w-8">
                <Image
                  src="/logo.png"
                  alt="Nyvarra Logo"
                  fill
                  className="object-contain opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                />
              </div>
              <span className="font-mono text-[10px] tracking-[0.5em] text-gray-200 transition-colors group-hover:text-white">
                NYVARRA
              </span>
            </div>

            <div className="hidden items-center gap-10 text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 md:flex">
              <a href="#engine" className="transition-colors hover:text-white">
                Engine
              </a>
              <a href="#optics" className="transition-colors hover:text-white">
                Optics
              </a>
              <a
                href="#magic"
                className="transition-colors hover:text-amber-500"
              >
                Black Magic
              </a>
              <Link
                href="/changelog"
                className="transition-colors hover:text-white"
              >
                Changelog
              </Link>
            </div>

            <Link
              href="/editor"
              className="border-none bg-white px-7 py-3 text-[10px] font-mono font-semibold uppercase tracking-[0.25em] text-black transition-colors hover:bg-gray-200"
            >
              Open Studio
            </Link>
          </div>
        </nav>

        {/* HERO */}
        <section
          className="flex h-screen flex-col items-center justify-center px-4 pt-28 text-center relative"
          aria-labelledby="nyvarra-hero-title"
        >
          {/* Privacy Badge - Top Right */}
          <div className="absolute top-32 right-8 hidden md:flex items-center gap-2 px-4 py-2 border border-amber-900/30 bg-black/40 backdrop-blur-xl">
            <div className="h-2 w-2 rounded-full bg-amber-500/80 animate-pulse" />
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-500/80">
              100% Local Processing
            </span>
          </div>

          {/* slider-inspired help text top-left */}
          <div className="pointer-events-none fixed left-6 top-24 font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">
            Click. Drag. Grade.
          </div>

          <div className="flex flex-col items-center animate-fade-in-up">
            <span className="mb-8 border-b border-amber-900/30 pb-4 font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-amber-500/80">
              Built out of Yearning.
            </span>

            <h1 className="mb-8 bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-center font-serif text-5xl font-light tracking-tight text-transparent md:text-7xl lg:text-8xl">
              For the Love <br />
              <span className="text-3xl italic text-gray-400 md:text-4xl">
                of
              </span>{" "}
              Grain
            </h1>

            <p className="mx-auto mb-10 max-w-xl text-lg font-light leading-relaxed tracking-wide text-gray-300 md:text-xl">
              I built this because I missed the feeling of developing film. A
              digital darkroom that respects the physics of light, made for
              people who care about the details.
            </p>

            <div className="flex flex-col items-center justify-center gap-5 md:flex-row">
              <Link
                href="/editor"
                className="group relative inline-flex items-center gap-2 border border-amber-600/30 px-10 py-4 text-[10px] font-mono uppercase tracking-[0.3em] text-amber-50 transition-all hover:border-amber-500"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Creating
                  <Wand2 size={14} />
                </span>
                <div className="absolute inset-0 w-0 bg-amber-900/30 opacity-30 transition-all duration-300 group-hover:w-full" />
              </Link>

              <Link
                href="/presets"
                className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-gray-400 transition-colors hover:text-white"
              >
                <Film size={14} />
                Explore Presets
              </Link>
            </div>
          </div>

          {/* Slider-esque vertical line at bottom */}
          <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 opacity-40">
            <div className="h-16 w-px bg-gradient-to-b from-transparent via-white to-transparent" />
          </div>
        </section>

        {/* CORE ENGINE */}
        <section
          id="engine"
          className="mx-auto max-w-7xl border-t border-white/5 px-6 py-32"
        >
          <SectionHeading subtitle="Tools that treat your images like light hitting a sensor, not just pixels on a screen.">
            The Darkroom
          </SectionHeading>
          <div className="grid grid-cols-1 gap-px border border-white/5 bg-white/5 md:grid-cols-3 stagger-children">
            <FeatureCard
              icon={Layers}
              title="32-Bit Depth"
              desc="Because we know how much information is hidden in your shadows. Processed with enough precision to keep every detail intact."
            />
            <FeatureCard
              icon={Scan}
              title="Non-Destructive"
              desc="Experiment freely. Every slider is just a math operation on the original light data, so you can always go back."
            />
            <FeatureCard
              icon={Aperture}
              title="Teal & Tungsten"
              desc="My personal take on the classic split-tone look. Pushes shadows to deep teal and highlights to warm tungsten naturally."
            />
          </div>
        </section>

        {/* OPTICS */}
        <section id="optics" className="bg-[#080808] py-32 px-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-20 md:flex-row">
            <div className="w-full md:w-1/2">
              <SectionHeading subtitle="Digital sensors are amazing, but sometimes they're too clean. Here's how we bring back the soul of analog photography.">
                Imperfections
              </SectionHeading>

              <div className="space-y-px border border-white/5 bg-white/5">
                <div className="border-l-2 border-transparent bg-[#050505] p-8 transition-colors hover:border-amber-700 hover:bg-[#0a0a0a]">
                  <h4 className="mb-2 text-xl font-light text-white">
                    Halation
                  </h4>
                  <p className="text-sm font-light text-gray-500">
                    That beautiful red glow you get when bright light hits film
                    emulsion. It softens the harshest highlights.
                  </p>
                </div>
                <div className="border-l-2 border-transparent bg-[#050505] p-8 transition-colors hover:border-amber-700 hover:bg-[#0a0a0a]">
                  <h4 className="mb-2 text-xl font-light text-white">
                    Anamorphic Glass
                  </h4>
                  <p className="text-sm font-light text-gray-500">
                    Recreating the distinct character of vintage cinema lenses.
                    Subtle distortion and chromatic aberration that draws the
                    eye.
                  </p>
                </div>
                <div className="border-l-2 border-transparent bg-[#050505] p-8 transition-colors hover:border-amber-700 hover:bg-[#0a0a0a]">
                  <h4 className="mb-2 text-xl font-light text-white">
                    Organic Grain
                  </h4>
                  <p className="text-sm font-light text-gray-500">
                    Not just a static overlay. This grain reacts to the exposure
                    of your image, just like real silver halide crystals.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden border border-white/5 bg-black md:w-1/2">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/25 via-black to-black opacity-60" />
              <div className="absolute top-1/4 left-0 h-px w-full rotate-12 blur-sm bg-blue-500/30" />
              <div className="absolute bottom-1/3 left-0 h-px w-full -rotate-6 blur-md bg-amber-500/25" />

              <div className="relative z-10 border border-white/10 bg-black/60 p-10 text-center backdrop-blur-md">
                <span className="mb-4 block font-mono text-[10px] uppercase tracking-[0.4em] text-gray-500">
                  Simulation
                </span>
                <div className="text-3xl font-serif italic text-white/80 md:text-4xl">
                  "Perfectly
                  <br />
                  Imperfect"
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BLACK MAGIC */}
        <section id="magic" className="mx-auto max-w-7xl px-6 py-32">
          <div className="mb-24 text-center">
            <span className="mb-6 inline-block border border-amber-900/50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">
              Experimental
            </span>
            <h2 className="mb-8 font-serif text-5xl italic text-white md:text-7xl">
              Creative Tools
            </h2>
            <p className="mx-auto max-w-xl font-light leading-relaxed text-gray-500">
              Some things I added just for fun. Tools that let you push an image
              beyond what was captured, or fix lighting that wasn't quite right
              on the day.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="relative min-h-[420px] border border-white/10 bg-[#080808] transition-colors hover:bg-[#0a0a0a]">
              <div className="absolute right-0 top-0 p-8 opacity-20 transition-opacity duration-700 group-hover:opacity-100">
                <Sun size={32} strokeWidth={1} className="text-amber-500" />
              </div>
              <div className="flex h-full flex-col justify-end p-12">
                <h3 className="mb-4 text-3xl font-light text-white">
                  God Light
                </h3>
                <p className="mb-8 max-w-sm font-light leading-relaxed text-gray-500">
                  Missed golden hour? This tool estimates the 3D shape of your
                  subject and lets you add a new light source where you need it.
                </p>
                <div className="h-px w-full bg-gray-900 transition-colors group-hover:bg-amber-900/50" />
              </div>
            </div>

            <div className="relative min-h-[420px] border border-white/10 bg-[#080808] transition-colors hover:bg-[#0a0a0a]">
              <div className="absolute right-0 top-0 p-8 opacity-20 transition-opacity duration-700 group-hover:opacity-100">
                <Palette
                  size={32}
                  strokeWidth={1}
                  className="text-purple-400"
                />
              </div>
              <div className="flex h-full flex-col justify-end p-12">
                <h3 className="mb-4 text-3xl font-light text-white">
                  Palette Heist
                </h3>
                <p className="mb-8 max-w-sm font-light leading-relaxed text-gray-500">
                  Ever see a movie still and wish you could steal that color
                  grade? Upload a reference, and I'll try to map its colors to
                  your image.
                </p>

                <div className="flex gap-4 opacity-50 transition-opacity group-hover:opacity-100">
                  <div className="h-2 w-12 bg-[#2c1a1a]" />
                  <div className="h-2 w-12 bg-[#8c3a3a]" />
                  <div className="h-2 w-12 bg-[#d69e4f]" />
                </div>
              </div>
            </div>

            <div className="relative min-h-[360px] border border-white/10 bg-[#080808] transition-colors hover:bg-[#0a0a0a] md:col-span-2">
              <div className="flex h-full flex-col items-center justify-center p-12 text-center">
                <Wand2
                  size={48}
                  strokeWidth={1}
                  className="mb-8 text-gray-700 transition-colors duration-500 group-hover:text-blue-400"
                />
                <h3 className="mb-4 text-3xl font-light text-white">
                  False Color
                </h3>
                <p className="mb-8 max-w-xl font-light leading-relaxed text-gray-500">
                  A tool borrowed from cinema cameras. It visualizes exposure
                  values so you can see exactly where your skin tones and
                  shadows are sitting.
                </p>

                <div className="h-2 w-full max-w-md rounded-full bg-gradient-to-r from-purple-900 via-teal-900 to-red-900 opacity-40 group-hover:opacity-100" />
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER / WORKFLOW */}
        <section className="border-t border-white/5 bg-[#020202] py-24">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <div className="mb-16 flex flex-wrap justify-center gap-10 text-[10px] font-mono uppercase tracking-[0.25em] text-gray-600">
              <span className="flex items-center gap-3 hover:text-white transition-colors">
                <Download size={14} /> JSON Presets
              </span>
              <span className="flex items-center gap-3 hover:text-white transition-colors">
                <MonitorPlay size={14} /> 3D LUT Support
              </span>
              <span className="flex items-center gap-3 hover:text-white transition-colors">
                <Scan size={14} /> Batch Editing
              </span>
            </div>

            <div className="relative">
              <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.5em] text-amber-900/60">
                Made with ❤️ for photographers
              </p>
              <h1 className="pointer-events-none select-none text-[14vw] leading-none font-serif italic tracking-tighter text-white/5 mix-blend-difference">
                NYVARRA
              </h1>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default NyvarraLanding;
