import { describe, expect, it } from 'vitest';
import { createDefaultGradeGraph } from '../../app/lib/gradeGraph';
import { compileGradeGraph, moveGradeNode } from '../../app/editor/render/compileGradeGraph';
import { gradeNodeSettings } from '../../app/editor/render/gradeNodeSettings';
import { DEFAULT_SETTINGS } from '../../app/editor/pageTypes';

describe('executable grade graph', () => {
  it('follows edges rather than node array order', () => {
    const graph = createDefaultGradeGraph();
    graph.nodes.reverse();
    expect(compileGradeGraph(graph).map(node => node.kind)).toEqual(compileGradeGraph(createDefaultGradeGraph()).map(node => node.kind));
  });
  it('retains an implicit LUT for older V2 documents', () => {
    const graph = createDefaultGradeGraph();
    graph.nodes = graph.nodes.filter(node => node.id !== 'lut');
    graph.edges = graph.edges.filter(edge => edge.sourceNodeId !== 'lut');
    graph.edges.find(edge => edge.targetNodeId === 'lut')!.targetNodeId = 'plates';
    expect(compileGradeGraph(graph).filter(node => node.kind === 'lut')).toHaveLength(1);
  });
  it('accepts mask side-inputs on Plate Composite and keeps them when reordering', () => {
    const graph = createDefaultGradeGraph();
    graph.nodes.push({ id: 'mask-1', kind: 'mask-brush', name: 'Brush', enabled: true, opacity: 1, params: { strokes: [], invert: false } });
    graph.edges.push({ id: 'edge-mask-1-plates', sourceNodeId: 'mask-1', targetNodeId: 'plates', sourcePort: 'mask', targetPort: 'mask', order: 0 });
    expect(compileGradeGraph(graph).map(node => node.kind)).toEqual(compileGradeGraph(createDefaultGradeGraph()).map(node => node.kind));
    const moved = moveGradeNode(graph, 'curve', -1);
    expect(moved.nodes.some(node => node.id === 'mask-1')).toBe(true);
    expect(moved.edges.some(edge => edge.id === 'edge-mask-1-plates')).toBe(true);
    expect(() => compileGradeGraph(moved)).not.toThrow();
  });
  it('rejects an image branch rather than flattening it', () => {
    const graph = createDefaultGradeGraph();
    graph.edges.push({ ...graph.edges[2], id: 'branch', targetNodeId: 'film' });
    expect(() => compileGradeGraph(graph)).toThrow(/serial|Parallel/);
  });
  it('keeps encoding boundaries fixed while allowing color stages to move', () => {
    const graph = createDefaultGradeGraph();
    expect(moveGradeNode(graph, 'develop', -1)).toBe(graph);
    const moved = moveGradeNode(graph, 'curve', -1);
    expect(compileGradeGraph(moved).slice(2,4).map(node => node.id)).toEqual(['curve','develop']);
  });
  it('rejects invalid opacity and bypassed required transforms', () => {
    const graph = createDefaultGradeGraph();
    graph.nodes[2].opacity = NaN;
    expect(() => compileGradeGraph(graph)).toThrow(/opacity/);
    graph.nodes[2].opacity = 1;
    graph.nodes[1].enabled = false;
    expect(() => compileGradeGraph(graph)).toThrow(/required/);
  });
  it('allows finite node-local color overrides without replacing resources', () => {
    const node = createDefaultGradeGraph().nodes.find(node => node.kind === 'develop')!;
    node.params = { contrast: 0.5, brightness: NaN, lutTexture: 'bad' };
    const settings = gradeNodeSettings(DEFAULT_SETTINGS, node);
    expect(settings.contrast).toBe(.5);
    expect(settings.brightness).toBe(DEFAULT_SETTINGS.brightness);
    expect(settings.lutTexture).toBe(DEFAULT_SETTINGS.lutTexture);
  });
});


describe('OKLCH node overrides', () => {
  it('accepts the mixer channel inputs and rejects the unused tealOrange field', () => {
    const graph = createDefaultGradeGraph();
    const node = graph.nodes.find(node => node.kind === 'oklch-mixer')!;
    node.params = { hslOrangeSat: -0.6, hslBlueHue: 0.25 };
    expect(() => compileGradeGraph(graph)).not.toThrow();
    expect(gradeNodeSettings(DEFAULT_SETTINGS, node)).toMatchObject({ hslOrangeSat: -0.6, hslBlueHue: 0.25 });
    node.params = { tealOrange: 0.5 };
    expect(() => compileGradeGraph(graph)).toThrow(/not a supported node override/);
  });
});
