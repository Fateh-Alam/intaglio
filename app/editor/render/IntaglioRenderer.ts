import * as THREE from "three";
import type { EditorSettings } from "../../types/editor";
import { createRenderGraph } from "./createRenderGraph";

export interface IntaglioRenderRequest {
  renderer: THREE.WebGLRenderer;
  sourceTexture: THREE.Texture;
  settings: Readonly<EditorSettings>;
  target: THREE.WebGLRenderTarget;
  width: number;
  height: number;
  brushMaskTexture?: THREE.Texture | null;
  tile?: {
    fullWidth: number;
    fullHeight: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  };
}

/** Canonical graph compiler and executor used by preview, proof, export, and batch. */
export class IntaglioRenderer {
  private readonly graph = createRenderGraph();

  render(request: Readonly<IntaglioRenderRequest>): void {
    const width = Math.max(1, Math.floor(request.width));
    const height = Math.max(1, Math.floor(request.height));
    this.graph.setSize(width, height);
    if (request.target.width !== width || request.target.height !== height) request.target.setSize(width, height);
    if (request.tile) {
      this.graph.setViewOffset(
        request.tile.fullWidth,
        request.tile.fullHeight,
        request.tile.offsetX,
        request.tile.offsetY,
        request.tile.width,
        request.tile.height,
      );
    } else {
      this.graph.clearViewOffset();
    }
    this.graph.render(request.renderer, request.settings as EditorSettings, request.sourceTexture, request.target, {
      brushMaskTexture: request.brushMaskTexture ?? null,
    });
  }

  dispose(): void {
    this.graph.dispose();
  }
}
