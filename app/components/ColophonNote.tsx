"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { COLOPHON, COLOPHON_EVENT, COLOPHON_PASSPHRASE, openColophon } from "../lib/colophon";
import { BrandMark } from "../editor/shell/TopBar";

const IDLE_RESET_MS = 2500;
const TAP_WINDOW_MS = 2500;
const REQUIRED_TAPS = 5;

const isTypingElement = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT" ||
    element.isContentEditable
  );
};

interface ColophonCardProps {
  compact?: boolean;
  titleId?: string;
  onClose?: () => void;
}

export function ColophonCard({ compact = false, titleId, onClose }: ColophonCardProps) {
  return (
    <div className={compact ? "px-5 py-6 text-left" : "px-7 py-8 text-left sm:px-9 sm:py-10"}>
      <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-white/40">
        {COLOPHON.eyebrow}
      </p>
      <h2
        id={titleId}
        className={`type-display mt-3 text-white ${compact ? "text-[30px] leading-[1.08]" : "text-[38px] leading-[1.05] sm:text-[44px]"}`}
      >
        {COLOPHON.heading}
      </h2>
      <div className={`mt-5 space-y-3.5 text-white/70 ${compact ? "text-[13.5px] leading-[1.68]" : "text-[15px] leading-[1.72]"}`}>
        {COLOPHON.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="mt-6 border-t border-white/[0.08] pt-5">
        <p className="text-[14px] text-white/85">{COLOPHON.closing}</p>
        <p className="type-display mt-0.5 text-[24px] italic text-white/90">
          {COLOPHON.signature}
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
        <span>{COLOPHON.stamp}</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ui-focus rounded px-2 py-1 text-white/45 transition-colors hover:text-white"
          >
            Close [Esc]
          </button>
        )}
      </div>
    </div>
  );
}

/** Visually identical footer mark; five rapid taps open the colophon on touch devices. */
export function ColophonFooterMark({ size = 18 }: { size?: number }) {
  const tapsRef = useRef<{ count: number; lastAt: number }>({ count: 0, lastAt: 0 });

  const handleClick = () => {
    const now = Date.now();
    const withinWindow = now - tapsRef.current.lastAt <= TAP_WINDOW_MS;
    const nextCount = withinWindow ? tapsRef.current.count + 1 : 1;
    tapsRef.current = { count: nextCount, lastAt: now };
    if (nextCount >= REQUIRED_TAPS) {
      tapsRef.current = { count: 0, lastAt: 0 };
      openColophon();
    }
  };

  return (
    <span onClick={handleClick} className="inline-flex select-none">
      <BrandMark size={size} />
    </span>
  );
}

declare global {
  interface Window {
    __etchColophonLogged?: boolean;
  }
}

/** Site-wide text-based colophon listener (passphrase + console note). */
export function ColophonNote() {
  const [isOpen, setIsOpen] = useState(false);
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || window.__etchColophonLogged) return;
    window.__etchColophonLogged = true;
    console.log(
      `%c${COLOPHON.eyebrow.toUpperCase()}\n%c${COLOPHON.heading}\n\n${COLOPHON.paragraphs.join("\n\n")}\n\n${COLOPHON.closing}\n${COLOPHON.signature}\n\n%c${COLOPHON.stamp} · /humans.txt`,
      "font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; letter-spacing: 0.16em; color: #7aafff;",
      "font-family: ui-sans-serif, -apple-system, sans-serif; font-size: 12px; line-height: 1.6; color: #d4d4d8;",
      "font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; letter-spacing: 0.12em; color: #71717a;"
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOpenEvent = () => setIsOpen(true);

    const onKeyDown = (event: KeyboardEvent) => {
      if (isOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(false);
        }
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingElement(event.target)) return;

      const key = event.key.toLowerCase();
      if (!/^[a-z]$/.test(key)) return;

      const now = Date.now();
      if (now - lastKeyTimeRef.current > IDLE_RESET_MS) {
        bufferRef.current = "";
      }
      lastKeyTimeRef.current = now;

      bufferRef.current = (bufferRef.current + key).slice(-COLOPHON_PASSPHRASE.length);
      if (bufferRef.current === COLOPHON_PASSPHRASE) {
        bufferRef.current = "";
        setIsOpen(true);
      }
    };

    window.addEventListener(COLOPHON_EVENT, onOpenEvent);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener(COLOPHON_EVENT, onOpenEvent);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="etch-colophon-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="w-full max-w-[490px] rounded-[16px] border border-white/[0.1] bg-[#0c0c0d] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.95)]"
            onClick={(event) => event.stopPropagation()}
          >
            <ColophonCard titleId="etch-colophon-title" onClose={() => setIsOpen(false)} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
