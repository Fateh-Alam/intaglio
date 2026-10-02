"use client";

import React, { useState } from "react";
import { IconCamera, IconColumns2, IconPlus, IconTrash } from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import { Button, IconButton } from "../../ui/Controls";
import { useShell } from "./useShell";

function Heading({ children }: { children: React.ReactNode }) {
  return <div className="px-1.5 pb-1.5 pt-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ui-text-3)]">{children}</div>;
}

/** Named versions of the edit (virtual copies) and image snapshots for comparison. */
export function VersionsTab() {
  const {
    settingsSnapshots, setSettingsSnapshots, activeVirtualCopyId, handleCreateVirtualCopy, handleRestoreVirtualCopy, handleDeleteVirtualCopy,
    snapshots, handleTakeSnapshot, handleCompareSnapshot, handleDeleteSnapshot, settings, updateSetting,
  } = useEditorState();
  const shell = useShell();
  const [renaming, setRenaming] = useState<string | null>(null);

  const rename = (id: string, name: string) => {
    const trimmed = name.trim();
    if (trimmed) setSettingsSnapshots((current) => current.map((copy) => copy.id === id ? { ...copy, name: trimmed } : copy));
    setRenaming(null);
  };

  return (
    <div className="ui-scroll h-full overflow-y-auto px-2 pb-4" onPointerLeave={() => shell.setPreview(null)}>
      <Heading>Versions</Heading>
      <p className="px-1.5 pb-2 text-[11.5px] leading-relaxed text-[var(--ui-text-3)]">
        Save the current edit as a version, try something bold, and switch back any time.
      </p>
      <Button className="mb-2 w-full" icon={<IconPlus size={15} />} onClick={() => handleCreateVirtualCopy()}>
        Save current edit as version
      </Button>
      {settingsSnapshots.map((copy) => {
        const active = copy.id === activeVirtualCopyId;
        return (
          <div
            key={copy.id}
            onPointerEnter={() => shell.setPreview(copy.settings)}
            className={`group/version flex items-center gap-2 rounded-[9px] px-2 py-1.5 transition-colors ${active ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"}`}
          >
            {renaming === copy.id ? (
              <input
                autoFocus
                defaultValue={copy.name}
                onBlur={(event) => rename(copy.id, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") rename(copy.id, event.currentTarget.value);
                  if (event.key === "Escape") setRenaming(null);
                }}
                className="h-7 min-w-0 flex-1 rounded-[6px] bg-black/40 px-2 text-[12px] outline-none ring-1 ring-[var(--ui-accent)]"
              />
            ) : (
              <button
                type="button"
                onClick={() => { shell.setPreview(null); handleRestoreVirtualCopy(copy.id); }}
                onDoubleClick={() => setRenaming(copy.id)}
                title="Click to switch · double-click to rename"
                className="ui-focus min-w-0 flex-1 truncate rounded-[6px] py-1 text-left text-[12px] text-[var(--ui-text)]"
              >
                {copy.name}
              </button>
            )}
            {active && <span className="text-[10.5px] text-[var(--ui-accent-strong)]">Current</span>}
            <IconButton label="Delete version" size="sm" className="opacity-0 group-hover/version:opacity-100" onClick={() => handleDeleteVirtualCopy(copy.id)}>
              <IconTrash size={14} />
            </IconButton>
          </div>
        );
      })}

      <Heading>Snapshots</Heading>
      <p className="px-1.5 pb-2 text-[11.5px] leading-relaxed text-[var(--ui-text-3)]">
        Freeze how the photo looks right now and compare it side by side with later edits.
      </p>
      <Button className="mb-2 w-full" icon={<IconCamera size={15} />} onClick={() => void handleTakeSnapshot()}>
        Take snapshot
      </Button>
      <div className="grid grid-cols-2 gap-2">
        {snapshots.map((snapshot) => (
          <div key={snapshot.id} className="group/snap relative overflow-hidden rounded-[9px] bg-black ring-1 ring-[var(--ui-line)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={snapshot.url} alt="" className="aspect-[4/3] w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 transition-opacity group-hover/snap:opacity-100">
              <IconButton label="Compare with current" size="sm" onClick={() => { handleCompareSnapshot(snapshot.url); shell.setCompare("split"); }}>
                <IconColumns2 size={14} />
              </IconButton>
              <IconButton label="Delete snapshot" size="sm" onClick={() => handleDeleteSnapshot(snapshot.id)}>
                <IconTrash size={14} />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
      {settings.compareTexture && (
        <Button variant="ghost" className="mt-2 w-full" onClick={() => { updateSetting("compareTexture", null); shell.setCompare("off"); }}>
          Stop comparing with snapshot
        </Button>
      )}
    </div>
  );
}
