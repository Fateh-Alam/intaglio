"use client";

import React, { useState, useRef, useEffect } from "react";
import { IconChevronDown, IconCheck } from "@tabler/icons-react";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const CustomSelect = ({
  value,
  options,
  onChange,
  placeholder = "Select…",
  className = "",
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const selectedOption = options.find((opt) => opt.value === value);

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
        <span className={`truncate ${selectedOption ? "text-[var(--ui-text)]" : "text-[var(--ui-text-3)]"}`}>
          {selectedOption ? selectedOption.label : placeholder}
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
        <div className="ui-scroll absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-[10px] bg-[var(--ui-raised)] p-1 ring-1 ring-inset ring-[var(--ui-line-strong)] shadow-[var(--ui-shadow-pop)]">
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`ui-focus flex w-full items-center justify-between rounded-[7px] px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                option.value === value
                  ? "bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)]"
                  : "text-[var(--ui-text-2)] hover:bg-white/[0.06] hover:text-[var(--ui-text)]"
              }`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <IconCheck size={14} stroke={2} />}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-2.5 py-2 text-center text-[11.5px] text-[var(--ui-text-3)]">
              No options
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
