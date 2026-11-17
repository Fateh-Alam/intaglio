import * as THREE from 'three';
import { RenderPass, type RenderInput, textureFromRenderInput } from '../RenderPass';
import type { AdjustmentLayer, MaskLayer, PhotoCrop } from '../../../types/editor';
import { OKLAB_GLSL_CHUNK } from '../shaders/oklabChunk';
import { CROP_GLSL } from '../shaders/geometryChunk';
import { linearGeometry, MAX_BRUSH_PARTS, MAX_MASK_PARTS, radialGeometry } from '../../../lib/maskGeometry';
import { BrushTextureCache } from '../brushTextures';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Positions are image space (top-left origin); x is scaled by the aspect so
// shapes stay round. Luminance uses OKLab lightness and color uses OKLCh hue,
// matching how people perceive "mid-tones" and "this blue".
const fragmentShader = `
#define MAX_MASKS ${MAX_MASK_PARTS}

uniform sampler2D tDiffuse; // graded plate
uniform sampler2D tBase;    // image before this plate
uniform sampler2D tBrush0;
uniform sampler2D tBrush1;
uniform sampler2D tBrush2;
uniform sampler2D tBrush3;

uniform float uPlateOpacity;
uniform int uMaskCount;
uniform float uAspect;
uniform vec4 uCrop;
uniform vec2 uFullSize;
uniform vec2 uTileOffset;
uniform vec2 uTileSize;
uniform bool uCoverageOnly;

uniform int uMaskType[MAX_MASKS]; // 1 radial, 2 linear, 3 luminance, 4 brush, 5 color range
uniform int uMaskBlendMode[MAX_MASKS]; // 0 add, 1 subtract, 2 intersect
uniform float uMaskOpacity[MAX_MASKS];
uniform int uMaskInvert[MAX_MASKS];
uniform float uMaskFeather[MAX_MASKS];
uniform vec2 uMaskCenter[MAX_MASKS];
uniform vec2 uMaskRadii[MAX_MASKS];
uniform float uMaskAngle[MAX_MASKS];
uniform vec2 uMaskStart[MAX_MASKS];
uniform vec2 uMaskEnd[MAX_MASKS];
uniform float uMaskTarget[MAX_MASKS];
uniform float uMaskRange[MAX_MASKS];
uniform float uMaskChromaTarget[MAX_MASKS];
uniform float uMaskChromaRange[MAX_MASKS];
uniform int uMaskBrushSlot[MAX_MASKS];

varying vec2 vUv;

${OKLAB_GLSL_CHUNK}
${CROP_GLSL}

vec2 hueAndSaturation(vec3 c) {
  vec4 k = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, k.wz), vec4(c.gb, k.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec2(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10));
}

float sampleBrush(int slot, vec2 uv) {
  if (slot == 0) return texture2D(tBrush0, uv).a;
  if (slot == 1) return texture2D(tBrush1, uv).a;
  if (slot == 2) return texture2D(tBrush2, uv).a;
  if (slot == 3) return texture2D(tBrush3, uv).a;
  return 0.0;
}

float evaluateMask(int i, vec3 baseColor, vec2 p, vec2 glUv) {
  int type = uMaskType[i];
  float m = 0.0;
  if (type == 1) {
    vec2 d = (p - uMaskCenter[i]) * vec2(uAspect, 1.0);
    float c = cos(-uMaskAngle[i]);
    float s = sin(-uMaskAngle[i]);
    vec2 r = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
    float distance = length(r / max(uMaskRadii[i], vec2(1e-4)));
    m = 1.0 - smoothstep(1.0 - max(1e-5, uMaskFeather[i]), 1.0, distance);
  } else if (type == 2) {
    vec2 axis = (uMaskEnd[i] - uMaskStart[i]) * vec2(uAspect, 1.0);
    vec2 offset = (p - uMaskStart[i]) * vec2(uAspect, 1.0);
    float t = dot(offset, axis) / max(dot(axis, axis), 1e-6);
    m = 1.0 - smoothstep(0.0, 1.0, t);
  } else if (type == 3) {
    float lightness = linearSrgbToOklab(max(baseColor, vec3(0.0))).x;
    float distance = abs(lightness - uMaskTarget[i]);
    float range = uMaskRange[i];
    m = 1.0 - smoothstep(range, range + max(uMaskFeather[i], 1e-4), distance);
  } else if (type == 4) {
    m = sampleBrush(uMaskBrushSlot[i], glUv);
  } else if (type == 5) {
    vec3 lab = linearSrgbToOklab(max(baseColor, vec3(0.0)));
    float chroma = length(lab.yz);
    float hue = fract(atan(lab.z, lab.y) / 6.28318530718);
    float distance = abs(hue - uMaskTarget[i]);
    distance = min(distance, 1.0 - distance);
    float width = max(uMaskRange[i], 1e-4);
    m = (1.0 - smoothstep(width * 0.5, width, distance)) * smoothstep(0.012, 0.045, chroma);
    if (uMaskChromaTarget[i] > 0.0) {
      m *= 1.0 - smoothstep(uMaskChromaRange[i], uMaskChromaRange[i] + 0.04, abs(chroma - uMaskChromaTarget[i]));
    }
  } else if (type == 6) {
    float lightness = dot(baseColor, vec3(0.2126, 0.7152, 0.0722));
    float distance = abs(lightness - uMaskTarget[i]);
    float range = uMaskRange[i];
    m = 1.0 - smoothstep(min(range - 1e-5, max(0.0, range - uMaskFeather[i])), range, distance);
  } else if (type == 7) {
    vec2 hs = hueAndSaturation(max(baseColor, vec3(0.0)));
    float distance = abs(hs.x - uMaskTarget[i]);
    distance = min(distance, 1.0 - distance);
    float width = max(uMaskRange[i], 1e-4);
    float saturationRange = max(uMaskChromaRange[i], 1e-4);
    m = (1.0 - smoothstep(width * 0.75, width, distance))
      * (1.0 - smoothstep(saturationRange * 0.75, saturationRange, abs(hs.y - uMaskChromaTarget[i])));
  }
  if (uMaskInvert[i] == 1) m = 1.0 - m;
  return clamp(m * uMaskOpacity[i], 0.0, 1.0);
}

void main() {
  vec4 baseColor = texture2D(tBase, vUv);
  vec4 gradedColor = texture2D(tDiffuse, vUv);
  vec2 glUv = uncropUv(vec2(
    (uTileOffset.x + vUv.x * uTileSize.x) / uFullSize.x,
    (uFullSize.y - uTileOffset.y - uTileSize.y + vUv.y * uTileSize.y) / uFullSize.y
  ), uCrop);
  vec2 p = vec2(glUv.x, 1.0 - glUv.y);

  float finalMask = 1.0;
  if (uMaskCount > 0) {
    finalMask = 0.0;
    for (int i = 0; i < MAX_MASKS; i++) {
      if (i >= uMaskCount) break;
      float m = evaluateMask(i, baseColor.rgb, p, glUv);
      int blend = uMaskBlendMode[i];
      if (i == 0) finalMask = blend == 1 ? 1.0 - m : m;
      else if (blend == 0) finalMask = clamp(finalMask + m, 0.0, 1.0);
      else if (blend == 1) finalMask = clamp(finalMask - m, 0.0, 1.0);
      else finalMask = finalMask * m;
    }
  }

  if (uCoverageOnly) gl_FragColor = vec4(baseColor.rgb, finalMask);
  else gl_FragColor = vec4(mix(baseColor.rgb, gradedColor.rgb, finalMask * uPlateOpacity), 1.0);
}
`;

