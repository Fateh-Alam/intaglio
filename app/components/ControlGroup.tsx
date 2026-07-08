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

  return (
    <div className="relative border-b border-white/5 bg-transparent transition-colors hover:bg-white/[0.02]">
      <div role="button" tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <h3 className="flex items-center gap-2 text-xs font-medium text-white/70 transition-colors group-hover:text-white">
          {icon && <span className="text-white/40 transition-colors group-hover:text-white/80">{icon}</span>}
          {title}
        </h3>
        <div className="flex items-center justify-center">
          <svg
            className={`h-3.5 w-3.5 text-white/30 transition-transform duration-300 group-hover:text-white/60 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-4 px-4 pb-6 pt-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ControlGroup;
