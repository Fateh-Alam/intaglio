"use client";

import React, { useState } from "react";
import { ProGradingPanel } from "../components/ProGradingPanel";
import { TitlesPanel } from "../text/TitlesPanel";
import { IconAdjustmentsHorizontal, IconBrush, IconChevronRight, IconTimeline, IconTypography, IconX } from "@tabler/icons-react";
import { DevelopPanel } from "../develop/DevelopPanel";
import { MasksPanel } from "../masks/MasksPanel";
import { Segmented, IconButton } from "../../ui/Controls";
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
        <button
          type="button"
          aria-label="Open pro grading workspace…"
          onClick={() => setProGrading(true)}
          className="ui-focus group mt-2 flex h-9 w-full items-center gap-2.5 rounded-[8px] px-2 text-left transition-colors hover:bg-white/[0.04]"
        >
          <span className="grid h-6 w-6 place-items-center rounded-[6px] bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)]">
            <IconTimeline size={14} stroke={1.8} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--ui-text-2)] group-hover:text-[var(--ui-text)]">
            Pro grading <span className="font-normal text-[var(--ui-text-3)]">· Nodes, scopes, LUTs</span>
          </span>
          <IconChevronRight size={14} className="text-[var(--ui-text-3)] transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {shell.rightMode === "develop" && <DevelopPanel />}
        {shell.rightMode === "masks" && <MasksPanel />}
        {shell.rightMode === "text" && <TitlesPanel />}
      </div>
    </div>
  );
}
