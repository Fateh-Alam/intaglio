"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { DEFAULT_TEXT_OVERLAY, type TextOverlaySettings } from "../components/CinematicTextOverlay";
import { DEFAULT_SETTINGS } from "../editor/pageTypes";
import { ExportEngine } from "../editor/render/ExportEngine";
import { IntaglioRenderer } from "../editor/render/IntaglioRenderer";
import { ensureOverlayFonts, renderOverlays } from "../editor/render/overlayCompositor";
import { measureParity, type ParityMetrics } from "../lib/parityMetrics";
import { parseCubeLUT } from "../utils/lutParser";
import type { EditorSettings, WatermarkSettings } from "../types/editor";

const WIDTH = 192;
const HEIGHT = 128;
const FEATURES = ["geometry", "lut", "plates", "radial-mask", "linear-mask", "luminance-mask", "color-range-mask", "brush-mask", "text", "watermark"] as const;

function sourceCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("2D fixture context is unavailable.");
  const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#08245e");
  gradient.addColorStop(0.45, "#d47b4a");
  gradient.addColorStop(1, "#f8edc7");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#19cfa3";
  context.fillRect(18, 20, 48, 52);
  context.fillStyle = "#e61658";
  context.beginPath();
  context.arc(145, 58, 28, 0, Math.PI * 2);
  context.fill();
  return canvas;
}

function fixtureLut(): THREE.Data3DTexture {
  const rows: string[] = [];
  for (let blue = 0; blue < 2; blue += 1) {
    for (let green = 0; green < 2; green += 1) {
      for (let red = 0; red < 2; red += 1) rows.push(`${green * 0.08 + red * 0.92} ${blue * 0.12 + green * 0.88} ${red * 0.1 + blue * 0.9}`);
    }
  }
  const texture = parseCubeLUT(`TITLE "Parity Fixture"\nLUT_3D_SIZE 2\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n${rows.join("\n")}`);
  if (!texture) throw new Error("Parity LUT did not parse.");
  return texture;
}

function fixtureSettings(lutTexture: THREE.Data3DTexture): EditorSettings {
  const maskIds = ["radial", "linear", "luminance", "color", "brush"];
  return {
    ...DEFAULT_SETTINGS,
    brightness: 0.18,
    contrast: 0.12,
    vibrance: 0.2,
    rotate: 2.5,
    zoom: 1.03,
    keystoneH: 0.015,
    lensDistortion: 0.025,
    grain: 0.08,
    lutTexture,
    lutStrength: 0.72,
    adjustmentLayers: [{ id: "plate-fixture", name: "Masked plate", maskIds, opacity: 0.68, blendMode: "normal", params: { brightness: -0.22, temperature: 0.18, structure: 0.15 } }],
    masks: [
      { id: "radial", name: "Radial", type: "radial", blendMode: "ADD", opacity: 0.85, params: { center: { x: 0.5, y: 0.5 }, radius: 0.44, feather: 0.18, invert: false } },
      { id: "linear", name: "Linear", type: "linear", blendMode: "INTERSECT", opacity: 0.72, params: { angle: 0.14, position: 0.45, feather: 0.22, invert: false } },
      { id: "luminance", name: "Luminance", type: "luminosity", blendMode: "ADD", opacity: 0.55, params: { target: 0.62, range: 0.3, feather: 0.12 } },
      { id: "color", name: "Color range", type: "colorRange", blendMode: "ADD", opacity: 0.48, params: { targetHue: 0.96, hueWidth: 0.16, targetChroma: 0.74, chromaRange: 0.28 } },
      { id: "brush", name: "Brush", type: "brush", blendMode: "ADD", opacity: 0.6, params: { strokes: [{ id: "stroke", points: [{ x: 0.2, y: 0.8, pressure: 1, t: 0 }, { x: 0.8, y: 0.2, pressure: 1, t: 1 }], size: 0.12, feather: 0.5, flow: 1, opacity: 1, mode: "paint" }] } },
    ],
  };
}

const overlays: { text: TextOverlaySettings; watermark: WatermarkSettings } = {
  text: { ...DEFAULT_TEXT_OVERLAY, subtitleEnabled: true, subtitleText: "INTAGLIO PARITY", subtitleY: 22, dateEnabled: true, dateText: "2026.08.13", locationText: "LINEAR sRGB", fontSize: 1.15, shadowBlur: 5, shadowDistance: 2 },
  watermark: { enabled: true, text: "LOCAL PROOF", position: "bottom-right", opacity: 0.62, size: 0.32 },
};

