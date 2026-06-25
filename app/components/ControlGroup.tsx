"use client";

import React, { useState } from "react";

const ControlGroup = ({
  title,
  children,
  defaultOpen = true,
  accentColor = "amber",
  icon,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
  icon?: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const accentBorders: Record<string, string> = {
    amber: "before:bg-[var(--ormond-brass)]",
    purple: "before:bg-[var(--ormond-oxblood)]",
    cyan: "before:bg-[var(--ormond-green)]",
    orange: "before:bg-[var(--ormond-copper)]",
    green: "before:bg-[var(--ormond-olive)]",
  };

  return (
    <div
      className={`relative border border-[var(--ormond-line)] bg-[rgba(20,19,15,0.56)] p-4 transition-all before:absolute before:left-0 before:top-0 before:h-full before:w-[2px] ${accentBorders[accentColor] || accentBorders.amber}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center justify-between pb-3 text-left"
      >
        <h3 className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[rgba(231,223,208,0.58)] transition group-hover:text-[var(--ormond-paper)]">
          {icon && <span className="text-[rgba(231,223,208,0.36)]">{icon}</span>}
          {title}
        </h3>
        <svg
          className={`h-4 w-4 text-[rgba(231,223,208,0.32)] transition-transform duration-300 group-hover:text-[rgba(231,223,208,0.62)] ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-4 border-t border-[var(--ormond-line)] pt-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ControlGroup;
