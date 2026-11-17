import type { GradeGraph, GradeNode } from '../../types/document';
import { validateGradeNodeParams } from './gradeNodeSettings';
import { nodeOutputPort, validateGradeGraph } from '../../lib/gradeGraph';

const supported = new Set(['source', 'geometry', 'develop', 'curve', 'oklch-mixer', 'color-wheels', 'lut', 'plate-composite', 'film', 'halation', 'bloom', 'optical', 'sharpen', 'display-transform', 'output']);
/**
 * Compile only executable serial image paths. Never silently flatten branches.
 * Mask nodes are side inputs on Plate Composite's mask port; the plate pipeline
 * renders them, so they are validated here but not part of the image chain.
 */
export function compileGradeGraph(graph: GradeGraph): GradeNode[] {
  const validation = validateGradeGraph(graph);
  if (!validation.valid) throw new Error(validation.issues.map(issue => issue.message).join(' '));
  const imageNodes = graph.nodes.filter(node => nodeOutputPort(node) === 'image');
  const imageEdges = graph.edges.filter(edge => edge.sourcePort === 'image');
  const ordered: GradeNode[] = [];
  let node = graph.nodes.find(node => node.kind === 'source')!;
  while (true) {
    if (!supported.has(node.kind)) throw new Error(`${node.kind} is not supported by the serial grader yet.`);
    if (!Number.isFinite(node.opacity) || node.opacity < 0 || node.opacity > 1) throw new Error('Node opacity must be between 0 and 1.');
    validateGradeNodeParams(node);
    ordered.push(node);
    if (node.kind === 'output') break;
    const edges = imageEdges.filter(edge => edge.sourceNodeId === node.id);
    if (edges.length !== 1) throw new Error('The grader currently requires one serial image path.');
    const next = graph.nodes.find(candidate => candidate.id === edges[0].targetNodeId)!;
    if (imageEdges.filter(edge => edge.targetNodeId === next.id).length !== 1) throw new Error('Parallel inputs require a mixer, which is not supported yet.');
    node = next;
  }
  if (ordered.length !== imageNodes.length) throw new Error('Remove disconnected nodes before rendering.');
  if (ordered[1]?.kind !== 'geometry' || ordered.at(-2)?.kind !== 'display-transform') throw new Error('Geometry must follow Source and Display must precede Output.');
  for (const node of ordered.filter(node => ['source', 'geometry', 'display-transform', 'output'].includes(node.kind))) {
    if (!node.enabled || node.opacity !== 1) throw new Error(`${node.name} is a required pipeline stage.`);
  }
  // V2 documents predate the explicit LUT node; retain their existing look.
  if (!ordered.some(node => node.kind === 'lut')) {
    const index = ordered.findIndex(node => node.kind === 'plate-composite');
    ordered.splice(index < 0 ? ordered.length - 2 : index, 0, { id: '__legacy-lut', kind: 'lut', name: 'LUT', enabled: true, opacity: 1, params: {} });
  }
  return ordered;
}

export function moveGradeNode(graph: GradeGraph, nodeId: string, direction: -1 | 1): GradeGraph {
  const nodes = compileGradeGraph(graph).filter(node => node.id !== '__legacy-lut');
  const index = nodes.findIndex(node => node.id === nodeId);
  const destination = index + direction;
  if (index < 2 || index >= nodes.length - 2 || destination < 2 || destination >= nodes.length - 2) return graph;
  [nodes[index], nodes[destination]] = [nodes[destination], nodes[index]];
  // Keep mask side-inputs (nodes and mask-port edges) exactly as they were.
  const maskNodes = graph.nodes.filter(node => nodeOutputPort(node) !== 'image');
  const maskEdges = graph.edges.filter(edge => edge.sourcePort !== 'image');
  const imageEdges = nodes.slice(0, -1).map((node, i) => ({ id: `edge-${node.id}-${nodes[i+1].id}`, sourceNodeId: node.id, targetNodeId: nodes[i+1].id, sourcePort: 'image' as const, targetPort: 'image' as const, order: i }));
  return { ...graph, nodes: [...nodes.map((node, i) => ({ ...node, position: { x: i * 190, y: 80 } })), ...maskNodes], edges: [...imageEdges, ...maskEdges] };
}
