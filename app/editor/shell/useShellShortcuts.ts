"use client";

import { useEffect } from "react";
import { useShell } from "./useShell";

const isTypingTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return Boolean(element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT" || element.isContentEditable));
};

/** Lightroom-compatible view shortcuts. Editing shortcuts (⌘Z, ratings, flags) live in the editor state. */
export function useShellShortcuts(enabled: boolean) {
  const shell = useShell();

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
      if (key === "e") return run(() => shell.setRightMode("develop"));
      if (key === "m") return run(() => shell.setRightMode("masks"));
      if (key === "t") return run(() => shell.setRightMode("text"));
      if (event.key === "Tab") return run(() => shell.setPanelsHidden(!shell.panelsHidden));
      if (event.key === "Escape" && shell.preview) return run(() => shell.setPreview(null));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, shell]);
}
