"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { DataUtils } from "three";
import { isDesktopApp } from "../../lib/platform";
import type { MaskColorSampler } from "../../lib/maskGeometry";
import { computeHistogramMetrics } from "../../utils/histogram";
import { extractDominantColors } from "../../utils/swatch";
import { serializeCubeLUT } from "../../utils/lutParser";
import type { EditorSettings, HistogramData, LutUserData, PerformanceMode } from "../../types/editor";
import type { GradeNode } from "../../types/document";
import type { LoupeView } from "../../components/ImagePlane";
import { EFFECT_BY_ID } from "../effects/catalog";
import { nativeGradeNodes } from "./nativeGrade";
import { glyphAtlasPixels } from "./creative/glyphAtlas";
import { getLiveBrushStroke, onBrushTexturesChanged } from "./brushTextures";
import { encodeCanvasWasm } from "./wasmCodecs";
import type { LinearSourceBuffer } from "./sourceTexture";

function packLut(texture: NonNullable<EditorSettings["lutTexture"]>) {
  const { lutSize, domainMin, domainMax, title } = texture.userData as LutUserData;
  const { width, data } = texture.image;
  const size = lutSize ?? width;
  if (!(data instanceof Uint16Array) || data.length !== size ** 3 * 4 || size > 128) {
    throw new Error("This LUT needs the web renderer.");
  }
  const values = new Float32Array(size ** 3 * 3);
  for (let index = 0; index < size ** 3; index += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      values[3 * index + channel] = DataUtils.fromHalfFloat(data[4 * index + channel]);
    }
  }
  return serializeCubeLUT({ size, values, title, domainMin: domainMin ?? [0, 0, 0], domainMax: domainMax ?? [1, 1, 1] });
}

function previewSettings(settings: EditorSettings, grade: GradeNode[] | null) {
  const { lutTexture, ...values } = settings;
  return {
    ...values,
    compareTexture: undefined,
    lutStrength: lutTexture ? values.lutStrength : 0,
    gradeNodes: nativeGradeNodes(settings, grade),
    masks: values.masks.map((mask) => {
      const live = mask.type === "brush" ? getLiveBrushStroke(mask.id) : null;
      return live && mask.type === "brush"
        ? { ...mask, params: { ...mask.params, strokes: [...mask.params.strokes, live] } }
        : mask;
    }),
  };
}

function comparisonPixels(texture: NonNullable<EditorSettings["compareTexture"]>) {
  const image = texture.image as HTMLImageElement;
  const scale = Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("The comparison snapshot could not be read.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const bytes = new Uint8Array(8 + data.length);
  const header = new DataView(bytes.buffer);
  header.setUint32(0, canvas.width, true);
  header.setUint32(4, canvas.height, true);
  bytes.set(data, 8);
  return bytes;
}

async function uploadLinearSource(
  invoke: typeof import("@tauri-apps/api/core").invoke,
  source: LinearSourceBuffer,
  signal: AbortSignal,
) {
  const { width, height, pixels } = source;
  if (pixels.length !== width * height * 3) throw new Error("Invalid RAW development buffer.");
  // This bridge runs only on macOS, where RGB16 typed arrays are little-endian.
  const bytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  const chunkSize = 8 * 1024 * 1024;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    signal.throwIfAborted();
    const chunk = bytes.subarray(offset, offset + chunkSize);
    const packet = new Uint8Array(12 + chunk.length);
    const header = new DataView(packet.buffer);
    header.setUint32(0, width, true);
    header.setUint32(4, height, true);
    header.setUint32(8, offset / 2, true);
    packet.set(chunk, 12);
    await invoke("viewport_load_linear", packet);
  }
  return [width, height] as const;
}

function getRamps(settings: EditorSettings) {
  return [...new Set(settings.creativeEffects
    .filter((layer) => layer.enabled && layer.opacity > 0 && EFFECT_BY_ID.get(layer.effect)?.glyphs)
    .map((layer) => layer.glyphs || " "))].sort();
}

