
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

import { EditorTopToolbar } from "./components/EditorTopToolbar";
import { PresetsBottomBar } from "./components/PresetsBottomBar";
import { EditorToolStrip } from "./components/EditorToolStrip";

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
    settings,
    handleCommand,
    isShortcutHelpOpen,
    setIsShortcutHelpOpen
  } = editorState;

  if (!imageSrc) {
    return (
      <main className="intaglio-page flex h-screen w-screen overflow-hidden font-intaglio-sans relative">
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
        settings={settings}
        onExtractFrame={(dataUrl) => {
          setImageSrc(dataUrl);
          setImageName("Video Frame");
        }}
      />
      </main>
    );
  }

  return (
    <main
      className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--intaglio-charcoal)] font-sans text-[var(--intaglio-paper)] selection:bg-[var(--intaglio-brass)] selection:text-black"
    >
      <MobileLimitationModal
        isOpen={showMobileWarning}
        onClose={() => setShowMobileWarning(false)}
      />
      
      <CommandBar
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        commands={appCommands}
      />

      <ShortcutHelp
        isOpen={isShortcutHelpOpen}
        onClose={() => setIsShortcutHelpOpen(false)}
        commands={appCommands}
      />

      <EditorTopToolbar />
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Canvas */}
        <EditorWorkspaceCanvas />
        
        {/* Right: Inspector Sidebar */}
        <EditorRightSidebar />

        {/* Far Right: Tools Strip */}
        <EditorToolStrip />
        
        <PresetsBottomBar />
      </div>
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
