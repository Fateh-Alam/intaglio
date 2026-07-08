const fs = require('fs');

const pageCode = `
"use client";

import React from "react";
import { EditorProvider } from "./hooks/useEditorState";
import { EditorLeftSidebar } from "./components/EditorLeftSidebar";
import { EditorWorkspaceCanvas } from "./components/EditorWorkspaceCanvas";
import { EditorRightSidebar } from "./components/EditorRightSidebar";
import { useEditorState } from "./hooks/useEditorState";
import StartScreen from "../components/StartScreen";
import MobileLimitationModal from "../components/MobileLimitationModal";
import VideoGradingPanel from "../components/VideoGradingPanel";
import { CommandBar, ShortcutHelp } from "../components/CommandBar";
import { DEFAULT_SETTINGS, DEFAULT_ASSET_METADATA } from "./pageTypes";

function EditorLayout() {
  const editorState = useEditorState();
  const { 
    isFocusMode, 
    showMobileWarning, 
    setShowMobileWarning, 
    imageSrc, 
    setImageSrc, 
    openImagePicker, 
    openProjectPicker, 
    setIsVideoGradingOpen, 
    setSettings, 
    setImageName, 
    setImageInfo, 
    setAssetMetadata,
    isVideoGradingOpen,
    videoSrc,
    isCommandBarOpen,
    setIsCommandBarOpen,
    appCommands,
    handleCommand,
    isShortcutHelpOpen,
    setIsShortcutHelpOpen
  } = editorState;

  if (!imageSrc) {
    return (
      <main className="ormond-page flex h-screen w-screen overflow-hidden font-ormond-sans relative">
        <StartScreen
          onOpenImage={openImagePicker}
          onOpenArchive={openProjectPicker}
          onOpenVideo={() => setIsVideoGradingOpen(true)}
          onTrySample={() => {
            setSettings(DEFAULT_SETTINGS);
            setImageSrc("/demo.jpg");
            setImageName("Demo Sample");
            setImageInfo({
              width: 2000,
              height: 2500,
              fileType: "image/jpeg",
            });
            setAssetMetadata(DEFAULT_ASSET_METADATA);
          }}
        />
        <VideoGradingPanel
          isOpen={isVideoGradingOpen}
          onClose={() => setIsVideoGradingOpen(false)}
          videoSrc={videoSrc}
        />
      </main>
    );
  }

  return (
    <main
      className={\`grid h-screen w-screen grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-[var(--ormond-charcoal)] font-sans text-[var(--ormond-paper)] selection:bg-[var(--ormond-brass)] selection:text-black md:grid-rows-1 \${
        isFocusMode
          ? "md:grid-cols-[minmax(0,1fr)]"
          : "md:grid-cols-[76px_minmax(0,1fr)_360px]"
      }\`}
    >
      <MobileLimitationModal
        isOpen={showMobileWarning}
        onClose={() => setShowMobileWarning(false)}
      />
      
      <CommandBar
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        commands={appCommands || []}
        onSelect={handleCommand}
      />
      
      <ShortcutHelp
        isOpen={isShortcutHelpOpen}
        onClose={() => setIsShortcutHelpOpen(false)}
      />

      <EditorLeftSidebar />
      <EditorWorkspaceCanvas />
      <EditorRightSidebar />
    </main>
  );
}

export default function Home() {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  );
}
`;

fs.writeFileSync('app/editor/page.tsx', pageCode);
console.log('Fixed page.tsx');
