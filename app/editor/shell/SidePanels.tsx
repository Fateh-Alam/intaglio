"use client";

import React, { useState } from "react";
import { ProGradingPanel } from "../components/ProGradingPanel";
import { IconAdjustmentsHorizontal, IconBrush, IconTypography, IconX } from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import { DevelopPanel } from "../develop/DevelopPanel";
import { MasksPanel } from "../masks/MasksPanel";
import CinematicTextControls from "../../components/CinematicTextControls";
import { Segmented, IconButton, Switch } from "../../ui/Controls";
import { DevSlider } from "../../ui/DevSlider";
import { SubHeading } from "../../ui/Section";
import { WATERMARK_POSITIONS } from "../pageTypes";
import { useShell, type LeftTab, type RightMode } from "./useShell";
import { LooksTab } from "./LooksTab";
import { useSwitchRightMode } from "./useSwitchRightMode";
import { HistoryTab } from "./HistoryTab";
import { VersionsTab } from "./VersionsTab";
import { InfoTab } from "./InfoTab";
import { CropControls } from "../crop/CropControls";
import { useCrop } from "../crop/useCrop";

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
  const [proGrading, setProGrading] = useState(false);
  const shell = useShell();
  const changeMode = useSwitchRightMode();
  const crop = useCrop();
  if (proGrading && !crop.draft) return <ProGradingPanel onClose={() => setProGrading(false)} />;
  if (crop.draft) return <div className="flex h-full flex-col"><CropControls /></div>;
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--ui-line)] px-3 py-2.5">
        <Segmented size="md" value={shell.rightMode} onChange={changeMode} options={RIGHT_MODES} />
        <button onClick={() => setProGrading(true)} className="ui-focus mt-2 w-full rounded py-1 text-[11px] text-[var(--ui-text-3)] hover:text-[var(--ui-text)]">Open pro grading workspace…</button>
      </div>
      <div className="min-h-0 flex-1">
        {shell.rightMode === "develop" && <DevelopPanel />}
        {shell.rightMode === "masks" && <MasksPanel />}
        {shell.rightMode === "text" && <TextMode />}
      </div>
    </div>
  );
}
