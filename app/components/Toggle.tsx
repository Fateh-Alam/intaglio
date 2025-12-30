"use client";

import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

const Toggle = ({ checked, onChange, className = "" }: ToggleProps) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
        checked ? "bg-amber-500" : "bg-gray-700"
      } ${className}`}
    >
      <div
        className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 shadow-sm ${
          checked ? "left-5" : "left-1"
        }`}
      />
    </button>
  );
};

export default Toggle;
