"use client";

import React from "react";
import {
  IconArrowBackUp, IconArrowForwardUp, IconChartHistogram, IconChevronDown, IconCommand, IconDownload,
  IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import { FORMAT } from "../../lib/brand";
import { Button, IconButton } from "../../ui/Controls";
import { MenuItem, Popover } from "../../ui/Popover";
import { useShell } from "./useShell";

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6.25" fill="none" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      <path d="M12 1.75V22.25" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MenuAction({ label, shortcut, onSelect, children }: { label: string; shortcut?: string; onSelect?: () => void; children?: React.ReactNode }) {
  const className = "ui-focus flex h-8 w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 text-left text-[12px] text-[var(--ui-text-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]";
  const body = (
    <>
      <span>{label}</span>
      {shortcut && <span className="text-[11px] text-[var(--ui-text-3)]">{shortcut}</span>}
      {children}
    </>
  );
  return onSelect ? <button type="button" role="menuitem" onClick={onSelect} className={className}>{body}</button> : <label role="menuitem" className={className}>{body}</label>;
}

const Separator = () => <div className="my-1 h-px bg-white/[0.07]" />;

export function TopBar({ onOpenLibrary }: { onOpenLibrary?: () => void } = {}) {
  const {
    imageName, history, historyIndex, handleUndo, handleRedo, openImagePicker, openProjectPicker, openRecipePicker, handleSaveProjectSession,
    setIsPresetModalOpen, setIsBatchExportOpen, setIsProofSheetOpen, setIsExportModalOpen,
    handleCopySettings, handlePasteSettings, clipboard, setIsCommandBarOpen,
  } = useEditorState();
  const shell = useShell();
  const edited = historyIndex > 0;

  return (
    <header className="relative z-50 flex h-12 shrink-0 items-center gap-2 border-b border-[var(--ui-line)] bg-[var(--ui-chrome)] px-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <div className="hidden items-center gap-2 px-1.5 text-[var(--ui-text)] min-[360px]:flex">
          <BrandMark />
        </div>
        {onOpenLibrary && <button type="button" onClick={onOpenLibrary} className="ui-focus rounded-[8px] px-2.5 py-2 text-[12.5px] text-[var(--ui-text-2)] hover:bg-white/[0.06] hover:text-[var(--ui-text)]">Library</button>}
        <Popover
          side="bottom"
          align="start"
          width={248}
          trigger={({ open, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className={`ui-focus flex h-8 items-center gap-1 rounded-[8px] px-2.5 text-[12.5px] font-medium transition-colors ${open ? "bg-white/[0.08] text-[var(--ui-text)]" : "text-[var(--ui-text-2)] hover:bg-white/[0.06] hover:text-[var(--ui-text)]"}`}
            >
              File <IconChevronDown size={13} stroke={2} className="opacity-60" />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuAction label="Open photo…" shortcut="⌘O" onSelect={() => { openImagePicker(); close(); }} />
              <MenuAction label="Open project…" shortcut="⇧⌘O" onSelect={() => { openProjectPicker(); close(); }} />
              <MenuAction label="Save project" shortcut="⌘S" onSelect={() => { void handleSaveProjectSession(); close(); }} />
              <Separator />
              <MenuAction label={`Save look as .${FORMAT.recipeExtension}…`} onSelect={() => { setIsPresetModalOpen(true); close(); }} />
              <MenuAction label={`Apply .${FORMAT.recipeExtension} look…`} onSelect={() => { openRecipePicker(); close(); }} />
              <MenuAction label="Copy edit settings" onSelect={() => { handleCopySettings(); close(); }} />
              {clipboard && <MenuAction label="Paste edit settings" onSelect={() => { handlePasteSettings(); close(); }} />}
              <Separator />
              <MenuAction label="Proof sheet…" onSelect={() => { setIsProofSheetOpen(true); close(); }} />
              <MenuAction label="Batch export…" onSelect={() => { setIsBatchExportOpen(true); close(); }} />
              <MenuAction label="Export…" shortcut="⌘E" onSelect={() => { setIsExportModalOpen(true); close(); }} />
            </>
          )}
        </Popover>
        <IconButton
          label={shell.leftOpen ? "Hide looks & history" : "Show looks & history"}
          shortcut="L"
          active={shell.leftOpen}
          onClick={() => shell.setLeftOpen(!shell.leftOpen)}
        >
          {shell.leftOpen ? <IconLayoutSidebarLeftCollapse size={17} stroke={1.6} /> : <IconLayoutSidebarLeftExpand size={17} stroke={1.6} />}
        </IconButton>
        <Popover
          side="bottom"
          align="start"
          width={220}
          trigger={({ open, toggle }) => (
            <IconButton
              label="Histogram"
              active={open || shell.histogramVisible}
              aria-pressed={undefined}
              aria-expanded={open}
              aria-haspopup="menu"
              onClick={toggle}
            >
              <IconChartHistogram size={17} stroke={1.6} />
            </IconButton>
          )}
        >
          {(close) => (
            <>
              <MenuItem
                selected={shell.histogramVisible && !shell.histogramDetached}
                hint="Edit panel"
                onSelect={() => {
                  shell.setHistogramVisible(true);
                  shell.setHistogramDetached(false);
                  close();
                }}
              >
                Docked histogram
              </MenuItem>
              <MenuItem
                selected={shell.histogramVisible && shell.histogramDetached}
                hint="⇧H"
                onSelect={() => {
                  shell.setHistogramVisible(true);
                  shell.setHistogramDetached(true);
                  close();
                }}
              >
                Floating histogram
              </MenuItem>
              <MenuItem
                selected={!shell.histogramVisible}
                hint="H"
                onSelect={() => {
                  shell.setHistogramVisible(false);
                  close();
                }}
              >
                Hide histogram
              </MenuItem>
              {shell.histogramVisible && shell.histogramDetached && shell.histogramPosition !== null && (
                <>
                  <Separator />
                  <MenuAction
                    label="Reset position"
                    onSelect={() => {
                      shell.setHistogramPosition(null);
                      close();
                    }}
                  />
                </>
              )}
            </>
          )}
        </Popover>
      </div>

      <div className="sr-only min-w-0 max-w-[40%] items-center gap-2 text-[12.5px] sm:not-sr-only sm:flex">
        <span className="truncate font-medium text-[var(--ui-text)]">{imageName}</span>
        {edited && <span className="shrink-0 rounded-full bg-white/[0.07] px-2 py-0.5 text-[10.5px] text-[var(--ui-text-2)]">Edited</span>}
      </div>

      <div className="flex flex-1 items-center justify-end gap-1">
        <IconButton label="Undo" shortcut="⌘Z" onClick={handleUndo} disabled={historyIndex === 0}>
          <IconArrowBackUp size={17} stroke={1.6} />
        </IconButton>
        <IconButton label="Redo" shortcut="⇧⌘Z" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
          <IconArrowForwardUp size={17} stroke={1.6} />
        </IconButton>
        <IconButton label="Search commands" shortcut="⌘K" onClick={() => setIsCommandBarOpen(true)}>
          <IconCommand size={16} stroke={1.6} />
        </IconButton>
        <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
        <Button variant="primary" icon={<IconDownload size={15} stroke={2} />} onClick={() => setIsExportModalOpen(true)}>
          Export
        </Button>
      </div>
    </header>
  );
}
