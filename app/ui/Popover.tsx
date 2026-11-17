"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface PopoverProps {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  width?: number;
}

/** Lightweight anchored popover that closes on outside click or Escape. */
export function Popover({ trigger, children, side = "top", align = "center", width = 220 }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const horizontal = align === "start" ? { left: 0 } : align === "end" ? { right: 0 } : { left: "50%", x: "-50%" };
  const vertical = side === "top" ? { bottom: "calc(100% + 10px)" } : { top: "calc(100% + 10px)" };

  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: side === "top" ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === "top" ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            className="ui-glass absolute z-50 rounded-[12px] p-1.5"
            style={{ width, ...vertical, ...horizontal }}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({ selected, onSelect, children, hint, disabled }: { selected?: boolean; onSelect: () => void; children: React.ReactNode; hint?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`ui-focus flex h-8 w-full items-center justify-between gap-2 rounded-[8px] px-2.5 text-left text-[12px] transition-colors disabled:opacity-40 ${selected ? "bg-white/[0.1] text-[var(--ui-text)]" : "text-[var(--ui-text-2)] hover:bg-white/[0.06] hover:text-[var(--ui-text)]"}`}
    >
      <span className="flex items-center gap-2">{children}</span>
      {hint && <span className="text-[11px] text-[var(--ui-text-3)]">{hint}</span>}
    </button>
  );
}
