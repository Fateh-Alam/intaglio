"use client";

import React, { useRef, useState } from "react";
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
  Type,
  Shield,
  Sparkles as SparklesIcon,
  SlidersHorizontal,
  Eye,
  Brush,
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

      <Sparkles
        count={140}
        scale={12}
        size={2}
        speed={0.35}
        opacity={0.55}
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

      <spotLight
        position={[-10, 10, -5]}
        angle={0.2}
        penumbra={1}
        intensity={2}
        color="#cceeff"
      />

      <spotLight
        position={[10, 0, 5]}
        angle={0.5}
        penumbra={1}
        intensity={1.5}
        color="#ffeedd"
      />

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
    <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-amber-900/10 blur-2xl opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

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

const ProofChips = () => {
  const chips = [
    "32-BIT FLOAT",
    "LOCAL-FIRST",
    "GPU REAL-TIME",
    "CURVES",
    "8-CH HSL",
    "3D LUT",
    "MASKS",
    "FILM LAB",
    "HALATION",
    "GRAIN PHYSICS",
  ];

  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-2 md:gap-3">
      {chips.map((c) => (
        <span
          key={c}
          className="border border-white/10 bg-black/30 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.35em] text-white/60 backdrop-blur-sm"
        >
          {c}
        </span>
      ))}
    </div>
  );
};

const BigSection = ({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  tone = "dark",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  tone?: "dark" | "darker";
}) => (
  <section
    id={id}
    className={`relative border-t border-white/5 ${
      tone === "darker" ? "bg-[#020202]" : "bg-[#050505]"
    }`}
  >
    <div className="mx-auto max-w-7xl px-6 py-28 md:py-36">
      <div className="mb-16 md:mb-24">
        {eyebrow && (
          <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.5em] text-amber-500/70">
            {eyebrow}
          </div>
        )}
        <h2 className="font-serif text-5xl font-light italic tracking-tight text-white md:text-7xl">
          {title}
        </h2>
        <div className="mt-8 h-px w-28 bg-gradient-to-r from-amber-600 to-transparent" />
        <p className="mt-8 max-w-3xl text-lg font-light leading-relaxed text-gray-400 md:text-xl">
          {subtitle}
        </p>
      </div>

      {children}
    </div>
  </section>
);

const MetricRow = ({ left, right }: { left: string; right: string }) => (
  <div className="flex items-center justify-between gap-6 border-b border-white/10 py-4">
    <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/50">
      {left}
    </span>
    <span className="text-sm font-light text-gray-300">{right}</span>
  </div>
);

