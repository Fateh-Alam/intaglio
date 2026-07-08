
import React, { useEffect, useRef } from "react";
import type { HistogramData } from "../../types/editor";

export const getColorCastLabel = (data: HistogramData) => {
  const { r, g, b } = data.average;
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

const StatusChip = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-[96px] border border-white/10 bg-black/35 px-3 py-1.5">
    <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/25">
      {label}
    </div>
    <div className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
      {value}
    </div>
  </div>
);

export const HistogramGraph = ({
  data,
}: {
  data: { r: number[]; g: number[]; b: number[] };
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

    // Find max value to normalize
    const max = Math.max(...data.r, ...data.g, ...data.b);

    ctx.globalCompositeOperation = "screen";

    const drawChannel = (channelData: number[], color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * w;
        const y = h - (channelData[i] / max) * h;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.fill();
    };

    drawChannel(data.r, "rgba(255, 0, 0, 0.5)");
    drawChannel(data.g, "rgba(0, 255, 0, 0.5)");
    drawChannel(data.b, "rgba(0, 0, 255, 0.5)");
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={100}
      className="w-[200px] h-[100px]"
    />
  );
};
