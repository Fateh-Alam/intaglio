"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconDeviceDesktop } from "@tabler/icons-react";

interface MobileLimitationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** A gentle note on small screens. Everything still works; it is just roomier on a computer. */
export default function MobileLimitationModal({ isOpen, onClose }: MobileLimitationModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="small-screen-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            className="ui-root relative w-full max-w-sm rounded-t-[22px] bg-[var(--ui-panel)] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] ring-1 ring-inset ring-[var(--ui-line)] shadow-[var(--ui-shadow-pop)] sm:rounded-[22px]"
          >
            <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-white/15 sm:hidden" aria-hidden />
            <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-white/[0.05] text-[var(--ui-text-2)] ring-1 ring-inset ring-white/[0.08]">
              <IconDeviceDesktop size={22} stroke={1.5} />
            </div>
            <h2 id="small-screen-title" className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-[var(--ui-text)]">
              Roomier on a bigger screen
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ui-text-2)]">
              Every tool works here, but sliders, masks and the 1:1 loupe are easier to use on a tablet or computer.
            </p>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="ui-focus mt-6 h-11 w-full rounded-[12px] bg-[var(--ui-accent)] text-[14px] font-semibold text-white transition-colors hover:bg-[var(--ui-accent-strong)]"
            >
              Continue anyway
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
