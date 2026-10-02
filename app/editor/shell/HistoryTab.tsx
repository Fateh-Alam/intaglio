"use client";

import React from "react";
import { useEditorState } from "../hooks/useEditorState";
import { Button } from "../../ui/Controls";
import { useShell } from "./useShell";

const timeLabel = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Every edit, newest first. Hover to preview a step on the photo; click to go back to it. */
export function HistoryTab() {
  const { history, historyIndex, handleJumpToHistory, handleClearHistory } = useEditorState();
  const shell = useShell();
  const entries = history.map((entry, index) => ({ entry, index })).reverse();

  return (
    <div className="flex h-full flex-col" onPointerLeave={() => shell.setPreview(null)}>
      <ol className="ui-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3" aria-label="Edit history">
        {entries.map(({ entry, index }) => {
          const current = index === historyIndex;
          const undone = index > historyIndex;
          return (
            <li key={entry.id}>
              <button
                type="button"
                aria-current={current ? "step" : undefined}
                onPointerEnter={() => shell.setPreview(current ? null : entry.settings)}
                onClick={() => { shell.setPreview(null); handleJumpToHistory(index); }}
                className={`ui-focus group/step flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-left transition-colors ${current ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"}`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${current ? "bg-[var(--ui-accent)]" : undone ? "bg-white/15" : "bg-white/35"}`} />
                <span className={`min-w-0 flex-1 truncate text-[12px] ${undone ? "text-[var(--ui-text-3)] line-through decoration-white/20" : "text-[var(--ui-text)]"}`}>{entry.action}</span>
                <span className="ui-num shrink-0 text-[11px] text-[var(--ui-text-3)]">{timeLabel(entry.timestamp)}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex items-center justify-between border-t border-[var(--ui-line)] px-3 py-2.5">
        <span className="text-[11px] text-[var(--ui-text-3)]">{history.length} {history.length === 1 ? "step" : "steps"}</span>
        <Button variant="ghost" onClick={handleClearHistory} disabled={history.length <= 1}>Clear history</Button>
      </div>
    </div>
  );
}
