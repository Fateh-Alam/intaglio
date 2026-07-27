"use client";

import React, { useState, useRef, useEffect } from "react";
import { IconChevronDown, IconCheck, IconSearch } from "@tabler/icons-react";

interface FontSelectorProps {
  value: string;
  fonts: string[];
  onChange: (value: string) => void;
  className?: string;
}

export default function FontSelector({
  value,
  fonts,
  onChange,
  className = "",
}: FontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
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

  // Inject Google Fonts link for the preview list
  useEffect(() => {
    if (!isOpen) return; // Only load when opened to save network
    
    const linkId = "font-selector-previews";
    if (document.getElementById(linkId)) return;

    const link = document.createElement("link");
    link.id = linkId;
    const familyParams = fonts.map(f => `family=${f.replace(/\s+/g, '+')}`).join('&');
    link.href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, [isOpen, fonts]);

  const filteredFonts = fonts.filter(f => f.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        role="button" 
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#0a0908] border border-[var(--intaglio-line)] rounded-none px-3 py-2 text-xs flex items-center justify-between transition-colors focus:outline-none focus:border-amber-500/50 hover:bg-white/5 ${
          isOpen ? "border-amber-500/50 bg-white/5" : ""
        }`}
      >
        <span
          className={`truncate ${value ? "text-white" : "text-gray-500"}`}
          style={value ? { fontFamily: `'${value}', sans-serif` } : {}}
        >
          {value || "Select Font..."}
        </span>
        <IconChevronDown className={`text-gray-500 w-4 h-4 transition-transform duration-200 ${ isOpen ? "rotate-180 text-amber-500" : "" }`}/>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#0d0c0a] border border-[var(--intaglio-line)] shadow-xl max-h-72 flex flex-col">
          <div className="p-2 border-b border-[var(--intaglio-line)] relative">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search fonts..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 pl-7 text-[10px] text-white focus:outline-none focus:border-amber-500/50"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1 pb-1">
            {filteredFonts.length === 0 ? (
              <div className="p-3 text-center text-[10px] text-gray-500">No fonts found</div>
            ) : (
              filteredFonts.map((font) => (
                <div
                  key={font}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onChange(font);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`px-3 py-2 flex flex-col hover:bg-white/10 transition-colors ${
                    value === font ? "bg-amber-500/10 text-amber-400" : "text-gray-300"
                  }`}
                >
                  <span style={{ fontFamily: `'${font}', sans-serif`, fontSize: '18px' }}>
                    {font}
                  </span>
                  <span className="text-[9px] text-gray-600 font-sans tracking-widest uppercase mt-0.5">
                    {font}
                  </span>
                </div>
              ))
            )}
            
            {/* Custom Input Fallback */}
            {search && filteredFonts.length === 0 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  onChange(search);
                  setIsOpen(false);
                  setSearch("");
                }}
                className="px-3 py-3 text-xs border-t border-[var(--intaglio-line)] text-amber-400 hover:bg-white/10"
              >
                Use custom: "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
