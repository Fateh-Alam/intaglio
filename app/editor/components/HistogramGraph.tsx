
import React, { useEffect, useRef } from "react";
import type { HistogramData } from "../../types/editor";

export const getColorCastLabel = (data: HistogramData) => {
  const [r, g, b] = data.meanRgb;
  const warmCool = r - b;
  const greenMagenta = g - (r + b) / 2;

  if (Math.abs(warmCool) < 8 && Math.abs(greenMagenta) < 8) return "Neutral";
  if (warmCool > 12) return "Warm";
  if (warmCool < -12) return "Cool";
  if (greenMagenta > 10) return "Green";
  if (greenMagenta < -10) return "Magenta";
  return "Subtle";
};

export const ScopeMetric = ({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn";
}) => {
  const toneClass =
    tone === "warn"
      ? "text-red-300"
      : tone === "ok"
        ? "text-emerald-300"
        : "text-white/55";

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-2 py-2">
      <div className="font-mono text-[8px] uppercase tracking-[0.26em] text-white/25">
        {label}
      </div>
      <div className={`mt-1 font-mono text-[10px] ${toneClass}`}>{value}</div>
    </div>
  );
};

export const HistogramGraph = ({
  data,
}: {
  data: HistogramData | null;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const [rData, gData, bData] = data.rgb;
    
    // Find max value ignoring the extreme absolute black (0) and white (255) to prevent squashing
    const max = Math.max(
      ...rData.slice(1, 254),
      ...gData.slice(1, 254),
      ...bData.slice(1, 254)
    ) * 1.1; // Add 10% headroom

    // Additive blending creates CMY and White where channels overlap, exactly like Lightroom
    ctx.globalCompositeOperation = "lighter";

    const drawChannel = (channelData: number[], color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * w;
        // Linear scaling with capped max
        const normalized = Math.min(channelData[i] / max, 1.0);
        const y = h - normalized * h;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.fill();
    };

    // Lightroom colors
    drawChannel(rData, "rgba(255, 0, 0, 0.8)");
    drawChannel(gData, "rgba(0, 255, 0, 0.8)");
    drawChannel(bData, "rgba(0, 0, 255, 0.8)");
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={100}
      className="w-full h-[120px]"
    />
  );
};

export const RgbParadeGraph = ({
  data,
}: {
  data: HistogramData | null;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const [rData, gData, bData] = data.rgb;
    
    const max = Math.max(
      ...rData.slice(1, 254),
      ...gData.slice(1, 254),
      ...bData.slice(1, 254)
    ) * 1.1;

    const drawParadeChannel = (channelData: number[], color: string, offsetX: number, width: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(offsetX, h);
      for (let i = 0; i < 256; i++) {
        const x = offsetX + (i / 255) * width;
        const normalized = Math.min(channelData[i] / max, 1.0);
        const y = h - normalized * h;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(offsetX + width, h);
      ctx.fill();
    };

    const thirdW = w / 3;
    // Parade doesn't overlap, so we can use solid colors or lighter ones.
    drawParadeChannel(rData, "rgba(255, 80, 80, 0.9)", 0, thirdW);
    drawParadeChannel(gData, "rgba(80, 255, 80, 0.9)", thirdW, thirdW);
    drawParadeChannel(bData, "rgba(80, 120, 255, 0.9)", thirdW * 2, thirdW);
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={100}
      className="w-full h-[80px]"
    />
  );
};
