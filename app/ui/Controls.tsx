"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";
import { Tooltip } from "./Tooltip";

interface SegmentedProps<T extends string> {
  value: T;
  options: ReadonlyArray<{ id: T; label: React.ReactNode; hint?: string }>;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}

/** Pill segmented control with a sliding selection. */
export function Segmented<T extends string>({ value, options, onChange, size = "sm", className = "" }: SegmentedProps<T>) {
  const group = useId();
  const height = size === "sm" ? "h-7" : "h-8";
  return (
    <div role="radiogroup" className={`flex ${height} items-center rounded-[8px] bg-black/30 p-[2px] ring-1 ring-inset ring-[var(--ui-line)] ${className}`}>
      {options.map((option) => {
        const active = option.id === value;
        const button = (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`ui-focus relative flex h-full flex-1 items-center justify-center rounded-[6px] px-2.5 text-[11.5px] font-medium transition-colors ${active ? "text-[var(--ui-text)]" : "text-[var(--ui-text-3)] hover:text-[var(--ui-text-2)]"}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${group}`}
                className="absolute inset-0 rounded-[6px] bg-white/[0.12] shadow-[0_1px_2px_rgba(0,0,0,0.45),inset_0_0.5px_0_rgba(255,255,255,0.08)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">{option.label}</span>
          </button>
        );
        return option.hint ? <Tooltip key={option.id} content={option.hint}>{button}</Tooltip> : button;
      })}
    </div>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  shortcut?: string;
  active?: boolean;
  tooltipSide?: "top" | "bottom" | "left" | "right";
  size?: "sm" | "md";
}

export function IconButton({ label, shortcut, active, tooltipSide = "bottom", size = "md", className = "", children, ...rest }: IconButtonProps) {
  const dimension = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  return (
    <Tooltip content={label} shortcut={shortcut} side={tooltipSide}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={`ui-focus grid ${dimension} place-items-center rounded-[8px] transition-colors disabled:pointer-events-none disabled:opacity-30 ${active ? "bg-white/[0.1] text-[var(--ui-text)]" : "text-[var(--ui-text-2)] hover:bg-white/[0.06] hover:text-[var(--ui-text)]"} ${className}`}
        {...rest}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function Switch({ checked, onChange, label, hint, shortcut }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint?: string; shortcut?: string }) {
  const id = useId();
  const text = <label htmlFor={id} className="cursor-pointer text-[12px] text-[var(--ui-text-2)]">{label}</label>;
  return (
    <div className="flex h-8 items-center justify-between">
      {hint ? <Tooltip content={hint} shortcut={shortcut} side="left">{text}</Tooltip> : text}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-keyshortcuts={shortcut}
        onClick={() => onChange(!checked)}
        className="ui-focus relative h-[18px] w-[30px] shrink-0 rounded-full transition-colors duration-200"
        style={{ backgroundColor: checked ? "var(--ui-accent)" : "var(--ui-line-strong)" }}
      >
        <span
          className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-[left] duration-200"
          style={{ left: checked ? 14 : 2, transitionTimingFunction: "var(--ui-ease)" }}
        />
      </button>
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  icon?: React.ReactNode;
}

export function Button({ variant = "secondary", icon, className = "", children, ...rest }: ButtonProps) {
  const styles = {
    primary: "bg-[var(--ui-accent)] text-white hover:bg-[var(--ui-accent-strong)] shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]",
    secondary: "bg-[var(--ui-control)] text-[var(--ui-text)] hover:bg-[var(--ui-control-hover)] ring-1 ring-inset ring-[var(--ui-line)]",
    ghost: "text-[var(--ui-text-2)] hover:bg-white/[0.06] hover:text-[var(--ui-text)]",
  }[variant];
  return (
    <button
      type="button"
      className={`ui-focus inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] px-3 text-[12px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${styles} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
