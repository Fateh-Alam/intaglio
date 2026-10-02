import * as THREE from "three";
import type { EditorSettings } from "../../types/editor";
import { RenderPass, type RenderInput, textureFromRenderInput } from "./RenderPass";
import { PingPongTarget } from "./PingPongTarget";
import { MaskBlendPass } from "./passes/MaskBlendPass";
import { plateRenderSettings } from "./plateParams";

export interface RenderRuntimeResources {
  brushMaskTexture?: THREE.Texture | null;
}

export class RenderGraph {
  private readonly sourcePasses: RenderPass[] = [];
  private readonly platePasses: RenderPass[] = [];
  private readonly globalPasses: RenderPass[] = [];
  private maskBlendPass: MaskBlendPass | null = null;
  private readonly pingPongTarget = new PingPongTarget(1, 1);
  private readonly plateAccumulationTarget = new PingPongTarget(1, 1);
  private readonly copyScene = new THREE.Scene();
  private readonly copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly copyMaterial = new THREE.MeshBasicMaterial();
  private readonly copyGeometry = new THREE.PlaneGeometry(2, 2);
  private readonly copyQuad = new THREE.Mesh(this.copyGeometry, this.copyMaterial);

  constructor() { this.copyScene.add(this.copyQuad); }

  setSize(width: number, height: number): void {
    this.pingPongTarget.setSize(width, height);
    this.plateAccumulationTarget.setSize(width, height);
  }

  addSourcePass(pass: RenderPass): void { pass.setup(); this.sourcePasses.push(pass); }
  addPlatePass(pass: RenderPass): void { pass.setup(); this.platePasses.push(pass); }
  setMaskBlendPass(pass: MaskBlendPass): void { pass.setup(); this.maskBlendPass = pass; }
  addGlobalPass(pass: RenderPass): void { pass.setup(); this.globalPasses.push(pass); }
  getSourcePasses(): readonly RenderPass[] { return this.sourcePasses; }
  getPlatePasses(): readonly RenderPass[] { return this.platePasses; }
  getGlobalPasses(): readonly RenderPass[] { return this.globalPasses; }

  private runPasses(renderer: THREE.WebGLRenderer, passes: RenderPass[], settings: EditorSettings, input: RenderInput): RenderInput {
    let current = input;
    for (const pass of passes) {
      pass.updateUniforms(settings);
      if (!pass.enabled) continue;
      pass.render(renderer, current, this.pingPongTarget.write);
      this.pingPongTarget.swap();
      current = this.pingPongTarget.read;
    }
    return current;
  }

  private copy(renderer: THREE.WebGLRenderer, input: RenderInput, target: THREE.WebGLRenderTarget): THREE.WebGLRenderTarget {
    this.copyMaterial.map = textureFromRenderInput(input);
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(this.copyScene, this.copyCamera);
    return target;
  }

  render(renderer: THREE.WebGLRenderer, settings: EditorSettings, inputTexture: THREE.Texture, finalTarget?: THREE.WebGLRenderTarget, runtime: RenderRuntimeResources = {}): void {
    this.sourcePasses.forEach((pass) => pass.setSource(inputTexture));
    let accumulator = this.runPasses(renderer, this.sourcePasses, settings, inputTexture);
    accumulator = this.runPasses(renderer, this.platePasses, settings, accumulator);

    for (const plate of settings.adjustmentLayers) {
      const stableBase = this.copy(renderer, accumulator, this.plateAccumulationTarget.read);
      const plateSettings = plateRenderSettings(settings, plate.params);
      const graded = this.runPasses(renderer, this.platePasses, plateSettings, stableBase);
      if (this.maskBlendPass) {
        this.maskBlendPass.updateForPlate(plate, settings.masks, runtime.brushMaskTexture ?? null);
        this.maskBlendPass.renderBlend(renderer, graded, stableBase, this.pingPongTarget.write);
        this.pingPongTarget.swap();
        accumulator = this.pingPongTarget.read;
      } else {
        accumulator = graded;
      }
    }

    let current = accumulator;
    const enabledGlobal = this.globalPasses.filter((pass) => { pass.updateUniforms(settings); return pass.enabled; });
    if (enabledGlobal.length === 0) {
      if (finalTarget) this.copy(renderer, current, finalTarget);
      return;
    }
    enabledGlobal.forEach((pass, index) => {
      const isLast = index === enabledGlobal.length - 1;
      const output = isLast ? finalTarget ?? null : this.pingPongTarget.write;
      pass.render(renderer, current, output);
      if (!isLast) { this.pingPongTarget.swap(); current = this.pingPongTarget.read; }
    });
  }

  setViewOffset(fullWidth: number, fullHeight: number, x: number, y: number, width: number, height: number): void {
    this.sourcePasses.forEach((pass) => pass.setViewOffset(fullWidth, fullHeight, x, y, width, height));
    this.maskBlendPass?.setViewOffset(fullWidth, fullHeight, x, y, width, height);
    this.globalPasses.forEach((pass) => pass.setViewOffset(fullWidth, fullHeight, x, y, width, height));
  }

  clearViewOffset(): void {
    this.sourcePasses.forEach((pass) => pass.clearViewOffset());
    this.maskBlendPass?.clearViewOffset();
    this.globalPasses.forEach((pass) => pass.clearViewOffset());
  }

  dispose(): void {
    [...this.sourcePasses, ...this.platePasses, ...this.globalPasses].forEach((pass) => pass.dispose());
    this.maskBlendPass?.dispose();
    this.pingPongTarget.dispose();
    this.plateAccumulationTarget.dispose();
    this.copyGeometry.dispose();
    this.copyMaterial.dispose();
  }
}
