"use client";

import React, { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

const ControlGroup = ({
  title,
  children,
  defaultOpen = true,
  accentColor = "accent",
  icon,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
  icon?: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      data-accent={accentColor}
      className="border-b border-[var(--ui-line)] py-1 last:border-b-0"
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="ui-focus group flex h-9 w-full items-center justify-between rounded-[8px] px-1 text-left transition-colors hover:text-[var(--ui-text)]"
      >
        <span className="flex items-center gap-2 text-[12px] font-semibold tracking-[-0.01em] text-[var(--ui-text)]">
          {icon && (
            <span className="text-[var(--ui-text-3)] transition-colors group-hover:text-[var(--ui-text-2)]">
              {icon}
            </span>
          )}
          {title}
        </span>
        <IconChevronDown
          size={14}
          stroke={1.8}
          className={`text-[var(--ui-text-3)] transition-transform duration-200 group-hover:text-[var(--ui-text-2)] ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && <div className="space-y-3 pb-4 pt-1.5">{children}</div>}
    </section>
  );
};

export default ControlGroup;
