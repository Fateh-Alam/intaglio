"use client";

import React, { useState } from "react";
import {
  IconBrightnessHalf, IconBrush, IconColorPicker, IconColorSwatch, IconEye, IconEyeOff, IconGradienter, IconOvalVertical,
  IconPlus, IconTrash,
} from "@tabler/icons-react";
import type { MaskLayer } from "../../types/editor";
import { MASK_KIND_LABEL, MAX_BRUSH_PARTS, MAX_MASK_PARTS, radialGeometry, type MaskKind } from "../../lib/maskGeometry";
import { useEditorState } from "../hooks/useEditorState";
import { useShell } from "../shell/useShell";
import { DevelopSections } from "../develop/DevelopPanel";
import { Button, IconButton, Segmented, Switch } from "../../ui/Controls";
import { DevSlider } from "../../ui/DevSlider";
import { MenuItem, Popover } from "../../ui/Popover";
import { oklchCss } from "../../utils/oklab";
import { useMasks } from "./useMasks";

const KINDS: ReadonlyArray<{ kind: MaskKind; icon: React.ReactNode; detail: string }> = [
  { kind: "brush", icon: <IconBrush size={18} stroke={1.6} />, detail: "Paint exactly where" },
  { kind: "linear", icon: <IconGradienter size={18} stroke={1.6} />, detail: "Skies, foregrounds" },
  { kind: "radial", icon: <IconOvalVertical size={18} stroke={1.6} />, detail: "Faces, spotlights" },
  { kind: "luminosity", icon: <IconBrightnessHalf size={18} stroke={1.6} />, detail: "Only highlights or shadows" },
  { kind: "colorRange", icon: <IconColorSwatch size={18} stroke={1.6} />, detail: "Only one color" },
];

const kindIcon = (kind: MaskKind) => KINDS.find((item) => item.kind === kind)?.icon;

const MODE_LABEL: Record<MaskLayer["blendMode"], string> = { ADD: "Add", SUBTRACT: "Subtract", INTERSECT: "Intersect" };

const percent = (value: number) => `${Math.round(value * 100)}`;

function KindMenu({ label, icon, onPick, align = "start", disabled = false, brushLimit = false }: {
  label: string; icon: React.ReactNode; onPick: (kind: MaskKind) => void;
  align?: "start" | "end"; disabled?: boolean; brushLimit?: boolean;
}) {
  return (
    <Popover
      side="bottom"
      align={align}
      width={210}
      trigger={({ open, toggle }) => (
        <Button variant="ghost" aria-haspopup="menu" aria-expanded={open} disabled={disabled} className={`h-7 px-2 text-[11.5px] disabled:opacity-40 ${open ? "bg-white/[0.08] text-[var(--ui-text)]" : ""}`} icon={icon} onClick={toggle}>
          {label}
        </Button>
      )}
    >
      {(close) => KINDS.map((item) => (
        <MenuItem key={item.kind} disabled={item.kind === "brush" && brushLimit} hint={item.kind === "brush" && brushLimit ? "Limit reached" : undefined} onSelect={() => { onPick(item.kind); close(); }}>
          <span className="text-[var(--ui-text-2)]">{item.icon}</span>
          {MASK_KIND_LABEL[item.kind]}
        </MenuItem>
      ))}
    </Popover>
  );
}

