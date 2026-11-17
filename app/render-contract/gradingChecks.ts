import * as THREE from 'three';
import { DEFAULT_SETTINGS } from '../editor/pageTypes';
import { IntaglioRenderer } from '../editor/render/IntaglioRenderer';
import { ExportEngine } from '../editor/render/ExportEngine';
import { bakeGradeLut } from '../editor/render/bakeGradeLut';
import { createDefaultGradeGraph } from '../lib/gradeGraph';
import { measureParity, type ParityMetrics } from '../lib/parityMetrics';
import { parseCubeLUT } from '../utils/lutParser';
import type { GradeGraph } from '../types/document';
import type { EditorSettings } from '../types/editor';

export async function gradingChecks(renderer: THREE.WebGLRenderer, source: THREE.Texture, width: number, height: number): Promise<Record<string, ParityMetrics>> {
  const pipeline = new IntaglioRenderer();
  const target = new THREE.WebGLRenderTarget(width,height,{type:THREE.UnsignedByteType,depthBuffer:false});
  const engine = new ExportEngine();
  const graph = createDefaultGradeGraph();
  const settings = { ...DEFAULT_SETTINGS, brightness: .7, contrast: .3 };
  const pixels = (candidate: EditorSettings, gradeGraph?: GradeGraph) => {
    pipeline.render({renderer, sourceTexture:source, settings:candidate, gradeGraph, target,width,height});
    const data = new Uint8Array(width*height*4);
    renderer.readRenderTargetPixels(target,0,0,width,height,data);
    return new Uint8ClampedArray(data);
  };
  let lut: THREE.Data3DTexture | null = null;
  try {
    const legacy = pixels(settings);
    const serial = pixels(settings,graph);
    const bypass = structuredClone(graph);
    bypass.nodes.find(node=>node.kind==='develop')!.enabled=false;
    const zero = structuredClone(graph);
    zero.nodes.find(node=>node.kind==='develop')!.opacity=0;
    const half = structuredClone(graph);
    half.nodes.find(node=>node.kind==='develop')!.opacity=.5;
    const local = structuredClone(graph);
    local.nodes.find(node=>node.kind==='develop')!.params={brightness:.7,contrast:.3};
    const png = await engine.exportImage(source,settings,{format:'image/png',width,height,gradeGraph:half});
    const bitmap=await createImageBitmap(png); const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d')!;ctx.drawImage(bitmap,0,0);bitmap.close();
    const topDown=ctx.getImageData(0,0,width,height).data;
    const bottomUp=new Uint8ClampedArray(topDown.length);
    for(let y=0;y<height;y++)bottomUp.set(topDown.subarray(y*width*4,(y+1)*width*4),(height-1-y)*width*4);
    lut=parseCubeLUT(bakeGradeLut(settings,graph,33));
    if(!lut)throw new Error('Baked grade did not parse as a LUT');
    return {
      graphDefault:measureParity(legacy,serial),
      graphBypass:measureParity(pixels(settings,bypass),pixels(settings,zero)),
      graphChangesPixels:measureParity(serial,pixels(settings,bypass)),
      graphOpacityChangesPixels:measureParity(serial,pixels(settings,half)),
      graphNodeParams:measureParity(serial,pixels(DEFAULT_SETTINGS,local)),
      graphExport:measureParity(pixels(settings,half),bottomUp),
      graphLutRoundTrip:measureParity(serial,pixels({...DEFAULT_SETTINGS,lutTexture:lut,lutStrength:1},graph)),
    };
  } finally { lut?.dispose();target.dispose();pipeline.dispose();engine.dispose(); }
}
