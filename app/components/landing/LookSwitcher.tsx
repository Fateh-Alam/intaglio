"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface LookFrame {
  id: string;
  label: string;
  caption: string;
  src: string;
}

/** One photograph rendered several ways. Choosing a look cross-fades the frame. */
export function LookSwitcher({ looks }: { looks: readonly LookFrame[] }) {
  const [active, setActive] = useState(looks[0].id);
  const look = looks.find((item) => item.id === active) ?? looks[0];

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
      <div className="relative order-2 mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-[20px] bg-[#111] shadow-[0_50px_120px_-40px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.06)] lg:order-1">
        <AnimatePresence initial={false}>
          <motion.img
            key={look.id}
            src={look.src}
            alt={`The sample photograph with the ${look.label} look`}
            initial={{ opacity: 0, scale: 1.015 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        </AnimatePresence>
      </div>

      <div className="order-1 lg:order-2">
        <div role="tablist" aria-label="Looks" className="flex flex-col gap-1.5">
          {looks.map((item) => {
            const selected = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(item.id)}
                className={`ui-focus group flex items-center gap-4 rounded-[14px] px-4 py-3.5 text-left transition-colors ${selected ? "bg-white/[0.06] ring-1 ring-inset ring-white/[0.08]" : "hover:bg-white/[0.03]"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt="" className={`h-11 w-11 shrink-0 rounded-[9px] object-cover transition-opacity ${selected ? "opacity-100" : "opacity-60 group-hover:opacity-90"}`} loading="lazy" />
                <span className="min-w-0">
                  <span className={`block text-[15px] font-medium tracking-[-0.01em] ${selected ? "text-white" : "text-white/60 group-hover:text-white/85"}`}>{item.label}</span>
                  <span className="block text-[13px] text-white/40">{item.caption}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
