
"use client";

import React from "react";
import { motion, useTransform, MotionValue } from "framer-motion";

function MotionNumber({ value, prefix = "", suffix = "", decimal = 0 }: { value: MotionValue<number>; prefix?: string; suffix?: string; decimal?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    return value.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = prefix + latest.toFixed(decimal) + suffix;
      }
    });
  }, [value, prefix, suffix, decimal]);
  return <span ref={ref}>{prefix + value.get().toFixed(decimal) + suffix}</span>;
}

export function CameraHUD({ scrollY }: { scrollY: MotionValue<number> }) {
  const iso = useTransform(scrollY, [0.3, 0.6], [100, 12800]);
  const shutterSpeed = useTransform(scrollY, [0.1, 0.4], [125, 8000]);
  const fStop = useTransform(scrollY, [0.1, 0.4], [1.4, 16]);
  const expComp = useTransform(scrollY, [0, 0.2, 0.4, 0.6, 0.8], [0, -1.3, 0.7, -0.3, 0]);

  const hudOpacity = useTransform(scrollY, [0, 0.02, 0.8, 0.9], [0, 1, 1, 0]);
  const bracketScale = useTransform(scrollY, [0, 0.2], [1.02, 1]);
  const bracketBlur = useTransform(scrollY, [0, 0.2], ["blur(4px)", "blur(0px)"]);

  // Use the warm Intaglio Brass color
  const color = "#e2ae65";

  return (
    <motion.div 
      className="pointer-events-none fixed inset-0 z-40 p-4 md:p-8 uppercase tracking-[0.2em] font-mono text-[10px] sm:text-[11px]"
      style={{ opacity: hudOpacity, color: color, textShadow: "0 0 10px rgba(226,174,101,0.3)" }}
    >
      <motion.div 
        className="absolute inset-4 md:inset-8 border border-[#e2ae65]/10"
        style={{ scale: bracketScale, filter: bracketBlur }}
      >
        <div className="absolute top-0 left-0 w-8 h-8 border-t-[2px] border-l-[2px] border-[#e2ae65]/70" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-[2px] border-r-[2px] border-[#e2ae65]/70" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[2px] border-l-[2px] border-[#e2ae65]/70" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[2px] border-r-[2px] border-[#e2ae65]/70" />
        
        <div className="absolute top-1/2 left-1/2 w-16 h-12 border border-[#e2ae65]/30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[2px] h-[2px] bg-[#e2ae65]/80 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_5px_#e2ae65]" />
      </motion.div>

      <div className="absolute top-8 left-12 right-12 flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <span className="font-bold flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
             RAW
          </span>
        </div>
        <div className="flex flex-col items-end gap-2 text-[#e2ae65]/80">
          <span>100% // NO CLOUD</span>
        </div>
      </div>

      <div className="absolute bottom-8 left-12 right-12 flex justify-between items-end">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-6 font-bold">
            <MotionNumber value={iso} prefix="ISO " />
            <MotionNumber value={shutterSpeed} prefix="1/" />
            <MotionNumber value={fStop} prefix="F" decimal={1} />
          </div>
          
          <div className="h-1.5 w-64 bg-[#e2ae65]/10 relative mt-2 rounded-sm">
             <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#e2ae65]/50 z-10" />
             <div className="absolute top-0 bottom-0 right-1/4 w-px bg-[#e2ae65]/20" />
             <div className="absolute top-0 bottom-0 left-1/4 w-px bg-[#e2ae65]/20" />
             <motion.div 
               className="absolute top-0 bottom-0 w-[2px] bg-[#e2ae65] shadow-[0_0_5px_#e2ae65]"
               style={{ left: "50%", x: useTransform(expComp, [-3, 3], ["-128px", "128px"]) }}
             />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-[#e2ae65]/70">
          <span>MF // PEAKING ON</span>
          <span>FILM SIM: UNKNOWN</span>
        </div>
      </div>
    </motion.div>
  );
}
