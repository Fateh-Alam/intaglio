"use client";

// Renders the shared native-parity cases with the web export pipeline, so
// tests/browser/native-parity.spec.ts can compare them with etch-core's output.

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS } from "../editor/pageTypes";
import { ExportEngine } from "../editor/render/ExportEngine";
import { createLinearSourceTexture, loadImageTexture } from "../editor/render/sourceTexture";
import { parseCubeLUT } from "../utils/lutParser";
import { normalizeCreativeEffects } from "../editor/effects/settings";
import { glyphAtlasPixels } from "../editor/render/creative/glyphAtlas";
import { cropSize } from "../lib/cropGeometry";
import type { EditorSettings } from "../types/editor";
import type { GradeGraph, GradeNode, ImageNodeKind } from "../types/document";
import { nativeGradeNodes, nativeGradePath } from "../editor/render/nativeGrade";
import cases from "./cases.json";

const FIXTURE = "/parity/native-fixture.png";

type FixtureNode = { kind: ImageNodeKind; enabled?: boolean; opacity?: number; params?: Record<string, unknown> };

function fixtureGraph(stages: FixtureNode[]): GradeGraph {
  const order: FixtureNode[] = [
    { kind: "source" }, { kind: "geometry" }, ...stages, { kind: "display-transform" }, { kind: "output" },
  ];
  const nodes: GradeNode[] = order.map((node, index) => ({ id: String(index), name: node.kind, enabled: true, opacity: 1, params: {}, ...node }));
  return {
    version: 2, nodes, outputNodeId: nodes.at(-1)!.id,
    edges: nodes.slice(1).map((node, index) => ({ id: `edge-${index}`, sourceNodeId: nodes[index].id, sourcePort: "image", targetNodeId: node.id, targetPort: "image", order: index })),
  };
}

async function pixels(blob: Blob, width: number, height: number): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No 2D context.");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const data = context.getImageData(0, 0, width, height).data;
  return encodeBytes(data);
}

function encodeBytes(data: Iterable<number>): string {
  let binary = "";
  for (const value of data) binary += String.fromCharCode(value);
  return btoa(binary);
}

export default function NativeParityProbe(): React.ReactElement {
  const [result, setResult] = useState<{ status: string; error?: string; width?: number; height?: number; cases?: Record<string, string>; sizes?: Record<string, [number, number]>; atlases?: Record<string, string>; gradePlans?: Record<string, ReturnType<typeof nativeGradeNodes>> }>({ status: "running" });

  useEffect(() => {
    void (async () => {
      try {
        const texture = await loadImageTexture(FIXTURE);
        const { width, height } = texture.image as { width: number; height: number };
        const rgb16 = new Uint16Array(width * height * 3);
        for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
          const code = 1 + x + 23 * y * y;
          rgb16.set([code, Math.floor(code / 2), Math.floor(code / 3)], (y * width + x) * 3);
        }
        const linearTexture = createLinearSourceTexture({ width, height, pixels: rgb16 });
        const engine = new ExportEngine();
        const out: Record<string, string> = {};
        const sizes: Record<string, [number, number]> = {};
        const atlases: Record<string, string> = Object.create(null);
        const gradePlans: Record<string, ReturnType<typeof nativeGradeNodes>> = {};
        const profiled = new Map<string, Awaited<ReturnType<typeof loadImageTexture>>>();
        for (const [name, overrides] of Object.entries(cases)) {
          // `lutFile` names a .cube next to the fixture; the native engine reads the same file.
          const { lutFile, linearSource, customNodes, iccSource, ...rest } = overrides as Record<string, unknown> & { lutFile?: string; linearSource?: boolean; customNodes?: FixtureNode[]; iccSource?: string };
          const lutTexture = lutFile ? parseCubeLUT(await (await fetch(`/parity/${lutFile}`)).text()) : null;
          if (lutFile && !lutTexture) throw new Error(`${lutFile} did not parse.`);
          const creativeEffects = normalizeCreativeEffects(rest.creativeEffects);
          for (const layer of creativeEffects) {
            if (!layer.glyphs) continue;
            atlases[layer.glyphs] ??= encodeBytes(glyphAtlasPixels(layer.glyphs));
          }
          const settings = { ...DEFAULT_SETTINGS, ...rest, lutTexture, creativeEffects } as EditorSettings;
          const gradeGraph = customNodes && fixtureGraph(customNodes);
          if (gradeGraph) gradePlans[name] = nativeGradeNodes(settings, nativeGradePath(gradeGraph));
          if (iccSource && !profiled.has(iccSource)) profiled.set(iccSource, await loadImageTexture(`/parity/${iccSource}`));
          const source = iccSource ? profiled.get(iccSource)! : linearSource ? linearTexture : texture;
          // A crop changes the output size, exactly as an export would.
          const size = cropSize(width, height, settings.crop);
          const blob = await engine.exportImage(source, settings, { gradeGraph, format: "image/png", quality: 1, width: size.width, height: size.height });
          out[name] = await pixels(blob, size.width, size.height);
          sizes[name] = [size.width, size.height];
          lutTexture?.dispose();
        }
        engine.dispose();
        texture.dispose();
        linearTexture.dispose();
        profiled.forEach((source) => source.dispose());
        setResult({ status: "done", width, height, cases: out, sizes, atlases, gradePlans });
      } catch (error) {
        setResult({ status: "failed", error: error instanceof Error ? error.message : String(error) });
      }
    })();
  }, []);

  return <pre data-testid="native-parity-result" data-status={result.status}>{JSON.stringify(result)}</pre>;
}
