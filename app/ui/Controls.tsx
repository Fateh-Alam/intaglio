"use client";

import React, { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Tooltip } from "./Tooltip";

interface SegmentedProps<T extends string> {
  value: T;
  options: ReadonlyArray<{ id: T; label: React.ReactNode; hint?: string }>;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  appearance?: "inset" | "tabs";
  label?: string;
  className?: string;
}

/** An exclusive choice group with keyboard navigation and a shared selection indicator. */
export function Segmented<T extends string>({
  value, options, onChange, size = "sm", appearance = "inset", label, className = "",
}: SegmentedProps<T>) {
  const group = useId();
  const reduceMotion = useReducedMotion();
  const tabs = appearance === "tabs";
  const selected = options.findIndex((option) => option.id === value);
  const height = tabs ? "h-10" : size === "sm" ? "h-8" : "h-9";

  const navigate = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="radio"]'));
    const from = buttons.indexOf(event.target as HTMLButtonElement);
    if (from < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown": next = (from + 1) % buttons.length; break;
      case "ArrowLeft":
      case "ArrowUp": next = (from - 1 + buttons.length) % buttons.length; break;
      case "Home": next = 0; break;
      case "End": next = buttons.length - 1; break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
    buttons[next].focus();
    if (next !== selected) onChange(options[next].id);
  };

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={navigate}
      className={`flex ${height} min-w-0 items-center ${tabs
        ? "gap-0.5 border-b border-[var(--ui-line-strong)]"
        : "gap-0.5 rounded-[9px] bg-black/25 p-[3px] ring-1 ring-inset ring-[var(--ui-line)]"} ${className}`}>
      {options.map((option, index) => {
        const active = index === selected;
        const button = (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={index === Math.max(0, selected) ? 0 : -1}
            onClick={() => onChange(option.id)}
            className={`ui-focus relative flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center rounded-[6px] px-2 text-[11.5px] font-medium transition-colors motion-reduce:transition-none ${active
              ? "text-[var(--ui-text)]"
              : "text-[var(--ui-text-2)] hover:bg-white/[0.05] hover:text-[var(--ui-text)]"}`}
          >
            {active && (
              <motion.span
                aria-hidden
                layoutId={`seg-${group}`}
                initial={false}
                className={tabs
                  ? "pointer-events-none absolute inset-x-1 bottom-[-1px] h-0.5 rounded-t-full bg-[var(--ui-accent)]"
                  : "pointer-events-none absolute inset-0 rounded-[6px] bg-[var(--ui-raised)] shadow-[0_1px_3px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-[var(--ui-line-strong)]"}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap ${tabs && active ? "font-semibold" : ""}`}>{option.label}</span>
          </button>
        );
        return option.hint ? <Tooltip key={option.id} content={option.hint} className="h-full min-w-0 flex-1">{button}</Tooltip> : button;
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

export function Switch({
  checked,
  onChange,
  label,
  hint,
  shortcut,
  disabled,
  disabledHint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  shortcut?: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const id = useId();
  const effectiveHint = disabled && disabledHint ? disabledHint : hint;
  const text = (
    <label
      htmlFor={id}
      className={`text-[12px] ${disabled ? "cursor-not-allowed text-[var(--ui-text-3)]" : "cursor-pointer text-[var(--ui-text-2)]"}`}
    >
      {label}
    </label>
  );
  return (
    <div>
      <div className={`flex h-8 items-center justify-between ${disabled ? "opacity-45" : ""}`}>
        {effectiveHint ? <Tooltip content={effectiveHint} shortcut={shortcut} side="left">{text}</Tooltip> : text}
        <button
          id={id}
          type="button"
          role="switch"
          disabled={disabled}
          aria-checked={checked}
          aria-disabled={disabled ? "true" : undefined}
          aria-keyshortcuts={shortcut}
          onClick={() => !disabled && onChange(!checked)}
          className={`ui-focus relative h-[18px] w-[30px] shrink-0 rounded-full transition-colors duration-200 ${disabled ? "cursor-not-allowed" : ""}`}
          style={{ backgroundColor: checked ? "var(--ui-accent)" : "var(--ui-line-strong)" }}
        >
          <span
            className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-[left] duration-200"
            style={{ left: checked ? 14 : 2, transitionTimingFunction: "var(--ui-ease)" }}
          />
        </button>
      </div>
      {disabled && disabledHint && (
        <p className="-mt-1 pb-1 text-[10.5px] leading-tight text-[var(--ui-text-3)]">{disabledHint}</p>
      )}
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