function RangeBar({ label, background, target, range, onPick }: { label: string; background: string; target: number; range: number; onPick: (value: number) => void }) {
  const left = Math.max(0, target - range) * 100;
  const right = Math.min(1, target + range) * 100;
  return (
    <div
      role="slider"
      aria-label={label}
      aria-valuenow={Math.round(target * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      className="ui-focus relative my-2 h-6 cursor-pointer rounded-[6px] ring-1 ring-inset ring-white/10"
      style={{ background }}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onPick(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.1 : 0.01;
        const values: Record<string, number> = { ArrowLeft: target - step, ArrowDown: target - step, ArrowRight: target + step, ArrowUp: target + step, Home: 0, End: 1 };
        if (!(event.key in values)) return;
        event.preventDefault();
        onPick(Math.min(1, Math.max(0, values[event.key])));
      }}
    >
      <div className="pointer-events-none absolute inset-y-0 rounded-[6px] bg-white/25 ring-1 ring-white/60" style={{ left: `${left}%`, width: `${right - left}%` }} />
      <div className="pointer-events-none absolute inset-y-[-3px] w-[3px] -translate-x-1/2 rounded-full bg-white shadow" style={{ left: `${target * 100}%` }} />
    </div>
  );
}

const HUE_STRIP = `linear-gradient(90deg, ${Array.from({ length: 13 }, (_, i) => `${oklchCss(0.7, 0.14, i * 30)} ${(i / 12) * 100}%`).join(", ")})`;
const LEGACY_HUE_STRIP = `linear-gradient(90deg, ${Array.from({ length: 13 }, (_, i) => `hsl(${i * 30} 88% 55%)`).join(", ")})`;

function ComponentEditor({ mask }: { mask: MaskLayer }) {
  const { updateComponent } = useMasks();
  const { brushSize, setBrushSize, brushFeather, setBrushFeather, brushErasing, setBrushErasing, imageInfo } = useEditorState();
  const shell = useShell();
  const set = <T extends MaskLayer>(patch: Partial<T["params"]>, label: string) =>
    updateComponent(mask.id, (current) => ({ ...current, params: { ...current.params, ...patch } } as MaskLayer), label);

  const picker = (mode: "luminosity" | "colorRange") => (
    <Button
      variant="secondary"
      className={`w-full ${shell.picking === mode ? "ring-[var(--ui-accent)]" : ""}`}
      icon={<IconColorPicker size={15} />}
      onClick={() => shell.setPicking(shell.picking === mode ? null : mode)}
    >
      {shell.picking === mode ? "Click the photo to pick…" : "Pick from photo"}
    </Button>
  );

  switch (mask.type) {
    case "brush":
      return (
        <>
          <Segmented
            className="mb-2"
            value={brushErasing ? "erase" : "paint"}
            onChange={(mode) => setBrushErasing(mode === "erase")}
            options={[{ id: "paint", label: "Paint", hint: "Paint the adjustment in" }, { id: "erase", label: "Erase", hint: "Hold Alt or Option while painting to erase" }]}
          />
          <DevSlider label="Size" value={brushSize} defaultValue={0.3} min={0.05} max={3} step={0.01} onChange={setBrushSize} format={(value) => `${Math.round(value * 100)}`}
            hint="Brush size. Press [ and ] to change it while painting." />
          <DevSlider label="Feather" value={brushFeather} defaultValue={0.5} min={0} max={1} onChange={setBrushFeather} format={percent}
            hint="How soft the brush edge is. Shift+[ and Shift+] change it." />
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--ui-text-2)]">Paint on the photo. Hold Alt or Option to erase.</p>
        </>
      );
    case "radial": {
      const p = mask.params;
      const g = radialGeometry(p, imageInfo ? imageInfo.width / imageInfo.height : 1);
      const change = (patch: Partial<typeof p>, label: string) => set({
        center: { x: g.cx, y: g.cy }, radiusX: g.rx, radiusY: g.ry, feather: g.feather, ...patch,
      }, label);
      return (
        <>
          <DevSlider label="Feather" value={g.feather} defaultValue={0.5} min={0} max={1} format={percent} onChange={(feather) => change({ feather }, "Mask Feather")}
            hint="How gradually the effect fades toward the edge." />
          <DevSlider label="Width" value={g.rx} defaultValue={0.3} min={0.02} max={1.5} format={percent} onChange={(radiusX) => change({ radiusX }, "Mask Size")} />
          <DevSlider label="Height" value={g.ry} defaultValue={0.3} min={0.02} max={1.5} format={percent} onChange={(radiusY) => change({ radiusY }, "Mask Size")} />
          <DevSlider label="Rotation" value={p.angle ?? 0} defaultValue={0} min={-180} max={180} step={0.5} format={(value) => `${Math.round(value)}°`} onChange={(angle) => change({ angle }, "Mask Rotation")} />
          <Switch label="Invert" checked={p.invert} onChange={(invert) => set({ invert }, "Invert Mask")} hint="Affect everything outside the shape instead." />
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--ui-text-3)]">Drag the center to move, the edge dots to resize.</p>
        </>
      );
    }
    case "linear":
      return (
        <>
          <Switch label="Invert" checked={mask.params.invert} onChange={(invert) => set({ invert }, "Invert Mask")} hint="Flip which side gets the effect." />
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--ui-text-3)]">Drag the dots on the photo: full effect at the first line, none at the last.</p>
        </>
      );
    case "luminosity": {
      const p = mask.params;
      return (
        <>
          <RangeBar label="Brightness target" background="linear-gradient(90deg, #000, #fff)" target={p.target} range={p.range} onPick={(target) => set({ target }, "Luminance Target")} />
          <DevSlider label="Brightness" value={p.target} defaultValue={0.75} min={0} max={1} format={percent} onChange={(target) => set({ target }, "Luminance Target")}
            hint="Which tones to select: 0 is black, 100 is white." />
          <DevSlider label="Range" value={p.range} defaultValue={0.2} min={0.01} max={0.6} format={percent} onChange={(range) => set({ range }, "Luminance Range")}
            hint="How many neighbouring tones are included." />
          <DevSlider label="Smoothness" value={p.feather} defaultValue={0.12} min={0} max={0.5} format={percent} onChange={(feather) => set({ feather }, "Luminance Smoothness")} />
          {picker("luminosity")}
        </>
      );
    }
    case "colorRange": {
      const p = mask.params;
      const hue = p.targetHue > 1 ? p.targetHue / 360 : p.targetHue;
      return (
        <>
          <RangeBar label="Hue target" background={p.colorSpace ? HUE_STRIP : LEGACY_HUE_STRIP} target={hue} range={p.hueWidth} onPick={(targetHue) => set({ targetHue }, "Color Target")} />
          <DevSlider label="Range" value={p.hueWidth} defaultValue={0.08} min={0.01} max={0.3} format={(value) => `${Math.round(value * 360)}°`} onChange={(hueWidth) => set({ hueWidth }, "Color Range")}
            hint="How many neighbouring hues are included." />
          {picker("colorRange")}
        </>
      );
    }
  }
}

