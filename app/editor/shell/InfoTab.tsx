"use client";

import React from "react";
import { IconFlag, IconFlagOff, IconStarFilled, IconX } from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import { COLOR_LABELS } from "../pageTypes";
import type { AssetMetadataSettings } from "../../types/editor";
import { Tooltip } from "../../ui/Tooltip";

function Field({ label, value, onChange, multiline, placeholder }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; placeholder?: string }) {
  const className = "w-full rounded-[8px] bg-black/30 px-2.5 py-1.5 text-[12px] text-[var(--ui-text)] outline-none ring-1 ring-inset ring-[var(--ui-line)] transition-shadow placeholder:text-[var(--ui-text-3)] focus:ring-[var(--ui-accent)]";
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-[var(--ui-text-3)]">{label}</span>
      {multiline
        ? <textarea rows={3} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`${className} resize-none leading-relaxed`} />
        : <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`${className} h-8`} />}
    </label>
  );
}

/** Rating, flags, labels and descriptive metadata. Keyboard: 0–5, P, X, U. */
export function InfoTab() {
  const { assetMetadata, setAssetMetadata, imageInfo, imageName } = useEditorState();
  const set = <K extends keyof AssetMetadataSettings>(key: K, value: AssetMetadataSettings[K]) =>
    setAssetMetadata((current) => ({ ...current, [key]: value }));

  return (
    <div className="ui-scroll h-full space-y-5 overflow-y-auto px-3.5 pb-6 pt-2">
      <div>
        <div className="truncate text-[13px] font-semibold">{imageName}</div>
        {imageInfo && (
          <div className="ui-num mt-0.5 text-[11.5px] text-[var(--ui-text-3)]">
            {imageInfo.width} × {imageInfo.height} · {(imageInfo.width * imageInfo.height / 1e6).toFixed(1)} MP
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((stars) => (
              <Tooltip key={stars} content={`${stars} star${stars > 1 ? "s" : ""}`} shortcut={String(stars)}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={assetMetadata.rating === stars}
                  onClick={() => set("rating", assetMetadata.rating === stars ? 0 : stars)}
                  className="ui-focus grid h-7 w-7 place-items-center rounded-[6px] hover:bg-white/[0.06]"
                >
                  <IconStarFilled size={15} className={stars <= assetMetadata.rating ? "text-[#ffc94d]" : "text-white/15"} />
                </button>
              </Tooltip>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <Tooltip content="Pick" shortcut="P">
              <button type="button" aria-pressed={assetMetadata.flagStatus === "picked"} onClick={() => set("flagStatus", assetMetadata.flagStatus === "picked" ? "unflagged" : "picked")}
                className={`ui-focus grid h-7 w-7 place-items-center rounded-[6px] hover:bg-white/[0.06] ${assetMetadata.flagStatus === "picked" ? "text-[var(--ui-text)]" : "text-white/25"}`}>
                <IconFlag size={15} />
              </button>
            </Tooltip>
            <Tooltip content="Reject" shortcut="X">
              <button type="button" aria-pressed={assetMetadata.flagStatus === "rejected"} onClick={() => set("flagStatus", assetMetadata.flagStatus === "rejected" ? "unflagged" : "rejected")}
                className={`ui-focus grid h-7 w-7 place-items-center rounded-[6px] hover:bg-white/[0.06] ${assetMetadata.flagStatus === "rejected" ? "text-[var(--ui-danger)]" : "text-white/25"}`}>
                <IconFlagOff size={15} />
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Color label">
          {COLOR_LABELS.map((label) => (
            <Tooltip key={label.id} content={label.label}>
              <button
                type="button"
                role="radio"
                aria-checked={assetMetadata.colorLabel === label.id}
                onClick={() => set("colorLabel", label.id)}
                className={`ui-focus grid h-6 w-6 place-items-center rounded-full transition-transform hover:scale-110 ${assetMetadata.colorLabel === label.id ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--ui-panel)]" : ""}`}
                style={{ background: label.id === "none" ? "transparent" : label.color, boxShadow: label.id === "none" ? "inset 0 0 0 1px rgba(255,255,255,0.25)" : undefined }}
              >
                {label.id === "none" && <IconX size={11} className="text-white/40" />}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Field label="Title" value={assetMetadata.title} placeholder="Untitled" onChange={(value) => set("title", value)} />
        <Field label="Caption" value={assetMetadata.caption} placeholder="What's happening in this photo" multiline onChange={(value) => set("caption", value)} />
        <Field label="Creator" value={assetMetadata.creator} placeholder="Your name or studio" onChange={(value) => set("creator", value)} />
        <Field label="Copyright" value={assetMetadata.copyright} placeholder="© 2026 Your Name" onChange={(value) => set("copyright", value)} />
        <Field label="Keywords" value={assetMetadata.keywords} placeholder="portrait, editorial, night" onChange={(value) => set("keywords", value)} />
      </div>
    </div>
  );
}
