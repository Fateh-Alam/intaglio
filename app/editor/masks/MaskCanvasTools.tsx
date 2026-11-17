"use client";

import React, { useEffect, useRef, useState } from "react";
import type { BrushStroke, LinearMaskParams, MaskLayer, PhotoCrop, RadialMaskParams } from "../../types/editor";
import { linearGeometry, radialGeometry, type MaskColorSampler } from "../../lib/maskGeometry";
import { setLiveBrushStroke } from "../render/brushTextures";
import { linearSrgbToOklab } from "../../utils/oklab";
import { useEditorState } from "../hooks/useEditorState";
import { useShell } from "../shell/useShell";
import { useMasks } from "./useMasks";

interface Size {
  width: number;
  height: number;
}

type Point = { x: number; y: number };

const HANDLE = "fill-white stroke-black/50 cursor-grab active:cursor-grabbing";

/** Converts a client position to image space (0…1, top-left origin). */
function toImage(element: Element, clientX: number, clientY: number): Point {
  const rect = element.getBoundingClientRect();
  return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
}

function useDrag(onMove: (point: Point, event: PointerEvent) => void) {
  const cleanup = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => cleanup.current?.(), []);

  return (event: React.PointerEvent, frame: Element) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    cleanup.current?.();
    const target = event.currentTarget;
    const pointer = event.pointerId;
    const move = (event: Event) => {
      const moveEvent = event as PointerEvent;
      if (moveEvent.pointerId === pointer) onMove(toImage(frame, moveEvent.clientX, moveEvent.clientY), moveEvent);
    };
    const stop = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("lostpointercapture", stop);
      if (target.hasPointerCapture(pointer)) target.releasePointerCapture(pointer);
      cleanup.current = undefined;
    };
    target.setPointerCapture(pointer);
    target.addEventListener("pointermove", move);
    target.addEventListener("lostpointercapture", stop);
    cleanup.current = stop;
  };
}

