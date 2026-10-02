import { describe, expect, it } from "vitest";
import { createDefaultGradeGraph, validateGradeGraph } from "../../app/lib/gradeGraph";

describe("grade graph validation", () => {
  it("accepts the canonical graph", () => expect(validateGradeGraph(createDefaultGradeGraph()).valid).toBe(true));
  it("rejects cycles", () => {
    const graph = createDefaultGradeGraph();
    graph.edges.push({ id: "cycle", sourceNodeId: "output", sourcePort: "image", targetNodeId: "source", targetPort: "image", order: 99 });
    expect(validateGradeGraph(graph).issues.some((issue) => issue.code === "cycle")).toBe(true);
  });
  it("rejects mask data connected to an image-only input", () => {
    const graph = createDefaultGradeGraph();
    graph.nodes.push({ id: "radial", kind: "mask-radial", name: "Radial", enabled: true, opacity: 1, params: { center: { x: 0.5, y: 0.5 }, radiusX: 0.3, radiusY: 0.3, feather: 0.1, invert: false } });
    graph.edges.push({ id: "bad-mask-edge", sourceNodeId: "radial", sourcePort: "mask", targetNodeId: "output", targetPort: "mask", order: 99 });
    expect(validateGradeGraph(graph).issues.some((issue) => issue.code === "invalid-port")).toBe(true);
  });
  it("rejects image-to-mask port mismatches", () => {
    const graph = createDefaultGradeGraph();
    graph.edges[0].targetPort = "mask";
    expect(validateGradeGraph(graph).issues.some((issue) => issue.code === "invalid-port")).toBe(true);
  });
});
