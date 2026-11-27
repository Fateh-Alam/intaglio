import * as THREE from "three";
import type { EditorSettings } from "../../types/editor";
import { hasCreativeEffects } from "../effects/settings";
import { RenderPass, type RenderInput, dimensionsFromRenderInput, textureFromRenderInput } from "./RenderPass";
import { PingPongTarget } from "./PingPongTarget";
import { MaskBlendPass } from "./passes/MaskBlendPass";
import { plateRenderSettings } from "./plateParams";

import type { GradeGraph } from "../../types/document";
import { DisplayTransformPass } from "./passes/DisplayTransformPass";
import { gradeNodeSettings } from "./gradeNodeSettings";
import { compileGradeGraph } from "./compileGradeGraph";
import { cropSize } from "../../lib/cropGeometry";

export interface RenderRuntimeResources {
  gradeGraph?: GradeGraph;
  /** LUT authoring: evaluate only pixel-local color operations, without dither. */
  colorOnly?: boolean;
  /** Preview only. Store coverage separately from the photo and its histogram. */
  maskOverlay?: { plateId: string; target: THREE.WebGLRenderTarget };
  /** Preview only. Export reads the committed strokes in the document. */
  liveBrush?: boolean;
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
  private readonly copyMaterial = new THREE.ShaderMaterial({
    uniforms: { map: { value: null }, base: { value: null }, opacity: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'uniform sampler2D map; uniform sampler2D base; uniform float opacity; varying vec2 vUv; void main(){gl_FragColor=mix(texture2D(base,vUv),texture2D(map,vUv),opacity);}',
    depthTest: false, depthWrite: false,
  });
  private readonly nodeBase = new PingPongTarget(1, 1);
  private readonly copyGeometry = new THREE.PlaneGeometry(2, 2);
  private readonly copyQuad = new THREE.Mesh(this.copyGeometry, this.copyMaterial);

  constructor() { this.copyScene.add(this.copyQuad); }

  setSize(width: number, height: number): void {
    this.pingPongTarget.setSize(width, height);
    this.nodeBase.setSize(width, height);
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

  private copy(renderer: THREE.WebGLRenderer, input: RenderInput, target: THREE.WebGLRenderTarget | null, base: RenderInput = input, opacity = 1): THREE.WebGLRenderTarget | null {
    this.copyMaterial.uniforms.map.value = textureFromRenderInput(input);
    this.copyMaterial.uniforms.base.value = textureFromRenderInput(base);
    this.copyMaterial.uniforms.opacity.value = opacity;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(this.copyScene, this.copyCamera);
    return target;
  }

  render(renderer: THREE.WebGLRenderer, settings: EditorSettings, inputTexture: THREE.Texture, finalTarget?: THREE.WebGLRenderTarget, runtime: RenderRuntimeResources = {}): void {
    const source = dimensionsFromRenderInput(inputTexture, 1);
    const reference = cropSize(source.width, source.height, settings.crop);
    this.globalPasses.forEach((pass) => pass.setEffectSize(reference.width, reference.height));
    if (runtime.gradeGraph) { this.renderSaved(renderer, settings, inputTexture, finalTarget, runtime); return; }
    // Creative Effects use the unquantized display signal. Final display dither
    // would perturb palette thresholds and the inputs to error diffusion.
    (this.globalPasses[5] as DisplayTransformPass).setDither(!runtime.colorOnly && !hasCreativeEffects(settings.creativeEffects));
    const overlay = runtime.maskOverlay;
    this.maskBlendPass?.pruneBrushes(settings.masks);
    const sourceAspect = source.width / Math.max(source.height, 1);
    this.sourcePasses.forEach((pass) => pass.setSource(inputTexture));
    let accumulator = this.runPasses(renderer, this.sourcePasses, settings, inputTexture);
    accumulator = this.runPasses(renderer, this.platePasses, settings, accumulator);

    for (const plate of settings.adjustmentLayers) {
      const stableBase = this.copy(renderer, accumulator, this.plateAccumulationTarget.read)!;
      const plateSettings = plateRenderSettings(settings, plate.params);
      const graded = this.runPasses(renderer, this.platePasses, plateSettings, stableBase);
      if (this.maskBlendPass) {
        this.maskBlendPass.updateForPlate(plate, settings.masks, sourceAspect, settings.crop, Boolean(runtime.liveBrush));
        this.maskBlendPass.renderBlend(renderer, graded, stableBase, this.pingPongTarget.write);
        if (overlay?.plateId === plate.id) this.maskBlendPass.renderCoverage(renderer, stableBase, overlay.target);
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

  private renderSaved(renderer: THREE.WebGLRenderer, settings: EditorSettings, input: THREE.Texture, target: THREE.WebGLRenderTarget | undefined, runtime: RenderRuntimeResources): void {
    const nodes = compileGradeGraph(runtime.gradeGraph!);
    (this.globalPasses[5] as DisplayTransformPass).setDither(!runtime.colorOnly && !hasCreativeEffects(settings.creativeEffects));
    const passes = new Map([
      ['geometry', this.sourcePasses[0]], ['develop', this.platePasses[0]],
      ['curve', this.platePasses[1]], ['oklch-mixer', this.platePasses[2]],
      ['color-wheels', this.platePasses[3]], ['lut', this.platePasses[4]],
      ['film', this.globalPasses[0]], ['halation', this.globalPasses[1]],
      ['bloom', this.globalPasses[2]], ['optical', this.globalPasses[3]],
      ['sharpen', this.globalPasses[4]], ['display-transform', this.globalPasses[5]],
    ]);
    this.sourcePasses.forEach(pass => pass.setSource(input));
    this.maskBlendPass?.pruneBrushes(settings.masks);
    const dimensions = dimensionsFromRenderInput(input, 1);
    let current: RenderInput = input;
    for (const node of nodes) {
      if (!node.enabled || node.opacity === 0 || node.kind === 'source' || node.kind === 'output') continue;
      if (runtime.colorOnly && ['plate-composite', 'halation', 'bloom', 'optical', 'sharpen'].includes(node.kind)) continue;
      const base = node.opacity < 1 ? this.copy(renderer, current, this.nodeBase.read)! : current;
      if (node.kind === 'plate-composite') {
        for (const plate of settings.adjustmentLayers) {
          const stableBase = this.copy(renderer, current, this.plateAccumulationTarget.read)!;
          const graded = this.runPasses(renderer, this.platePasses, plateRenderSettings(settings, plate.params), stableBase);
          if (this.maskBlendPass) {
            this.maskBlendPass.updateForPlate(plate, settings.masks, dimensions.width / dimensions.height, settings.crop, Boolean(runtime.liveBrush));
            this.maskBlendPass.renderBlend(renderer, graded, stableBase, this.pingPongTarget.write);
            if (runtime.maskOverlay?.plateId === plate.id) this.maskBlendPass.renderCoverage(renderer, stableBase, runtime.maskOverlay.target);
            this.pingPongTarget.swap();
            current = this.pingPongTarget.read;
          }
        }
      } else {
        const pass = passes.get(node.kind)!;
        if (!(runtime.colorOnly && node.kind === 'geometry')) current = this.runPasses(renderer, [pass], gradeNodeSettings(settings, node), current);
        if (node.kind === 'geometry') current = this.runPasses(renderer, [this.sourcePasses[1]], settings, current);
      }
      if (node.opacity < 1) {
        this.copy(renderer, current, this.pingPongTarget.write, base, node.opacity);
        this.pingPongTarget.swap();
        current = this.pingPongTarget.read;
      }
    }
    if (!runtime.colorOnly) current = this.runPasses(renderer, this.globalPasses.slice(6), settings, current);
    this.copy(renderer, current, target ?? null);
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
    this.nodeBase.dispose();
    this.plateAccumulationTarget.dispose();
    this.copyGeometry.dispose();
    this.copyMaterial.dispose();
  }
}
