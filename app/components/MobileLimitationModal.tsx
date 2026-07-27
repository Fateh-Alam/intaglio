"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconDeviceLaptop, IconX } from "@tabler/icons-react";

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
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm overflow-hidden border border-[var(--intaglio-line)] bg-[var(--intaglio-panel)] shadow-2xl"
          >
            {/* Header Art */}
            <div className="relative h-28 overflow-hidden bg-[var(--intaglio-charcoal-2)]">
              <div className="intaglio-grain absolute" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative z-10 border border-[var(--intaglio-line)] bg-black/20 p-3">
                  <IconDeviceLaptop className="intaglio-icon text-[var(--intaglio-brass)]"/>
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
                  Intaglio is designed for the precision and power of a desktop
                  darkroom workflow.
                </p>
                <p className="border border-[var(--intaglio-line)] bg-white/5 py-2 font-mono text-xs text-gray-500">
                  Mobile experience is limited.
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <div role="button" tabIndex={0}
                  onClick={onClose}
                  className="w-full border border-[var(--intaglio-brass)] bg-[var(--intaglio-brass)] py-3 text-sm font-semibold uppercase tracking-wider text-black transition-colors hover:bg-[#c49b62]"
                >
                  Continue Anyway
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div role="button" tabIndex={0}
              onClick={onClose}
              className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
            >
              <IconX className="intaglio-icon"/>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
