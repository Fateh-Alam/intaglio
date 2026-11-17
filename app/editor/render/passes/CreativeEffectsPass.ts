import * as THREE from "three";
import type { EditorSettings } from "../../../types/editor";
import { EFFECT_BY_ID, type EffectId } from "../../effects/catalog";
import { hasCreativeEffects, hexRgb, type CreativeEffect } from "../../effects/settings";
import { dimensionsFromRenderInput, RenderPass, textureFromRenderInput, type RenderInput } from "../RenderPass";
import { print } from "../creative/print";
import { geometric } from "../creative/geometric";
import { signal } from "../creative/signal";
import { materials } from "../creative/materials";
import { finishing } from "../creative/finishing";
import { studio } from "../creative/studio";
import { ditherRgba, sortRgba } from "../creative/raster";
import { effectFragment, fullScreenVertex } from "../creative/shader";

const shaders: Record<EffectId, string> = { ...print, ...geometric, ...signal, ...materials, ...finishing, ...studio };
const copyFragment = `
  uniform sampler2D tInput;
  varying vec2 vUv;
  void main() { gl_FragColor = texture2D(tInput, vUv); }
`;

function renderTarget() {
  return new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false,
    colorSpace: THREE.NoColorSpace,
  });
}

export class CreativeEffectsPass extends RenderPass {
  private layers: readonly CreativeEffect[] = [];
  private readonly targets = [renderTarget(), renderTarget()];
  private readonly rasterTarget = renderTarget();
  private readonly programs = new Map<EffectId, THREE.ShaderMaterial>();
  private readonly atlases = new Map<string, THREE.CanvasTexture>();
  private readonly copy = new THREE.ShaderMaterial({
    vertexShader: fullScreenVertex,
    fragmentShader: copyFragment,
    uniforms: { tInput: { value: null } },
    depthTest: false,
    depthWrite: false,
  });

  setup() {}

  updateUniforms(settings: EditorSettings) {
    this.enabled = hasCreativeEffects(settings.creativeEffects);
    this.layers = this.enabled ? settings.creativeEffects.filter((layer) => layer.enabled && layer.opacity > 0) : [];
  }

  private program(effect: EffectId): THREE.ShaderMaterial {
    const saved = this.programs.get(effect);
    if (saved) return saved;
    const program = new THREE.ShaderMaterial({
      vertexShader: fullScreenVertex,
      fragmentShader: effectFragment(shaders[effect]),
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tInput: { value: null },
        tPattern: { value: null },
        uSize: { value: new THREE.Vector2() },
        uOpacity: { value: 1 },
        uSizePx: { value: 12 },
        uDetail: { value: 0.5 },
        uAngle: { value: 0 },
        uPhase: { value: 0 },
        uGlyphCount: { value: 1 },
        uShadow: { value: new THREE.Vector3() },
        uLight: { value: new THREE.Vector3() },
        uInvert: { value: false },
      },
    });
    this.programs.set(effect, program);
    return program;
  }

  private atlas(ramp: string): THREE.Texture {
    const saved = this.atlases.get(ramp);
    if (saved) return saved;
    const glyphs = Array.from(ramp);
    const glyphWidth = 40, glyphHeight = 56;
    const canvas = document.createElement("canvas");
    canvas.width = glyphWidth * glyphs.length;
    canvas.height = glyphHeight;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fff";
    context.font = "bold 46px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    glyphs.forEach((glyph, index) => {
      context.save();
      context.beginPath();
      context.rect(index * glyphWidth, 0, glyphWidth, glyphHeight);
      context.clip();
      context.fillText(glyph, (index + 0.5) * glyphWidth, glyphHeight * 0.51, glyphWidth);
      context.restore();
    });
    const atlas = new THREE.CanvasTexture(canvas);
    atlas.minFilter = THREE.LinearFilter;
    atlas.generateMipmaps = false;
    this.atlases.set(ramp, atlas);
    if (this.atlases.size > 16) {
      const oldest = this.atlases.keys().next().value!;
      this.atlases.get(oldest)?.dispose();
      this.atlases.delete(oldest);
    }
    return atlas;
  }

  private raster(renderer: THREE.WebGLRenderer, input: THREE.Texture, layer: CreativeEffect, w: number, h: number) {
    // Run raster algorithms on the effect's logical grid rather than on every
    // output pixel, to keep the result stable across preview and export sizes.
    const logical = layer.effect === "dither" ? layer.size * Math.min(w, h) / 720 : Math.max(w, h) / 1024;
    const sampleCell = Math.max(1, logical, Math.sqrt(w * h / (1024 * 1024)));
    const width = Math.max(1, Math.round(w / sampleCell));
    const height = Math.max(1, Math.round(h / sampleCell));
    this.rasterTarget.setSize(width, height);
    this.copy.uniforms.tInput.value = input;
    this.fsQuad.material = this.copy;
    renderer.setRenderTarget(this.rasterTarget);
    this.fsQuad.render(renderer);

    const data = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(this.rasterTarget, 0, 0, width, height, data);
    if (layer.effect === "dither") ditherRgba(data, width, height, layer);
    else sortRgba(data, width, height, layer);
    const texture = new THREE.DataTexture(data, width, height);
    texture.needsUpdate = true;
    return texture;
  }

  render(renderer: THREE.WebGLRenderer, readBuffer: RenderInput, writeBuffer: THREE.WebGLRenderTarget | null) {
    const { width, height } = dimensionsFromRenderInput(readBuffer);
    let input = textureFromRenderInput(readBuffer);
    for (const [index, layer] of this.layers.entries()) {
      const target = index === this.layers.length - 1 ? writeBuffer : this.targets[index % 2];
      target?.setSize(width, height);
      const definition = EFFECT_BY_ID.get(layer.effect)!;
      const material = this.program(layer.effect);
      const u = material.uniforms;
      u.tInput.value = input;
      u.uSize.value.set(width, height);
      u.uOpacity.value = layer.opacity;
      u.uSizePx.value = layer.size;
      u.uDetail.value = layer.detail;
      u.uAngle.value = THREE.MathUtils.degToRad(layer.angle);
      u.uPhase.value = layer.phase;
      u.uShadow.value.set(...hexRgb(layer.shadow));
      u.uLight.value.set(...hexRgb(layer.light));
      u.uInvert.value = layer.invert;
      let raster: THREE.DataTexture | null = null;
      if (definition.glyphs) {
        const glyphs = layer.glyphs || " ";
        u.tPattern.value = this.atlas(glyphs);
        u.uGlyphCount.value = Array.from(glyphs).length;
      } else if (layer.effect === "dither" || layer.effect === "pixel-sort") {
        raster = this.raster(renderer, input, layer, width, height);
        u.tPattern.value = raster;
      }
      this.fsQuad.material = material;
      renderer.setRenderTarget(target);
      this.fsQuad.render(renderer);
      raster?.dispose();
      if (target) input = target.texture;
    }
  }

  override dispose() {
    super.dispose();
    this.targets.forEach((target) => target.dispose());
    this.rasterTarget.dispose();
    this.copy.dispose();
    this.programs.forEach((program) => program.dispose());
    this.atlases.forEach((atlas) => atlas.dispose());
  }
}
