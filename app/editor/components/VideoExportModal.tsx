"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconMovie, IconX } from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import { useShell } from "../shell/useShell";
import { Button, Segmented, Switch } from "../../ui/Controls";
import { saveVideoFile } from "../../lib/platform";
import { loadRenderSource } from "../render/sourceTexture";
import { exportEffectVideo, hasAnimatedEffects, videoSize, videoSupport, type VideoSupport } from "../render/videoExport";

const LENGTHS = [{ id: "3", label: "3 s" }, { id: "5", label: "5 s" }, { id: "8", label: "8 s" }, { id: "12", label: "12 s" }] as const;
const SIZES = [{ id: "720", label: "720p" }, { id: "1080", label: "1080p" }, { id: "2160", label: "4K" }] as const;
const RATES = [{ id: "24", label: "24 fps" }, { id: "30", label: "30 fps" }, { id: "60", label: "60 fps" }] as const;

const stem = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "etch";

/** Export animated Creative Effects as a seamless MP4 loop, rendered on this device. */
export function VideoExportModal() {
  const { settings, imageSrc, rawSource, imageInfo, imageName, gradeGraph, textOverlay, watermark } = useEditorState();
  const shell = useShell();
  const open = shell.videoExportOpen;
  const [seconds, setSeconds] = useState<(typeof LENGTHS)[number]["id"]>("5");
  const [shortEdge, setShortEdge] = useState<(typeof SIZES)[number]["id"]>("1080");
  const [fps, setFps] = useState<(typeof RATES)[number]["id"]>("30");
  const [withTitles, setWithTitles] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [support, setSupport] = useState<VideoSupport | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const animated = hasAnimatedEffects(settings);
  const size = useMemo(
    () => (imageInfo ? videoSize(imageInfo.width, imageInfo.height, settings.crop, Number(shortEdge)) : null),
    [imageInfo, settings.crop, shortEdge],
  );
  const frames = Number(seconds) * Number(fps);

  useEffect(() => {
    if (!open || !size) return;
    let cancelled = false;
    void videoSupport(size.width, size.height, Number(fps)).then((result) => { if (!cancelled) setSupport(result); });
    return () => { cancelled = true; };
  }, [open, size, fps]);

  const close = () => {
    abortRef.current?.abort();
    setProgress(null);
    setMessage(null);
    shell.setVideoExportOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && progress === null) shell.setVideoExportOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, progress, shell]);

  const run = async () => {
    if (!imageSrc) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setMessage(null);
    setProgress(0);
    let texture: Awaited<ReturnType<typeof loadRenderSource>> | null = null;
    try {
      texture = await loadRenderSource(imageSrc, rawSource);
      const blob = await exportEffectVideo(texture, settings, {
        shortEdge: Number(shortEdge),
        fps: Number(fps),
        seconds: Number(seconds),
        gradeGraph,
        overlays: withTitles ? { text: textOverlay, watermark } : undefined,
        signal: controller.signal,
        onProgress: setProgress,
      });
      const name = `${stem(imageName)}_loop_${seconds}s.mp4`;
      const savedName = await saveVideoFile(blob, name);
      if (savedName) {
        setMessage({ tone: "ok", text: `Saved ${savedName} (${(blob.size / 1_048_576).toFixed(1)} MB).` });
      }
    } catch (error) {
      if (controller.signal.aborted) setMessage({ tone: "error", text: "Export cancelled." });
      else setMessage({ tone: "error", text: error instanceof Error ? error.message : typeof error === "string" ? error : "Video export failed." });
    } finally {
      texture?.dispose();
      abortRef.current = null;
      setProgress(null);
    }
  };

  const busy = progress !== null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!busy) close(); }} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-export-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
            className="ui-root relative w-full max-w-[420px] rounded-[18px] bg-[var(--ui-panel)] p-5 ring-1 ring-inset ring-[var(--ui-line)] shadow-[var(--ui-shadow-pop)]"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)]"><IconMovie size={20} stroke={1.6} /></span>
              <div className="min-w-0 flex-1">
                <h2 id="video-export-title" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ui-text)]">Export video</h2>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--ui-text-3)]">Your animated effects as a seamless MP4 loop, rendered on this device.</p>
              </div>
              <button type="button" aria-label="Close" disabled={busy} onClick={close} className="ui-focus grid h-8 w-8 place-items-center rounded-[8px] text-[var(--ui-text-3)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)] disabled:opacity-30">
                <IconX size={16} />
              </button>
            </div>

            {!animated ? (
              <p className="mt-5 rounded-[10px] bg-white/[0.03] p-3 text-[12.5px] leading-relaxed text-[var(--ui-text-2)] ring-1 ring-inset ring-white/[0.05]">
                Add a Creative Effect that moves (any effect with a Phase control), then come back here to export it as video.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                <Row label="Length"><Segmented value={seconds} onChange={setSeconds} options={LENGTHS} /></Row>
                <Row label="Size"><Segmented value={shortEdge} onChange={setShortEdge} options={SIZES} /></Row>
                <Row label="Frame rate"><Segmented value={fps} onChange={setFps} options={RATES} /></Row>
                <Switch label="Include titles and watermark" checked={withTitles} onChange={setWithTitles} />
                {size && (
                  <p className="ui-num text-[11.5px] text-[var(--ui-text-3)]">
                    {size.width} × {size.height} · {frames} frames · H.264 MP4 · loops seamlessly
                  </p>
                )}
                {support && !support.ok && <p role="alert" className="text-[12px] text-[var(--ui-warn)]">{support.reason}</p>}
              </div>
            )}

            {busy && (
              <div className="mt-5" role="status" aria-live="polite">
                <div className="mb-1.5 flex justify-between text-[11.5px] text-[var(--ui-text-2)]">
                  <span>Rendering frame {Math.min(frames, Math.round((progress ?? 0) * frames))} of {frames}</span>
                  <span className="ui-num">{Math.round((progress ?? 0) * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[var(--ui-accent)] transition-[width] duration-150" style={{ width: `${(progress ?? 0) * 100}%` }} />
                </div>
              </div>
            )}
            {message && <p role="status" className={`mt-4 text-[12px] ${message.tone === "ok" ? "text-[var(--ui-success)]" : "text-[var(--ui-danger)]"}`}>{message.text}</p>}

            <div className="mt-6 flex justify-end gap-2">
              {busy ? (
                <Button onClick={() => abortRef.current?.abort()}>Cancel</Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={close}>Close</Button>
                  <Button variant="primary" disabled={!animated || !support?.ok} onClick={() => void run()}>Export MP4</Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px] text-[var(--ui-text-2)]">
      <span>{label}</span>
      {children}
    </div>
  );
}
