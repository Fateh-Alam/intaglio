import * as THREE from 'three';
import type { GradeGraph } from '../../types/document';
import type { EditorSettings } from '../../types/editor';
import { IntaglioRenderer } from './IntaglioRenderer';
import { compileGradeGraph } from './compileGradeGraph';

export function bakeGradeLut(settings: EditorSettings, graph: GradeGraph, size: 33 | 65): string {
  compileGradeGraph(graph);
  const count = size ** 3;
  const width = Math.ceil(Math.sqrt(count));
  const height = Math.ceil(count / width);
  const input = new Float32Array(width * height * 4);
  for (let i = 0; i < count; i++) {
    input[i*4] = (i % size)/(size-1);
    input[i*4+1] = (Math.floor(i/size) % size)/(size-1);
    input[i*4+2] = Math.floor(i/(size*size))/(size-1);
    input[i*4+3] = 1;
  }
  const texture = new THREE.DataTexture(input, width, height, THREE.RGBAFormat, THREE.FloatType);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  const pipeline = new IntaglioRenderer();
  const target = new THREE.WebGLRenderTarget(width, height, { type: THREE.FloatType, format: THREE.RGBAFormat, colorSpace: THREE.NoColorSpace, depthBuffer: false });
  try {
    if (!renderer.extensions.has('EXT_color_buffer_float')) throw new Error('Floating-point LUT export is unavailable on this GPU.');
    pipeline.render({ renderer, sourceTexture: texture, settings, gradeGraph: graph, colorOnly: true, target, width, height });
    const output = new Float32Array(width * height * 4);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, output);
    const lines = ['TITLE "Etch Color Grade"', '# sRGB encoded input/output; spatial effects, masks, geometry and creative effects excluded', `LUT_3D_SIZE ${size}`, 'DOMAIN_MIN 0 0 0', 'DOMAIN_MAX 1 1 1'];
    for (let i = 0; i < count; i++) {
      const color = [output[i*4], output[i*4+1], output[i*4+2]];
      if (color.some(value => !Number.isFinite(value))) throw new Error('The grade produced a non-finite color. Check node settings.');
      lines.push(color.map(value => value.toFixed(7)).join(' '));
    }
    return lines.join('\n') + '\n';
  } finally { target.dispose(); texture.dispose(); pipeline.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
}