function RadialHandles({ mask, size, frame }: { mask: Extract<MaskLayer, { type: "radial" }>; size: Size; frame: React.RefObject<SVGSVGElement | null> }) {
  const { updateComponent } = useMasks();
  const aspect = size.width / size.height;
  const g = radialGeometry(mask.params, aspect);
  const write = (patch: Partial<RadialMaskParams>) =>
    updateComponent(mask.id, (current) => ({
      ...current,
      params: {
        ...current.params,
        center: { x: g.cx, y: g.cy },
        radiusX: g.rx,
        radiusY: g.ry,
        angle: (g.angle * 180) / Math.PI,
        feather: g.feather,
        ...patch,
      },
    } as MaskLayer), "Move Mask");

  const cx = g.cx * size.width;
  const cy = g.cy * size.height;
  const rx = g.rx * size.height;
  const ry = g.ry * size.height;
  const degrees = (g.angle * 180) / Math.PI;
  const axisX = { x: Math.cos(g.angle), y: Math.sin(g.angle) };
  const axisY = { x: -Math.sin(g.angle), y: Math.cos(g.angle) };
  const edgeX = { x: cx + axisX.x * rx, y: cy + axisX.y * rx };
  const edgeY = { x: cx - axisY.x * ry, y: cy - axisY.y * ry };
  const rotate = { x: cx - axisY.x * (ry + 22), y: cy - axisY.y * (ry + 22) };

  const local = (point: Point) => {
    const dx = (point.x - g.cx) * size.width;
    const dy = (point.y - g.cy) * size.height;
    return { along: dx * axisX.x + dy * axisX.y, across: dx * axisY.x + dy * axisY.y };
  };

  const startMove = useDrag((point) => write({ center: { x: Math.min(1.2, Math.max(-0.2, point.x)), y: Math.min(1.2, Math.max(-0.2, point.y)) } }));
  const startWidth = useDrag((point) => write({ radiusX: Math.max(0.01, Math.abs(local(point).along) / size.height) }));
  const startHeight = useDrag((point) => write({ radiusY: Math.max(0.01, Math.abs(local(point).across) / size.height) }));
  const startRotate = useDrag((point) => {
    const dx = (point.x - g.cx) * size.width;
    const dy = (point.y - g.cy) * size.height;
    const degrees = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    write({ angle: degrees > 180 ? degrees - 360 : degrees });
  });

  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${degrees} ${cx} ${cy})`} fill="none" stroke="white" strokeWidth={1.5} strokeOpacity={0.9} style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.7))" }} />
      {g.feather > 0.02 && (
        <ellipse cx={cx} cy={cy} rx={rx * (1 - g.feather)} ry={ry * (1 - g.feather)} transform={`rotate(${degrees} ${cx} ${cy})`} fill="none" stroke="white" strokeOpacity={0.55} strokeDasharray="4 4" />
      )}
      <line x1={edgeY.x} y1={edgeY.y} x2={rotate.x} y2={rotate.y} stroke="white" strokeOpacity={0.6} />
      <circle cx={cx} cy={cy} r={7} className={HANDLE} strokeWidth={1} onPointerDown={(event) => frame.current && startMove(event, frame.current)} />
      <circle cx={cx} cy={cy} r={2.5} className="pointer-events-none fill-black/60" />
      <circle cx={edgeX.x} cy={edgeX.y} r={5} className={HANDLE} onPointerDown={(event) => frame.current && startWidth(event, frame.current)} />
      <circle cx={edgeY.x} cy={edgeY.y} r={5} className={HANDLE} onPointerDown={(event) => frame.current && startHeight(event, frame.current)} />
      <circle cx={rotate.x} cy={rotate.y} r={4.5} className="cursor-alias fill-[#5b9bff] stroke-white" strokeWidth={1.5} onPointerDown={(event) => frame.current && startRotate(event, frame.current)} />
    </g>
  );
}

function LinearHandles({ mask, size, frame }: { mask: Extract<MaskLayer, { type: "linear" }>; size: Size; frame: React.RefObject<SVGSVGElement | null> }) {
  const { updateComponent } = useMasks();
  const g = linearGeometry(mask.params, size.width / size.height);
  const write = (patch: Partial<LinearMaskParams>) =>
    updateComponent(mask.id, (current) => ({ ...current, params: { ...current.params, start: g.start, end: g.end, ...patch } } as MaskLayer), "Move Gradient");
  const s = { x: g.start.x * size.width, y: g.start.y * size.height };
  const e = { x: g.end.x * size.width, y: g.end.y * size.height };
  const m = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
  const length = Math.hypot(e.x - s.x, e.y - s.y) || 1;
  const normal = { x: -(e.y - s.y) / length, y: (e.x - s.x) / length };
  const span = Math.hypot(size.width, size.height) * 1.5;
  const line = (p: Point, opacity: number, dashed = false) => (
    <line x1={p.x - normal.x * span} y1={p.y - normal.y * span} x2={p.x + normal.x * span} y2={p.y + normal.y * span} stroke="white" strokeOpacity={opacity} strokeWidth={1.25} strokeDasharray={dashed ? "5 5" : undefined} style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.7))" }} />
  );
  const startDrag = useDrag((point) => write({ start: point }));
  const endDrag = useDrag((point) => write({ end: point }));
  const moveDrag = useRef<{ origin: Point; start: Point; end: Point } | null>(null);
  const startMove = useDrag((point) => {
    const drag = moveDrag.current;
    if (!drag) return;
    const dx = point.x - drag.origin.x;
    const dy = point.y - drag.origin.y;
    write({ start: { x: drag.start.x + dx, y: drag.start.y + dy }, end: { x: drag.end.x + dx, y: drag.end.y + dy } });
  });

  return (
    <g>
      {line(s, 0.95)}
      {line(m, 0.5, true)}
      {line(e, 0.95)}
      <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="white" strokeOpacity={0.6} />
      <circle cx={s.x} cy={s.y} r={6} className={HANDLE} onPointerDown={(event) => frame.current && startDrag(event, frame.current)} />
      <circle cx={e.x} cy={e.y} r={6} className={HANDLE} onPointerDown={(event) => frame.current && endDrag(event, frame.current)} />
      <circle
        cx={m.x}
        cy={m.y}
        r={7}
        className={HANDLE}
        onPointerDown={(event) => {
          if (!frame.current) return;
          moveDrag.current = { origin: toImage(frame.current, event.clientX, event.clientY), start: g.start, end: g.end };
          startMove(event, frame.current);
        }}
      />
    </g>
  );
}

function BrushTool({ mask, size }: { mask: Extract<MaskLayer, { type: "brush" }>; size: Size }) {
  const { brushSize, setBrushSize, brushFeather, setBrushFeather, brushErasing } = useEditorState();
  const { updateComponent } = useMasks();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef<{ pointerId: number; stroke: BrushStroke } | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [altDown, setAltDown] = useState(false);

  useEffect(() => () => setLiveBrushStroke(mask.id, null), [mask.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      setAltDown(event.altKey);
      const target = event.target as HTMLElement | null;
      if (event.type !== "keydown" || event.metaKey || event.ctrlKey || event.altKey || target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "[" || event.key === "{") {
        if (event.shiftKey) setBrushFeather(Math.max(0, brushFeather - 0.1));
        else setBrushSize(Math.max(0.05, brushSize / 1.2));
      } else if (event.key === "]" || event.key === "}") {
        if (event.shiftKey) setBrushFeather(Math.min(1, brushFeather + 0.1));
        else setBrushSize(Math.min(3, brushSize * 1.2));
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [brushSize, brushFeather, setBrushSize, setBrushFeather]);

  const erasing = brushErasing || altDown;
  const radius = Math.max(1, brushSize * Math.min(size.width, size.height) * 0.1);

  const pointFrom = (event: PointerEvent | React.PointerEvent) => {
    const surface = surfaceRef.current;
    if (!surface) return null;
    const p = toImage(surface, event.clientX, event.clientY);
    const pressure = event.pointerType === "pen" ? Math.max(0.05, event.pressure) : 1;
    return { x: p.x, y: p.y, pressure, t: event.timeStamp };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || drawingRef.current) return;
    event.stopPropagation();
    const point = pointFrom(event);
    if (!point) return;
    const stroke: BrushStroke = {
      id: crypto.randomUUID(),
      points: [point],
      size: brushSize,
      feather: brushFeather,
      flow: 1,
      opacity: 1,
      mode: erasing || event.altKey ? "erase" : "paint",
    };
    drawingRef.current = { pointerId: event.pointerId, stroke };
    setLiveBrushStroke(mask.id, stroke);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const surface = surfaceRef.current;
    if (surface) {
      const local = toImage(surface, event.clientX, event.clientY);
      setCursor({ x: local.x * size.width, y: local.y * size.height });
    }
    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) return;
    const { stroke } = drawing;
    const events = event.nativeEvent.getCoalescedEvents?.();
    for (const coalesced of events?.length ? events : [event.nativeEvent]) {
      const point = pointFrom(coalesced);
      if (point) stroke.points.push(point);
    }
    setLiveBrushStroke(mask.id, stroke);
  };

  const finishStroke = (event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) return;
    drawingRef.current = null;
    setLiveBrushStroke(mask.id, null);
    if (!commit) return;
    const { stroke } = drawing;
    const point = pointFrom(event);
    const last = stroke.points.at(-1);
    if (point && last && (last.x !== point.x || last.y !== point.y)) {
      stroke.points.push({ ...point, pressure: last.pressure });
    }
    updateComponent(mask.id, (current) => current.type === "brush"
      ? { ...current, params: { ...current.params, strokes: [...current.params.strokes, stroke] } }
      : current, stroke.mode === "erase" ? "Erase Brush" : "Brush");
  };

  return (
    <div
      ref={surfaceRef}
      data-testid="mask-brush-surface"
      className="pointer-events-auto absolute inset-0 cursor-none touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => finishStroke(event, true)}
      onPointerCancel={(event) => finishStroke(event, false)}
      onLostPointerCapture={(event) => finishStroke(event, false)}
      onPointerLeave={() => { if (!drawingRef.current) setCursor(null); }}
    >
      {cursor && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <circle cx={cursor.x} cy={cursor.y} r={radius} fill="none" stroke="white" strokeWidth={1.25} style={{ filter: "drop-shadow(0 0 1.5px rgba(0,0,0,0.9))" }} />
          {brushFeather > 0.05 && <circle cx={cursor.x} cy={cursor.y} r={radius * (1 - brushFeather)} fill="none" stroke="white" strokeOpacity={0.6} strokeDasharray="3 3" />}
          <text x={cursor.x} y={cursor.y + 4} textAnchor="middle" className="fill-white text-[13px] font-semibold" style={{ filter: "drop-shadow(0 0 1.5px rgba(0,0,0,0.9))" }}>{erasing ? "−" : "+"}</text>
        </svg>
      )}
    </div>
  );
}

function hsvHue(r: number, g: number, b: number, high: number, chroma: number) {
  if (chroma === 0) return 0;
  const sector = high === r ? (g - b) / chroma : high === g ? 2 + (b - r) / chroma : 4 + (r - g) / chroma;
  return (sector / 6 + 1) % 1;
}

/** On-photo editing for the selected mask part: handles, brush, or eyedropper. */
export function MaskCanvasTools({ size, sampleColor, crop }: { size: Size; sampleColor: React.RefObject<MaskColorSampler | null>; crop: PhotoCrop }) {
  const shell = useShell();
  const masks = useMasks();
  const svgRef = useRef<SVGSVGElement>(null);
  const component = masks.selectedComponent;
  if (!component || size.width === 0) return null;

  if (shell.picking) {
    return (
      <div
        data-testid="mask-color-sample-surface"
        className="pointer-events-auto absolute inset-0 cursor-crosshair"
        onPointerDown={async (event) => {
          if (!event.isPrimary || event.button !== 0) return;
          event.stopPropagation();
          const point = toImage(event.currentTarget, event.clientX, event.clientY);
          const rgb = await sampleColor.current?.((point.x - crop.x) / crop.width, (point.y - crop.y) / crop.height);
          if (!rgb) return;
          const [r, g, b] = rgb.map((channel) => Math.max(0, channel));
          const [lightness, a, yellow] = linearSrgbToOklab(r, g, b);
          if (shell.picking === "luminosity" && component.type === "luminosity") {
            const target = Math.min(1, component.params.colorSpace ? lightness : 0.2126 * r + 0.7152 * g + 0.0722 * b);
            masks.updateComponent(component.id, (current) => current.type === "luminosity"
              ? { ...current, params: { ...current.params, target } }
              : current, "Pick Luminance");
          } else if (shell.picking === "colorRange" && component.type === "colorRange") {
            const high = Math.max(r, g, b);
            const chroma = high - Math.min(r, g, b);
            const perceptual = component.params.colorSpace === "oklch";
            const targetHue = perceptual ? (Math.atan2(yellow, a) / (2 * Math.PI) + 1) % 1 : hsvHue(r, g, b, high, chroma);
            masks.updateComponent(component.id, (current) => current.type === "colorRange"
              ? { ...current, params: { ...current.params, targetHue, targetChroma: perceptual ? 0 : chroma / (high || 1) } }
              : current, "Pick Color");
          }
          shell.setPicking(null);
        }}
      />
    );
  }

  if (component.type === "brush") return <BrushTool key={component.id} mask={component} size={size} />;

  if (component.type === "radial" || component.type === "linear") {
    return (
      <svg ref={svgRef} className="pointer-events-none absolute inset-0 h-full w-full touch-none overflow-visible" viewBox={`0 0 ${size.width} ${size.height}`}>
        <g className="pointer-events-auto">
          {component.type === "radial"
            ? <RadialHandles mask={component} size={size} frame={svgRef} />
            : <LinearHandles mask={component} size={size} frame={svgRef} />}
        </g>
      </svg>
    );
  }
  return null;
}
