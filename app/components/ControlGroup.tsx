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
    amber: "border-l-amber-500/50",
    purple: "border-l-purple-500/50",
    cyan: "border-l-cyan-500/50",
    orange: "border-l-orange-500/50",
    green: "border-l-green-500/50",
  };

  return (
    <div
      className={`border-l-2 ${accentBorders[accentColor] || accentBorders.amber} pl-3 transition-all`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 group"
      >
        <h3 className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber-900/70 group-hover:text-amber-700/90 font-semibold transition flex items-center gap-2">
          {icon && <span className="text-gray-500">{icon}</span>}
          {title}
        </h3>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
        <div className="space-y-4 pb-2">{children}</div>
      </div>
    </div>
  );
};

export default ControlGroup;
