import * as THREE from 'three';
import { RenderPass } from './RenderPass';
import { PingPongTarget } from './PingPongTarget';
import { EditorSettings } from '../../types/editor';

export class RenderGraph {
  private passes: RenderPass[] = [];
  private pingPongTarget: PingPongTarget;
  private width: number = 0;
  private height: number = 0;
  
  constructor() {
    this.pingPongTarget = new PingPongTarget(1, 1);
  }

  public setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pingPongTarget.setSize(width, height);
  }

  public addPass(pass: RenderPass) {
    pass.setup();
    this.passes.push(pass);
  }

  public getPasses() {
    return this.passes;
  }

  public render(
    renderer: THREE.WebGLRenderer,
    settings: EditorSettings,
    inputTexture: THREE.Texture,
    finalTarget?: THREE.WebGLRenderTarget
  ) {
    let currentInput: THREE.Texture | THREE.WebGLRenderTarget = inputTexture;

    // First, update all uniforms so passes can decide if they are enabled
    for (const pass of this.passes) {
      pass.updateUniforms(settings);
    }

    // Filter enabled passes
    const activePasses = this.passes.filter(pass => pass.enabled);

    for (let i = 0; i < activePasses.length; i++) {
      const pass = activePasses[i];
      const isLast = i === activePasses.length - 1;

      const writeBuffer = isLast ? (finalTarget || null) : this.pingPongTarget.write;

      // The pass is responsible for binding the read buffer/texture
      pass.render(renderer, currentInput as any, writeBuffer);

      if (!isLast) {
        this.pingPongTarget.swap();
        currentInput = this.pingPongTarget.read;
      }
    }
  }

  public dispose() {
    this.passes.forEach(pass => pass.dispose());
    this.pingPongTarget.dispose();
  }

  public setViewOffset(fullWidth: number, fullHeight: number, x: number, y: number, width: number, height: number) {
    this.passes.forEach(pass => pass.setViewOffset(fullWidth, fullHeight, x, y, width, height));
  }

  public clearViewOffset() {
    this.passes.forEach(pass => pass.clearViewOffset());
  }
}
