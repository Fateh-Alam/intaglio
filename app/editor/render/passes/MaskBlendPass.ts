import * as THREE from 'three';
import { RenderPass } from '../RenderPass';
import { AdjustmentLayer, MaskLayer } from '../../../types/editor';

const MAX_MASKS = 32;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
#define MAX_MASKS ${MAX_MASKS}

uniform sampler2D tDiffuse; // Graded Plate
uniform sampler2D tBase;    // Base image (before plate)
uniform sampler2D tBrushMask;

uniform float uPlateOpacity;
uniform int uMaskCount;
uniform vec2 uFullSize;
uniform vec2 uTileOffset;
uniform vec2 uTileSize;

// Mask Uniforms
uniform int uMaskType[MAX_MASKS]; // 0=none, 1=radial, 2=linear, 3=luma, 4=brush, 5=colorRange
uniform int uMaskBlendMode[MAX_MASKS]; // 0=ADD, 1=SUBTRACT, 2=INTERSECT
uniform float uMaskOpacity[MAX_MASKS];

// Radial & Linear
uniform vec2 uMaskCenter[MAX_MASKS];
uniform float uMaskRadius[MAX_MASKS];
uniform float uMaskAngle[MAX_MASKS];
uniform float uMaskPosition[MAX_MASKS];
uniform float uMaskFeather[MAX_MASKS];
uniform int uMaskInvert[MAX_MASKS];

// Luma
uniform float uMaskLumaTarget[MAX_MASKS];
uniform float uMaskLumaRange[MAX_MASKS];
uniform float uMaskHueTarget[MAX_MASKS];
uniform float uMaskHueWidth[MAX_MASKS];
uniform float uMaskChromaTarget[MAX_MASKS];
uniform float uMaskChromaRange[MAX_MASKS];

varying vec2 vUv;