/** Lightroom-style masks: create, combine, place on the photo, then adjust below. */
export function MasksPanel() {
  const masks = useMasks();
  const shell = useShell();
  const [renaming, setRenaming] = useState<string | null>(null);

  if (masks.plates.length === 0) {
    return (
      <div className="ui-scroll h-full overflow-y-auto px-4 py-6">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-[12px] bg-white/[0.05] text-[var(--ui-text-2)]"><IconBrush size={20} stroke={1.5} /></div>
          <div className="text-[13.5px] font-semibold">Adjust part of your photo</div>
          <p className="mx-auto mt-1 max-w-[240px] text-[12px] leading-relaxed text-[var(--ui-text-3)]">Make a mask, then use the usual sliders. Only the masked area changes.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map((item) => (
            <button
              key={item.kind}
              type="button"
              onClick={() => masks.createMask(item.kind)}
              className="ui-focus flex flex-col items-start gap-2 rounded-[12px] bg-white/[0.035] p-3 text-left ring-1 ring-inset ring-[var(--ui-line)] transition-colors hover:bg-white/[0.07] last:col-span-2"
            >
              <span className="text-[var(--ui-text-2)]">{item.icon}</span>
              <span>
                <span className="block text-[12.5px] font-medium">{MASK_KIND_LABEL[item.kind]}</span>
                <span className="block text-[11px] text-[var(--ui-text-3)]">{item.detail}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const plate = masks.activePlate;
  const component = masks.selectedComponent;
  const parts = plate ? masks.componentsOf(plate) : [];
  const brushLimit = parts.filter((part) => part.type === "brush").length >= MAX_BRUSH_PARTS;
  const partLimit = parts.length >= MAX_MASK_PARTS;

  return (
    <div className="ui-scroll h-full overflow-y-auto">
      <div className="sticky top-0 z-20 border-b border-[var(--ui-line)] bg-[var(--ui-panel)] px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold">Masks</span>
          <KindMenu label="New mask" icon={<IconPlus size={14} />} onPick={masks.createMask} align="end" />
        </div>
        {plate && <Switch label="Show overlay" checked={shell.showMaskOverlay} onChange={shell.setShowMaskOverlay} hint="Tint the masked area red" shortcut="O" />}
      </div>
      <div className="border-b border-[var(--ui-line)] px-3 py-3">
        <ul className="space-y-1">
          {masks.plates.map((item) => {
            const active = item.id === plate?.id;
            const hidden = item.enabled === false;
            return (
              <li key={item.id} className={`rounded-[10px] transition-colors ${active ? "bg-white/[0.07] ring-1 ring-inset ring-white/10" : "hover:bg-white/[0.04]"}`}>
                <div className="group/plate flex items-center gap-1 py-1 pl-2.5 pr-1">
                  {renaming === item.id ? (
                    <input
                      autoFocus
                      defaultValue={item.name}
                      onBlur={(event) => { masks.updatePlate(item.id, { name: event.target.value.trim() || item.name }, "Rename Mask"); setRenaming(null); }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                        if (event.key === "Escape") setRenaming(null);
                      }}
                      className="h-7 min-w-0 flex-1 rounded-[6px] bg-black/40 px-2 text-[12px] outline-none ring-1 ring-[var(--ui-accent)]"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => masks.selectPlate(item.id)}
                      onDoubleClick={() => setRenaming(item.id)}
                      title="Double-click to rename"
                      className={`ui-focus h-7 min-w-0 flex-1 truncate text-left text-[12.5px] ${active ? "font-medium text-[var(--ui-text)]" : "text-[var(--ui-text-2)]"} ${hidden ? "opacity-50" : ""}`}
                    >
                      {item.name}
                    </button>
                  )}
                  <IconButton label={hidden ? "Show mask effect" : "Hide mask effect"} size="sm" onClick={() => masks.updatePlate(item.id, { enabled: hidden }, hidden ? "Show Mask" : "Hide Mask")}>
                    {hidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                  </IconButton>
                  <IconButton label="Delete mask" size="sm" onClick={() => masks.removePlate(item.id)}>
                    <IconTrash size={14} />
                  </IconButton>
                </div>
                {active && (
                  <div className="px-1.5 pb-2">
                    {masks.componentsOf(item).map((part, index) => {
                      const selected = part.id === component?.id;
                      return (
                        <div key={part.id} className={`group/part flex items-center gap-2 rounded-[8px] px-2 py-1 ${selected ? "bg-[var(--ui-accent-soft)]" : "hover:bg-white/[0.04]"}`}>
                          <button type="button" aria-pressed={selected} onClick={() => masks.selectComponent(item.id, part.id)} className="ui-focus flex min-w-0 flex-1 items-center gap-2 py-0.5 text-left">
                            <span className={selected ? "text-[var(--ui-accent-strong)]" : "text-[var(--ui-text-3)]"}>{kindIcon(part.type)}</span>
                            <span className="truncate text-[12px] text-[var(--ui-text)]">{MASK_KIND_LABEL[part.type]}</span>
                          </button>
                          {index > 0 && <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-[var(--ui-text-2)]">{MODE_LABEL[part.blendMode]}</span>}
                          <IconButton label="Remove this part" size="sm" onClick={() => masks.removeComponent(item.id, part.id)}>
                            <IconTrash size={13} />
                          </IconButton>
                        </div>
                      );
                    })}
                    <div className="mt-1 flex gap-0.5 px-0.5">
                      <KindMenu label="Add" icon={<IconPlus size={13} />} disabled={partLimit} brushLimit={brushLimit} onPick={(kind) => masks.addComponent(item.id, kind, "ADD")} />
                      <KindMenu label="Subtract" icon={<span className="text-[13px] leading-none">−</span>} disabled={partLimit} brushLimit={brushLimit} onPick={(kind) => masks.addComponent(item.id, kind, "SUBTRACT")} />
                      <KindMenu label="Intersect" icon={<span className="text-[12px] leading-none">∩</span>} align="end" disabled={partLimit} brushLimit={brushLimit} onPick={(kind) => masks.addComponent(item.id, kind, "INTERSECT")} />
                    </div>
                    {partLimit && <p className="px-2 text-[11px] text-[var(--ui-text-2)]">This mask has the maximum of {MAX_MASK_PARTS} parts.</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {plate && (
        <>
          {component && (
            <div className="border-b border-[var(--ui-line)] px-4 py-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ui-text-3)]">{MASK_KIND_LABEL[component.type]}</span>
              </div>
              <ComponentEditor mask={component} />
            </div>
          )}
          <div className="border-b border-[var(--ui-line)] px-4 py-2">
            <DevSlider label="Amount" value={plate.opacity} defaultValue={1} min={0} max={1} format={percent} onChange={(opacity) => masks.updatePlate(plate.id, { opacity }, "Mask Amount")}
              hint="How strongly this mask's adjustments apply." />
          </div>
          <div className="px-4 pb-1 pt-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ui-text-3)]">Adjustments in {plate.name}</div>
          <DevelopSections />
        </>
      )}
      {!plate && (
        <p className="px-4 py-6 text-center text-[12px] text-[var(--ui-text-3)]">Select a mask to adjust it.</p>
      )}
    </div>
  );
}
