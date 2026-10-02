"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { sampleMonotoneCurve } from "../utils/spline";

interface Point {
  x: number;
  y: number;
}

interface CurveEditorProps {
  points: Point[];
  onChange: (points: Point[]) => void;
  color?: string; // Hex color for the line
}

export default function CurveEditor({
  points,
  onChange,
  color = "#ffffff",
}: CurveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Generate lookup table for visualization
  const lut = useMemo(() => sampleMonotoneCurve(points), [points]);

  const transformToCanvas = (p: Point, w: number, h: number) => ({
    x: p.x * w,
    y: (1 - p.y) * h,
  });

  const transformFromCanvas = (x: number, y: number, w: number, h: number) => ({
    x: Math.max(0, Math.min(1, x / w)),
    y: Math.max(0, Math.min(1, 1 - y / h)),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Vertical lines (0, 0.25, 0.5, 0.75, 1)
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * w;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    // Horizontal lines
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * h;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Draw Histogram? (Maybe later pass as prop)

    // Draw Curve
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Use LUT for rendering curve to match spline exactly
    for (let i = 0; i < lut.length; i++) {
      const x = (i / (lut.length - 1)) * w;
      const y = (1 - lut[i]) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Points
    points.forEach((p, i) => {
      const pos = transformToCanvas(p, w, h);
      const isHover = i === hoverIndex;
      const isDragging = i === draggingIndex;

      ctx.fillStyle = "#000";
      ctx.strokeStyle = isHover || isDragging ? color : "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isHover || isDragging ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }, [points, lut, color, hoverIndex, draggingIndex]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check hit test
    // We scale touches to canvas size (assumed distinct from CSS size but here mapped 1:1 via width/height attribs)
    // Actually we should handle high DPI. For simplicity now assume 1:1 or use width/height.
    // NOTE: Canvas internal resolution should match logical resolution or multiplied by dpr.
    // Here we use logical w/h passed from parent? Or just set fixed.

    // Basic hit test
    const w = canvas.width;
    const h = canvas.height;

    let hitIndex = -1;
    let minDist = 10; // Hit radius

    points.forEach((p, i) => {
      const pos = transformToCanvas(p, w, h);
      const dist = Math.hypot(pos.x - x, pos.y - y);
      if (dist < minDist) {
        minDist = dist;
        hitIndex = i;
      }
    });

    if (hitIndex !== -1) {
      setDraggingIndex(hitIndex);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      // Add new point on the curve
      // Or just map to nearest position?
      // Simple logic: Add point at click position if far from existing
      const p = transformFromCanvas(x, y, w, h);
      // Add and sort
      const newPoints = [...points, p].sort((a, b) => a.x - b.x);
      onChange(newPoints);
      // Find index of new point to start dragging?
      // For simplicity, just add.
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = canvas.width;
    const h = canvas.height;

    if (draggingIndex !== null) {
      // Drag logic
      const p = transformFromCanvas(x, y, w, h);

      // Constraints
      const newPoints = [...points];
      if (draggingIndex === 0) {
        // First point: locked x=0
        newPoints[draggingIndex] = { x: 0, y: p.y };
      } else if (draggingIndex === points.length - 1) {
        // Last point: locked x=1
        newPoints[draggingIndex] = { x: 1, y: p.y };
      } else {
        // Middle points: constrain x between neighbors
        const prev = points[draggingIndex - 1];
        const next = points[draggingIndex + 1];
        const clampedX = Math.max(prev.x + 0.01, Math.min(next.x - 0.01, p.x));
        newPoints[draggingIndex] = { x: clampedX, y: p.y };
      }

      onChange(newPoints);
    } else {
      // Hover logic
      let hitIndex = -1;
      let minDist = 10;
      points.forEach((p, i) => {
        const pos = transformToCanvas(p, w, h);
        const dist = Math.hypot(pos.x - x, pos.y - y);
        if (dist < minDist) {
          minDist = dist;
          hitIndex = i;
        }
      });
      setHoverIndex(hitIndex);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingIndex(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleDoubleClick = () => {
    // Remove point
    if (hoverIndex !== null) {
      // Don't remove first or last
      if (hoverIndex > 0 && hoverIndex < points.length - 1) {
        const newPoints = points.filter((_, i) => i !== hoverIndex);
        onChange(newPoints);
        setHoverIndex(null);
      } else {
        // Reset endpoint to default?
        // e.g. (0,0) or (1,1)
        const newPoints = [...points];
        if (hoverIndex === 0) newPoints[0] = { x: 0, y: 0 };
        if (hoverIndex === points.length - 1)
          newPoints[points.length - 1] = { x: 1, y: 1 };
        onChange(newPoints);
      }
    }
  };

  return (
    <div
      className="relative w-full aspect-square bg-[#151515] rounded-lg border border-white/10 overflow-hidden"
      ref={containerRef}
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="w-full h-full cursor-crosshair touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
}
