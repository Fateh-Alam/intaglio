"use client";

import React, { useRef, useEffect, useState } from "react";

interface ColorGradingValue {
  h: number; // 0-1
  s: number; // 0-1
  l: number; // -1 to 1
}

interface ColorWheelProps {
  value: ColorGradingValue;
  onChange: (val: ColorGradingValue) => void;
  label: string;
}

export default function ColorWheel({
  value,
  onChange,
  label,
}: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isDraggingWheel, setIsDraggingWheel] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // Draw Wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 2; // Padding

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Draw Wheel Gradient
    // We can use createRadialGradient or per-pixel.
    // Per-pixel is expensive for JS? Can do small resolution or use image.
    // For small 100x100, per pixel is okay-ish only once.
    // Or simpler: Draw conical gradient for hue, and radial for sat.
    // Canvas doesn't support conical gradient easily in older browsers but modern ones do. `createConicGradient`.

    // Conic gradient for Hue
    try {
      const gradient = ctx.createConicGradient(0, center, center);
      gradient.addColorStop(0, "red");
      gradient.addColorStop(1 / 6, "yellow");
      gradient.addColorStop(2 / 6, "lime");
      gradient.addColorStop(3 / 6, "cyan");
      gradient.addColorStop(4 / 6, "blue");
      gradient.addColorStop(5 / 6, "magenta");
      gradient.addColorStop(1, "red");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fill();

      // Radial gradient for Saturation (White center to Transparent edge?)
      // Standard shading: Center is white (desaturated), edge is pure color.
      const radial = ctx.createRadialGradient(
        center,
        center,
        0,
        center,
        center,
        radius
      );
      radial.addColorStop(0, "white");
      radial.addColorStop(1, "rgba(255,255,255,0)"); // Transparent

      // Wait, standard tint wheel: Center is neutral (0 saturation), Edge is max saturation.
      // Usually Center is Gray/White/Black depending on blending mode.
      // For Tinting, Center is Neutral (no tint).
      // Let's assume Additive/Overlay.
      // Visual: Center white/gray -> Color at edge.
      // Actually best visual: Conic Gradient + Radial Gradient (center gray to transparent).

      ctx.fillStyle = radial;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();
    } catch {
      // Fallback or just simple circle
      ctx.fillStyle = "#333";
      ctx.fill();
    }

    // Draw Handle
    const handleAngle = value.h * Math.PI * 2;
    const handleDist = value.s * radius;
    const hx = center + Math.cos(handleAngle) * handleDist;
    const hy = center + Math.sin(handleAngle) * handleDist;

    ctx.beginPath();
    ctx.arc(hx, hy, 4, 0, Math.PI * 2);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.fillStyle = `hsl(${value.h * 360}, 100%, 50%)`;
    ctx.fill();
    ctx.stroke();
  }, [value.h, value.s]);

  // Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Determine if wheel or slider (slider is separate HTML element usually)
    // Here we handle only wheel.
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const size = canvas.width;
    const center = size / 2;
    const dx = x - center;
    const dy = y - center; // Standard cartesian
    const dist = Math.hypot(dx, dy);

    if (dist <= center) {
      setIsDraggingWheel(true);
      updateWheel(x, y);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingWheel) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      updateWheel(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDraggingWheel(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const updateWheel = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 2;

    const dx = x - center;
    const dy = y - center;
    const dist = Math.hypot(dx, dy);

    let angle = Math.atan2(dy, dx); // -PI to PI
    if (angle < 0) angle += Math.PI * 2; // 0 to 2PI

    const sat = Math.min(1, dist / radius);

    onChange({
      ...value,
      h: angle / (Math.PI * 2),
      s: sat,
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
        {label}
      </div>
      <div className="flex gap-3 items-center">
        {/* Wheel */}
        <div className="relative w-24 h-24 rounded-full bg-black/20 border border-white/5 shadow-inner">
          <canvas
            ref={canvasRef}
            width={96}
            height={96}
            className="w-full h-full rounded-full cursor-crosshair touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        {/* Luminance Slider */}
        <div className="h-24 w-12 flex flex-col items-center justify-center relative">
          {/* Track */}
          <div className="absolute top-0 bottom-0 w-1 bg-white/10 rounded-full" />
          {/* Thumb */}
          <div
            className="absolute w-8 h-4 bg-white/10 border border-white/20 hover:bg-white/20 rounded cursor-ns-resize backdrop-blur-sm flex items-center justify-center"
            style={{
              top: `${50 - value.l * 50}%`,
              transform: "translateY(-50%)",
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setIsDraggingSlider(true);
            }}
            onPointerMove={(e) => {
              if (isDraggingSlider) {
                const rect = (
                  e.currentTarget.parentElement as HTMLElement
                ).getBoundingClientRect();
                const y = e.clientY - rect.top;
                const pct = Math.max(0, Math.min(1, y / rect.height));
                // Map 0..1 (top..bottom) to 1..-1
                // pct 0 -> 1 (High Lum)
                // pct 1 -> -1 (Low Lum)
                const l = 1 - pct * 2;
                onChange({ ...value, l });
              }
            }}
            onPointerUp={(e) => {
              setIsDraggingSlider(false);
              e.currentTarget.releasePointerCapture(e.pointerId);
            }}
          >
            <div className="w-4 h-0.5 bg-white/50 rounded-full" />
          </div>

          {/* Center marker */}
          <div className="absolute top-1/2 w-2 h-0.5 bg-white/20 -translate-x-1" />
        </div>
      </div>
    </div>
  );
}
