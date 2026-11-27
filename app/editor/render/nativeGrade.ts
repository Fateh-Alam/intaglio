import type { GradeGraph, GradeNode } from "../../types/document";
import type { EditorSettings } from "../../types/editor";
import { createDefaultGradeGraph } from "../../lib/gradeGraph";
import { compileGradeGraph } from "./compileGradeGraph";
import { gradeNodeSettings } from "./gradeNodeSettings";

const canonical = createDefaultGradeGraph().nodes.map((node) => node.kind);
const fixed = new Set(["source", "geometry", "display-transform", "output"]);

/** Keep the default graph on the fused path, including legacy explicit-LUT upgrades. */
export function nativeGradePath(graph?: GradeGraph): GradeNode[] | null {
  if (!graph) return null;
  const nodes = compileGradeGraph(graph);
  if (nodes.length === canonical.length && nodes.every((node, index) =>
    node.kind === canonical[index] && node.enabled && node.opacity === 1 && Object.keys(node.params).length === 0)) return null;
  return nodes.filter((node) => node.enabled && node.opacity > 0 && !fixed.has(node.kind));
}

export function nativeGradeNodes(settings: EditorSettings, path: GradeNode[] | null) {
  return path?.map((node) => {
    const effective = gradeNodeSettings(settings, node);
    // Overrides can only touch scalar controls; resources and layers stay with
    // the document. Send the resolved controls, preserving the web's validation.
    const overrides = effective === settings ? undefined : {
      ...effective, lutTexture: undefined, compareTexture: undefined,
      masks: undefined, adjustmentLayers: undefined, creativeEffects: undefined,
    };
    return { kind: node.kind, opacity: node.opacity, settings: overrides };
  });
}
