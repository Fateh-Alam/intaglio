"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { IconArchive, IconArrowRight, IconDeviceDesktop, IconHistory, IconLock, IconPhotoPlus } from "@tabler/icons-react";
import { BrandMark } from "../editor/shell/TopBar";

interface StartScreenProps {
  onOpenImage: () => void;
  onOpenArchive: () => void;
  onTrySample: () => void;
  /** Called with a file dropped anywhere on the screen. */
  onDropFile?: (file: File) => void;
}

const ASSURANCES = [
  { icon: IconLock, text: "Photos stay on this device" },
  { icon: IconHistory, text: "Every edit can be undone" },
  { icon: IconDeviceDesktop, text: "No install, no account" },
];

const ease = [0.2, 0.8, 0.2, 1] as const;

/** The first screen: one calm place to bring a photo in. */
export default function StartScreen({ onOpenImage, onOpenArchive, onTrySample, onDropFile }: StartScreenProps) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  // The whole window is a drop target, so a photo dropped anywhere opens.
  useEffect(() => {
    if (!onDropFile) return;
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current += 1;
      setDragging(true);
    };
    const onOver = (event: DragEvent) => { if (hasFiles(event)) event.preventDefault(); };
    const onLeave = () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      const file = event.dataTransfer?.files?.[0];
      if (file) onDropFile(file);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [onDropFile]);

  return (
    <div className="ui-root relative flex min-h-[100dvh] w-full flex-col overflow-hidden">
      {/* Soft light falling on the work surface. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_38%,rgba(255,255,255,0.055),transparent_70%)]" />

      <header className="relative z-10 flex h-14 items-center justify-between px-5">
        <Link href="/" className="ui-focus flex items-center gap-2.5 rounded-[8px] px-1 text-[var(--ui-text)]">
          <BrandMark size={20} />
          <span className="text-[13px] font-semibold tracking-[-0.01em]">Intaglio</span>
        </Link>
        <Link href="/changelog" className="ui-focus rounded-[8px] px-2.5 py-1.5 text-[12px] text-[var(--ui-text-3)] transition-colors hover:text-[var(--ui-text)]">
          What’s new
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="w-full max-w-[560px]"
        >
          <div
            className={`relative overflow-hidden rounded-[22px] bg-[var(--ui-panel)] p-2 ring-1 ring-inset transition-[box-shadow,background-color] duration-300 ${dragging ? "ring-[var(--ui-accent)] shadow-[0_0_0_6px_var(--ui-accent-soft)]" : "ring-[var(--ui-line)] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]"}`}
          >
            {/* Drop zone */}
            <div className={`flex flex-col items-center rounded-[16px] border border-dashed px-6 pb-8 pt-10 text-center transition-colors duration-300 ${dragging ? "border-[var(--ui-accent)] bg-[var(--ui-accent-soft)]" : "border-white/[0.09] bg-black/20"}`}>
              <div className={`grid h-14 w-14 place-items-center rounded-[16px] ring-1 ring-inset transition-colors ${dragging ? "bg-[var(--ui-accent)] text-white ring-transparent" : "bg-white/[0.04] text-[var(--ui-text-2)] ring-white/[0.08]"}`}>
                <IconPhotoPlus size={26} stroke={1.5} />
              </div>
              <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.02em] text-[var(--ui-text)]">
                {dragging ? "Drop to open" : "Bring in a photo"}
              </h1>
              <p className="mt-2 max-w-[340px] text-[13px] leading-relaxed text-[var(--ui-text-2)]">
                Drop it anywhere on this page, or choose one. JPEG, PNG, WebP and camera RAW.
              </p>
              <button
                type="button"
                onClick={onOpenImage}
                className="ui-focus mt-6 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--ui-accent)] px-5 text-[13px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_8px_24px_-8px_rgba(91,155,255,0.7)] transition-colors hover:bg-[var(--ui-accent-strong)]"
              >
                <span>Open Photograph</span>
                <kbd className="rounded-[5px] bg-black/20 px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-white/80">⌘O</kbd>
              </button>
            </div>

            {/* Other ways in */}
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onTrySample}
                className="ui-focus group flex items-center gap-3 rounded-[14px] bg-white/[0.025] p-2.5 text-left ring-1 ring-inset ring-white/[0.05] transition-colors hover:bg-white/[0.05]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/landing/frame-original.jpg" alt="" className="h-11 w-11 shrink-0 rounded-[9px] object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium text-[var(--ui-text)]">Sample Photograph</span>
                  <span className="block text-[11.5px] text-[var(--ui-text-3)]">Try it with ours</span>
                </span>
                <IconArrowRight size={15} className="mr-1 text-[var(--ui-text-3)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--ui-text-2)]" />
              </button>
              <button
                type="button"
                aria-label="Open Archive .intaglio project"
                onClick={onOpenArchive}
                className="ui-focus group flex items-center gap-3 rounded-[14px] bg-white/[0.025] p-2.5 text-left ring-1 ring-inset ring-white/[0.05] transition-colors hover:bg-white/[0.05]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[9px] bg-white/[0.04] text-[var(--ui-text-2)] ring-1 ring-inset ring-white/[0.06]">
                  <IconArchive size={19} stroke={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium text-[var(--ui-text)]">Open a project</span>
                  <span className="block text-[11.5px] text-[var(--ui-text-3)]">Continue an .intaglio file</span>
                </span>
                <IconArrowRight size={15} className="mr-1 text-[var(--ui-text-3)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--ui-text-2)]" />
              </button>
            </div>
          </div>

          <ul className="mt-7 flex flex-col items-center justify-center gap-x-6 gap-y-2.5 sm:flex-row">
            {ASSURANCES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 whitespace-nowrap text-[12px] text-[var(--ui-text-3)]">
                <Icon size={14} stroke={1.6} />
                {text}
              </li>
            ))}
          </ul>
        </motion.div>
      </main>

      <AnimatePresence>
        {dragging && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none fixed inset-3 z-50 rounded-[24px] ring-2 ring-inset ring-[var(--ui-accent)]/60"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
