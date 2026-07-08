"use client";

import React from "react";
import { useEditorState } from "../hooks/useEditorState";
import { EDITOR_MODULES, AUXILIARY_MODULES } from "../pageTypes";
import { motion, AnimatePresence, Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function EditorToolStrip() {
  const { activeTab, handleTabChange, isFocusMode, isPresetsBarOpen } = useEditorState();

  return (
    <AnimatePresence>
      {(!isFocusMode || isPresetsBarOpen) && (
        <motion.div 
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="hidden md:flex relative z-40 h-full w-[52px] flex-col items-center border-l border-white/5 bg-[#1c1c1e] py-4 shadow-sm overflow-y-auto custom-scrollbar"
        >
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-3"
          >
            {EDITOR_MODULES.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  variants={itemVariants}
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  title={item.label}
                  className={`p-2 rounded-xl transition-all duration-300 flex items-center justify-center ${
                    isActive
                      ? "bg-white/10 text-white shadow-sm scale-[1.05]"
                      : "text-white/40 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  <item.icon size={20} strokeWidth={isActive ? 1.5 : 1.25} />
                </motion.button>
              );
            })}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.5 }}
            className="my-5 h-px w-6 bg-white/5" 
          />

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-3"
          >
            {AUXILIARY_MODULES.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  variants={itemVariants}
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  title={item.label}
                  className={`p-2 rounded-xl transition-all duration-300 flex items-center justify-center ${
                    isActive
                      ? "bg-white/10 text-white shadow-sm scale-[1.05]"
                      : "text-white/40 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  <item.icon size={20} strokeWidth={isActive ? 1.5 : 1.25} />
                </motion.button>
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
