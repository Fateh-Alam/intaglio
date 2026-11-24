"use client";

import React, { useState, useRef, useEffect } from "react";
import { IconChevronDown, IconSearch } from "@tabler/icons-react";

interface FontSelectorProps {
  value: string;
  fonts: string[];
  onChange: (value: string) => void;
  className?: string;
}

export default function FontSelector({
  value,
  fonts,
  onChange,
  className = "",
}: FontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const linkId = "font-selector-previews";
    if (document.getElementById(linkId)) return;

    const link = document.createElement("link");
    link.id = linkId;
    const familyParams = fonts.map((f) => `family=${f.replace(/\s+/g, "+")}`).join("&");
    link.href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, [isOpen, fonts]);

  const filteredFonts = fonts.filter((f) => f.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`ui-focus flex h-8 w-full items-center justify-between gap-2 rounded-[8px] bg-black/30 px-2.5 text-[12px] ring-1 ring-inset transition-colors hover:bg-white/[0.04] ${
          isOpen ? "ring-[var(--ui-accent)]" : "ring-[var(--ui-line)]"
        }`}
      >
        <span
          className={`truncate ${value ? "text-[var(--ui-text)]" : "text-[var(--ui-text-3)]"}`}
          style={value ? { fontFamily: `'${value}', sans-serif` } : {}}
        >
          {value || "Select font…"}
        </span>
        <IconChevronDown
          size={14}
          stroke={1.8}
          className={`shrink-0 text-[var(--ui-text-3)] transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[var(--ui-accent-strong)]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-72 flex-col overflow-hidden rounded-[10px] bg-[var(--ui-raised)] ring-1 ring-inset ring-[var(--ui-line-strong)] shadow-[var(--ui-shadow-pop)]">
          <div className="relative border-b border-[var(--ui-line)] p-2">
            <IconSearch
              size={13}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ui-text-3)]"
            />
            <input
              type="text"
              placeholder="Search fonts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-full rounded-[7px] bg-black/35 pl-7 pr-2 text-[11.5px] text-[var(--ui-text)] outline-none ring-1 ring-inset ring-[var(--ui-line)] placeholder:text-[var(--ui-text-3)] focus:ring-[var(--ui-accent)]"
              autoFocus
            />
          </div>
          <div className="ui-scroll flex-1 overflow-y-auto p-1">
            {filteredFonts.length === 0 ? (
              <div className="p-3 text-center text-[11.5px] text-[var(--ui-text-3)]">
                No fonts found
              </div>
            ) : (
              filteredFonts.map((font) => (
                <button
                  type="button"
                  key={font}
                  onClick={() => {
                    onChange(font);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`ui-focus flex w-full flex-col rounded-[7px] px-2.5 py-1.5 text-left transition-colors ${
                    value === font
                      ? "bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)]"
                      : "text-[var(--ui-text-2)] hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
                  }`}
                >
                  <span style={{ fontFamily: `'${font}', sans-serif`, fontSize: "15px" }}>
                    {font}
                  </span>
                  <span className="text-[10px] text-[var(--ui-text-3)]">{font}</span>
                </button>
              ))
            )}

            {search && filteredFonts.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  onChange(search);
                  setIsOpen(false);
                  setSearch("");
                }}
                className="ui-focus w-full rounded-[7px] border-t border-[var(--ui-line)] px-2.5 py-2 text-left text-[11.5px] text-[var(--ui-accent-strong)] hover:bg-[var(--ui-accent-soft)]"
              >
                Use custom font: &ldquo;{search}&rdquo;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