const MASK_TYPE: Record<MaskLayer["type"], number> = { radial: 1, linear: 2, luminosity: 3, brush: 4, colorRange: 5 };

export class MaskBlendPass extends RenderPass {
  private material: THREE.ShaderMaterial;
  private plate: AdjustmentLayer | null = null;
  private masks: MaskLayer[] = [];
  private readonly brushTextures = new BrushTextureCache();
  private sourceAspect = 1;
  private includeLiveBrush = false;

  constructor() {
    super();
    const floats = () => ({ value: new Float32Array(MAX_MASK_PARTS) });
    const ints = () => ({ value: new Int32Array(MAX_MASK_PARTS) });
    const vec2s = () => ({ value: new Float32Array(MAX_MASK_PARTS * 2) });
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        tBase: { value: null },
        tBrush0: { value: null },
        tBrush1: { value: null },
        tBrush2: { value: null },
        tBrush3: { value: null },
        uPlateOpacity: { value: 1.0 },
        uMaskCount: { value: 0 },
        uAspect: { value: 1 },
        uCrop: { value: new THREE.Vector4(0, 0, 1, 1) },
        uFullSize: { value: new THREE.Vector2(1, 1) },
        uTileOffset: { value: new THREE.Vector2(0, 0) },
        uTileSize: { value: new THREE.Vector2(1, 1) },
        uCoverageOnly: { value: false },
        uMaskType: ints(),
        uMaskBlendMode: ints(),
        uMaskOpacity: floats(),
        uMaskInvert: ints(),
        uMaskFeather: floats(),
        uMaskCenter: vec2s(),
        uMaskRadii: vec2s(),
        uMaskAngle: floats(),
        uMaskStart: vec2s(),
        uMaskEnd: vec2s(),
        uMaskTarget: floats(),
        uMaskRange: floats(),
        uMaskChromaTarget: floats(),
        uMaskChromaRange: floats(),
        uMaskBrushSlot: ints(),
      },
    });
    this.fsQuad.material = this.material;
  }

  public setup() {}

  public updateUniforms() {}

  override setViewOffset(fullWidth: number, fullHeight: number, x: number, y: number, width: number, height: number): void {
    this.material.uniforms.uFullSize.value.set(fullWidth, fullHeight);
    this.material.uniforms.uTileOffset.value.set(x, y);
    this.material.uniforms.uTileSize.value.set(width, height);
  }

  override clearViewOffset(): void {
    this.material.uniforms.uFullSize.value.set(1, 1);
    this.material.uniforms.uTileOffset.value.set(0, 0);
    this.material.uniforms.uTileSize.value.set(1, 1);
  }

  pruneBrushes(masks: MaskLayer[]) {
    this.brushTextures.retain(masks);
  }

  updateForPlate(plate: AdjustmentLayer, masks: MaskLayer[], sourceAspect: number, crop: PhotoCrop, includeLiveBrush: boolean) {
    this.plate = plate;
    this.masks = plate.maskIds
      .map((id) => masks.find((mask) => mask.id === id))
      .filter((mask): mask is MaskLayer => Boolean(mask))
      .slice(0, MAX_MASK_PARTS);
    this.includeLiveBrush = includeLiveBrush;
    this.sourceAspect = sourceAspect;
    this.material.uniforms.uCrop.value.set(crop.x, crop.y, crop.width, crop.height);
    this.material.uniforms.uPlateOpacity.value = plate.enabled === false ? 0 : plate.opacity;
  }

  private bindMasks(aspect: number) {
    const u = this.material.uniforms;
    u.uAspect.value = aspect;
    u.uMaskCount.value = this.masks.length;
    let brushSlot = 0;
    const brushSamplers = ["tBrush0", "tBrush1", "tBrush2", "tBrush3"] as const;
    brushSamplers.forEach((name) => { u[name].value = null; });
    this.masks.forEach((mask, i) => {
      u.uMaskType.value[i] = MASK_TYPE[mask.type];
      u.uMaskBlendMode.value[i] = mask.blendMode === "ADD" ? 0 : mask.blendMode === "SUBTRACT" ? 1 : 2;
      u.uMaskOpacity.value[i] = mask.opacity;
      u.uMaskInvert.value[i] = 0;
      u.uMaskBrushSlot.value[i] = -1;
      if (mask.type === "radial") {
        const g = radialGeometry(mask.params, aspect);
        u.uMaskCenter.value.set([g.cx, g.cy], i * 2);
        u.uMaskRadii.value.set([g.rx, g.ry], i * 2);
        u.uMaskAngle.value[i] = g.angle;
        u.uMaskFeather.value[i] = g.feather;
        u.uMaskInvert.value[i] = g.invert ? 1 : 0;
      } else if (mask.type === "linear") {
        const g = linearGeometry(mask.params, aspect);
        u.uMaskStart.value.set([g.start.x, g.start.y], i * 2);
        u.uMaskEnd.value.set([g.end.x, g.end.y], i * 2);
        u.uMaskInvert.value[i] = g.invert ? 1 : 0;
      } else if (mask.type === "luminosity") {
        if (!mask.params.colorSpace) u.uMaskType.value[i] = 6;
        u.uMaskTarget.value[i] = mask.params.target;
        u.uMaskRange.value[i] = mask.params.range;
        u.uMaskFeather.value[i] = mask.params.feather;
      } else if (mask.type === "colorRange") {
        if (!mask.params.colorSpace) u.uMaskType.value[i] = 7;
        const hue = mask.params.targetHue > 1 ? mask.params.targetHue / 360 : mask.params.targetHue;
        u.uMaskTarget.value[i] = hue;
        u.uMaskRange.value[i] = mask.params.hueWidth;
        u.uMaskChromaTarget.value[i] = mask.params.targetChroma;
        u.uMaskChromaRange.value[i] = mask.params.chromaRange;
      } else if (mask.type === "brush" && brushSlot < MAX_BRUSH_PARTS) {
        u[brushSamplers[brushSlot]].value = this.brushTextures.get(mask, this.sourceAspect, this.includeLiveBrush);
        u.uMaskBrushSlot.value[i] = brushSlot;
        brushSlot += 1;
      }
    });
  }

  renderCoverage(renderer: THREE.WebGLRenderer, base: RenderInput, target: THREE.WebGLRenderTarget) {
    this.draw(renderer, base, base, target, true);
  }

  renderBlend(renderer: THREE.WebGLRenderer, graded: RenderInput, base: RenderInput, outputBuffer: THREE.WebGLRenderTarget | null) {
    this.draw(renderer, graded, base, outputBuffer, false);
  }

  private draw(renderer: THREE.WebGLRenderer, graded: RenderInput, base: RenderInput, outputBuffer: THREE.WebGLRenderTarget | null, coverageOnly: boolean) {
    if (!this.plate) return;
    this.bindMasks(this.sourceAspect);
    this.material.uniforms.uCoverageOnly.value = coverageOnly;
    this.material.uniforms.tDiffuse.value = textureFromRenderInput(graded);
    this.material.uniforms.tBase.value = textureFromRenderInput(base);
    renderer.setRenderTarget(outputBuffer);
    renderer.clear();
    this.fsQuad.render(renderer);
  }

  public render(renderer: THREE.WebGLRenderer, readBuffer: RenderInput, writeBuffer: THREE.WebGLRenderTarget | null) {
    this.renderBlend(renderer, readBuffer, readBuffer, writeBuffer);
  }

  public override dispose() {
    this.brushTextures.dispose();
    this.material.dispose();
    super.dispose();
  }
}
