"use client";

import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

const Toggle = ({ checked, onChange, className = "" }: ToggleProps) => {
  return (
    <div role="button" tabIndex={0}
      
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner ${
        checked ? "bg-blue-500 border border-blue-500" : "bg-white/10 border border-white/5"
      } ${className}`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-md ${
          checked ? "left-[1.125rem]" : "left-0.5"
        }`}
      />
    </div>
  );
};

export default Toggle;
