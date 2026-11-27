"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { isDesktopApp } from "../../lib/platform";
import type { EditorSettings } from "../../types/editor";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const grade: Partial<EditorSettings> = {
  curvePoints: {
    master: [{ x: 0, y: 0 }, { x: 0.25, y: 0.18 }, { x: 0.75, y: 0.84 }, { x: 1, y: 1 }],
    red: [{ x: 0, y: 0.03 }, { x: 0.5, y: 0.55 }, { x: 1, y: 1 }],
    green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    blue: [{ x: 0, y: 0 }, { x: 0.5, y: 0.44 }, { x: 1, y: 1 }],
  },
  hslBlueSat: 0.5,
  hslOrangeHue: 0.2,
  colorGrading: { shadows: { h: 0.55, s: 0.5, l: 0 }, midtones: { h: 0, s: 0, l: 0 }, highlights: { h: 0.08, s: 0.4, l: 0 }, balance: 0 },
  masks: [{ id: "spot", name: "Radial", type: "radial", blendMode: "ADD", opacity: 1,
    params: { center: { x: 0.55, y: 0.6 }, radius: 0.25, radiusX: 0.25, radiusY: 0.2, angle: 0, feather: 0.6, invert: false } }],
  adjustmentLayers: [{ id: "lift", name: "Lift", maskIds: ["spot"], opacity: 1, blendMode: "normal", params: { brightness: 0.6, shadows: 0.4 } }],
};

function percentile(samples: number[], p: number) {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}

interface Frame {
  brightness: number;
  frame: number;
  presented: boolean;
  latencyMs: number;
  previewDetail: number;
  drawableMs: number;
  postedAt: number;
}

/** Times exposure changes in the main editor during local desktop benchmark runs. */
export function useNativeViewportBenchmark(
  imageUrl: string | null,
  setSettings: Dispatch<SetStateAction<EditorSettings>>,
  setExposure: (brightness: number) => void,
  enableMaskOverlay: () => void,
  enableCustomGraph: () => void,
) {
  const started = useRef(false);
  const exposure = useRef(setExposure);
  const enableOverlay = useRef(enableMaskOverlay);
  const enableGraph = useRef(enableCustomGraph);
  useEffect(() => { exposure.current = setExposure; }, [setExposure]);
  useEffect(() => { enableOverlay.current = enableMaskOverlay; }, [enableMaskOverlay]);
  useEffect(() => { enableGraph.current = enableCustomGraph; }, [enableCustomGraph]);

  useEffect(() => {
    if (!imageUrl || !isDesktopApp() || started.current) return;
    const profile = new URLSearchParams(location.search).get("etchViewportBench");
    if (!profile) return;
    started.current = true;

    const run = async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const log = (message: string) => invoke("viewport_log", { message });
      try {
        await log(`editor-bench-start ${profile}`);
        for (let attempt = 0; attempt < 150 && !document.documentElement.dataset.etchMetal; attempt += 1) await sleep(100);
        if (!document.documentElement.dataset.etchMetal) throw new Error("The main editor did not activate Metal.");
        setSettings((current) => ({ ...current, ...grade }));
        if (profile === "large-custom") enableGraph.current();
        await sleep(500);
        const modes = profile.startsWith("large") ? ["fit", "zoom-mask"] : ["fit"];
        for (const mode of modes) {
          if (mode === "zoom-mask") {
            enableOverlay.current();
            await sleep(250);
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", bubbles: true, cancelable: true }));
            await sleep(500);
            const viewport = document.querySelector<HTMLElement>("[data-renderer='metal']");
            if (!viewport || Number(viewport.dataset.zoom) <= 1 || viewport.dataset.maskOverlay !== "lift") {
              throw new Error("The Metal viewport did not enter 100% zoom with the mask overlay.");
            }
          }
          // One warm-up and five timed drags at a 120 Hz input cadence.
          for (let run = 0; run < 6; run += 1) {
            const pending = new Map<number, number>();
            const latencies: number[] = [];
            const engine: number[] = [];
            const drawable: number[] = [];
            const editorQueue: number[] = [];
            const bridge: number[] = [];
            const frames = new Set<number>();
            let offscreen = 0;
            let actualSize = true;
            const onFrame = (event: Event) => {
              const timing = (event as CustomEvent<Frame>).detail;
              if (!pending.has(timing.brightness)) return;
              const now = performance.now();
              if (mode === "zoom-mask" && Math.abs(timing.previewDetail - 1) > 0.005) actualSize = false;
              frames.add(timing.frame);
              engine.push(timing.latencyMs);
              drawable.push(timing.drawableMs);
              bridge.push(Math.max(0, now - timing.postedAt - timing.latencyMs));
              for (const [brightness, sent] of pending) {
                latencies.push(now - sent);
                editorQueue.push(Math.max(0, timing.postedAt - sent));
                if (!timing.presented) offscreen += 1;
                pending.delete(brightness);
                if (brightness === timing.brightness) break;
              }
            };
            window.addEventListener("etch:metal-frame", onFrame);
            window.dispatchEvent(new PointerEvent("pointerdown"));
            try {
              const epoch = performance.now();
              for (let i = 0; i < 120; i += 1) {
                const brightness = Math.cos(i / 10) * 1.5 + i * 1e-7 + run * 1e-6;
                pending.set(brightness, performance.now());
                exposure.current(brightness);
                await sleep(Math.max(0, epoch + (i + 1) * 1000 / 120 - performance.now()));
              }
              for (let i = 0; pending.size && i < 100; i += 1) await sleep(10);
              if (pending.size || offscreen || !actualSize || latencies.length !== 120) {
                throw new Error(`${mode}: ${latencies.length}/120 inputs acknowledged, ${offscreen} offscreen, actual-size view ${actualSize}`);
              }
              if (run > 0) {
                await log(`editor-bench ${JSON.stringify({
                  photo: profile, mode, run, median: percentile(latencies, 0.5), p95: percentile(latencies, 0.95),
                  engineP95: percentile(engine, 0.95), drawableP95: percentile(drawable, 0.95), frames: frames.size, inputs: latencies.length,
                  editorQueueP95: percentile(editorQueue, 0.95), bridgeP95: percentile(bridge, 0.95),
                  inputLatencies: latencies,
                })}`);
              }
            } finally {
              window.dispatchEvent(new PointerEvent("pointerup"));
              window.removeEventListener("etch:metal-frame", onFrame);
            }
            await sleep(250);
          }
        }
        await log(`editor-bench-complete ${profile}`);
      } catch (error) {
        await log(`editor-bench-failed ${error}`);
      }
    };
    void run();
  }, [imageUrl, setSettings]);
}
