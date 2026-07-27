"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconCommand, IconKeyboard, IconSearch, IconX } from "@tabler/icons-react";

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
          className="fixed inset-0 z-[120] bg-black/72 p-4 backdrop-blur-md md:p-8"
          onClick={onClose}
        >
              <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="mx-auto mt-20 w-full max-w-2xl overflow-hidden border border-white/10 bg-[#1c1c1e] shadow-2xl rounded-xl"
          onClick={(event) => event.stopPropagation()}
        >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <IconSearch className="intaglio-icon text-blue-400"/>
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
            placeholder="Search commands..."
            className="w-full bg-transparent text-sm text-[var(--intaglio-paper)] outline-none placeholder:text-[rgba(231,223,208,0.28)]"
          />
          <div role="button" tabIndex={0}
            onClick={onClose}
            className="p-1.5 text-white/40 transition hover:bg-white/10 hover:text-[var(--intaglio-paper)]"
          >
            <IconX className="intaglio-icon"/>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-white/35">
              No matching commands.
            </div>
          ) : (
            filteredCommands.map((command) => (
              <div role="button" tabIndex={0}
                key={command.id}
                aria-disabled={command.disabled}
                onClick={() => {
                  command.run();
                  onClose();
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <span>
                  <span className="block text-sm text-white">
                    {command.title}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                    {command.section}
                  </span>
                </span>
                {command.shortcut && (
                  <kbd className="border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[rgba(231,223,208,0.46)]">
                    {command.shortcut}
                  </kbd>
                )}
              </div>
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/72 p-4 backdrop-blur-md md:p-8"
          onClick={onClose}
        >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="mx-auto mt-20 w-full max-w-2xl overflow-hidden border border-white/10 bg-[#1c1c1e] shadow-2xl rounded-xl"
          onClick={(event) => event.stopPropagation()}
        >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-white">
              <IconKeyboard className="intaglio-icon text-blue-400"/>
              <h2 className="font-mono text-sm uppercase tracking-[0.3em]">
                Shortcuts
              </h2>
            </div>
            <p className="mt-2 text-xs text-white/40">
              Keyboard-first controls for editing without breaking flow.
            </p>
          </div>
          <div role="button" tabIndex={0}
            onClick={onClose}
            className="p-1.5 text-white/35 transition hover:bg-white/10 hover:text-white"
          >
            <IconX className="intaglio-icon"/>
          </div>
        </div>

        <div className="grid gap-2 p-4 md:grid-cols-2">
          {visibleCommands.map((command) => (
            <div
              key={command.id}
              className="flex items-center justify-between border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <span>
                <span className="block text-sm text-white/80">
                  {command.title}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.28em] text-white/30">
                  {command.section}
                </span>
              </span>
              <kbd className="border border-white/10 bg-black px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-blue-400">
                {command.shortcut}
              </kbd>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 px-6 py-4 text-xs text-white/35">
          <IconCommand className="intaglio-icon mr-2 inline text-white/25"/>
          Press Cmd/Ctrl + K for the command bar.
        </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
