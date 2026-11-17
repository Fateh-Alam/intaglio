"use client";

import React from "react";
import { IconColumns2, IconCrop, IconGridDots, IconMinus, IconPhoto, IconPlus, IconSquareHalf, IconSunHigh } from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import type { GridOverlayMode } from "../../types/editor";
import { IconButton } from "../../ui/Controls";
import { MenuItem, Popover } from "../../ui/Popover";
import { Tooltip } from "../../ui/Tooltip";
import { SURROUND_COLORS, useShell, type Surround } from "./useShell";
import { useCrop } from "../crop/useCrop";

const GRID_MODES: ReadonlyArray<{ id: GridOverlayMode; label: string }> = [
  { id: "none", label: "None" },
  { id: "1:1", label: "Square 1:1" },
  { id: "4:5", label: "Portrait 4:5" },
  { id: "9:16", label: "Story 9:16" },
  { id: "carousel-4:5-2", label: "Carousel ×2" },
  { id: "carousel-4:5-3", label: "Carousel ×3" },
  { id: "title-safe", label: "Title safe" },
  { id: "action-safe", label: "Action safe" },
];

const SURROUNDS: ReadonlyArray<{ id: Surround; label: string }> = [
  { id: "black", label: "Black" },
  { id: "dark", label: "Dark grey" },
  { id: "medium", label: "Medium grey" },
];

function Divider() {
  return <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />;
}

/** Floating view controls: compare, clipping, overlays, zoom, surround. */
export function CanvasToolbar({ zoom, onZoom }: { zoom: number; onZoom: (zoom: number) => void }) {
  const { gridOverlayMode, setGridOverlayMode } = useEditorState();
  const shell = useShell();
  const { open: openCrop } = useCrop();

  return (
    <div className="ui-glass absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center rounded-[14px] p-1">
      <IconButton
        label={shell.compare === "before" ? "Showing before" : "Show before"}
        shortcut="\"
        tooltipSide="top"
        active={shell.compare === "before"}
        onClick={() => shell.setCompare(shell.compare === "before" ? "off" : "before")}
      >
        <IconPhoto size={17} stroke={1.6} />
      </IconButton>
      <IconButton
        label="Before / after split"
        shortcut="Y"
        tooltipSide="top"
        active={shell.compare === "split"}
        onClick={() => shell.setCompare(shell.compare === "split" ? "off" : "split")}
      >
        <IconColumns2 size={17} stroke={1.6} />
      </IconButton>
      <IconButton
        label="Show clipping"
        shortcut="J"
        tooltipSide="top"
        active={shell.showClipping}
        onClick={() => shell.setShowClipping(!shell.showClipping)}
      >
        <IconSunHigh size={17} stroke={1.6} />
      </IconButton>

      <Divider />

      <IconButton label="Crop & Straighten" shortcut="R" tooltipSide="top" onClick={openCrop}>
        <IconCrop size={17} stroke={1.6} />
      </IconButton>
      <Popover
        width={200}
        trigger={({ open, toggle }) => (
          <IconButton label="Crop guides" tooltipSide="top" active={open || gridOverlayMode !== "none"} onClick={toggle}>
            <IconGridDots size={17} stroke={1.6} />
          </IconButton>
        )}
      >
        {(close) => GRID_MODES.map((mode) => (
          <MenuItem key={mode.id} selected={gridOverlayMode === mode.id} onSelect={() => { setGridOverlayMode(mode.id); close(); }}>
            {mode.label}
          </MenuItem>
        ))}
      </Popover>
      <Popover
        width={190}
        trigger={({ open, toggle }) => (
          <IconButton label="Background" tooltipSide="top" active={open} onClick={toggle}>
            <IconSquareHalf size={17} stroke={1.6} />
          </IconButton>
        )}
      >
        {(close) => SURROUNDS.map((item) => (
          <MenuItem key={item.id} selected={shell.surround === item.id} onSelect={() => { shell.setSurround(item.id); close(); }}>
            <span className="h-3.5 w-3.5 rounded-[4px] ring-1 ring-white/20" style={{ background: SURROUND_COLORS[item.id] }} />
            {item.label}
          </MenuItem>
        ))}
      </Popover>

      <Divider />

      <IconButton label="Zoom out" shortcut="⌘−" tooltipSide="top" onClick={() => onZoom(zoom / 1.5)} disabled={zoom <= 0.25}>
        <IconMinus size={16} stroke={1.8} />
      </IconButton>
      <Tooltip content="Fit to window" shortcut="⌘0" side="top">
        <button
          type="button"
          onClick={() => onZoom(1)}
          className="ui-focus ui-num h-8 min-w-[52px] rounded-[8px] px-2 text-[11.5px] font-medium text-[var(--ui-text-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
        >
          {zoom === 1 ? "Fit" : `${Number(zoom.toFixed(2))}×`}
        </button>
      </Tooltip>
      <IconButton label="Zoom in" shortcut="⌘+" tooltipSide="top" onClick={() => onZoom(zoom * 1.5)} disabled={zoom >= 8}>
        <IconPlus size={16} stroke={1.8} />
      </IconButton>
    </div>
  );
}