const FilmStockCard = ({
  name,
  note,
  tint,
}: {
  name: string;
  note: string;
  tint: "amber" | "blue" | "purple" | "red" | "green";
}) => {
  const tintMap: Record<string, string> = {
    amber: "from-amber-900/25 via-black to-black",
    blue: "from-blue-900/25 via-black to-black",
    purple: "from-purple-900/25 via-black to-black",
    red: "from-red-900/25 via-black to-black",
    green: "from-emerald-900/25 via-black to-black",
  };

  return (
    <div className="group relative overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm transition-colors hover:border-white/25">
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] ${tintMap[tint]} opacity-80`}
      />
      <div className="relative z-10 p-7">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/60">
            Film Stock
          </span>
          <span className="border border-white/10 bg-black/30 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.35em] text-white/40">
            Lab
          </span>
        </div>
        <div className="mb-2 text-2xl font-light text-white/90">{name}</div>
        <div className="text-sm font-light leading-6 text-gray-400">{note}</div>

        <div className="mt-6 flex items-center gap-3 opacity-60 transition-opacity group-hover:opacity-100">
          <div className="h-2 w-10 bg-white/10" />
          <div className="h-2 w-16 bg-white/8" />
          <div className="h-2 w-12 bg-white/6" />
        </div>
      </div>
    </div>
  );
};

const BeforeAfter: React.FC = () => {
  const [pos, setPos] = useState(56);

  return (
    <div className="relative overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/50" />

      <div className="relative h-[420px] md:h-[520px]">
        {/* AFTER */}
        <div className="absolute inset-0">
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_10%,rgba(245,158,11,0.22),transparent_45%),radial-gradient(circle_at_75%_35%,rgba(59,130,246,0.18),transparent_50%),radial-gradient(circle_at_40%_80%,rgba(239,68,68,0.12),transparent_50%),linear-gradient(120deg,rgba(255,255,255,0.05),rgba(0,0,0,0.0))]" />
          <div className="absolute left-8 top-8 border border-white/10 bg-black/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.35em] text-white/70">
            After (Nyvarra Grade)
          </div>
        </div>

        {/* BEFORE */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 ${100 - pos}% 0 0)`,
          }}
        >
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_75%_35%,rgba(255,255,255,0.06),transparent_50%),linear-gradient(120deg,rgba(255,255,255,0.02),rgba(0,0,0,0.0))]" />
          <div className="absolute left-8 top-8 border border-white/10 bg-black/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.35em] text-white/60">
            Before (Original)
          </div>
          <div className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-soft-light">
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)`,
                backgroundSize: "10px 10px",
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="absolute top-0 bottom-0" style={{ left: `${pos}%` }}>
          <div className="h-full w-px bg-white/30" />
          <div className="absolute -left-5 top-1/2 -translate-y-1/2">
            <div className="flex items-center gap-2 border border-white/15 bg-black/40 px-3 py-2 backdrop-blur-md">
              <div className="h-1 w-10 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/60">
                Drag
              </span>
              <div className="h-1 w-10 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>
          </div>
        </div>

        {/* Slider */}
        <div className="absolute inset-x-6 bottom-6">
          <input
            aria-label="Before After slider"
            type="range"
            min={0}
            max={100}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="mt-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.35em] text-white/35">
            <span>Original</span>
            <span>Nyvarra</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DemoConsole: React.FC = () => {
  return (
    <div className="relative overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-900/18 via-transparent to-transparent" />

      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-white/30" />
          <div className="h-2 w-2 rounded-full bg-white/20" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/50">
          Studio Preview
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber-500/70">
          Live
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px bg-white/10 md:grid-cols-12">
        {/* Left sidebar */}
        <div className="md:col-span-3 bg-black/30 p-6">
          <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.45em] text-white/40">
            Modules
          </div>

          <div className="space-y-2">
            {[
              { icon: Palette, label: "Wheels" },
              { icon: Scan, label: "Curves" },
              { icon: Layers, label: "HSL" },
              { icon: MonitorPlay, label: "LUT" },
              { icon: Brush, label: "Masking" },
              { icon: Film, label: "Film Lab" },
              { icon: Type, label: "Text" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center justify-between border border-white/10 bg-black/30 px-4 py-3 transition-colors hover:border-white/25"
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} strokeWidth={1} className="text-white/55" />
                  <span className="text-sm font-light text-white/70">
                    {label}
                  </span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/25">
                  Open
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.45em] text-white/40">
              Analyzer
            </div>
            <div className="relative overflow-hidden border border-white/10 bg-black/30 p-4">
              <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/30">
                Histogram
              </div>
              <div className="mt-4 h-20 w-full rounded bg-[linear-gradient(to_right,rgba(255,255,255,0.05),rgba(255,255,255,0.02)),radial-gradient(circle_at_25%_55%,rgba(59,130,246,0.22),transparent_55%),radial-gradient(circle_at_60%_50%,rgba(245,158,11,0.18),transparent_60%),radial-gradient(circle_at_80%_60%,rgba(239,68,68,0.14),transparent_60%)]" />
              <div className="mt-3 flex justify-between font-mono text-[9px] uppercase tracking-[0.35em] text-white/25">
                <span>Shadows</span>
                <span>Highlights</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main preview */}
        <div className="md:col-span-6 bg-black/20 p-6">
          <div className="relative h-[360px] overflow-hidden border border-white/10 bg-black/30 md:h-[520px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.2),transparent_45%),radial-gradient(circle_at_75%_35%,rgba(59,130,246,0.16),transparent_55%),radial-gradient(circle_at_45%_80%,rgba(168,85,247,0.12),transparent_60%),linear-gradient(120deg,rgba(255,255,255,0.04),rgba(0,0,0,0))]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-soft-light">
              <div
                className="h-full w-full"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
              />
            </div>

            <div className="absolute left-6 top-6 flex flex-wrap items-center gap-2">
              <span className="border border-white/15 bg-black/40 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.35em] text-white/60 backdrop-blur-md">
                Teal & Tungsten
              </span>
              <span className="border border-white/10 bg-black/30 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.35em] text-white/45 backdrop-blur-md">
                Skin Protect
              </span>
              <span className="border border-white/10 bg-black/30 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.35em] text-white/45 backdrop-blur-md">
                Halation
              </span>
            </div>

            <div className="absolute bottom-6 left-6 right-6 border border-white/10 bg-black/35 p-5 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/45">
                  Look Intensity
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.45em] text-amber-500/70">
                  62
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10">
                <div className="h-2 w-[62%] rounded-full bg-gradient-to-r from-amber-700/40 via-amber-500/35 to-blue-500/30" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Grain", val: "18" },
                  { label: "Bloom", val: "12" },
                  { label: "WB", val: "+450K" },
                ].map((x) => (
                  <div
                    key={x.label}
                    className="border border-white/10 bg-black/25 px-4 py-3"
                  >
                    <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/30">
                      {x.label}
                    </div>
                    <div className="mt-1 text-sm font-light text-white/70">
                      {x.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="border border-white/10 bg-black/30 p-5">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">
                <Eye size={14} strokeWidth={1} /> Before / After
              </div>
              <div className="mt-3 text-sm font-light leading-6 text-gray-400">
                One key. No drama. Compare instantly.
              </div>
            </div>
            <div className="border border-white/10 bg-black/30 p-5">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">
                <SlidersHorizontal size={14} strokeWidth={1} /> History
              </div>
              <div className="mt-3 text-sm font-light leading-6 text-gray-400">
                Infinite undo with clean state snapshots.
              </div>
            </div>
            <div className="border border-white/10 bg-black/30 p-5">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">
                <Download size={14} strokeWidth={1} /> Export
              </div>
              <div className="mt-3 text-sm font-light leading-6 text-gray-400">
                Full-res processing, 4K retention, zero loss.
              </div>
            </div>
          </div>
        </div>

        {/* Right controls */}
        <div className="md:col-span-3 bg-black/30 p-6">
          <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.45em] text-white/40">
            Controls
          </div>

          <div className="space-y-4">
            {[
              { label: "Lift", val: "-12" },
              { label: "Gamma", val: "+08" },
              { label: "Gain", val: "+14" },
              { label: "Saturation", val: "+06" },
              { label: "Contrast", val: "+10" },
            ].map((x) => (
              <div
                key={x.label}
                className="border border-white/10 bg-black/25 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/35">
                    {x.label}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/55">
                    {x.val}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div className="h-2 w-[58%] rounded-full bg-white/20" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.45em] text-white/40">
              LUT Browser
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["Cinema", "Night", "Portra", "Tungsten", "Clean", "Dusty"].map(
                (x) => (
                  <div
                    key={x}
                    className="border border-white/10 bg-black/25 px-4 py-3 transition-colors hover:border-white/25"
                  >
                    <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/45">
                      {x}
                    </div>
                    <div className="mt-2 h-2 w-full bg-gradient-to-r from-white/10 via-white/6 to-white/10" />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-white/10 bg-black/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
      >
        <span className="text-lg font-light text-white/80">{q}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/35">
          {open ? "Close" : "Open"}
        </span>
      </button>
      {open && (
        <div className="border-t border-white/10 px-6 py-5 text-sm font-light leading-7 text-gray-400">
          {a}
        </div>
      )}
    </div>
  );
};

// ===========================
// MAIN PAGE
// ===========================

const NyvarraLanding: React.FC = () => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  React.useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -140px 0px" }
    );

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
      {/* Film grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-40 opacity-[0.09] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 3D BACKGROUND */}
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

      {/* CONTENT */}
      <div className="relative z-30 w-full">
        {/* NAVBAR */}
        <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="group flex items-center gap-3">
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
            </Link>

            <div className="hidden items-center gap-10 text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 md:flex">
              <a href="#engine" className="transition-colors hover:text-white">
                Engine
              </a>
              <a href="#studio" className="transition-colors hover:text-white">
                Studio
              </a>
              <a href="#grade" className="transition-colors hover:text-white">
                Grade
              </a>
              <a href="#film" className="transition-colors hover:text-white">
                Film Lab
              </a>
              <a href="#mask" className="transition-colors hover:text-white">
                Masking
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

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 border border-amber-900/30 bg-black/40 backdrop-blur-xl">
                <div className="h-2 w-2 rounded-full bg-amber-500/80 animate-pulse" />
                <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-500/80">
                  100% Local
                </span>
              </div>

              <Link
                href="/editor"
                className="border-none bg-white px-7 py-3 text-[10px] font-mono font-semibold uppercase tracking-[0.25em] text-black transition-colors hover:bg-gray-200"
              >
                Open Studio
              </Link>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section
          id="top"
          className="relative flex min-h-[110vh] flex-col items-center justify-center px-4 pt-28 text-center"
          aria-labelledby="nyvarra-hero-title"
        >
          <div className="pointer-events-none fixed left-6 top-24 font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">
            Shoot. Scan. Grade.
          </div>

          {/* built as a birthday gift — no credits, no noise */}
          <div className="mx-auto max-w-5xl animate-fade-in-up">
            <span className="mb-10 inline-block border-b border-amber-900/30 pb-4 font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-amber-500/80">
              A darkroom for the detail-obsessed.
            </span>

            <h1
              id="nyvarra-hero-title"
              className="mb-10 bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text font-serif text-6xl font-light tracking-tight text-transparent md:text-8xl lg:text-9xl"
            >
              For the Love <br />
              <span className="text-4xl italic text-gray-400 md:text-5xl">
                of
              </span>{" "}
              Grain
            </h1>

            <p className="mx-auto max-w-3xl text-lg font-light leading-relaxed tracking-wide text-gray-300 md:text-2xl">
              A local-first digital darkroom that treats images like light, not
              pixels. Film stocks, real curves, 8-channel HSL, 3D LUTs, masks,
              grain physics, and halation. Non-destructive. Fast. Precise.
            </p>

            <ProofChips />

            <div className="mt-12 flex flex-col items-center justify-center gap-5 md:flex-row">
              <Link
                href="/editor"
                className="group relative inline-flex items-center gap-2 border border-amber-600/30 px-12 py-5 text-[10px] font-mono uppercase tracking-[0.3em] text-amber-50 transition-all hover:border-amber-500"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Enter the Darkroom
                  <Wand2 size={14} />
                </span>
                <div className="absolute inset-0 w-0 bg-amber-900/30 opacity-30 transition-all duration-300 group-hover:w-full" />
              </Link>

              <Link
                href="#studio"
                className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-gray-400 transition-colors hover:text-white"
              >
                <Eye size={14} />
                See the Studio
              </Link>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {
                  k: "Processing",
                  v: "32-bit float internal pipeline",
                },
                {
                  k: "Speed",
                  v: "GPU accelerated rendering (WebGL/GLSL)",
                },
                {
                  k: "Quality",
                  v: "Full-res processing with 4K retention",
                },
              ].map((x) => (
                <div
                  key={x.k}
                  className="border border-white/10 bg-black/30 p-7 backdrop-blur-sm"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/35">
                    {x.k}
                  </div>
                  <div className="mt-3 text-base font-light text-white/75">
                    {x.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 opacity-40">
            <div className="h-16 w-px bg-gradient-to-b from-transparent via-white to-transparent" />
          </div>
        </section>

        {/* ENGINE */}
        <BigSection
          id="engine"
          eyebrow="Core Engine"
          title="The Darkroom"
          subtitle="Precision tools that behave like exposure, not filters. Every decision stays reversible until export."
        >
          <div className="grid grid-cols-1 gap-px border border-white/5 bg-white/5 md:grid-cols-3">
            <FeatureCard
              icon={Layers}
              title="32-Bit Float Pipeline"
              tag="HDR"
              desc="High dynamic range internal processing that keeps gradients clean and shadows honest."
            />
            <FeatureCard
              icon={MonitorPlay}
              title="GPU Real-Time"
              tag="WebGL"
              desc="WebGL/GLSL acceleration so your grade responds instantly and stays fluid."
            />
            <FeatureCard
              icon={Scan}
              title="Non-Destructive Editing"
              tag="Infinite"
              desc="Every slider is reversible. Push hard, pull back. No quality loss until export."
            />
            <FeatureCard
              icon={Download}
              title="Full-Res Processing"
              tag="4K+"
              desc="Processes at original resolution so export retains detail, texture, and micro-contrast."
            />
            <FeatureCard
              icon={Eye}
              title="Before / After"
              tag="Instant"
              desc="Quick compare to keep your taste honest. No guessing, no drift."
            />
            <FeatureCard
              icon={SlidersHorizontal}
              title="History Panel"
              tag="State"
              desc="Unlimited undo/redo with clean state snapshots you can trust."
            />
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className="md:col-span-5 border border-white/10 bg-black/30 p-8">
              <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.45em] text-white/40">
                Quality promises
              </div>
              <MetricRow
                left="Banding"
                right="Prevented with 32-bit float depth"
              />
              <MetricRow left="Edits" right="Non-destructive until export" />
              <MetricRow
                left="Performance"
                right="GPU accelerated live preview"
              />
              <MetricRow left="Exports" right="Full-res with 4K retention" />
            </div>
            <div className="md:col-span-7">
              <BeforeAfter />
            </div>
          </div>
        </BigSection>

        {/* STUDIO DEMO */}
        <BigSection
          id="studio"
          eyebrow="Studio"
          title="A tool that looks like it means it."
          subtitle="A cinematic interface that stays out of your way, but never hides the depth. The whole point is to make you want to keep going."
          tone="darker"
        >
          <DemoConsole />
        </BigSection>

        {/* THE GRADE */}
        <BigSection
          id="grade"
          eyebrow="Professional Color Grading"
          title="The Grade"
          subtitle="Wheels, curves, HSL, LUTs, white balance, skin protection. Everything you want when the look matters."
        >
          <div className="grid grid-cols-1 gap-px border border-white/5 bg-white/5 md:grid-cols-3">
            <FeatureCard
              icon={Palette}
              title="Three-Way Wheels"
              tag="Lift/Gamma/Gain"
              desc="Independent tonal control with luma and saturation shaping."
            />
            <FeatureCard
              icon={Layers}
              title="8-Channel HSL"
              tag="Red → Magenta"
              desc="Hue, saturation, luminance control per color channel for surgical fixes."
            />
            <FeatureCard
              icon={Scan}
              title="Curve Editor"
              tag="RGB + Luma"
              desc="Precision curves with custom control points for clean contrast and separation."
            />
            <FeatureCard
              icon={MonitorPlay}
              title="3D LUT Support"
              tag=".CUBE"
              desc="Import industry LUTs, apply fast, refine with wheels and curves."
            />
            <FeatureCard
              icon={Aperture}
              title="Teal & Orange"
              tag="Cinematic"
              desc="A tasteful one-slider filmic split tone that stays natural."
            />
            <FeatureCard
              icon={Shield}
              title="Skin Protection"
              tag="Smart Mask"
              desc="Preserve skin tones while pushing heavy looks everywhere else."
            />
            <FeatureCard
              icon={Sun}
              title="White Balance"
              tag="Kelvin"
              desc="Temperature and tint controls with logic that feels like real light."
            />
            <FeatureCard
              icon={Scan}
              title="Histogram Analyzer"
              tag="RGB/Luma"
              desc="Real-time frequency analysis so you can grade with confidence."
            />
            <FeatureCard
              icon={SparklesIcon}
              title="Cinematic Roll-Off"
              tag="Highlights"
              desc="Smooth highlight handling that avoids harsh clipping and digital glare."
            />
          </div>
        </BigSection>

        {/* FILM LAB */}
        <BigSection
          id="film"
          eyebrow="Film Emulation Lab"
          title="Perfectly Imperfect"
          subtitle="Stock emulations with physical grain, halation, and bloom. Built to feel like chemistry, not overlays."
          tone="darker"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FilmStockCard
              name="Kodak Portra"
              note="Soft skin, gentle contrast, creamy highlights."
              tint="amber"
            />
            <FilmStockCard
              name="Kodak Ektar"
              note="Punchy color, crisp separation, bright modern film."
              tint="red"
            />
            <FilmStockCard
              name="Fuji Velvia"
              note="Vivid greens, deep blues, landscape drama."
              tint="green"
            />
            <FilmStockCard
              name="Cinestill 800T"
              note="Tungsten glow, neon nights, cinematic halation."
              tint="blue"
            />
            <FilmStockCard
              name="Ilford HP5"
              note="Classic B&W grit with honest midtones."
              tint="purple"
            />
            <FilmStockCard
              name="Clean Negative"
              note="A neutral baseline for your own look."
              tint="amber"
            />
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className="md:col-span-7 border border-white/10 bg-black/30 p-8">
              <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.45em] text-white/40">
                Film physics
              </div>
              <MetricRow
                left="Grain"
                right="Procedural, exposure-reactive, not static"
              />
              <MetricRow
                left="Halation"
                right="Highlight bleed with roll-off control"
              />
              <MetricRow
                left="Bloom"
                right="Soft highlight spread that stays tasteful"
              />
              <MetricRow left="Texture" right="Feels organic, not noisy" />
            </div>
            <div className="md:col-span-5 border border-white/10 bg-black/30 p-8">
              <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.45em] text-white/40">
                Preset workflow
              </div>
              <div className="space-y-3">
                {[
                  "Pick a stock baseline",
                  "Dial wheels and curves",
                  "Refine with HSL",
                  "Add grain and halation",
                  "Export full-res",
                ].map((s) => (
                  <div
                    key={s}
                    className="flex items-center justify-between border border-white/10 bg-black/25 px-5 py-4"
                  >
                    <span className="text-sm font-light text-white/70">
                      {s}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/25">
                      Step
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </BigSection>

        {/* MASKING */}
        <BigSection
          id="mask"
          eyebrow="Masking Studio"
          title="Control the light. Not the whole frame."
          subtitle="Brush masks, luminosity ranges, gradients, inversion. Shape attention with precision."
        >
          <div className="grid grid-cols-1 gap-px border border-white/5 bg-white/5 md:grid-cols-3">
            <FeatureCard
              icon={Brush}
              title="Brush Mask"
              tag="Paint"
              desc="Paint to select with adjustable size, softness, and opacity."
            />
            <FeatureCard
              icon={Sun}
              title="Luminosity Masks"
              tag="Auto"
              desc="Target shadows, midtones, highlights without manual guesswork."
            />
            <FeatureCard
              icon={Aperture}
              title="Gradient Masks"
              tag="Linear/Radial"
              desc="Shape light with soft falloff for believable vignettes and lifts."
            />
            <FeatureCard
              icon={Layers}
              title="Inversion"
              tag="Instant"
              desc="Flip selections fast to move from subject to background and back."
            />
            <FeatureCard
              icon={Shield}
              title="Skin Preserve"
              tag="Mask Assist"
              desc="Protect faces while you push everything else into a look."
            />
            <FeatureCard
              icon={Eye}
              title="Mask Preview"
              tag="View"
              desc="See what you are affecting before it affects anything."
            />
          </div>
        </BigSection>

        {/* BLACK MAGIC */}
        <BigSection
          id="magic"
          eyebrow="AI & Smart Tools"
          title="Black Magic"
          subtitle="The fun stuff, but engineered like it belongs in the workflow. Reference matching, relighting, and analyzer tools."
          tone="darker"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="group relative min-h-[460px] overflow-hidden border border-white/10 bg-[#080808] transition-colors hover:bg-[#0a0a0a]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-900/18 via-transparent to-transparent" />
              <div className="absolute right-0 top-0 p-8 opacity-25 transition-opacity duration-700 group-hover:opacity-100">
                <Sun size={34} strokeWidth={1} className="text-amber-500" />
              </div>
              <div className="flex h-full flex-col justify-end p-12">
                <h3 className="mb-4 text-4xl font-light text-white">
                  God Light
                </h3>
                <p className="mb-8 max-w-md text-sm font-light leading-7 text-gray-500">
                  Procedural relighting with sources, intensity, falloff, and
                  color. Fix the day you did not get.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { k: "Sources", v: "2" },
                    { k: "Falloff", v: "Soft" },
                    { k: "Color", v: "Warm" },
                  ].map((x) => (
                    <div
                      key={x.k}
                      className="border border-white/10 bg-black/30 p-4"
                    >
                      <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/30">
                        {x.k}
                      </div>
                      <div className="mt-1 text-sm font-light text-white/70">
                        {x.v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="group relative min-h-[460px] overflow-hidden border border-white/10 bg-[#080808] transition-colors hover:bg-[#0a0a0a]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-purple-900/16 via-transparent to-transparent" />
              <div className="absolute right-0 top-0 p-8 opacity-25 transition-opacity duration-700 group-hover:opacity-100">
                <Palette
                  size={34}
                  strokeWidth={1}
                  className="text-purple-400"
                />
              </div>
              <div className="flex h-full flex-col justify-end p-12">
                <h3 className="mb-4 text-4xl font-light text-white">
                  Palette Heist
                </h3>
                <p className="mb-8 max-w-md text-sm font-light leading-7 text-gray-500">
                  Steal the grade from a reference frame. Map its color DNA onto
                  your image.
                </p>
                <div className="flex gap-4 opacity-60 transition-opacity group-hover:opacity-100">
                  <div className="h-2 w-16 bg-[#2c1a1a]" />
                  <div className="h-2 w-16 bg-[#8c3a3a]" />
                  <div className="h-2 w-16 bg-[#d69e4f]" />
                  <div className="h-2 w-16 bg-[#1a2b3c]" />
                </div>
              </div>
            </div>

            <div className="group relative min-h-[380px] overflow-hidden border border-white/10 bg-[#080808] transition-colors hover:bg-[#0a0a0a] md:col-span-2">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/14 via-transparent to-transparent" />
              <div className="flex h-full flex-col items-center justify-center p-12 text-center">
                <Scan
                  size={52}
                  strokeWidth={1}
                  className="mb-8 text-gray-700 transition-colors duration-500 group-hover:text-blue-400"
                />
                <h3 className="mb-4 text-4xl font-light text-white">
                  Analyzer Stack
                </h3>
                <p className="mb-10 max-w-2xl text-sm font-light leading-7 text-gray-500">
                  Histogram, luma mapping, and exposure cues so you grade with
                  information, not vibes.
                </p>
                <div className="h-2 w-full max-w-2xl rounded-full bg-gradient-to-r from-purple-900 via-teal-900 to-red-900 opacity-40 group-hover:opacity-100" />
              </div>
            </div>
          </div>
        </BigSection>

        {/* TYPOGRAPHY */}
        <BigSection
          id="type"
          eyebrow="Cinematic Typography"
          title="Titles that feel like movies."
          subtitle="Google Fonts, film title presets, and precise type control. For posters, stills, and story frames."
        >
          <div className="grid grid-cols-1 gap-px border border-white/5 bg-white/5 md:grid-cols-3">
            <FeatureCard
              icon={Type}
              title="Real-Time Google Fonts"
              tag="1000+"
              desc="Pick from a huge library without leaving the editor."
            />
            <FeatureCard
              icon={Film}
              title="Film Title Presets"
              tag="One Click"
              desc="Blade Runner, Dune, Interstellar energy without copying anyone."
            />
            <FeatureCard
              icon={SlidersHorizontal}
              title="Advanced Type Control"
              tag="Pro"
              desc="Tracking, small caps, case transforms, variable weights, italics."
            />
          </div>
        </BigSection>

        {/* TRUST / LOCAL */}
        <BigSection
          id="trust"
          eyebrow="Privacy & Trust"
          title="Local-first, on purpose."
          subtitle="Your images do not need to leave your machine for you to make them beautiful. Built for artists who care about control."
          tone="darker"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className="md:col-span-6 border border-white/10 bg-black/30 p-10">
              <div className="mb-6 flex items-center gap-3">
                <Shield
                  size={22}
                  strokeWidth={1}
                  className="text-amber-500/80"
                />
                <div className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/45">
                  Local Processing
                </div>
              </div>

              <MetricRow left="Uploads" right="None by default" />
              <MetricRow left="Edits" right="Non-destructive, reversible" />
              <MetricRow left="Storage" right="Your machine, your rules" />
              <MetricRow left="Exports" right="Full-res with retention" />

              <div className="mt-10 flex flex-col gap-4 md:flex-row">
                <Link
                  href="/editor"
                  className="group relative inline-flex items-center justify-center gap-2 border border-amber-600/30 px-10 py-4 text-[10px] font-mono uppercase tracking-[0.3em] text-amber-50 transition-all hover:border-amber-500"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Open Studio
                    <Wand2 size={14} />
                  </span>
                  <div className="absolute inset-0 w-0 bg-amber-900/30 opacity-30 transition-all duration-300 group-hover:w-full" />
                </Link>

                <Link
                  href="/presets"
                  className="inline-flex items-center justify-center gap-2 border border-white/10 bg-black/30 px-10 py-4 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60 transition-colors hover:border-white/25 hover:text-white"
                >
                  <Film size={14} />
                  Explore Presets
                </Link>
              </div>
            </div>

            <div className="md:col-span-6 border border-white/10 bg-black/30 p-10">
              <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.45em] text-white/45">
                FAQ
              </div>
              <div className="space-y-3">
                <FAQItem
                  q="Is it really non-destructive?"
                  a="Yes. Adjustments are applied as reversible operations. Your original stays intact until export."
                />
                <FAQItem
                  q="Can I use LUTs?"
                  a="Yes. Import .CUBE LUTs, apply them as a base, then refine with wheels, curves, and HSL."
                />
                <FAQItem
                  q="Will it keep my resolution?"
                  a="Yes. Processing is designed to retain full resolution, and export keeps detail and texture."
                />
              </div>
            </div>
          </div>
        </BigSection>

        {/* FINAL CTA */}
        <section id="final" className="border-t border-white/5 bg-[#020202]">
          <div className="mx-auto max-w-7xl px-6 py-28 md:py-36 text-center">
            <div className="mx-auto max-w-4xl">
              <div className="mb-7 font-mono text-[10px] uppercase tracking-[0.5em] text-amber-500/60">
                Start a new roll
              </div>
              <h2 className="font-serif text-6xl font-light italic tracking-tight text-white md:text-8xl">
                Develop something you actually want to keep.
              </h2>
              <p className="mx-auto mt-10 max-w-3xl text-lg font-light leading-relaxed text-gray-400 md:text-2xl">
                Nyvarra is built for photographers and color nerds who care
                about the details. If that is you, welcome home.
              </p>

              <div className="mt-12 flex flex-col items-center justify-center gap-5 md:flex-row">
                <Link
                  href="/editor"
                  className="group relative inline-flex items-center gap-2 border border-amber-600/30 px-14 py-6 text-[10px] font-mono uppercase tracking-[0.3em] text-amber-50 transition-all hover:border-amber-500"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Enter Nyvarra Studio
                    <Wand2 size={14} />
                  </span>
                  <div className="absolute inset-0 w-0 bg-amber-900/30 opacity-30 transition-all duration-300 group-hover:w-full" />
                </Link>

                <Link
                  href="/changelog"
                  className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-gray-400 transition-colors hover:text-white"
                >
                  <Scan size={14} />
                  Read the Changelog
                </Link>
              </div>
            </div>

            <div className="mt-20 border-t border-white/10 pt-16">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.5em] text-amber-900/60">
                Made with ❤️ for photographers
              </p>
              <p className="mb-6 font-mono text-[9px] uppercase tracking-[0.45em] text-white/20">
                Made as a gift. Kept as a craft.
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