function photoSample(data: ArrayBuffer) {
  const length = data.byteLength - 8;
  const dimensions = new DataView(data, length);
  const width = dimensions.getUint32(0, true);
  const height = dimensions.getUint32(4, true);
  return { width, height, pixels: new Uint8Array(data, 0, length) };
}

function sampleStats(data: ArrayBuffer) {
  const { width, height, pixels } = photoSample(data);
  return { ...computeHistogramMetrics(pixels), palette: extractDominantColors(pixels, 5, 10), scopeSample: { pixels, width, height } };
}

export type NativeSnapshotProvider = () => Promise<Blob | null>;
type Timing = { frame: number; latencyMs: number; submitMs: number; gpuDoneMs: number | null; presented: boolean };

type ViewportProps = {
  enabled: boolean;
  imageUrl: string;
  rawSource?: LinearSourceBuffer | null;
  element: RefObject<HTMLDivElement | null>;
  settings: EditorSettings;
  grade: GradeNode[] | null;
  performanceMode: PerformanceMode;
  surround: string;
  maskPlate: string | null;
  picking: boolean;
  showClipping: boolean;
  split: number;
  maskColorSampler?: RefObject<MaskColorSampler | null>;
  snapshotProvider?: RefObject<NativeSnapshotProvider | null>;
  view?: LoupeView;
  onStats: (stats: HistogramData) => void;
};

// AppKit owns one viewport per editor window. Finish in-flight opens/loads
// before releasing it or activating the next photo after a document switch.
let viewportLifecycle = Promise.resolve();

