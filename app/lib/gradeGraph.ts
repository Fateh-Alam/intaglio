import type { GradeEdge, GradeGraph, GradeNode, GradeNodeKind, GradePortType } from "../types/document";

const MASK_KINDS = new Set<GradeNodeKind>([
  "mask-radial", "mask-linear", "mask-luminance", "mask-color-range",
  "mask-brush", "mask-add", "mask-subtract", "mask-intersect",
]);

export interface GraphValidationIssue {
  code: "duplicate-node" | "missing-node" | "invalid-port" | "cycle" | "source-count" | "output-count" | "disconnected" | "unsupported-version";
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface GraphValidationResult {
  valid: boolean;
  issues: GraphValidationIssue[];
  orderedNodeIds: string[];
}

export const nodeOutputPort = (node: GradeNode): GradePortType => MASK_KINDS.has(node.kind) ? "mask" : "image";
const acceptsInputPort = (node: GradeNode, port: GradePortType): boolean => {
  if (node.kind === "source" || node.kind.startsWith("mask-") && !["mask-add", "mask-subtract", "mask-intersect"].includes(node.kind)) return false;
  if (["mask-add", "mask-subtract", "mask-intersect"].includes(node.kind)) return port === "mask";
  if (node.kind === "plate-composite") return port === "image" || port === "mask";
  return port === "image";
};

export function validateGradeGraph(graph: GradeGraph): GraphValidationResult {
  const issues: GraphValidationIssue[] = [];
  if (graph.version !== 2) issues.push({ code: "unsupported-version", message: `Unsupported graph version ${String(graph.version)}.` });

  const nodes = new Map<string, GradeNode>();
  for (const node of graph.nodes) {
    if (nodes.has(node.id)) issues.push({ code: "duplicate-node", nodeId: node.id, message: `Duplicate node id ${node.id}.` });
    nodes.set(node.id, node);
  }

  const outputNodes = graph.nodes.filter((node) => node.kind === "output");
  if (outputNodes.length !== 1 || outputNodes[0]?.id !== graph.outputNodeId) {
    issues.push({ code: "output-count", message: "A grade graph must have exactly one declared output node." });
  }
  const sourceNodes = graph.nodes.filter((node) => node.kind === "source");
  if (sourceNodes.length !== 1) issues.push({ code: "source-count", message: "A grade graph must have exactly one source node." });

  const incoming = new Map<string, GradeEdge[]>();
  const outgoing = new Map<string, GradeEdge[]>();
  for (const edge of graph.edges) {
    const source = nodes.get(edge.sourceNodeId);
    const target = nodes.get(edge.targetNodeId);
    if (!source || !target) {
      issues.push({ code: "missing-node", edgeId: edge.id, message: `Edge ${edge.id} references a missing node.` });
      continue;
    }
    if (nodeOutputPort(source) !== edge.sourcePort || !acceptsInputPort(target, edge.targetPort) || edge.sourcePort !== edge.targetPort) {
      issues.push({ code: "invalid-port", edgeId: edge.id, message: `Edge ${edge.id} connects incompatible ${edge.sourcePort} and ${edge.targetPort} ports.` });
    }
    incoming.set(edge.targetNodeId, [...(incoming.get(edge.targetNodeId) ?? []), edge]);
    outgoing.set(edge.sourceNodeId, [...(outgoing.get(edge.sourceNodeId) ?? []), edge]);
  }

  const indegree = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) if (nodes.has(edge.sourceNodeId) && nodes.has(edge.targetNodeId)) indegree.set(edge.targetNodeId, (indegree.get(edge.targetNodeId) ?? 0) + 1);
  const queue = graph.nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id).sort();
  const orderedNodeIds: string[] = [];
  while (queue.length) {
    const id = queue.shift();
    if (!id) break;
    orderedNodeIds.push(id);
    for (const edge of outgoing.get(id) ?? []) {
      const next = (indegree.get(edge.targetNodeId) ?? 0) - 1;
      indegree.set(edge.targetNodeId, next);
      if (next === 0) queue.push(edge.targetNodeId);
    }
  }
  if (orderedNodeIds.length !== graph.nodes.length) issues.push({ code: "cycle", message: "The grade graph contains a cycle." });

  const reachable = new Set<string>();
  const visit = (id: string) => {
    if (reachable.has(id)) return;
    reachable.add(id);
    for (const edge of incoming.get(id) ?? []) visit(edge.sourceNodeId);
  };
  if (nodes.has(graph.outputNodeId)) visit(graph.outputNodeId);
  for (const node of graph.nodes) {
    if (node.enabled && !reachable.has(node.id)) issues.push({ code: "disconnected", nodeId: node.id, message: `Enabled node ${node.name} is disconnected from output.` });
  }
  return { valid: issues.length === 0, issues, orderedNodeIds };
}

export function createDefaultGradeGraph(): GradeGraph {
  const kinds: Array<[string, GradeNodeKind, string]> = [
    ["source", "source", "Source"], ["geometry", "geometry", "Geometry"],
    ["develop", "develop", "Develop"], ["curve", "curve", "Tone Curve"],
    ["oklch", "oklch-mixer", "OKLCH Mixer"], ["wheels", "color-wheels", "Color Wheels"], ["plates", "plate-composite", "Plate Composite"],
    ["film", "film", "Film"], ["halation", "halation", "Halation"],
    ["bloom", "bloom", "Bloom"], ["optical", "optical", "Optical"],
    ["sharpen", "sharpen", "Sharpen"], ["display", "display-transform", "Display"],
    ["output", "output", "Output"],
  ];
  const nodes: GradeNode[] = kinds.map(([id, kind, name], index) => ({ id, kind: kind as "source", name, enabled: true, opacity: 1, params: {}, position: { x: index * 190, y: 80 } }));
  const edges: GradeEdge[] = nodes.slice(0, -1).map((node, index) => ({ id: `edge-${node.id}-${nodes[index + 1].id}`, sourceNodeId: node.id, sourcePort: "image", targetNodeId: nodes[index + 1].id, targetPort: "image", order: index }));
  return { version: 2, nodes, edges, outputNodeId: "output" };
}
