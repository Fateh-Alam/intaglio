"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EditorProvider, useEditorState } from "./hooks/useEditorState";
import StartScreen from "../components/StartScreen";
import MobileLimitationModal from "../components/MobileLimitationModal";
import { CommandBar, ShortcutHelp } from "../components/CommandBar";
import { DEFAULT_SETTINGS, DEFAULT_ASSET_METADATA } from "./pageTypes";
import { ExportModal } from "./components/ExportModal";
import { ProofSheetModal } from "./components/ProofSheetModal";
import { BatchExportModal } from "./components/BatchExportModal";
import { ShellProvider, useShell } from "./shell/useShell";
import { useShellShortcuts } from "./shell/useShellShortcuts";
import { useShellCommands } from "./shell/useShellCommands";
import { TopBar } from "./shell/TopBar";
import { PhotoCanvas } from "./shell/PhotoCanvas";
import { LeftPanel, RightPanel } from "./shell/SidePanels";
import { EditorModals } from "./shell/EditorModals";

function EditorLayout() {
  const {
    showMobileWarning, setShowMobileWarning, imageSrc, setImageSrc, openImagePicker, openProjectPicker, setSettings,
    setImageName, setImageInfo, setAssetMetadata, isCommandBarOpen, setIsCommandBarOpen, appCommands, isShortcutHelpOpen,
    setIsShortcutHelpOpen,
  } = useEditorState();
  const shell = useShell();
  const commands = [...appCommands, ...useShellCommands()];
  useShellShortcuts(Boolean(imageSrc) && !isCommandBarOpen && !isShortcutHelpOpen);

  if (!imageSrc) {
    return (
      <main className="intaglio-page relative flex h-screen w-screen overflow-hidden font-intaglio-sans">
        <StartScreen
          onOpenImage={openImagePicker}
          onOpenArchive={openProjectPicker}
          onTrySample={() => {
            setSettings(DEFAULT_SETTINGS);
            setImageSrc("/demo.jpg");
            setImageName("Demo Sample");
            setImageInfo({ width: 2000, height: 2500, fileType: "image/jpeg" });
            setAssetMetadata(DEFAULT_ASSET_METADATA);
          }}
        />
      </main>
    );
  }

  return (
    <main className="ui-root flex h-[100dvh] w-screen flex-col overflow-hidden selection:bg-[var(--ui-accent)]/40">
      <MobileLimitationModal isOpen={showMobileWarning} onClose={() => setShowMobileWarning(false)} />
      <CommandBar isOpen={isCommandBarOpen} onClose={() => setIsCommandBarOpen(false)} commands={commands} />
      <ShortcutHelp isOpen={isShortcutHelpOpen} onClose={() => setIsShortcutHelpOpen(false)} commands={commands} />
      <ExportModal />
      <ProofSheetModal />
      <BatchExportModal />
      <EditorModals />

      {!shell.panelsHidden && <TopBar />}

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <AnimatePresence initial={false}>
          {shell.leftOpen && !shell.panelsHidden && (
            <motion.aside
              key="left-panel"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute inset-y-0 left-0 z-30 w-full max-w-[320px] shrink-0 border-r border-[var(--ui-line)] bg-[var(--ui-panel)] shadow-2xl md:relative md:w-[280px] md:shadow-none"
              aria-label="Looks, history, versions and info"
            >
              <LeftPanel />
            </motion.aside>
          )}
        </AnimatePresence>

        <PhotoCanvas />

        {!shell.panelsHidden && (
          <aside
            className="h-[46dvh] shrink-0 border-t border-[var(--ui-line)] bg-[var(--ui-panel)] md:h-auto md:w-[328px] md:border-l md:border-t-0"
            aria-label="Edit controls"
          >
            <RightPanel />
          </aside>
        )}
      </div>
    </main>
  );
}

export default function EditorPage() {
  return (
    <EditorProvider>
      <ShellProvider>
        <EditorLayout />
      </ShellProvider>
    </EditorProvider>
  );
}
