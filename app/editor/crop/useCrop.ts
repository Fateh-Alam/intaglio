"use client";

import { constrainStraightenedCrop, cropWithRatio, FULL_CROP, normalizeCrop, sameCrop } from "../../lib/cropGeometry";
import { rotateMasks } from "../../lib/maskGeometry";
import type { PhotoCrop } from "../../types/editor";
import { useEditorState } from "../hooks/useEditorState";
import { useShell } from "../shell/useShell";

export const CROP_RATIOS = {
  free: "Free",
  original: "Original",
  square: "1:1",
  portrait: "4:5",
  landscape: "5:4",
  classic: "3:2",
  tall: "2:3",
  wide: "16:9",
  story: "9:16",
} as const;

export interface CropDraft {
  imageUrl: string;
  rect: PhotoCrop;
  rotation: number;
  ratio: keyof typeof CROP_RATIOS;
  drawHorizon: boolean;
}

const ratios = { square: 1, portrait: 4 / 5, landscape: 5 / 4, classic: 3 / 2, tall: 2 / 3, wide: 16 / 9, story: 9 / 16 };

export function useCrop() {
  const shell = useShell();
  const { imageSrc, imageInfo, rawSource, settings, commitSettings } = useEditorState();
  const source = rawSource ?? imageInfo;
  const aspect = source ? source.width / Math.max(1, source.height) : 1;
  const draft = imageSrc && shell.cropDraft?.imageUrl === imageSrc ? shell.cropDraft : null;
  const ratio = !draft || draft.ratio === "free" ? null : draft.ratio === "original" ? 1 : ratios[draft.ratio] / aspect;
  const rect = draft ? constrainStraightenedCrop(
    ratio === null ? draft.rect : cropWithRatio(draft.rect, ratio),
    draft.rotation, aspect, settings.zoom,
  ) : settings.crop;

  const change = (patch: Partial<CropDraft>) => {
    shell.setCropDraft((current) => current && current.imageUrl === imageSrc ? { ...current, ...patch } : current);
  };

  const close = () => shell.setCropDraft(null);
  const apply = () => {
    if (!draft) return;
    if (settings.rotate !== draft.rotation || !sameCrop(rect, settings.crop)) {
      commitSettings({
        crop: normalizeCrop(rect),
        rotate: draft.rotation,
        masks: rotateMasks(settings.masks, draft.rotation - settings.rotate, aspect),
      }, "Crop & Straighten");
    }
    close();
  };

  const open = () => {
    if (!imageSrc || draft) return;
    shell.setCompare("off");
    shell.setPreview(null);
    shell.setPicking(null);
    shell.setPanelsHidden(false);
    shell.setCropDraft({ imageUrl: imageSrc, rect: settings.crop, rotation: settings.rotate, ratio: "free", drawHorizon: false });
  };

  return {
    draft, aspect, ratio, rect, change, open, apply, close,
    reset: () => change({ rect: FULL_CROP, rotation: 0, ratio: "free", drawHorizon: false }),
    straighten: (rotation: number) => change({ rotation: Math.min(45, Math.max(-45, Math.round(rotation * 10) / 10)) }),
  };
}
