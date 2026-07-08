"use client";

import React, { useEffect, useState } from "react";
import {
  IconX,
  IconInfoCircle,
  IconBulb,
  IconChevronRight,
} from "@tabler/icons-react";

export interface TutorialContent {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tips: string[];
  plainEnglish?: string;
  icon: React.ReactNode;
  accentColor: string;
}

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: TutorialContent;
}

export default function TutorialModal({
  isOpen,
  onClose,
  content,
}: TutorialModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    let mountTimer: number | undefined;
    let contentTimer: number | undefined;
    let hideTimer: number | undefined;
    let unmountTimer: number | undefined;

    if (isOpen) {
      mountTimer = window.setTimeout(() => setIsAnimating(true), 0);
      contentTimer = window.setTimeout(() => setShowContent(true), 100);
    } else {
      hideTimer = window.setTimeout(() => setShowContent(false), 0);
      unmountTimer = window.setTimeout(() => setIsAnimating(false), 300);
    }

    return () => {
      window.clearTimeout(mountTimer);
      window.clearTimeout(contentTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(unmountTimer);
    };
  }, [isOpen]);

  if (!isAnimating && !isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-500 ease-out ${
        showContent ? "opacity-100 backdrop-blur-sm" : "opacity-0"
      }`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal - Glassmorphic Redesign */}
      <div
        className={`relative w-full max-w-lg max-h-[85vh] overflow-hidden bg-[#0d0c0a]/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] transform transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          showContent
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-12 scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle top glow */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--intaglio-brass)]/30 to-transparent" />

        <div className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="relative p-8 pb-6 flex items-start justify-between">
            <div className="flex gap-5">
              {/* Icon Container */}
              <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full border border-white/10 bg-white/5 text-[var(--intaglio-brass)] shadow-inner">
                {content.icon}
              </div>
              
              <div>
                <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[var(--intaglio-brass)]/70 mb-1">
                  {content.subtitle}
                </p>
                <h2 className="text-2xl font-serif tracking-wide text-white mb-2">
                  {content.title}
                </h2>
                <p className="text-[13px] text-gray-400 leading-relaxed max-w-md">
                  {content.description}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full border border-transparent hover:bg-white/10 transition-all duration-300 text-gray-500 hover:text-white"
            >
              <IconX size={18} />
            </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 pb-8">
            {/* Feature-Specific Animation container */}
            <div className="relative mx-8 my-4 h-48 rounded-lg border border-white/5 bg-black/40 overflow-hidden shadow-inner">
              <OrganicDemo featureId={content.id} color={content.accentColor} />
            </div>

            {/* Tips Section */}
            <div className="px-8 mt-8">
              <div className="flex items-center gap-2 mb-4">
                <IconBulb size={14} className="text-[var(--intaglio-brass)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                  Quick Tips
                </span>
              </div>
              <ul className="space-y-3">
                {content.tips.map((tip, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-[13px] text-gray-300 transition-all duration-500"
                    style={{
                      opacity: showContent ? 1 : 0,
                      transform: showContent
                        ? "translateX(0)"
                        : "translateX(-20px)",
                      transitionDelay: `${300 + index * 150}ms`,
                    }}
                  >
                    <IconChevronRight
                      size={14}
                      className="mt-0.5 shrink-0 text-[var(--intaglio-brass)]"
                    />
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>

              {/* Plain English Section */}
              {content.plainEnglish && (
                <div className="mt-8 p-5 rounded-lg bg-white/[0.02] border border-white/5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--intaglio-brass)]/50" />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--intaglio-brass)]">
                      In Plain English
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-400 leading-relaxed italic font-serif">
                    "{content.plainEnglish}"
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-8 pb-8 pt-4">
            <div
              role="button"
              tabIndex={0}
              onClick={onClose}
              className="w-full py-4 text-center border border-[var(--intaglio-line)] bg-[#161410] text-[var(--intaglio-paper)] font-mono text-[10px] uppercase tracking-widest transition-colors hover:bg-[var(--intaglio-brass)] hover:text-[#0d0c0a] cursor-pointer"
            >
              Acknowledge
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes breathe {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.35;
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  );
}

// Organic, alive animated demos with smooth easing
function OrganicDemo({
  featureId,
  color,
}: {
  featureId: string;
  color: string;
}) {
  const [time, setTime] = useState(0);

  useEffect(() => {
    let animationId: number;
    const animate = () => {
      setTime((t) => t + 0.016); // ~60fps increment
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Smooth easing functions for organic feel
  const wave = (t: number, speed = 1, offset = 0) =>
    Math.sin((t * speed + offset) * Math.PI * 2) * 0.5 + 0.5;
  const breathe = (t: number, speed = 0.5) =>
    (Math.sin(t * speed * Math.PI * 2) + 1) / 2;

  // BASIC - Gentle exposure breathing
  if (featureId === "basic") {
    const brightness = 0.4 + breathe(time, 0.3) * 0.35;
    const sliderPos = brightness * 100;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6">
        {/* Mini preview with smooth brightness shift */}
        <div
          className="w-32 h-20 rounded-lg relative overflow-hidden transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, 
              hsl(35, 30%, ${15 + brightness * 40}%) 0%, 
              hsl(220, 20%, ${10 + brightness * 25}%) 100%)`,
            boxShadow: `0 0 ${30 * brightness}px ${color}20`,
          }}
        >
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        {/* Organic slider */}
        <div className="w-3/4 relative">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-150 ease-out"
              style={{ width: `${sliderPos}%`, backgroundColor: color }}
            />
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg transition-all duration-150 ease-out"
            style={{
              left: `calc(${sliderPos}% - 8px)`,
              boxShadow: `0 0 15px ${color}60`,
            }}
          />
        </div>
        <p className="text-[10px] text-gray-500 font-mono">
          Exposure {(brightness - 0.5).toFixed(2)}
        </p>
      </div>
    );
  }

  // HISTOGRAM - Animated channel bars
  if (featureId === "histogram") {
    const rChannel = [30, 50, 70, 85, 60, 40, 25];
    const gChannel = [25, 45, 65, 80, 55, 35, 20];
    const bChannel = [20, 40, 60, 75, 50, 30, 15];

    return (
      <div className="absolute inset-0 flex items-end justify-center gap-1 p-6 pb-8">
        {rChannel.map((base, i) => {
          const rHeight = base + Math.sin(time * 1.5 + i * 0.5) * 15;
          const gHeight =
            gChannel[i] + Math.sin(time * 1.5 + i * 0.5 + 0.3) * 15;
          const bHeight =
            bChannel[i] + Math.sin(time * 1.5 + i * 0.5 + 0.6) * 15;

          return (
            <div key={i} className="flex gap-0.5 items-end">
              <div
                className="w-2 rounded-t transition-all duration-300"
                style={{
                  height: `${rHeight}%`,
                  backgroundColor: "#ef4444",
                  opacity: 0.7,
                }}
              />
              <div
                className="w-2 rounded-t transition-all duration-300"
                style={{
                  height: `${gHeight}%`,
                  backgroundColor: "#22c55e",
                  opacity: 0.7,
                }}
              />
              <div
                className="w-2 rounded-t transition-all duration-300"
                style={{
                  height: `${bHeight}%`,
                  backgroundColor: "#3b82f6",
                  opacity: 0.7,
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // COLOR - Organic temperature flow
  if (featureId === "color") {
    const temp = wave(time, 0.2) * 100 - 50;
    const hue = 200 + temp * 0.8;

    return (
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="relative">
          {/* Flowing color orb */}
          <div
            className="w-24 h-24 rounded-full transition-all duration-500 ease-out"
            style={{
              background: `radial-gradient(circle at 30% 30%, 
                hsl(${hue}, 80%, 60%) 0%, 
                hsl(${hue + 30}, 70%, 40%) 50%,
                hsl(${hue + 60}, 60%, 20%) 100%)`,
              boxShadow: `
                0 0 60px hsl(${hue}, 60%, 30%),
                inset 0 0 30px hsla(${hue}, 100%, 80%, 0.3)
              `,
              transform: `scale(${1 + breathe(time, 0.4) * 0.08})`,
            }}
          />
          {/* Floating particles */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: `hsl(${hue + i * 30}, 70%, 60%)`,
                left: `${50 + Math.cos(time * 0.5 + i * 2) * 45}%`,
                top: `${50 + Math.sin(time * 0.7 + i * 2) * 45}%`,
                opacity: 0.6 + breathe(time + i, 0.5) * 0.4,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>
        <div className="ml-6 text-left">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">
            Temperature
          </p>
          <p className="text-xl font-light" style={{ color }}>
            {temp > 0 ? "+" : ""}
            {temp.toFixed(0)}K
          </p>
        </div>
      </div>
    );
  }

  // CURVES - Flowing bezier
  if (featureId === "curves") {
    const y1 = 70 + Math.sin(time * 0.8) * 25;
    const y2 = 30 - Math.sin(time * 0.8 + 0.5) * 25;

    return (
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <svg viewBox="0 0 100 100" className="w-32 h-32">
          {/* Subtle grid */}
          {[25, 50, 75].map((v) => (
            <React.Fragment key={v}>
              <line
                x1={v}
                y1="0"
                x2={v}
                y2="100"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.5"
              />
              <line
                x1="0"
                y1={v}
                x2="100"
                y2={v}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.5"
              />
            </React.Fragment>
          ))}
          <line
            x1="0"
            y1="100"
            x2="100"
            y2="0"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.5"
            strokeDasharray="2"
          />

          {/* Flowing curve */}
          <path
            d={`M 0 100 C 25 ${y1} 75 ${y2} 100 0`}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />

          {/* Control points with glow */}
          <circle
            cx="25"
            cy={y1}
            r="5"
            fill={color}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
          <circle
            cx="75"
            cy={y2}
            r="5"
            fill={color}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />

          {/* Endpoint indicators */}
          <circle cx="0" cy="100" r="3" fill="white" opacity="0.5" />
          <circle cx="100" cy="0" r="3" fill="white" opacity="0.5" />
        </svg>
      </div>
    );
  }

  // GRADING - Rotating color wheels
  if (featureId === "grading") {
    const rotation = time * 20;
    const labels = ["Shadows", "Mids", "Highs"];

    return (
      <div className="absolute inset-0 flex items-center justify-center gap-5 p-4">
        {[0, 1, 2].map((i) => {
          const size = i === 1 ? 56 : 48;
          const dotAngle = rotation + i * 120;
          const dotRadius = size * 0.35;

          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className="relative rounded-full"
                style={{
                  width: size,
                  height: size,
                  background: `conic-gradient(from ${rotation + i * 40}deg, 
                    hsl(0, 65%, 50%), 
                    hsl(60, 65%, 50%), 
                    hsl(120, 65%, 50%), 
                    hsl(180, 65%, 50%), 
                    hsl(240, 65%, 50%), 
                    hsl(300, 65%, 50%), 
                    hsl(360, 65%, 50%))`,
                  opacity: 0.7,
                }}
              >
                {/* Center fade */}
                <div className="absolute inset-2 rounded-full bg-[#0a0a0a]/80" />

                {/* Floating control dot */}
                <div
                  className="absolute w-3 h-3 bg-white rounded-full shadow-lg"
                  style={{
                    left: `calc(50% + ${Math.cos((dotAngle * Math.PI) / 180) * dotRadius}px - 6px)`,
                    top: `calc(50% + ${Math.sin((dotAngle * Math.PI) / 180) * dotRadius}px - 6px)`,
                    boxShadow: "0 0 10px rgba(255,255,255,0.5)",
                  }}
                />
              </div>
              <span className="text-[8px] text-gray-500 uppercase tracking-wider">
                {labels[i]}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // HSL - Wave-like color bars
  if (featureId === "hsl") {
    const colors = [
      "#ef4444",
      "#f97316",
      "#eab308",
      "#22c55e",
      "#06b6d4",
      "#8b5cf6",
      "#ec4899",
    ];

    return (
      <div className="absolute inset-0 flex items-end justify-center gap-3 p-6 pb-10">
        {colors.map((c, i) => {
          const height = 40 + wave(time, 0.3, i * 0.15) * 50;

          return (
            <div
              key={i}
              className="w-5 rounded-t-full transition-all duration-300 ease-out"
              style={{
                backgroundColor: c,
                height: `${height}%`,
                opacity: 0.7 + wave(time, 0.4, i * 0.1) * 0.3,
                boxShadow: `0 0 20px ${c}40`,
              }}
            />
          );
        })}
      </div>
    );
  }

  // FILMS - Scroll carousel
  if (featureId === "films") {
    const offset = (time * 30) % 200;
    const films = [
      { name: "Portra", bg: "#c4a35a" },
      { name: "Velvia", bg: "#3f6b35" },
      { name: "CineStill", bg: "#8b2835" },
      { name: "Ektar", bg: "#2a4a5a" },
      { name: "Pro400H", bg: "#4a5a2a" },
    ];

    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 overflow-hidden">
        <div
          className="flex gap-3"
          style={{ transform: `translateX(${-offset}px)` }}
        >
          {[...films, ...films].map((film, i) => (
            <div
              key={i}
              className="w-20 h-28 rounded-xl flex flex-col items-center justify-center shrink-0 transition-all duration-300"
              style={{
                backgroundColor: `${film.bg}30`,
                border: `1px solid ${film.bg}50`,
                transform: `scale(${0.9 + wave(time, 0.3, i * 0.2) * 0.1})`,
              }}
            >
              <div
                className="w-14 h-10 rounded bg-black/40 mb-2"
                style={{ boxShadow: `inset 0 0 20px ${film.bg}30` }}
              />
              <span className="text-[10px] text-gray-400 font-mono">
                {film.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // EFFECTS - Grain & halation breathing
  if (featureId === "effects") {
    const glowSize = 15 + breathe(time, 0.4) * 15;

    return (
      <div className="absolute inset-0 flex items-center justify-center gap-10 p-6">
        {/* Grain */}
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-xl bg-gray-700 relative overflow-hidden"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${0.5 + breathe(time, 0.2) * 0.3}' numOctaves='4' seed='${Math.floor(time * 3)}'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundBlendMode: "overlay",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
          </div>
          <span className="text-[10px] text-gray-500 mt-2 block">Grain</span>
        </div>

        {/* Halation */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-xl bg-gray-800 relative overflow-hidden flex items-center justify-center">
            <div
              className="w-8 h-8 rounded-full bg-white/90"
              style={{
                boxShadow: `0 0 ${glowSize}px ${glowSize * 0.7}px ${color}`,
                filter: `blur(${1 + breathe(time, 0.5)}px)`,
              }}
            />
          </div>
          <span className="text-[10px] text-gray-500 mt-2 block">Halation</span>
        </div>
      </div>
    );
  }

  // MASKING - Breathing radial mask
  if (featureId === "masking") {
    const maskScale = 0.7 + breathe(time, 0.25) * 0.3;

    return (
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-40 h-28 rounded-xl bg-gradient-to-br from-gray-600 to-gray-800 relative overflow-hidden">
          <div
            className="absolute rounded-full border-2 border-dashed"
            style={{
              width: `${maskScale * 100}%`,
              height: `${maskScale * 140}%`,
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(ellipse, transparent 50%, ${color}30 100%)`,
              borderColor: `${color}60`,
              boxShadow: `0 0 30px ${color}20`,
            }}
          />
        </div>
      </div>
    );
  }

  // TEXT - Smooth typewriter
  if (featureId === "text") {
    const text = "CINEMATIC";
    const progress = (time * 0.8) % 2;
    const chars =
      progress < 1 ? Math.floor(progress * text.length) : text.length;
    const showCursor = progress < 1 || Math.sin(time * 6) > 0;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
        <p className="text-3xl font-extralight tracking-[0.4em] text-white">
          {text.slice(0, chars)}
          {showCursor && <span className="text-amber-400 ml-1">|</span>}
        </p>
        <div
          className="mt-4 px-4 py-1 rounded-full text-[10px] uppercase tracking-widest transition-all duration-500"
          style={{
            backgroundColor: `${color}20`,
            color,
            opacity: chars === text.length ? 1 : 0,
            transform:
              chars === text.length ? "translateY(0)" : "translateY(10px)",
          }}
        >
          Title Overlay
        </div>
      </div>
    );
  }

  // TRANSFORM - Floating rotation
  if (featureId === "transform") {
    const rotation = Math.sin(time * 0.4) * 12;
    const scale = 1 + Math.sin(time * 0.6) * 0.15;

    return (
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-28 h-20 rounded-xl bg-gradient-to-br from-gray-500/50 to-gray-700/50 border border-white/20 relative overflow-hidden"
          style={{
            transform: `rotate(${rotation}deg) scale(${scale})`,
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)",
          }}
        >
          {/* Grid overlay */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="border border-white/10" />
            ))}
          </div>
          {/* Center crosshair */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-px bg-white/40" />
            <div className="absolute w-px h-6 bg-white/40" />
          </div>
        </div>
      </div>
    );
  }

  // HISTORY - Organic timeline
  if (featureId === "history") {
    const activeIdx = Math.floor(time * 0.5) % 5;

    return (
      <div className="absolute inset-0 flex items-center justify-center gap-3 p-4">
        {[...Array(5)].map((_, i) => {
          const isActive = i <= activeIdx;
          const isCurrent = i === activeIdx;

          return (
            <div key={i} className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ease-out"
                style={{
                  backgroundColor: isActive
                    ? `${color}30`
                    : "rgba(255,255,255,0.05)",
                  border: isCurrent
                    ? `2px solid ${color}`
                    : "1px solid rgba(255,255,255,0.1)",
                  transform: isCurrent ? "scale(1.15)" : "scale(1)",
                  boxShadow: isCurrent ? `0 0 20px ${color}40` : "none",
                }}
              >
                <span className="text-[10px] font-mono text-gray-400">
                  {i + 1}
                </span>
              </div>
              {i < 4 && (
                <div
                  className="w-px h-3 mt-1 transition-all duration-300"
                  style={{
                    backgroundColor: isActive ? color : "rgba(255,255,255,0.1)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // SNAPSHOTS - Smooth wiper
  if (featureId === "snapshots") {
    const wiperPos = 25 + wave(time, 0.15) * 50;

    return (
      <div className="absolute inset-0 flex items-center justify-center gap-4 p-4">
        <div className="w-36 h-24 rounded-xl relative overflow-hidden shadow-xl">
          {/* Before */}
          <div className="absolute inset-0 bg-gray-600" />

          {/* After with gradient reveal */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-amber-500/40 to-orange-600/40"
            style={{ clipPath: `inset(0 ${100 - wiperPos}% 0 0)` }}
          />

          {/* Wiper line with glow */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white"
            style={{
              left: `${wiperPos}%`,
              boxShadow: "0 0 10px rgba(255,255,255,0.8)",
            }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-lg" />
          </div>
        </div>

        <div className="text-left">
          <p className="text-[10px] text-gray-500 mb-1">Before</p>
          <p className="text-[10px]" style={{ color }}>
            After
          </p>
        </div>
      </div>
    );
  }

  // FALSE COLOR - Animated exposure heatmap
  if (featureId === "falseColor") {
    const colors = [
      { label: "Under", color: "#3b82f6" }, // Blue
      { label: "OK", color: "#22c55e" }, // Green
      { label: "Hot", color: "#eab308" }, // Yellow
      { label: "Clip", color: "#ef4444" }, // Red
    ];

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
        {/* Animated gradient bar */}
        <div className="w-48 h-8 rounded-lg overflow-hidden relative">
          <div
            className="absolute inset-0 transition-all duration-300"
            style={{
              background: `linear-gradient(90deg, 
                #3b0764 0%, 
                #3b82f6 25%, 
                #22c55e 50%, 
                #eab308 75%, 
                #ef4444 100%)`,
            }}
          />
          {/* Scanning line */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white/80"
            style={{
              left: `${(Math.sin(time * 0.8) * 0.5 + 0.5) * 100}%`,
              boxShadow: "0 0 10px rgba(255,255,255,0.8)",
            }}
          />
        </div>

        {/* Legend */}
        <div className="flex gap-4">
          {colors.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 transition-all duration-300"
              style={{
                opacity: 0.6 + (Math.sin(time * 2 + i) * 0.5 + 0.5) * 0.4,
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-[10px] text-gray-400">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback - gentle pulse
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="w-20 h-20 rounded-full"
        style={{
          backgroundColor: `${color}15`,
          boxShadow: `0 0 ${30 + breathe(time, 0.3) * 20}px ${color}40`,
          transform: `scale(${1 + breathe(time, 0.4) * 0.1})`,
        }}
      />
    </div>
  );
}

// Helper component for manual tutorial trigger
export function TutorialTrigger({ onClick }: { onClick: () => void }) {
  return (
    <div role="button" tabIndex={0}
      onClick={onClick}
      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all duration-300 hover:scale-110 hover:rotate-12"
      title="View tutorial"
    >
      <IconInfoCircle size={14} />
    </div>
  );
}