async function pixelsFromBlob(blob: Blob): Promise<Uint8ClampedArray> {
  const image = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Decode context is unavailable.");
  context.drawImage(image, 0, 0);
  image.close();
  return context.getImageData(0, 0, WIDTH, HEIGHT).data;
}

interface ProbeMetrics { combined: ParityMetrics; raster: ParityMetrics; pngRoundTrip: ParityMetrics; decodedRasterOverlay: ParityMetrics; tiled: ParityMetrics; tiledNeutral: ParityMetrics; jpeg90: ParityMetrics; webp90: ParityMetrics; signatures: { png: string; jpeg: string; webp: string }; stages: Record<string, ParityMetrics>; correctness: Record<string, ParityMetrics> }

function identityLut(): THREE.Data3DTexture {
  const size = 17;
  const rows: string[] = [];
  for (let blue = 0; blue < size; blue += 1) for (let green = 0; green < size; green += 1) for (let red = 0; red < size; red += 1) rows.push(`${red / (size - 1)} ${green / (size - 1)} ${blue / (size - 1)}`);
  const texture = parseCubeLUT(`LUT_3D_SIZE ${size}\n${rows.join("\n")}`);
  if (!texture) throw new Error("Identity LUT did not parse.");
  return texture;
}

async function signature(blob: Blob, length: number): Promise<string> {
  return Array.from(new Uint8Array(await blob.slice(0, length).arrayBuffer()), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG fixture encoding failed.")), "image/png"));
}

async function runProbe(): Promise<ProbeMetrics> {
  const inputCanvas = sourceCanvas();
  const sourceTexture = new THREE.CanvasTexture(inputCanvas);
  const lut = fixtureLut();
  const settings = fixtureSettings(lut);
  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = WIDTH;
  previewCanvas.height = HEIGHT;
  const renderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: false, alpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const intaglioRenderer = new IntaglioRenderer();
  try {
    intaglioRenderer.render({ renderer, sourceTexture, settings, target: null, width: WIDTH, height: HEIGHT });
    await ensureOverlayFonts(overlays);
    const previewComposite = document.createElement("canvas");
    previewComposite.width = WIDTH;
    previewComposite.height = HEIGHT;
    const previewContext = previewComposite.getContext("2d", { willReadFrequently: true });
    if (!previewContext) throw new Error("Preview composite context is unavailable.");
    previewContext.drawImage(previewCanvas, 0, 0);
    const previewRaster = previewContext.getImageData(0, 0, WIDTH, HEIGHT).data;
    renderOverlays(previewContext, WIDTH, HEIGHT, overlays);

    const exportEngine = new ExportEngine();
    try {
      const tilePair = async (stageSettings: EditorSettings): Promise<ParityMetrics> => {
        const options = { format: "image/png" as const, quality: 1, width: WIDTH, height: HEIGHT };
        const full = await exportEngine.exportImage(sourceTexture, stageSettings, options);
        const tiled = await exportEngine.exportImage(sourceTexture, stageSettings, { ...options, maxTileSize: 160 });
        return measureParity(await pixelsFromBlob(full), await pixelsFromBlob(tiled));
      };
      const rasterPng = await exportEngine.exportImage(sourceTexture, settings, { format: "image/png", quality: 1, width: WIDTH, height: HEIGHT });
      const png = await exportEngine.exportImage(sourceTexture, settings, { format: "image/png", quality: 1, width: WIDTH, height: HEIGHT, overlays });
      const jpeg90 = await exportEngine.exportImage(sourceTexture, settings, { format: "image/jpeg", quality: 0.9, width: WIDTH, height: HEIGHT, overlays });
      const webp90 = await exportEngine.exportImage(sourceTexture, settings, { format: "image/webp", quality: 0.9, width: WIDTH, height: HEIGHT, overlays });
      const tiledPng = await exportEngine.exportImage(sourceTexture, settings, { format: "image/png", quality: 1, width: WIDTH, height: HEIGHT, overlays, maxTileSize: 160 });
      const neutralPng = await exportEngine.exportImage(sourceTexture, DEFAULT_SETTINGS, { format: "image/png", quality: 1, width: WIDTH, height: HEIGHT });
      const neutralTiledPng = await exportEngine.exportImage(sourceTexture, DEFAULT_SETTINGS, { format: "image/png", quality: 1, width: WIDTH, height: HEIGHT, maxTileSize: 160 });
      // Parity alone cannot catch operations that are equally wrong in preview
      // and export, so these compare exported renders against known results.
      const exportPixels = async (candidate: EditorSettings) => pixelsFromBlob(await exportEngine.exportImage(sourceTexture, candidate, { format: "image/png", quality: 1, width: WIDTH, height: HEIGHT }));
      const neutralPixels = await pixelsFromBlob(neutralPng);
      const identity = identityLut();
      const identityCurve = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
      const correctness = {
        // A full-coverage plate with no adjustments must be a no-op (plates must not re-decode linear input).
        neutralPlate: measureParity(neutralPixels, await exportPixels({ ...DEFAULT_SETTINGS, adjustmentLayers: [{ id: "neutral", name: "Neutral", maskIds: [], opacity: 1, blendMode: "normal", params: {} }] })),
        // An identity LUT must be a no-op (LUT lookup domain and coordinates are exact).
        identityLut: measureParity(neutralPixels, await exportPixels({ ...DEFAULT_SETTINGS, lutTexture: identity, lutStrength: 1 })),
        // The master curve must reach exports; an inverting master curve is expected to differ strongly.
        invertedMasterCurve: measureParity(neutralPixels, await exportPixels({ ...DEFAULT_SETTINGS, curvePoints: { master: [{ x: 0, y: 1 }, { x: 1, y: 0 }], red: identityCurve, green: identityCurve, blue: identityCurve } })),
      };
      identity.dispose();
      const stages = {
        geometry: await tilePair({ ...DEFAULT_SETTINGS, rotate: settings.rotate, zoom: settings.zoom, keystoneH: settings.keystoneH, lensDistortion: settings.lensDistortion }),
        lut: await tilePair({ ...DEFAULT_SETTINGS, lutTexture: lut, lutStrength: settings.lutStrength }),
        plateMasks: await tilePair({ ...DEFAULT_SETTINGS, adjustmentLayers: settings.adjustmentLayers, masks: settings.masks }),
        grain: await tilePair({ ...DEFAULT_SETTINGS, grain: settings.grain }),
      };
      const decodedRaster = await createImageBitmap(rasterPng);
      const decodedComposite = document.createElement("canvas");
      decodedComposite.width = WIDTH;
      decodedComposite.height = HEIGHT;
      const decodedContext = decodedComposite.getContext("2d", { willReadFrequently: true });
      if (!decodedContext) throw new Error("Decoded composite context is unavailable.");
      decodedContext.drawImage(decodedRaster, 0, 0);
      decodedRaster.close();
      renderOverlays(decodedContext, WIDTH, HEIGHT, overlays);
      const previewPixels = previewContext.getImageData(0, 0, WIDTH, HEIGHT).data;
      const pngPixels = await pixelsFromBlob(png);
      return {
        combined: measureParity(previewPixels, pngPixels),
        raster: measureParity(previewRaster, await pixelsFromBlob(rasterPng)),
        pngRoundTrip: measureParity(previewPixels, await pixelsFromBlob(await canvasBlob(previewComposite))),
        decodedRasterOverlay: measureParity(decodedContext.getImageData(0, 0, WIDTH, HEIGHT).data, pngPixels),
        tiled: measureParity(pngPixels, await pixelsFromBlob(tiledPng)),
        tiledNeutral: measureParity(await pixelsFromBlob(neutralPng), await pixelsFromBlob(neutralTiledPng)),
        jpeg90: measureParity(previewPixels, await pixelsFromBlob(jpeg90)),
        webp90: measureParity(previewPixels, await pixelsFromBlob(webp90)),
        signatures: { png: await signature(png, 8), jpeg: await signature(jpeg90, 3), webp: await signature(webp90, 12) },
        stages,
        correctness,
      };
    } finally {
      exportEngine.dispose();
    }
  } finally {
    intaglioRenderer.dispose();
    renderer.dispose();
    sourceTexture.dispose();
    lut.dispose();
  }
}

export default function RenderContractProbe(): React.ReactElement {
  const [result, setResult] = useState<{ status: "running" | "passed" | "failed"; metrics?: ProbeMetrics; error?: string }>({ status: "running" });
  useEffect(() => { void runProbe().then((metrics) => setResult({ status: "passed", metrics })).catch((error: unknown) => setResult({ status: "failed", error: error instanceof Error ? error.message : String(error) })); }, []);
  return <main className="min-h-screen bg-black p-8 font-mono text-white"><h1>Intaglio render contract probe</h1><output data-testid="render-contract-result" data-status={result.status}>{JSON.stringify({ ...result, features: FEATURES })}</output></main>;
}
