"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

declare global {
  interface Window {
    __brushMaskClear?: () => void;
  }
}

interface BrushMaskCanvasProps {
  width: number;
  height: number;
  brushSize: number;
  brushFeather: number;
  isErasing: boolean;
  isActive: boolean;
  onMaskUpdate: (maskDataUrl: string) => void;
  onClear: () => void;
}

export default function BrushMaskCanvas({
  width,
  height,
  brushSize,
  brushFeather,
  isErasing,
  isActive,
  onMaskUpdate,
  onClear,
}: BrushMaskCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    onMaskUpdate("");
    onClear();
  }, [width, height, onMaskUpdate, onClear]);

  // Expose clear function via window for parent to call
  useEffect(() => {
    window.__brushMaskClear = clearCanvas;
    return () => {
      delete window.__brushMaskClear;
    };
  }, [clearCanvas]);

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [width, height]
  );

  const drawBrush = useCallback(
    (x: number, y: number, prevX?: number, prevY?: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const actualSize = brushSize * Math.min(width, height) * 0.1;

      if (isErasing) {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
      }

      // Create radial gradient for feathered brush
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, actualSize);
      const featherStart = 1 - brushFeather;
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(featherStart, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, actualSize, 0, Math.PI * 2);
      ctx.fill();

      // Draw line between points for smooth strokes
      if (prevX !== undefined && prevY !== undefined) {
        const dist = Math.sqrt(Math.pow(x - prevX, 2) + Math.pow(y - prevY, 2));
        const steps = Math.ceil(dist / (actualSize * 0.3));
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const ix = prevX + (x - prevX) * t;
          const iy = prevY + (y - prevY) * t;
          const stepGradient = ctx.createRadialGradient(
            ix,
            iy,
            0,
            ix,
            iy,
            actualSize
          );
          stepGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
          stepGradient.addColorStop(featherStart, "rgba(255, 255, 255, 1)");
          stepGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = stepGradient;
          ctx.beginPath();
          ctx.arc(ix, iy, actualSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Update mask texture
      const dataUrl = canvas.toDataURL("image/png");
      onMaskUpdate(dataUrl);
    },
    [brushSize, brushFeather, isErasing, width, height, onMaskUpdate]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isActive) return;
      const pos = getCanvasCoords(e);
      if (!pos) return;
      setIsDrawing(true);
      setLastPos(pos);
      drawBrush(pos.x, pos.y);
    },
    [isActive, getCanvasCoords, drawBrush]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isActive || !isDrawing) return;
      const pos = getCanvasCoords(e);
      if (!pos) return;
      drawBrush(pos.x, pos.y, lastPos?.x, lastPos?.y);
      setLastPos(pos);
    },
    [isActive, isDrawing, getCanvasCoords, drawBrush, lastPos]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setLastPos(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
    setLastPos(null);
  }, []);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 z-20"
      style={{
        cursor: isErasing
          ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ff6b6b' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3Cline x1='8' y1='12' x2='16' y2='12'/%3E%3C/svg%3E\") 12 12, crosshair"
          : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2322d3ee' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3Cline x1='12' y1='8' x2='12' y2='16'/%3E%3Cline x1='8' y1='12' x2='16' y2='12'/%3E%3C/svg%3E\") 12 12, crosshair",
        pointerEvents: isActive ? "auto" : "none",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
}
