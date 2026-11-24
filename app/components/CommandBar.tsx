"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconCommand, IconKeyboard, IconSearch, IconX } from "@tabler/icons-react";
import { isColophonQuery } from "../lib/colophon";
import { ColophonCard } from "./ColophonNote";

export interface AppCommand {
  id: string;
  title: string;
  section: string;
  shortcut?: string;
  keywords?: string[];
  disabled?: boolean;
  run: () => void;
}

interface CommandBarProps {
  isOpen: boolean;
  commands: AppCommand[];
  onClose: () => void;
}

export function CommandBar({ isOpen, commands, onClose }: CommandBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      setQuery("");
      inputRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return commands;

    return commands.filter((command) => {
      const haystack = [
        command.title,
        command.section,
        command.shortcut,
        ...(command.keywords ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [commands, query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/70 p-4 backdrop-blur-md md:p-8"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command bar"
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
            className="ui-root mx-auto mt-16 w-full max-w-xl overflow-hidden rounded-[16px] bg-[var(--ui-panel)] ring-1 ring-inset ring-[var(--ui-line-strong)] shadow-[var(--ui-shadow-pop)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--ui-line)] px-4 py-3.5">
              <IconSearch size={16} stroke={1.8} className="shrink-0 text-[var(--ui-accent-strong)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") onClose();
                  if (event.key === "Enter") {
                    const command = filteredCommands.find((item) => !item.disabled);
                    if (command) {
                      command.run();
                      onClose();
                    }
                  }
                }}
                placeholder="Search commands…"
                className="w-full bg-transparent text-[13.5px] text-[var(--ui-text)] outline-none placeholder:text-[var(--ui-text-3)]"
              />
              <button
                type="button"
                aria-label="Close command bar"
                onClick={onClose}
                className="ui-focus grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-[var(--ui-text-3)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
              >
                <IconX size={15} />
              </button>
            </div>

            <div className="ui-scroll max-h-[400px] overflow-y-auto p-1.5">
              {filteredCommands.length === 0 ? (
                isColophonQuery(query) ? (
                  <ColophonCard compact onClose={onClose} />
                ) : (
                  <div className="px-4 py-10 text-center text-[12.5px] text-[var(--ui-text-3)]">
                    No matching commands.
                  </div>
                )
              ) : (
                filteredCommands.map((command) => (
                  <button
                    type="button"
                    key={command.id}
                    disabled={command.disabled}
                    onClick={() => {
                      if (command.disabled) return;
                      command.run();
                      onClose();
                    }}
                    className="ui-focus flex w-full items-center justify-between rounded-[9px] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] disabled:pointer-events-none disabled:opacity-35"
                  >
                    <span>
                      <span className="block text-[13px] font-medium text-[var(--ui-text)]">
                        {command.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[var(--ui-text-3)]">
                        {command.section}
                      </span>
                    </span>
                    {command.shortcut && (
                      <kbd className="rounded-[6px] bg-white/[0.07] px-2 py-0.5 font-sans text-[11px] font-medium text-[var(--ui-text-2)] ring-1 ring-inset ring-[var(--ui-line)]">
                        {command.shortcut}
                      </kbd>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ShortcutHelp({
  isOpen,
  commands,
  onClose,
}: CommandBarProps) {
  const visibleCommands = commands.filter((command) => command.shortcut);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/70 p-4 backdrop-blur-md md:p-8"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-help-title"
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
            className="ui-root mx-auto mt-14 w-full max-w-2xl overflow-hidden rounded-[16px] bg-[var(--ui-panel)] ring-1 ring-inset ring-[var(--ui-line-strong)] shadow-[var(--ui-shadow-pop)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[var(--ui-line)] px-6 py-5">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-accent-strong)]">
                  <IconKeyboard size={14} stroke={1.8} />
                  Keyboard
                </div>
                <h2 id="shortcuts-help-title" className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-[var(--ui-text)]">
                  Shortcuts
                </h2>
                <p className="mt-1 text-[12px] text-[var(--ui-text-2)]">
                  Keyboard-first controls for editing without breaking flow.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close shortcuts"
                onClick={onClose}
                className="ui-focus grid h-8 w-8 place-items-center rounded-[8px] text-[var(--ui-text-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
              >
                <IconX size={16} />
              </button>
            </div>

            <div className="ui-scroll grid max-h-[60vh] gap-2 overflow-y-auto p-5 md:grid-cols-2">
              {visibleCommands.map((command) => (
                <div
                  key={command.id}
                  className="flex items-center justify-between rounded-[10px] bg-white/[0.025] px-3.5 py-2.5 ring-1 ring-inset ring-[var(--ui-line)]"
                >
                  <span>
                    <span className="block text-[12.5px] font-medium text-[var(--ui-text)]">
                      {command.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[var(--ui-text-3)]">
                      {command.section}
                    </span>
                  </span>
                  <kbd className="rounded-[6px] bg-white/[0.07] px-2 py-0.5 font-sans text-[11px] font-semibold text-[var(--ui-accent-strong)] ring-1 ring-inset ring-[var(--ui-line)]">
                    {command.shortcut}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-[var(--ui-line)] bg-[var(--ui-chrome)]/60 px-6 py-3.5 text-[12px] text-[var(--ui-text-3)]">
              <IconCommand size={14} stroke={1.8} />
              Press Cmd/Ctrl + K for the command bar.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
