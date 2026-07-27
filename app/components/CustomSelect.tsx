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
  placeholder = "Select...",
  className = "",
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div role="button" tabIndex={0}
        
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#0a0908] border border-[var(--intaglio-line)] rounded-none pl-3 pr-2 py-2 text-sm flex items-center justify-between transition-colors focus:outline-none focus:border-amber-500/50 hover:bg-white/5 ${
          isOpen ? "border-amber-500/50 bg-white/5" : ""
        }`}
      >
        <span
          className={`truncate ${selectedOption ? "text-white" : "text-gray-500"}`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <IconChevronDown className={`text-gray-500 transition-transform duration-200 ${ isOpen ? "rotate-180 text-amber-500" : "" }`}/>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
          <div className="py-1">
            {options.map((option) => (
              <div role="button" tabIndex={0}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between group transition-colors ${
                  option.value === value
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value && <IconCheck className="intaglio-icon"/>}
              </div>
            ))}
            {options.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No options
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
