"use client";

import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  ariaLabel?: string;
}

const Toggle = ({ checked, onChange, className = "", ariaLabel }: ToggleProps) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`ui-focus relative h-[18px] w-[30px] shrink-0 rounded-full transition-colors duration-200 ${className}`}
      style={{ backgroundColor: checked ? "var(--ui-accent)" : "var(--ui-line-strong)" }}
    >
      <span
        className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-[left] duration-200"
        style={{ left: checked ? 14 : 2, transitionTimingFunction: "var(--ui-ease)" }}
      />
    </button>
  );
};

export default Toggle;
