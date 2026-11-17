"use client";

import { useEffect } from "react";
import { useShell } from "./useShell";
import { useSwitchRightMode } from "./useSwitchRightMode";

const isTypingTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return Boolean(element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT" || element.isContentEditable));
};

/** Lightroom-compatible view shortcuts. Editing shortcuts (⌘Z, ratings, flags) live in the editor state. */
export function useShellShortcuts(enabled: boolean) {
  const shell = useShell();
  const switchMode = useSwitchRightMode();

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const run = (action: () => void) => {
        event.preventDefault();
        action();
      };
      if (event.key === "\\") return run(() => shell.setCompare(shell.compare === "before" ? "off" : "before"));
      if (key === "y") return run(() => shell.setCompare(shell.compare === "split" ? "off" : "split"));
      if (key === "j") return run(() => shell.setShowClipping(!shell.showClipping));
      if (key === "l") return run(() => shell.setLeftOpen(!shell.leftOpen));
      if (key === "e") return run(() => switchMode("develop"));
      if (key === "m") return run(() => switchMode("masks"));
      if (key === "t") return run(() => switchMode("text"));
      if (key === "o" && shell.rightMode === "masks") return run(() => shell.setShowMaskOverlay(!shell.showMaskOverlay));
      if (key === "f" && event.shiftKey) return run(() => shell.setPanelsHidden(!shell.panelsHidden));
      if (event.key === "Escape" && shell.picking) return run(() => shell.setPicking(null));
      if (event.key === "Escape" && shell.preview) return run(() => shell.setPreview(null));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, shell, switchMode]);
}
