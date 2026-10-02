"use client";

import React, { useMemo, useRef, useState } from "react";
import { sampleMonotoneCurve, type CurveControlPoint } from "../utils/spline";

interface CurveCanvasProps {
  points: CurveControlPoint[];
  onChange: (points: CurveControlPoint[]) => void;
  color: string;
  /** Optional 256-bin histogram drawn behind the curve. */
  histogram?: number[];
  histogramColor?: string;
}

const SIZE = 256;
const HIT_RADIUS = 12;
const REMOVE_DISTANCE = 28;
const MIN_GAP = 0.01;

/**
 * Point curve editor. Click to add a point and keep dragging; drag an inner
 * point off the graph to remove it; double-click a point to remove/reset it;
 * hold Alt for fine moves.
 */
export function CurveCanvas({ points, onChange, color, histogram, histogramColor = "rgba(255,255,255,0.07)" }: CurveCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ index: number; startClient: { x: number; y: number }; startPoint: CurveControlPoint } | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [removing, setRemoving] = useState(false);

  const curvePath = useMemo(() => {
    const samples = sampleMonotoneCurve(points, 129);
    return Array.from(samples, (value, index) => `${index === 0 ? "M" : "L"}${(index / 128) * SIZE},${(1 - Math.min(1, Math.max(0, value))) * SIZE}`).join(" ");
  }, [points]);

  const histogramPath = useMemo(() => {
    if (!histogram || histogram.length === 0) return null;
    const bins = histogram.length;
    let peak = 0;
    for (let i = 1; i < bins - 1; i++) peak = Math.max(peak, histogram[i]);
    if (peak <= 0) return null;
    const step = SIZE / (bins - 1);
    let path = `M0,${SIZE}`;
    for (let i = 0; i < bins; i++) path += ` L${i * step},${SIZE - Math.min(1, Math.sqrt(histogram[i] / peak)) * SIZE * 0.9}`;
    return `${path} L${SIZE},${SIZE} Z`;
  }, [histogram]);

  const toUnit = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, outside: 0 };
    const x = (clientX - rect.left) / rect.width;
    const y = 1 - (clientY - rect.top) / rect.height;
    const outsideX = Math.max(0, rect.left - clientX, clientX - rect.right);
    const outsideY = Math.max(0, rect.top - clientY, clientY - rect.bottom);
    return { x, y, outside: Math.max(outsideX, outsideY) };
  };

  const hitTest = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return -1;
    let best = -1;
    let bestDistance = HIT_RADIUS;
    points.forEach((point, index) => {
      const distance = Math.hypot(rect.left + point.x * rect.width - clientX, rect.top + (1 - point.y) * rect.height - clientY);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best;
  };

  const clampPoint = (index: number, x: number, y: number, list: CurveControlPoint[]) => {
    const clampedY = Math.min(1, Math.max(0, y));
    if (index === 0) return { x: Math.min(Math.max(0, x), list[1] ? list[1].x - MIN_GAP : 1), y: clampedY };
    if (index === list.length - 1) return { x: Math.max(Math.min(1, x), list[index - 1].x + MIN_GAP), y: clampedY };
    return { x: Math.min(list[index + 1].x - MIN_GAP, Math.max(list[index - 1].x + MIN_GAP, x)), y: clampedY };
  };

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || event.detail > 1) return;
    let index = hitTest(event.clientX, event.clientY);
    let list = points;
    if (index === -1) {
      const unit = toUnit(event.clientX, event.clientY);
      const point = { x: Math.min(1 - MIN_GAP, Math.max(MIN_GAP, unit.x)), y: Math.min(1, Math.max(0, unit.y)) };
      list = [...points, point].sort((a, b) => a.x - b.x);
      index = list.indexOf(point);
      onChange(list);
    }
    dragRef.current = { index, startClient: { x: event.clientX, y: event.clientY }, startPoint: list[index] };
    setActive(index);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const unit = toUnit(event.clientX, event.clientY);
    setHover(unit.outside === 0 ? { x: unit.x, y: unit.y } : null);
    const drag = dragRef.current;
    if (!drag) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = event.altKey ? 0.2 : 1;
    const x = drag.startPoint.x + ((event.clientX - drag.startClient.x) / rect.width) * factor;
    const y = drag.startPoint.y - ((event.clientY - drag.startClient.y) / rect.height) * factor;
    const interior = drag.index > 0 && drag.index < points.length - 1;
    setRemoving(interior && unit.outside > REMOVE_DISTANCE);
    const next = [...points];
    next[drag.index] = clampPoint(drag.index, x, y, points);
    onChange(next);
  };

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setActive(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag && removing) onChange(points.filter((_, index) => index !== drag.index));
    setRemoving(false);
  };

  const onDoubleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const index = hitTest(event.clientX, event.clientY);
    if (index === -1) return;
    if (index > 0 && index < points.length - 1) onChange(points.filter((_, i) => i !== index));
    else {
      const next = [...points];
      next[index] = index === 0 ? { x: 0, y: 0 } : { x: 1, y: 1 };
      onChange(next);
    }
  };

  const readout = active !== null && points[active]
    ? { x: points[active].x, y: points[active].y }
    : hover
      ? { x: hover.x, y: sampleMonotoneCurve(points, 257)[Math.round(Math.min(1, Math.max(0, hover.x)) * 256)] }
      : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="block aspect-square w-full cursor-crosshair touch-none select-none rounded-[8px] bg-black/25 ring-1 ring-inset ring-[var(--ui-line)]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onDoubleClick={onDoubleClick}
      >
        {histogramPath && <path d={histogramPath} fill={histogramColor} />}
        {[0.25, 0.5, 0.75].map((t) => (
          <g key={t} stroke="rgba(255,255,255,0.06)" strokeWidth={1} vectorEffect="non-scaling-stroke">
            <line x1={t * SIZE} y1={0} x2={t * SIZE} y2={SIZE} vectorEffect="non-scaling-stroke" />
            <line x1={0} y1={t * SIZE} x2={SIZE} y2={t * SIZE} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
        <line x1={0} y1={SIZE} x2={SIZE} y2={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={curvePath} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map((point, index) => {
          const isActive = index === active;
          return (
            <circle
              key={index}
              cx={point.x * SIZE}
              cy={(1 - point.y) * SIZE}
              r={isActive ? 5.5 : 4.5}
              fill={isActive ? color : "#18181a"}
              stroke={color}
              strokeWidth={1.75}
              opacity={isActive && removing ? 0.25 : 1}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="pointer-events-none mt-1.5 flex h-4 items-center justify-between text-[11px] text-[var(--ui-text-3)]">
        <span>{removing ? "Release to remove point" : "Click to add · drag off to remove"}</span>
        {readout && (
          <span className="ui-num text-[var(--ui-text-2)]">
            {Math.round(readout.x * 255)} → {Math.round(Math.min(1, Math.max(0, readout.y)) * 255)}
          </span>
        )}
      </div>
    </div>
  );
}
