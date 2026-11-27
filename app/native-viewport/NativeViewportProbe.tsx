"use client";

// Developer test for the native viewport (roadmap §10, D2 spike). The photo is
// drawn by etch-core into a Metal view *under* this page; the photo area here
// is transparent. Opened from Help → Developer when Etch runs with ETCH_DEVELOPER=1.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { DevSlider } from "../ui/DevSlider";
import { isDesktopApp } from "../lib/platform";
import { createEffect } from "../editor/effects/settings";
import { glyphAtlasPixels } from "../editor/render/creative/glyphAtlas";

type Settings = Record<string, unknown>;

// Exercises every fused stage: tone curve, color mixer and three-way grading.
const SAMPLE_GRADE: Settings = {
  curvePoints: {
    master: [{ x: 0, y: 0 }, { x: 0.25, y: 0.18 }, { x: 0.75, y: 0.84 }, { x: 1, y: 1 }],
    red: [{ x: 0, y: 0.03 }, { x: 0.5, y: 0.55 }, { x: 1, y: 1 }],
    green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    blue: [{ x: 0, y: 0 }, { x: 0.5, y: 0.44 }, { x: 1, y: 0.95 }],
  },
  hslBlueSat: 0.5,
  hslOrangeHue: 0.2,
  colorGrading: { shadows: { h: 0.55, s: 0.5, l: 0 }, midtones: { h: 0, s: 0, l: 0 }, highlights: { h: 0.08, s: 0.4, l: 0 }, balance: 0 },
  // A local adjustment: lift the wheel arch, so the multi-pass path is measured too.
  masks: [{ id: "spot", name: "Radial", type: "radial", blendMode: "ADD", opacity: 1, params: { center: { x: 0.55, y: 0.6 }, radius: 0.25, radiusX: 0.25, radiusY: 0.2, angle: 0, feather: 0.6, invert: false } }],
  adjustmentLayers: [{ id: "lift", name: "Lift", maskIds: ["spot"], opacity: 1, blendMode: "normal", params: { brightness: 0.6, shadows: 0.4 } }],
};
interface FrameTiming { frame: number; latencyMs: number; submitMs: number; gpuDoneMs?: number | null; presented: boolean }

const CONTROLS: { key: string; label: string; min: number; max: number }[] = [
  { key: "brightness", label: "Exposure", min: -2, max: 2 },
  { key: "contrast", label: "Contrast", min: -1, max: 1 },
  { key: "highlights", label: "Highlights", min: -1, max: 1 },
  { key: "shadows", label: "Shadows", min: -1, max: 1 },
  { key: "whites", label: "Whites", min: -1, max: 1 },
  { key: "blacks", label: "Blacks", min: -1, max: 1 },
  { key: "temperature", label: "Temperature", min: -1, max: 1 },
  { key: "tint", label: "Tint", min: -1, max: 1 },
  { key: "vibrance", label: "Vibrance", min: -1, max: 1 },
  { key: "saturation", label: "Saturation", min: -1, max: 1 },
  { key: "dehaze", label: "Dehaze", min: -1, max: 1 },
];

const percentile = (values: number[], p: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
};

async function invoke<T>(command: string, args?: Record<string, unknown> | Uint8Array): Promise<T> {
  const core = await import("@tauri-apps/api/core");
  return core.invoke<T>(command, args);
}

