"use client";

import React from "react";
import { IconAdjustmentsHorizontal, IconBrush, IconTypography, IconX } from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import { DevelopPanel } from "../develop/DevelopPanel";
import PlateStackPanel from "../components/PlateStackPanel";
import CinematicTextControls from "../../components/CinematicTextControls";
import { Segmented, IconButton, Switch } from "../../ui/Controls";
import { DevSlider } from "../../ui/DevSlider";
import { SubHeading } from "../../ui/Section";
import { WATERMARK_POSITIONS } from "../pageTypes";
import { useShell, type LeftTab, type RightMode } from "./useShell";
import { LooksTab } from "./LooksTab";
import { HistoryTab } from "./HistoryTab";
import { VersionsTab } from "./VersionsTab";
import { InfoTab } from "./InfoTab";

const LEFT_TABS: ReadonlyArray<{ id: LeftTab; label: string }> = [
  { id: "looks", label: "Looks" },
  { id: "history", label: "History" },
  { id: "versions", label: "Versions" },
  { id: "info", label: "Info" },
];

export function LeftPanel() {
  const shell = useShell();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 px-3 pb-2 pt-3">
        <Segmented className="flex-1" value={shell.leftTab} onChange={(tab) => { shell.setPreview(null); shell.setLeftTab(tab); }} options={LEFT_TABS} />
        <IconButton label="Close panel" shortcut="L" size="sm" onClick={() => { shell.setPreview(null); shell.setLeftOpen(false); }}>
          <IconX size={14} />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1">
        {shell.leftTab === "looks" && <LooksTab />}
        {shell.leftTab === "history" && <HistoryTab />}
        {shell.leftTab === "versions" && <VersionsTab />}
        {shell.leftTab === "info" && <InfoTab />}
      </div>
    </div>
  );
}

const RIGHT_MODES: ReadonlyArray<{ id: RightMode; label: React.ReactNode; hint: string }> = [
  { id: "develop", label: <><IconAdjustmentsHorizontal size={14} stroke={1.75} /> Edit</>, hint: "Adjust the whole photo (E)" },
  { id: "masks", label: <><IconBrush size={14} stroke={1.75} /> Masks</>, hint: "Adjust selected areas (M)" },
  { id: "text", label: <><IconTypography size={14} stroke={1.75} /> Text</>, hint: "Titles, captions and watermark (T)" },
];

function MasksMode() {
  const { settings, updateSetting, activePlateId, setActivePlateId, brushMaskActive, setBrushMaskActive, brushSize, setBrushSize, brushFeather, setBrushFeather, brushErasing, setBrushErasing } = useEditorState();
  const shell = useShell();
  const plate = settings.adjustmentLayers.find((layer) => layer.id === activePlateId);
  const hasBrush = Boolean(plate?.maskIds.some((id) => settings.masks.find((mask) => mask.id === id)?.type === "brush"));
  return (
    <div className="ui-scroll h-full overflow-y-auto px-4 py-3">
      <PlateStackPanel settings={settings} updateSetting={updateSetting} activePlateId={activePlateId} setActivePlateId={setActivePlateId} />
      {hasBrush && (
        <div className="mt-4 rounded-[10px] bg-white/[0.03] p-3 ring-1 ring-inset ring-[var(--ui-line)]">
          <Switch label="Paint on photo" checked={brushMaskActive} onChange={setBrushMaskActive} hint="Paint where this adjustment applies." />
          <Segmented
            className="my-2"
            value={brushErasing ? "erase" : "paint"}
            onChange={(mode) => setBrushErasing(mode === "erase")}
            options={[{ id: "paint", label: "Paint" }, { id: "erase", label: "Erase" }]}
          />
          <DevSlider label="Size" value={brushSize} defaultValue={0.3} min={0.02} max={1} onChange={setBrushSize} format={(value) => `${Math.round(value * 100)}`} />
          <DevSlider label="Feather" value={brushFeather} defaultValue={0.5} min={0} max={1} onChange={setBrushFeather} format={(value) => `${Math.round(value * 100)}`} />
        </div>
      )}
      {plate && (
        <button type="button" onClick={() => shell.setRightMode("develop")} className="ui-focus mt-4 w-full rounded-[9px] bg-[var(--ui-accent-soft)] py-2 text-[12px] font-medium text-[var(--ui-accent-strong)] hover:bg-[var(--ui-accent)]/25">
          Adjust “{plate.name}”
        </button>
      )}
    </div>
  );
}

function TextMode() {
  const { textOverlay, setTextOverlay, handleFontUpload, watermark, setWatermark } = useEditorState();
  return (
    <div className="ui-scroll h-full overflow-y-auto px-4 py-3">
      <CinematicTextControls textOverlay={textOverlay} setTextOverlay={setTextOverlay} onFontUpload={handleFontUpload} />
      <div className="mt-6 border-t border-[var(--ui-line)] pt-4">
        <SubHeading>Watermark</SubHeading>
        <Switch label="Add watermark" checked={watermark.enabled} onChange={(enabled) => setWatermark((current) => ({ ...current, enabled, text: current.text || "PROOF" }))} />
        {watermark.enabled && (
          <>
            <input
              value={watermark.text}
              onChange={(event) => setWatermark((current) => ({ ...current, text: event.target.value }))}
              placeholder="© Your Name"
              className="my-2 h-8 w-full rounded-[8px] bg-black/30 px-2.5 text-[12px] outline-none ring-1 ring-inset ring-[var(--ui-line)] focus:ring-[var(--ui-accent)]"
            />
            <div className="mb-2 grid grid-cols-3 gap-1">
              {WATERMARK_POSITIONS.map((position) => (
                <button
                  key={position.id}
                  type="button"
                  aria-pressed={watermark.position === position.id}
                  onClick={() => setWatermark((current) => ({ ...current, position: position.id }))}
                  className={`ui-focus h-7 rounded-[7px] text-[11px] transition-colors ${watermark.position === position.id ? "bg-white/[0.1] text-[var(--ui-text)]" : "text-[var(--ui-text-3)] hover:bg-white/[0.05] hover:text-[var(--ui-text-2)]"}`}
                >
                  {position.label}
                </button>
              ))}
            </div>
            <DevSlider label="Opacity" value={watermark.opacity} defaultValue={0.62} min={0} max={1} onChange={(opacity) => setWatermark((current) => ({ ...current, opacity }))} format={(value) => `${Math.round(value * 100)}%`} />
            <DevSlider label="Size" value={watermark.size} defaultValue={0.32} min={0} max={1} onChange={(size) => setWatermark((current) => ({ ...current, size }))} format={(value) => `${Math.round(value * 100)}`} />
          </>
        )}
      </div>
    </div>
  );
}

export function RightPanel() {
  const shell = useShell();
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--ui-line)] px-3 py-2.5">
        <Segmented size="md" value={shell.rightMode} onChange={shell.setRightMode} options={RIGHT_MODES} />
      </div>
      <div className="min-h-0 flex-1">
        {shell.rightMode === "develop" && <DevelopPanel />}
        {shell.rightMode === "masks" && <MasksMode />}
        {shell.rightMode === "text" && <TextMode />}
      </div>
    </div>
  );
}
