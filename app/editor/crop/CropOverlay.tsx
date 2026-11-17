"use client";

import { useRef, useState, type PointerEvent } from "react";
import { dragCrop, horizonCorrection, type CropHandle, type CropPoint } from "../../lib/cropGeometry";
import type { PhotoCrop } from "../../types/editor";
import type { useCrop } from "./useCrop";

const handles = [
  { id: "nw", label: "Top left", x: "0%", y: "0%", cursor: "nwse-resize", mark: "h-4 w-4 border-l-2 border-t-2 translate-x-[7px] translate-y-[7px]" },
  { id: "n", label: "Top", x: "50%", y: "0%", cursor: "ns-resize", mark: "h-[2px] w-5" },
  { id: "ne", label: "Top right", x: "100%", y: "0%", cursor: "nesw-resize", mark: "h-4 w-4 border-r-2 border-t-2 -translate-x-[7px] translate-y-[7px]" },
  { id: "e", label: "Right", x: "100%", y: "50%", cursor: "ew-resize", mark: "h-5 w-[2px]" },
  { id: "se", label: "Bottom right", x: "100%", y: "100%", cursor: "nwse-resize", mark: "h-4 w-4 border-r-2 border-b-2 -translate-x-[7px] -translate-y-[7px]" },
  { id: "s", label: "Bottom", x: "50%", y: "100%", cursor: "ns-resize", mark: "h-[2px] w-5" },
  { id: "sw", label: "Bottom left", x: "0%", y: "100%", cursor: "nesw-resize", mark: "h-4 w-4 border-l-2 border-b-2 translate-x-[7px] -translate-y-[7px]" },
  { id: "w", label: "Left", x: "0%", y: "50%", cursor: "ew-resize", mark: "h-5 w-[2px]" },
] as const;

type Drag = { pointer: number; start: CropPoint } & ({ handle: CropHandle; rect: PhotoCrop } | { handle: "horizon" });
type CropTool = ReturnType<typeof useCrop>;

export function CropOverlay({ crop }: { crop: CropTool }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [line, setLine] = useState<{ from: CropPoint; to: CropPoint } | null>(null);
  const { x, y, width, height } = crop.rect;
  const drawing = crop.draft?.drawHorizon;

  const point = (event: PointerEvent) => {
    const bounds = frameRef.current?.getBoundingClientRect();
    if (!bounds || !bounds.width || !bounds.height) return null;
    return { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height };
  };
  const start = (event: PointerEvent<HTMLElement>, handle: Drag["handle"]) => {
    if (!event.isPrimary || event.button !== 0 || dragRef.current) return;
    const position = point(event);
    if (!position) return;
    event.stopPropagation();
    const pointer = event.pointerId;
    dragRef.current = handle === "horizon" ? { handle, pointer, start: position } : { handle, pointer, start: position, rect: crop.rect };
    event.currentTarget.setPointerCapture(pointer);
    if (handle === "horizon") setLine({ from: position, to: position });
  };
  const move = (event: PointerEvent) => {
    const drag = dragRef.current;
    const position = point(event);
    if (!drag || drag.pointer !== event.pointerId || !position) return;
    if (drag.handle === "horizon") {
      setLine({ from: drag.start, to: position });
    } else {
      crop.change({ rect: dragCrop(drag.rect, drag.handle, { x: position.x - drag.start.x, y: position.y - drag.start.y }, crop.ratio) });
    }
  };
  const end = (event: PointerEvent, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    dragRef.current = null;
    setLine(null);
    if (cancelled) return;
    const position = point(event);
    const bounds = frameRef.current?.getBoundingClientRect();
    if (drag.handle === "horizon" && position && bounds && crop.draft) {
      const dx = (position.x - drag.start.x) * bounds.width;
      const dy = (position.y - drag.start.y) * bounds.height;
      if (Math.hypot(dx, dy) >= 12) {
        crop.straighten(crop.draft.rotation - horizonCorrection(dx, dy));
        crop.change({ drawHorizon: false });
      }
    }
  };
  const keys = (event: React.KeyboardEvent<HTMLElement>, handle: CropHandle) => {
    const deltas: Record<string, CropPoint> = {
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.02 : 0.002;
    crop.change({ rect: dragCrop(crop.rect, handle, { x: delta.x * step, y: delta.y * step }, crop.ratio) });
  };

  return (
    <div ref={frameRef} className="absolute inset-0 z-20 select-none" data-testid="crop-surface"
      onPointerMove={move} onPointerUp={(event) => end(event)} onPointerCancel={(event) => end(event, true)}
      onLostPointerCapture={(event) => end(event, true)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div data-testid="crop-frame" className="absolute border border-white/80 shadow-[0_0_0_200vmax_rgba(0,0,0,0.62)]"
          style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${width * 100}%`, height: `${height * 100}%` }}>
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, index) =>
              <div key={index} className={`${index % 3 < 2 ? "border-r " : ""}${index < 6 ? "border-b " : ""}border-white/30`} />)}
          </div>
        </div>
      </div>
      {drawing ? (
        <div className="pointer-events-auto absolute inset-0 cursor-crosshair touch-none" data-testid="horizon-surface"
          onPointerDown={(event) => start(event, "horizon")} />
      ) : (
        <div className="absolute" style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${width * 100}%`, height: `${height * 100}%` }}>
          <button type="button" aria-label="Move crop frame" className="ui-focus pointer-events-auto absolute inset-0 cursor-move touch-none"
            onPointerDown={(event) => start(event, "move")} onKeyDown={(event) => keys(event, "move")} />
          {handles.map(({ id, label, x, y, cursor, mark }) => (
            <button key={id} type="button" aria-label={`Resize crop · ${label}`}
              className="ui-focus pointer-events-auto absolute grid h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-[3px]"
              style={{ left: x, top: y, cursor }} onPointerDown={(event) => start(event, id)} onKeyDown={(event) => keys(event, id)}>
              <span aria-hidden className={`border-white bg-white drop-shadow-[0_0_2px_#000] ${mark} ${id.length > 1 ? "!bg-transparent" : ""}`} />
            </button>
          ))}
        </div>
      )}
      {line && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <line x1={`${line.from.x * 100}%`} y1={`${line.from.y * 100}%`} x2={`${line.to.x * 100}%`} y2={`${line.to.y * 100}%`}
            stroke="black" strokeWidth={4} opacity={0.7} />
          <line x1={`${line.from.x * 100}%`} y1={`${line.from.y * 100}%`} x2={`${line.to.x * 100}%`} y2={`${line.to.y * 100}%`}
            stroke="white" strokeWidth={2} />
          {[line.from, line.to].map((point, index) =>
            <circle key={index} cx={`${point.x * 100}%`} cy={`${point.y * 100}%`} r={4} fill="white" stroke="black" />)}
        </svg>
      )}
    </div>
  );
}
