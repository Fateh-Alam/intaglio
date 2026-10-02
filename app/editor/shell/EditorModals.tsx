"use client";

import React from "react";
import { useEditorState } from "../hooks/useEditorState";
import PresetCreatorModal from "../../components/PresetCreatorModal";
import ReferenceViewer from "../../components/ReferenceViewer";
import LUTCreatorModal from "../../components/LUTCreatorModal";

/** Dialogs opened from the shell (look creation, LUT creator, reference viewer). */
export function EditorModals() {
  const {
    settings, imageSrc, isPresetModalOpen, setIsPresetModalOpen, handleSaveRecipe, isReferenceOpen, setIsReferenceOpen,
    referenceImageUrl, setReferenceImageUrl, isLUTCreatorOpen, setIsLUTCreatorOpen, handleApplyGeneratedLut,
  } = useEditorState();

  return (
    <>
      <PresetCreatorModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        settings={settings}
        onSave={(presetData) => void handleSaveRecipe(presetData)}
      />
      <ReferenceViewer
        isOpen={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        referenceUrl={referenceImageUrl}
        originalUrl={imageSrc}
        onUploadReference={(file) => setReferenceImageUrl(URL.createObjectURL(file))}
      />
      <LUTCreatorModal
        isOpen={isLUTCreatorOpen}
        onClose={() => setIsLUTCreatorOpen(false)}
        onApplyLUT={(lutData) => {
          void handleApplyGeneratedLut({
            size: Math.round(Math.cbrt(lutData.length / 3)),
            values: Float32Array.from(lutData),
            domainMin: [0, 0, 0],
            domainMax: [1, 1, 1],
            title: "Custom LUT",
          });
        }}
      />
    </>
  );
}
