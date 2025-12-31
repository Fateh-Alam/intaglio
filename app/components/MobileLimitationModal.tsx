"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconDeviceLaptop, IconDeviceMobile, IconX } from "@tabler/icons-react";

interface MobileLimitationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileLimitationModal({
  isOpen,
  onClose,
}: MobileLimitationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-sm bg-[#080808] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-amber-500/10"
          >
            {/* Header Art */}
            <div className="h-32 bg-gradient-to-br from-amber-500/20 via-rose-500/10 to-blue-500/10 relative overflow-hidden">
              <div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [0.95, 1.05, 0.95],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-20 h-20 rounded-full bg-amber-500/20 blur-2xl absolute"
                />
                <div className="relative z-10 bg-black/50 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                  <IconDeviceLaptop size={32} className="text-amber-500" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 text-center space-y-4">
              <h2 className="text-xl font-medium text-white tracking-wide">
                Desktop Recommended
              </h2>

              <div className="space-y-3">
                <p className="text-sm text-gray-400 leading-relaxed">
                  Nyvarra Studio is designed for the precision and power of a
                  desktop workflow.
                </p>
                <p className="text-xs text-gray-500 font-mono bg-white/5 py-2 rounded-lg border border-white/5">
                  Mobile experience is limited.
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors active:scale-95 text-sm uppercase tracking-wider"
                >
                  Continue Anyway
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
            >
              <IconX size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
