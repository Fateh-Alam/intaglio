"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconChevronRight, IconRotate2 } from "@tabler/icons-react";
import { Tooltip } from "./Tooltip";

interface SectionProps {
  title: string;
  open: boolean;
  /** Alt/Option-click opens only this section (Lightroom "solo"). */
  onToggle: (solo: boolean) => void;
  modified?: boolean;
  onReset?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function Section({ title, open, onToggle, modified, onReset, actions, children }: SectionProps) {
  return (
    <section className="border-b border-[var(--ui-line)]">
      <div className="group/section flex h-11 items-center gap-1 pl-3 pr-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={(event) => onToggle(event.altKey)}
          className="ui-focus flex h-8 flex-1 items-center gap-2 rounded-[7px] pl-1 text-left"
        >
          <IconChevronRight
            size={14}
            stroke={2}
            className="text-[var(--ui-text-3)] transition-transform duration-200 group-hover/section:text-[var(--ui-text-2)]"
            style={{ transform: open ? "rotate(90deg)" : "none", transitionTimingFunction: "var(--ui-ease)" }}
          />
          <span className={`text-[12.5px] font-semibold tracking-[-0.005em] transition-colors ${open ? "text-[var(--ui-text)]" : "text-[var(--ui-text-2)] group-hover/section:text-[var(--ui-text)]"}`}>
            {title}
          </span>
          {modified && <span aria-label="Modified" className="h-[5px] w-[5px] rounded-full bg-[var(--ui-accent)]" />}
        </button>
        {actions}
        {modified && onReset && (
          <Tooltip content={`Reset ${title}`}>
            <button
              type="button"
              onClick={onReset}
              className="ui-focus grid h-7 w-7 place-items-center rounded-[7px] text-[var(--ui-text-3)] opacity-0 transition hover:bg-white/[0.06] hover:text-[var(--ui-text)] group-hover/section:opacity-100 focus-visible:opacity-100"
            >
              <IconRotate2 size={14} stroke={1.75} />
            </button>
          </Tooltip>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Quiet sub-heading that groups controls inside a section (e.g. "Tone"). */
export function SubHeading({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-1.5 mt-4 flex items-center justify-between first:mt-0">
      <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ui-text-3)]">{children}</span>
      {right}
    </div>
  );
}
