"use client";

import { useEffect, useRef } from "react";
import type { AppCommand } from "../../types/editor";
import { isRecipeFilename } from "../../lib/brand";
import { onDesktopMenu, onDesktopOpenFiles } from "../../lib/platform";

interface DesktopBridgeActions {
  commands: AppCommand[];
  openFile: (file: File) => void;
  undo: () => void;
  redo: () => void;
  openCommandBar: () => void;
}

const isEditingText = () => {
  const element = document.activeElement as HTMLElement | null;
  return Boolean(element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable));
};

/**
 * Connects the macOS app's menu bar and Finder "Open With" to the editor. Menu
 * items carry editor command ids, so they run exactly what the command bar
 * and keyboard shortcuts run. Does nothing in the browser.
 */
export function useDesktopBridge(actions: DesktopBridgeActions) {
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });

  useEffect(() => {
    let disposed = false;
    const cleanups: (() => void)[] = [];
    const keep = (cleanup: () => void) => (disposed ? cleanup() : cleanups.push(cleanup));

    void onDesktopMenu((id) => {
      const { commands, undo, redo, openCommandBar } = latest.current;
      // In a text field, Undo/Redo edit the text, as on any Mac.
      if (id === "undo" || id === "redo") {
        if (isEditingText()) document.execCommand(id);
        else if (id === "undo") undo();
        else redo();
        return;
      }
      if (id === "command-bar") return openCommandBar();
      const command = commands.find((candidate) => candidate.id === id);
      if (command && !command.disabled) command.run();
    }).then(keep);

    void onDesktopOpenFiles((files) => {
      // The editor holds one photo: open the first photo or project, else apply the first look.
      const file = files.find((candidate) => !isRecipeFilename(candidate.name)) ?? files[0];
      latest.current.openFile(file);
    }).then(keep);

    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);
}
