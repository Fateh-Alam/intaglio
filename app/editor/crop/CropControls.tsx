"use client";

import { IconCheck, IconCrop, IconLine } from "@tabler/icons-react";
import { Button } from "../../ui/Controls";
import { DevSlider } from "../../ui/DevSlider";
import { formatDegrees } from "../develop/tracks";
import { CROP_RATIOS, useCrop, type CropDraft } from "./useCrop";

export function CropControls() {
  const crop = useCrop();
  if (!crop.draft) return null;
  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Crop & Straighten controls">
      <div className="flex h-[53px] shrink-0 items-center gap-2.5 border-b border-[var(--ui-line)] px-4">
        <IconCrop size={17} stroke={1.6} className="text-[var(--ui-text-2)]" />
        <h2 className="text-[13px] font-semibold">Crop &amp; Straighten</h2>
        <Button variant="ghost" className="ml-auto h-8 px-2 text-[11.5px]" onClick={crop.reset}>Reset</Button>
      </div>
      <div className="ui-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
        <label className="mb-4 flex items-center justify-between gap-4 text-[12px] text-[var(--ui-text-2)]">
          Aspect ratio
          <select className="ui-focus h-8 min-w-28 rounded-[7px] bg-[var(--ui-control)] px-2 text-[12px] text-[var(--ui-text)]"
            value={crop.draft.ratio} onChange={(event) => crop.change({ ratio: event.target.value as CropDraft["ratio"] })}>
            {Object.entries(CROP_RATIOS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <DevSlider label="Angle" min={-45} max={45} step={0.1} defaultValue={0} value={crop.draft.rotation}
          format={formatDegrees} onChange={crop.straighten} />
        <Button className="mt-3 w-full" icon={<IconLine size={15} />} aria-pressed={crop.draft.drawHorizon}
          onClick={() => crop.change({ drawHorizon: !crop.draft?.drawHorizon })}>
          {crop.draft.drawHorizon ? "Stop drawing" : "Draw horizon"}
        </Button>
        <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ui-text-2)]">
          {crop.draft.drawHorizon ? "Drag along a horizon or a vertical edge to level the photo." : "Drag the frame to position it. Pull an edge or a corner to resize."}
        </p>
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--ui-line)] px-4 py-3">
        <Button onClick={crop.close}>Cancel</Button>
        <Button variant="primary" icon={<IconCheck size={15} />} onClick={crop.apply}>Apply crop</Button>
      </div>
    </section>
  );
}
