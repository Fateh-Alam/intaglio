"use client";

// Developer test for the native viewport (roadmap §10, D2 spike). The photo is
// drawn by etch-core into a Metal view *under* this page; the photo area here
// is transparent. Opened from Help → Developer when Etch runs with ETCH_DEVELOPER=1.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { DevSlider } from "../ui/DevSlider";
import { isDesktopApp } from "../lib/platform";

type Settings = Record<string, number>;
interface FrameTiming { submitMs: number; gpuDoneMs?: number | null }

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
  const [settings, setSettings] = useState<Settings>({});
  const [status, setStatus] = useState("Starting…");
  const [stats, setStats] = useState<string[]>([]);
  const [live, setLive] = useState("");
  const latest = useRef<Settings>({});
  const inFlight = useRef(false);
  const pending = useRef(false);
  const roundTrips = useRef<number[]>([]);

  const area = () => {
    const rect = areaRef.current?.getBoundingClientRect();
    return rect ? [rect.x, rect.y, rect.width, rect.height] : [0, 0, 0, 0];
  };

  // Latest-wins: at most one frame in flight, and the newest settings always land.
  const push = useCallback(async () => {
    if (inFlight.current) {
      pending.current = true;
      return;
    }
    inFlight.current = true;
    do {
      pending.current = false;
      const started = performance.now();
      await invoke<FrameTiming>("viewport_update", { settings: latest.current, area: area() });
      roundTrips.current = [...roundTrips.current.slice(-119), performance.now() - started];
      setLive(`Live sliders: median ${percentile(roundTrips.current, 0.5).toFixed(2)} ms per frame (last ${roundTrips.current.length})`);
    } while (pending.current);
    inFlight.current = false;
  }, []);

  const benchmark = useCallback(async () => {
    const trips: number[] = [];
    const gpu: number[] = [];
    const submit: number[] = [];
    for (let i = 0; i < 120; i += 1) {
      const value = Math.sin(i / 12) * 1.5;
      const started = performance.now();
      const timing = await invoke<FrameTiming>("viewport_update", { settings: { ...latest.current, brightness: value }, area: area(), measure: true });
      trips.push(performance.now() - started);
      submit.push(timing.submitMs);
      if (timing.gpuDoneMs != null) gpu.push(timing.gpuDoneMs);
    }
    await invoke("viewport_update", { settings: latest.current, area: area() });
    const lines = [
      `Slider → frame done (JS round trip, waits for GPU): median ${percentile(trips, 0.5).toFixed(2)} ms, p95 ${percentile(trips, 0.95).toFixed(2)} ms`,
      `Rust encode + submit: median ${percentile(submit, 0.5).toFixed(2)} ms · GPU finished after: median ${percentile(gpu, 0.5).toFixed(2)} ms, p95 ${percentile(gpu, 0.95).toFixed(2)} ms`,
    ];
    setStats(lines);
    await invoke("viewport_log", { message: `benchmark (120 frames): ${lines.join(" | ")}` });
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
        await invoke("viewport_update", { area: area() });
        setStatus(`etch-core on ${info.gpu} (${info.backend}) · photo ${width}×${height}`);
        await invoke("viewport_log", { message: `opened on ${info.gpu} (${info.backend}), photo ${width}x${height}` });
        await benchmark();
      } catch (error) {
        setStatus(`Native viewport failed: ${error}`);
        void invoke("viewport_log", { message: `failed: ${error}` }).catch(() => {});
      }
    })();

    const observer = new ResizeObserver(() => void push());
    if (areaRef.current) observer.observe(areaRef.current);
    return () => {
      cancelled = true;
      observer.disconnect();
      document.documentElement.style.background = html;
      document.body.style.background = body;
      void invoke("viewport_close").catch(() => {});
    };
  }, [benchmark, push]);

  const set = (key: string, value: number) => {
    const next = { ...latest.current, [key]: value };
    latest.current = next;
    setSettings(next);
    void push();
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
          The photo is drawn by the Rust engine on Metal, under this page. These sliders send settings only; no pixels cross the bridge.
        </p>
        {CONTROLS.map((control) => (
          <DevSlider
            key={control.key}
            label={control.label}
            value={settings[control.key] ?? 0}
            min={control.min}
            max={control.max}
            defaultValue={0}
            step={(control.max - control.min) / 200}
            onChange={(value) => set(control.key, value)}
          />
        ))}
        <button type="button" onClick={() => void benchmark()} className="rounded-md bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/15">
          Run benchmark
        </button>
        <div className="space-y-1 text-[11px] leading-relaxed text-[var(--ui-text-2)]">
          {stats.map((line) => <p key={line}>{line}</p>)}
          {live && <p>{live}</p>}
        </div>
      </aside>
    </main>
  );
}