export default function NativeViewportProbe(): React.ReactElement {
  const areaRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<Settings>(SAMPLE_GRADE);
  const [status, setStatus] = useState("Starting…");
  const [stats, setStats] = useState<string[]>([]);
  const latest = useRef<Settings>(SAMPLE_GRADE);
  const [graded, setGraded] = useState(true);
  const [effect, setEffect] = useState("");
  const gradedRef = useRef(true);
  const area = () => {
    const rect = areaRef.current?.getBoundingClientRect();
    return rect ? [rect.x, rect.y, rect.width, rect.height] : [0, 0, 0, 0];
  };

  // Fire and forget: the render thread folds bursts of slider events into one frame.
  const push = useCallback(() => {
    void invoke("viewport_update", { settings: latest.current, area: area() });
  }, []);

  const benchmark = useCallback(async () => {
    // 1. One input at a time, each waiting for its frame: the cost of a frame.
    const trips: number[] = [];
    const gpu: number[] = [];
    const rustOne: number[] = [];
    let shown = 0;
    for (let i = 0; i < 120; i += 1) {
      const started = performance.now();
      const timing = await invoke<FrameTiming>("viewport_update", { settings: { ...latest.current, brightness: Math.sin(i / 12) * 1.5 }, area: area(), measure: true });
      trips.push(performance.now() - started);
      if (timing.gpuDoneMs != null) gpu.push(timing.gpuDoneMs);
      rustOne.push(timing.latencyMs);
      if (timing.presented) shown += 1;
    }
    // 2. A 120 Hz slider drag: inputs keep coming without waiting, as a hand
    //    on a trackpad would send them. Time each input until its frame is done.
    const sends: Promise<{ wait: number; timing: FrameTiming }>[] = [];
    for (let i = 0; i < 120; i += 1) {
      const sentAt = performance.now();
      sends.push(invoke<FrameTiming>("viewport_update", { settings: { ...latest.current, brightness: Math.cos(i / 10) * 1.5 }, area: area(), measure: true })
        .then((timing) => ({ wait: performance.now() - sentAt, timing })));
      await new Promise((resolve) => setTimeout(resolve, 1000 / 120));
    }
    const drag = await Promise.all(sends);
    const dragWaits = drag.map((entry) => entry.wait);
    const rustDrag = drag.map((entry) => entry.timing.latencyMs);
    const frames = new Set(drag.map((entry) => entry.timing.frame)).size;
    await invoke("viewport_update", { settings: latest.current, area: area() });
    const lines = [
      `${gradedRef.current ? "With the sample grade (every stage on)." : "Base develop only."}`,
      `One at a time — engine (input reaches Rust → frame done): median ${percentile(rustOne, 0.5).toFixed(2)} ms, p95 ${percentile(rustOne, 0.95).toFixed(2)} ms · seen from the page: median ${percentile(trips, 0.5).toFixed(2)} ms, p95 ${percentile(trips, 0.95).toFixed(2)} ms (GPU work median ${percentile(gpu, 0.5).toFixed(2)} ms)`,
      `120 Hz drag — engine: median ${percentile(rustDrag, 0.5).toFixed(2)} ms, p95 ${percentile(rustDrag, 0.95).toFixed(2)} ms · seen from the page: median ${percentile(dragWaits, 0.5).toFixed(2)} ms, p95 ${percentile(dragWaits, 0.95).toFixed(2)} ms · 120 inputs drawn in ${frames} frames`,
      shown === 120 ? "All frames were shown on screen." : `${120 - shown} of 120 frames were drawn offscreen because the window was hidden.`,
    ];
    setStats(lines);
    await invoke("viewport_log", { message: `benchmark: ${lines.join(" | ")}` });
  }, []);

  useEffect(() => {
    if (!isDesktopApp()) {
      queueMicrotask(() => setStatus("This test runs only in the Etch Mac app."));
      return;
    }
    // Let the Metal view under the page show through.
    const html = document.documentElement.style.background;
    const body = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";

    let cancelled = false;
    void (async () => {
      try {
        const info = await invoke<{ gpu: string; backend: string }>("viewport_open");
        const bytes = new Uint8Array(await (await fetch("/demo.jpg")).arrayBuffer());
        const [width, height] = await invoke<[number, number]>("viewport_load", bytes);
        if (cancelled) return;
        await invoke("viewport_update", { settings: latest.current, area: area() });
        setStatus(`etch-core on ${info.gpu} (${info.backend}) · photo ${width}×${height}`);
        await invoke("viewport_log", { message: `opened on ${info.gpu} (${info.backend}), photo ${width}x${height}` });
        await benchmark();
      } catch (error) {
        setStatus(`Native viewport failed: ${error}`);
        void invoke("viewport_log", { message: `failed: ${error}` }).catch(() => {});
      }
    })();

    const observer = new ResizeObserver(() => push());
    if (areaRef.current) observer.observe(areaRef.current);
    return () => {
      cancelled = true;
      observer.disconnect();
      document.documentElement.style.background = html;
      document.body.style.background = body;
      void invoke("viewport_close").catch(() => {});
    };
  }, [benchmark, push]);

  const toggleGrade = (on: boolean) => {
    const sliders = Object.fromEntries(CONTROLS.map((control) => [control.key, latest.current[control.key] ?? 0]));
    const next = {
      ...(on ? SAMPLE_GRADE : {}),
      ...sliders,
      creativeEffects: latest.current.creativeEffects ?? [],
    };
    latest.current = next;
    gradedRef.current = on;
    setGraded(on);
    setSettings(next);
    push();
  };

  const changeEffect = async (id: string) => {
    const layer = id === "characters" || id === "dither" || id === "mosaic" ? createEffect(id, "viewport-sample") : null;
    const next = { ...latest.current, creativeEffects: layer ? [layer] : [] };
    const ramp = layer?.glyphs;
    latest.current = next;
    setSettings(next);
    setEffect(id);
    try {
      await invoke("viewport_update", {
        settings: next,
        area: area(),
        glyphAtlases: ramp ? [{ ramp, pixels: Array.from(glyphAtlasPixels(ramp)) }] : [],
        measure: true,
      });
    } catch (error) {
      setStatus(`Native viewport failed: ${error}`);
    }
  };

  const set = (key: string, value: number) => {
    const next = { ...latest.current, [key]: value };
    latest.current = next;
    setSettings(next);
    push();
  };

  return (
    <main className="flex h-[100dvh] w-screen text-[var(--ui-text)]">
      <div ref={areaRef} className="relative min-w-0 flex-1" aria-label="Photo drawn natively by etch-core">
        <p className="absolute left-4 top-3 rounded-md bg-black/50 px-2 py-1 text-[11px] text-white/80">{status}</p>
      </div>
      <aside className="flex w-[300px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/10 bg-[#14130f] p-4">
        <a href="/editor/" className="text-[12px] text-[var(--ui-text-2)] hover:text-[var(--ui-text)]">← Back to the editor</a>
        <h1 className="text-[13px] font-semibold">Native viewport test</h1>
        <p className="text-[11.5px] leading-relaxed text-[var(--ui-text-2)]">
          The Rust engine draws the photo on Metal. Sliders send settings, and character effects send a small glyph atlas when selected.
        </p>
        {CONTROLS.map((control) => (
          <DevSlider
            key={control.key}
            label={control.label}
            value={(settings[control.key] as number | undefined) ?? 0}
            min={control.min}
            max={control.max}
            defaultValue={0}
            step={(control.max - control.min) / 200}
            onChange={(value) => set(control.key, value)}
          />
        ))}
        <label className="flex items-center gap-2 text-[12px] text-[var(--ui-text-2)]">
          <input type="checkbox" checked={graded} onChange={(event) => toggleGrade(event.target.checked)} />
          Sample grade (tone curve, color mixer, split toning, a radial local adjustment)
        </label>
        <label className="flex items-center justify-between gap-2 text-[12px] text-[var(--ui-text-2)]">
          Creative Effect
          <select value={effect} onChange={(event) => void changeEffect(event.target.value)} className="rounded-md bg-white/10 px-2 py-1">
            <option value="">None</option>
            <option value="mosaic">Mosaic</option>
            <option value="characters">Characters</option>
            <option value="dither">Dither</option>
          </select>
        </label>
        <button type="button" onClick={() => void benchmark()} className="rounded-md bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/15">
          Run benchmark
        </button>
        <div className="space-y-1 text-[11px] leading-relaxed text-[var(--ui-text-2)]">
          {stats.map((line) => <p key={line}>{line}</p>)}
        </div>
      </aside>
    </main>
  );
}