export function useNativeViewport(props: ViewportProps) {
  const { imageUrl, rawSource, enabled, settings, grade, view, maskPlate, performanceMode, surround, picking, showClipping, split, maskColorSampler, snapshotProvider } = props;
  const eligible = enabled && isDesktopApp() && navigator.platform.startsWith("Mac");
  const [loaded, setLoaded] = useState<{
    url: string;
    raw: typeof rawSource;
    dimensions: readonly [number, number] | null;
  } | null>(null);
  const latest = useRef(props);
  const update = useRef<(change?: "brush" | "layout") => void>(null);
  const pick = useRef<MaskColorSampler | null>(null);
  const snapshot = useRef<NativeSnapshotProvider | null>(null);

  useLayoutEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    if (!eligible) return;
    const source = new AbortController();
    let stopped = false;
    let opened = false;
    let rendered = false;
    let revision = 0;
    let statsTimer: ReturnType<typeof setTimeout> | undefined;
    let lastSettings: EditorSettings | undefined;
    let lastGrade: GradeNode[] | null | undefined;
    let lastViewportArea: [number, number, number, number] | undefined;
    let lastPreview: ViewportProps | undefined;
    let lastComparison: EditorSettings["compareTexture"] = null;
    let lastRamps: string | undefined;
    let statsDirty = true;
    let resize: ResizeObserver | undefined;
    let followLayout: number | undefined;
    let unlisten: (() => void) | undefined;
    let send = Promise.resolve();
    let area: [number, number, number, number] | undefined;
    const benchmark = new URLSearchParams(location.search).has("etchViewportBench");
    const bridge = import("@tauri-apps/api/core");

    const reportFailure = (error: unknown) => {
      if (stopped || source.signal.aborted) return;
      console.warn("Etch Metal viewport", error);
      setLoaded({ url: imageUrl, raw: rawSource, dimensions: null });
      stopped = true;
      update.current = null;
      pick.current = null;
      snapshot.current = null;
      clearTimeout(statsTimer);
      resize?.disconnect();
      unlisten?.();
    };

    const render = async (brushChanged: boolean) => {
      if (stopped) return;
      const current = latest.current;
      const element = current.element.current;
      if (!element) return;
      if (!area) {
        const rect = element.getBoundingClientRect();
        area = [rect.x, rect.y, rect.width, rect.height];
      }
      const viewportArea = area;
      const changed = current.settings !== lastSettings || current.grade !== lastGrade || brushChanged;
      const rounds = revision;
      const { invoke } = await bridge;
      if (stopped) return;
      const comparison = current.settings.compareTexture;
      if ((current.split >= 0 || !comparison) && comparison !== lastComparison) {
        await invoke("viewport_set_comparison", comparison ? comparisonPixels(comparison) : new Uint8Array());
        lastComparison = comparison;
      }
      if (changed && (!lastSettings || lastSettings.lutTexture !== current.settings.lutTexture)) {
        if (current.settings.lutTexture || lastSettings?.lutTexture) {
          await invoke("viewport_set_lut", { cube: current.settings.lutTexture ? packLut(current.settings.lutTexture) : null });
        }
      }
      let glyphAtlases: { ramp: string; pixels: number[] }[] | undefined;
      if (changed && current.settings.creativeEffects !== lastSettings?.creativeEffects) {
        const ramps = getRamps(current.settings);
        const key = JSON.stringify(ramps);
        if (key !== lastRamps) {
          glyphAtlases = ramps.map((ramp) => ({ ramp, pixels: Array.from(glyphAtlasPixels(ramp)) }));
          lastRamps = key;
        }
      }
      if (stopped) return;
      const previewChanged = lastViewportArea !== viewportArea || !lastPreview
        || current.view !== lastPreview.view || current.performanceMode !== lastPreview.performanceMode
        || current.maskPlate !== lastPreview.maskPlate || current.picking !== lastPreview.picking
        || current.showClipping !== lastPreview.showClipping || current.split !== lastPreview.split
        || current.surround !== lastPreview.surround;
      const limit = { draft: 1, balanced: 1.25, quality: 2 }[current.performanceMode];
      const color = Number.parseInt(current.surround.slice(1), 16);
      const brightness = current.settings.brightness;
      // Fold intermediate React updates into the newest frame while Metal
      // finishes the current one.
      const postedAt = benchmark ? performance.now() : 0;
      const timing = await invoke<Timing | null>("viewport_update", {
        settings: changed ? previewSettings(current.settings, current.grade) : undefined,
        glyphAtlases,
        area: lastViewportArea !== viewportArea ? viewportArea : undefined,
        preview: previewChanged ? {
          camera: {
            zoom: current.view?.zoom ?? 1, cx: current.view?.cx ?? 0.5, cy: current.view?.cy ?? 0.5,
            inset: 0.9, fitPixelRatio: Math.min(1, limit / devicePixelRatio),
          },
          maskPlate: current.maskPlate,
          pickMaskColor: current.picking,
          showClipping: current.showClipping,
          comparisonSplit: current.split >= 0 ? Math.min(1, current.split) : null,
          surround: [(color >> 16) & 255, (color >> 8) & 255, color & 255],
        } : undefined,
        measure: true,
      });
      if (stopped) return;
      if (benchmark && timing && changed) {
        window.dispatchEvent(new CustomEvent("etch:metal-frame", { detail: { ...timing, brightness, postedAt } }));
      }
      rendered = true;
      lastSettings = current.settings;
      lastGrade = current.grade;
      lastViewportArea = viewportArea;
      lastPreview = current;
      if (changed) statsDirty = true;
      if (statsDirty && !pending) {
        clearTimeout(statsTimer);
        statsTimer = setTimeout(() => {
          void invoke<ArrayBuffer>("viewport_sample").then((data) => {
            if (!stopped && rounds === revision) {
              statsDirty = false;
              latest.current.onStats(sampleStats(data));
            }
          }).catch(() => {});
        }, 150);
      }
    };

    let pending = false;
    let brushPending = false;
    const schedule = (change?: "brush" | "layout") => {
      if (stopped) return;
      revision += 1;
      clearTimeout(statsTimer);
      if (change === "layout") area = undefined;
      brushPending ||= change === "brush";
      if (pending) return;
      pending = true;
      send = send.then(() => {
        pending = false;
        const live = brushPending;
        brushPending = false;
        return render(live);
      }).catch(reportFailure);
    };

    viewportLifecycle = viewportLifecycle.catch(() => {}).then(async () => {
      if (stopped) return;
      let pixels: LinearSourceBuffer | Uint8Array = rawSource ?? new Uint8Array();
      if (!rawSource) {
        const response = await fetch(imageUrl, { signal: source.signal });
        if (!response.ok) throw new Error("The source image is unavailable.");
        pixels = new Uint8Array(await response.arrayBuffer());
      }
      if (stopped) return;
      const { invoke } = await bridge;
      await invoke("viewport_open");
      opened = true;
      if (stopped) return;
      const [sourceWidth, sourceHeight] = pixels instanceof Uint8Array
        ? await invoke<[number, number]>("viewport_load", pixels)
        : await uploadLinearSource(invoke, pixels, source.signal);
      if (stopped) return;
      await render(false);
      if (stopped || !rendered) return;
      setLoaded({ url: imageUrl, raw: rawSource, dimensions: [sourceWidth, sourceHeight] });
      update.current = schedule;
      pick.current = async (x, y) => {
        try {
          await send;
          if (!stopped) return await invoke<[number, number, number] | null>("viewport_pick_mask_color", { x, y });
        } catch {
          // Ignore picks when the document is closing or has changed.
        }
        return null;
      };
      snapshot.current = async () => {
        await send;
        if (stopped) return null;
        const frame = await invoke<ArrayBuffer>("viewport_capture_snapshot");
        if (stopped) return null;
        const { width, height, pixels } = photoSample(frame);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("The comparison snapshot could not be encoded.");
        const image = context.createImageData(width, height);
        image.data.set(pixels);
        context.putImageData(image, 0, 0);
        return encodeCanvasWasm(canvas, "image/webp", 0.85);
      };
      const element = latest.current.element.current;
      resize = new ResizeObserver(() => {
        cancelAnimationFrame(followLayout ?? 0);
        followLayout = requestAnimationFrame(() => schedule("layout"));
      });
      if (element) resize.observe(element);
      unlisten = onBrushTexturesChanged(() => schedule("brush"));
      window.addEventListener("resize", onResize);
      schedule("layout");
    }).catch(reportFailure);

    function onResize() { schedule("layout"); }

    return () => {
      stopped = true;
      source.abort();
      update.current = null;
      pick.current = null;
      snapshot.current = null;
      clearTimeout(statsTimer);
      cancelAnimationFrame(followLayout ?? 0);
      resize?.disconnect();
      unlisten?.();
      window.removeEventListener("resize", onResize);
      setLoaded(null);
      viewportLifecycle = viewportLifecycle.catch(() => {}).then(async () => {
        await send;
        if (opened) await (await bridge).invoke("viewport_close");
      }).catch(() => {});
    };
  }, [eligible, imageUrl, rawSource]);

  useLayoutEffect(() => { update.current?.("layout"); }, [view]);
  useLayoutEffect(() => { update.current?.(); }, [settings, grade, maskPlate, performanceMode, surround, picking, showClipping, split]);

  const result = eligible && loaded?.url === imageUrl && loaded.raw === rawSource ? loaded : null;
  const active = Boolean(result?.dimensions);
  useEffect(() => {
    if (!active || !snapshotProvider) return;
    const provider = snapshot.current;
    snapshotProvider.current = provider;
    return () => { if (snapshotProvider.current === provider) snapshotProvider.current = null; };
  }, [active, snapshotProvider]);
  useEffect(() => {
    if (!active || !picking || !maskColorSampler) return;
    const sampler = pick.current;
    maskColorSampler.current = sampler;
    return () => { if (maskColorSampler.current === sampler) maskColorSampler.current = null; };
  }, [active, picking, maskColorSampler]);
  useEffect(() => {
    if (!active) return;
    document.documentElement.dataset.etchMetal = "true";
    return () => { delete document.documentElement.dataset.etchMetal; };
  }, [active]);
  const renderer = active ? "metal" : eligible && !result ? "loading" : "webgl";
  return { renderer, dimensions: result?.dimensions ?? null };
}
