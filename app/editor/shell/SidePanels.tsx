"use client";

import React from "react";
import { ProGradingPanel } from "../components/ProGradingPanel";
import { TitlesPanel } from "../text/TitlesPanel";
import { IconAdjustmentsHorizontal, IconBrush, IconTimeline, IconTypography, IconX } from "@tabler/icons-react";
import { DevelopPanel } from "../develop/DevelopPanel";
import { MasksPanel } from "../masks/MasksPanel";
import { Segmented, IconButton } from "../../ui/Controls";
import { useShell, type LeftTab, type RightMode } from "./useShell";
import { LooksTab } from "./LooksTab";
import { EffectsTab } from "./EffectsTab";
import { useSwitchRightMode } from "./useSwitchRightMode";
import { HistoryTab } from "./HistoryTab";
import { VersionsTab } from "./VersionsTab";
import { InfoTab } from "./InfoTab";
import { CropControls } from "../crop/CropControls";
import { useCrop } from "../crop/useCrop";

const LEFT_TABS: ReadonlyArray<{ id: LeftTab; label: string }> = [
  { id: "looks", label: "Looks" },
  { id: "effects", label: "Effects" },
  { id: "history", label: "History" },
  { id: "versions", label: "Versions" },
  { id: "info", label: "Info" },
];

export function LeftPanel() {
  const shell = useShell();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 px-3 pb-2 pt-3">
        <Segmented className="min-w-0 flex-1 [&>button]:px-1" value={shell.leftTab} onChange={(tab) => { shell.setPreview(null); shell.setLeftTab(tab); }} options={LEFT_TABS} />
        <IconButton label="Close panel" shortcut="L" size="sm" onClick={() => { shell.setPreview(null); shell.setLeftOpen(false); }}>
          <IconX size={14} />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1">
        {shell.leftTab === "looks" && <LooksTab />}
        {shell.leftTab === "effects" && <EffectsTab />}
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
  { id: "grade", label: <><IconTimeline size={14} stroke={1.75} /> Grade</>, hint: "Pro grading: nodes, scopes and LUT Studio" },
];

/** Tool tabs, then that tool's controls. Grade is an opt-in mode beside Edit, Masks and Text. */
export function RightPanel() {
  const shell = useShell();
  const changeMode = useSwitchRightMode();
  const crop = useCrop();
  if (crop.draft) return <div className="flex h-full flex-col"><CropControls /></div>;
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--ui-line)] px-3 py-2.5">
        <Segmented size="md" className="w-full" value={shell.rightMode} onChange={changeMode} options={RIGHT_MODES} />
      </div>
      <div className="min-h-0 flex-1">
        {shell.rightMode === "develop" && <DevelopPanel />}
        {shell.rightMode === "masks" && <MasksPanel />}
        {shell.rightMode === "text" && <TitlesPanel />}
        {shell.rightMode === "grade" && <ProGradingPanel />}
      </div>
    </div>
  );
}