// Luma util
float luma709(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

vec3 rgbToHsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// Evaluate a single mask
float evaluateMask(int i, vec3 baseColor, vec2 maskUv) {
  int type = uMaskType[i];
  float m = 0.0;
  
  if (type == 1) { // Radial
    vec2 center = uMaskCenter[i];
    float radius = uMaskRadius[i];
    float feather = uMaskFeather[i];
    float dist = distance(maskUv, center);
    float inner = max(0.0, radius - feather);
    m = 1.0 - smoothstep(inner, radius, dist);
    if (uMaskInvert[i] == 1) m = 1.0 - m;
  } 
  else if (type == 2) { // Linear
    float angle = uMaskAngle[i] * 6.28318;
    float pos = uMaskPosition[i];
    float feather = uMaskFeather[i];
    vec2 dir = vec2(cos(angle), sin(angle));
    float proj = dot(maskUv - vec2(0.5), dir) + 0.5;
    m = smoothstep(pos - feather, pos + feather, proj);
    if (uMaskInvert[i] == 1) m = 1.0 - m;
  }
  else if (type == 3) { // Luma
    float y = luma709(baseColor);
    float target = uMaskLumaTarget[i];
    float range = uMaskLumaRange[i];
    float feather = uMaskFeather[i];
    float diff = abs(y - target);
    m = 1.0 - smoothstep(max(0.0, range - feather), range, diff);
  }
  else if (type == 4) { // Brush
    m = texture2D(tBrushMask, maskUv).r; 
  }
  else if (type == 5) { // Color range
    vec3 hsv = rgbToHsv(max(baseColor, vec3(0.0)));
    float hueDistance = abs(hsv.x - uMaskHueTarget[i]);
    hueDistance = min(hueDistance, 1.0 - hueDistance);
    float hueMask = 1.0 - smoothstep(uMaskHueWidth[i] * 0.75, uMaskHueWidth[i], hueDistance);
    float chromaDistance = abs(hsv.y - uMaskChromaTarget[i]);
    float chromaMask = 1.0 - smoothstep(uMaskChromaRange[i] * 0.75, uMaskChromaRange[i], chromaDistance);
    m = hueMask * chromaMask;
  }
  
  return clamp(m * uMaskOpacity[i], 0.0, 1.0);
}

void main() {
  vec4 baseColor = texture2D(tBase, vUv);
  vec4 gradedColor = texture2D(tDiffuse, vUv);
  vec2 maskUv = vec2(
    (uTileOffset.x + vUv.x * uTileSize.x) / uFullSize.x,
    (uFullSize.y - uTileOffset.y - uTileSize.y + vUv.y * uTileSize.y) / uFullSize.y
  );
  
  if (uPlateOpacity == 0.0) {
    gl_FragColor = baseColor;
    return;
  }
  
  float finalMask = 1.0;
  
  if (uMaskCount > 0) {
    finalMask = 0.0; // Start at 0 if we have masks, then accumulate
    for (int i = 0; i < MAX_MASKS; i++) {
      if (i >= uMaskCount) break;
      
      float m = evaluateMask(i, baseColor.rgb, maskUv);
      int blend = uMaskBlendMode[i];
      
      if (i == 0) {
        finalMask = m;
      } else {
        if (blend == 0) finalMask = clamp(finalMask + m, 0.0, 1.0); // ADD
        else if (blend == 1) finalMask = clamp(finalMask - m, 0.0, 1.0); // SUBTRACT
        else if (blend == 2) finalMask = finalMask * m; // INTERSECT
      }
    }
  }
  
  float mixFactor = finalMask * uPlateOpacity;
  
  gl_FragColor = vec4(mix(baseColor.rgb, gradedColor.rgb, mixFactor), 1.0);
}
`;

export class MaskBlendPass extends RenderPass {
  private material: THREE.ShaderMaterial;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        tBase: { value: null },
        tBrushMask: { value: null },
        uPlateOpacity: { value: 1.0 },
        uMaskCount: { value: 0 },
        uFullSize: { value: new THREE.Vector2(1, 1) },
        uTileOffset: { value: new THREE.Vector2(0, 0) },
        uTileSize: { value: new THREE.Vector2(1, 1) },
        
        uMaskType: { value: new Int32Array(MAX_MASKS) },
        uMaskBlendMode: { value: new Int32Array(MAX_MASKS) },
        uMaskOpacity: { value: new Float32Array(MAX_MASKS) },
        uMaskCenter: { value: new Float32Array(MAX_MASKS * 2) },
        uMaskRadius: { value: new Float32Array(MAX_MASKS) },
        uMaskAngle: { value: new Float32Array(MAX_MASKS) },
        uMaskPosition: { value: new Float32Array(MAX_MASKS) },
        uMaskFeather: { value: new Float32Array(MAX_MASKS) },
        uMaskInvert: { value: new Int32Array(MAX_MASKS) },
        uMaskLumaTarget: { value: new Float32Array(MAX_MASKS) },
        uMaskLumaRange: { value: new Float32Array(MAX_MASKS) },
        uMaskHueTarget: { value: new Float32Array(MAX_MASKS) },
        uMaskHueWidth: { value: new Float32Array(MAX_MASKS) },
        uMaskChromaTarget: { value: new Float32Array(MAX_MASKS) },
        uMaskChromaRange: { value: new Float32Array(MAX_MASKS) },
      }
    });
    this.fsQuad.material = this.material;
  }

  public setup() {
    // Shaders already provided inline
  }

  public updateUniforms() {
    // Not used via standard RenderGraph update
  }

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

  updateForPlate(plate: AdjustmentLayer, masks: MaskLayer[], brushMaskTex: THREE.Texture | null) {
    this.material.uniforms.uPlateOpacity.value = plate.opacity;
    this.material.uniforms.tBrushMask.value = brushMaskTex;
    
    // We only process masks that belong to this plate
    const plateMasks = masks.filter(m => plate.maskIds.includes(m.id)).slice(0, MAX_MASKS);
    this.material.uniforms.uMaskCount.value = plateMasks.length;
    
    const types = new Int32Array(MAX_MASKS);
    const blendModes = new Int32Array(MAX_MASKS);
    const opacities = new Float32Array(MAX_MASKS);
    const centers = new Float32Array(MAX_MASKS * 2);
    const radii = new Float32Array(MAX_MASKS);
    const angles = new Float32Array(MAX_MASKS);
    const positions = new Float32Array(MAX_MASKS);
    const feathers = new Float32Array(MAX_MASKS);
    const inverts = new Int32Array(MAX_MASKS);
    const lumaTargets = new Float32Array(MAX_MASKS);
    const lumaRanges = new Float32Array(MAX_MASKS);
    const hueTargets = new Float32Array(MAX_MASKS);
    const hueWidths = new Float32Array(MAX_MASKS);
    const chromaTargets = new Float32Array(MAX_MASKS);
    const chromaRanges = new Float32Array(MAX_MASKS);
    
    plateMasks.forEach((m, i) => {
      let typeId = 0;
      if (m.type === 'radial') typeId = 1;
      else if (m.type === 'linear') typeId = 2;
      else if (m.type === 'luminosity') typeId = 3;
      else if (m.type === 'brush') typeId = 4;
      else if (m.type === 'colorRange') typeId = 5;
      
      types[i] = typeId;
      blendModes[i] = m.blendMode === 'ADD' ? 0 : m.blendMode === 'SUBTRACT' ? 1 : 2;
      opacities[i] = m.opacity;
      
      if (m.type === 'radial') {
        const p = m.params;
        centers[i * 2] = p.center.x;
        centers[i * 2 + 1] = p.center.y;
        radii[i] = p.radius;
        feathers[i] = p.feather;
        inverts[i] = p.invert ? 1 : 0;
      }
      else if (m.type === 'linear') {
        const p = m.params;
        angles[i] = p.angle;
        positions[i] = p.position;
        feathers[i] = p.feather;
        inverts[i] = p.invert ? 1 : 0;
      }
      else if (m.type === 'luminosity') {
        const p = m.params;
        lumaTargets[i] = p.target;
        lumaRanges[i] = p.range;
        feathers[i] = p.feather;
      }
      else if (m.type === 'colorRange') {
        const p = m.params;
        hueTargets[i] = p.targetHue > 1 ? p.targetHue / 360 : p.targetHue;
        hueWidths[i] = Math.max(p.hueWidth, 0.0001);
        chromaTargets[i] = p.targetChroma;
        chromaRanges[i] = Math.max(p.chromaRange, 0.0001);
      }
    });
    
    this.material.uniforms.uMaskType.value = types;
    this.material.uniforms.uMaskBlendMode.value = blendModes;
    this.material.uniforms.uMaskOpacity.value = opacities;
    this.material.uniforms.uMaskCenter.value = centers;
    this.material.uniforms.uMaskRadius.value = radii;
    this.material.uniforms.uMaskAngle.value = angles;
    this.material.uniforms.uMaskPosition.value = positions;
    this.material.uniforms.uMaskFeather.value = feathers;
    this.material.uniforms.uMaskInvert.value = inverts;
    this.material.uniforms.uMaskLumaTarget.value = lumaTargets;
    this.material.uniforms.uMaskLumaRange.value = lumaRanges;
    this.material.uniforms.uMaskHueTarget.value = hueTargets;
    this.material.uniforms.uMaskHueWidth.value = hueWidths;
    this.material.uniforms.uMaskChromaTarget.value = chromaTargets;
    this.material.uniforms.uMaskChromaRange.value = chromaRanges;
    
    this.enabled = true;
  }

  renderBlend(
    renderer: THREE.WebGLRenderer, 
    gradedTexture: THREE.Texture | THREE.WebGLRenderTarget, 
    baseTexture: THREE.Texture | THREE.WebGLRenderTarget, 
    outputBuffer: THREE.WebGLRenderTarget | null
  ) {
    if (!this.enabled) return;

    this.material.uniforms.tDiffuse.value = 'texture' in gradedTexture ? gradedTexture.texture : gradedTexture;
    this.material.uniforms.tBase.value = 'texture' in baseTexture ? baseTexture.texture : baseTexture;
    
    if (outputBuffer) {
      renderer.setRenderTarget(outputBuffer);
    } else {
      renderer.setRenderTarget(null);
    }
    renderer.clear();
    this.fsQuad.render(renderer);
  }
  
  public render(
    renderer: THREE.WebGLRenderer,
    readBuffer: THREE.WebGLRenderTarget | THREE.Texture,
    writeBuffer: THREE.WebGLRenderTarget | null
  ) {
    this.renderBlend(renderer, readBuffer, readBuffer, writeBuffer);
  }

  public override dispose() {
    this.material.dispose();
    super.dispose();
  }
}
