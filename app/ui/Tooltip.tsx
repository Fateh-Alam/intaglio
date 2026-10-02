"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: React.ReactNode;
  shortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
  children: React.ReactElement;
}

/**
 * Portal tooltip so it is never clipped by scrolling panels. Shows after a
 * short hover delay and hides immediately on leave or press.
 */
export function Tooltip({ content, shortcut, side = "bottom", delay = 450, children }: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = side === "left" ? rect.left - 8 : side === "right" ? rect.right + 8 : rect.left + rect.width / 2;
      const y = side === "top" ? rect.top - 8 : side === "bottom" ? rect.bottom + 8 : rect.top + rect.height / 2;
      setPosition({ x, y });
    }, delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPosition(null);
  };

  const transform = {
    top: "translate(-50%, -100%)",
    bottom: "translate(-50%, 0)",
    left: "translate(-100%, -50%)",
    right: "translate(0, -50%)",
  }[side];

  return (
    <span ref={anchorRef} className="inline-flex" onPointerEnter={show} onPointerLeave={hide} onPointerDown={hide}>
      {children}
      {position && typeof document !== "undefined" && createPortal(
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[1000] max-w-[260px] rounded-[8px] px-2.5 py-1.5 text-[11.5px] leading-snug text-[var(--ui-text)] ui-glass animate-in fade-in zoom-in-95 duration-150"
          style={{ left: position.x, top: position.y, transform }}
        >
          <span>{content}</span>
          {shortcut && (
            <kbd className="ml-2 rounded-[4px] bg-white/10 px-1.5 py-[1px] font-sans text-[10.5px] text-[var(--ui-text-2)]">{shortcut}</kbd>
          )}
        </div>,
        document.body,
      )}
    </span>
  );
}
