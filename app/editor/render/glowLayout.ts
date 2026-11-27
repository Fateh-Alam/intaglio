import type { GradeGraph } from "../../types/document";
import type { EditorSettings } from "../../types/editor";

/** A quarter-resolution document grid, limited by the input tile's detail. */
export function glowAxis(reference: number, span: number, working: number, radius: number) {
  const referenceTaps = Math.max(1, Math.floor(reference / 4)) * span;
  const size = Math.min(working, Math.max(1, Math.round(referenceTaps)));
  return { size, direction: 2 * radius * size / referenceTaps };
}

/** The two glow stages can consume each other's halo, so their reach adds. */
export function glowPadding(settings: EditorSettings, graph?: GradeGraph) {
  let padding = 0;
  for (const kind of ["bloom", "halation"] as const) {
    const active = settings[kind] > 0 || graph?.nodes.some((node) =>
      node.kind === kind && node.enabled && node.opacity > 0 && Number(node.params[kind]) > 0,
    );
    if (active) padding += 32 * Math.abs(settings[`${kind}Radius`]) + 8;
  }
  return Math.ceil(padding);
}
