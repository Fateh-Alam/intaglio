import * as THREE from 'three';
import { RenderPass } from '../RenderPass';
import { EditorSettings, AdjustmentLayer, MaskLayer } from '../../../types/editor';
import { OKLAB_GLSL_CHUNK } from '../shaders/oklabChunk';

const MAX_LAYERS = 8;
const MAX_MASKS = 16;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
#define MAX_LAYERS ${MAX_LAYERS}
#define MAX_MASKS ${MAX_MASKS}

uniform sampler2D tDiffuse;
uniform sampler2D tBrushMask; // Single global brush mask for now

uniform int uNumLayers;

// Layer Uniforms
uniform float uLayerOpacity[MAX_LAYERS];
uniform float uLayerExposure[MAX_LAYERS];
uniform float uLayerContrast[MAX_LAYERS];
uniform float uLayerHighlights[MAX_LAYERS];
uniform float uLayerShadows[MAX_LAYERS];
uniform float uLayerTemperature[MAX_LAYERS];
uniform float uLayerTint[MAX_LAYERS];
uniform float uLayerSaturation[MAX_LAYERS];
uniform float uLayerClarity[MAX_LAYERS];
uniform int uLayerMaskCount[MAX_LAYERS];
uniform int uLayerMaskStart[MAX_LAYERS];

// Mask Uniforms
uniform int uMaskType[MAX_MASKS]; // 0=none, 1=radial, 2=linear, 3=luma, 4=brush
uniform int uMaskBlendMode[MAX_MASKS]; // 0=ADD, 1=SUBTRACT, 2=INTERSECT

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

varying vec2 vUv;

${OKLAB_GLSL_CHUNK}

// Reuse base develop functions
vec3 applyExposure(vec3 color, float ev) {
  return color * exp2(ev);
}

vec3 applyLogContrast(vec3 color, float contrast, float pivot) {
  vec3 safeColor = max(color, vec3(1e-6));
  vec3 logColor = log2(safeColor);
  float logPivot = log2(pivot);
  logColor = (logColor - logPivot) * (1.0 + contrast) + logPivot;
  return exp2(logColor);
}

vec3 applyHighlights(vec3 color, float amount) {
  float y = luma709(color);
  float w = smoothstep(0.45, 1.0, y);
  return color * exp2(-amount * w);
}

vec3 applyShadows(vec3 color, float amount) {
  float y = luma709(color);
  float w = 1.0 - smoothstep(0.02, 0.45, y);
  vec3 lifted = color + vec3(amount * 0.18) * w * (1.0 - color);
  vec3 deepened = color * (1.0 + amount * 0.5 * w);
  return amount >= 0.0 ? lifted : deepened;
}

vec3 applyTint(vec3 color, float tint) {
  vec3 magenta = vec3(1.0 + tint * 0.05, 1.0 - tint * 0.08, 1.0 + tint * 0.05);
  vec3 green = vec3(1.0 + tint * 0.03, 1.0 + tint * 0.08, 1.0 + tint * 0.03);
  return tint >= 0.0 ? color * magenta : color * green;
}

vec3 kelvinToRGB(float temp) {
  temp = temp / 100.0;
  vec3 rgb;
  if(temp <= 66.0) {
    rgb.r = 255.0;
    rgb.g = temp;
    rgb.g = 99.4708025861 * log(rgb.g) - 161.1195681661;
    if(temp <= 19.0) {
      rgb.b = 0.0;
    } else {
      rgb.b = temp - 10.0;
      rgb.b = 138.5177312231 * log(rgb.b) - 305.0447927307;
    }
  } else {
    rgb.r = temp - 60.0;
    rgb.r = 329.698727446 * pow(rgb.r, -0.1332047592);
    rgb.g = temp - 60.0;
    rgb.g = 288.1221695283 * pow(rgb.g, -0.0755148492);
    rgb.b = 255.0;
  }
  return clamp(rgb / 255.0, 0.0, 1.0);
}

// Evaluate a single mask
float evaluateMask(int i, vec3 baseColor) {
  int type = uMaskType[i];
  float m = 0.0;
  
  if (type == 1) { // Radial
    vec2 center = uMaskCenter[i];
    float radius = uMaskRadius[i];
    float feather = uMaskFeather[i];
    float dist = distance(vUv, center);
    float inner = max(0.0, radius - feather);
    m = 1.0 - smoothstep(inner, radius, dist);
    if (uMaskInvert[i] == 1) m = 1.0 - m;
  } 
  else if (type == 2) { // Linear
    float angle = uMaskAngle[i] * 6.28318;
    float pos = uMaskPosition[i];
    float feather = uMaskFeather[i];
    vec2 dir = vec2(cos(angle), sin(angle));
    float proj = dot(vUv - vec2(0.5), dir) + 0.5;
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
    m = texture2D(tBrushMask, vUv).r; // Assuming brush mask writes to red channel or is grayscale
  }
  
  return clamp(m, 0.0, 1.0);
}

void main() {
  vec4 texColor = texture2D(tDiffuse, vUv);
  vec3 baseColor = texColor.rgb; // Already linearized by BaseDevelopPass
  vec3 finalColor = baseColor;
  
  for (int l = 0; l < MAX_LAYERS; l++) {
    if (l >= uNumLayers) break;
    
    // Evaluate combined mask for this layer
    float layerMask = 0.0;
    int maskStart = uLayerMaskStart[l];
    int maskCount = uLayerMaskCount[l];
    
    if (maskCount == 0) {
      layerMask = 1.0; // If no masks, applies to whole image? Or 0? Let's say 0 (disabled).
      continue;
    } else {
      for (int m = 0; m < MAX_MASKS; m++) {
        if (m >= maskCount) break;
        int idx = maskStart + m;
        float maskVal = evaluateMask(idx, baseColor);
        int blendMode = uMaskBlendMode[idx];
        
        if (m == 0) {
          layerMask = maskVal;
        } else {
          if (blendMode == 0) { // ADD
            layerMask = min(1.0, layerMask + maskVal);
          } else if (blendMode == 1) { // SUBTRACT
            layerMask = max(0.0, layerMask - maskVal);
          } else if (blendMode == 2) { // INTERSECT
            layerMask = layerMask * maskVal;
          }
        }
      }
    }
    
    layerMask *= uLayerOpacity[l];
    
    if (layerMask > 0.001) {
      vec3 adjustedColor = finalColor;
      
      // White Balance
      vec3 referenceWhite = kelvinToRGB(6500.0);
      float miredShift = -uLayerTemperature[l] * 50.0;
      vec3 targetWhite = kelvinToRGB(1000000.0 / max((1000000.0 / 6500.0) + miredShift, 1.0));
      adjustedColor *= (referenceWhite / max(targetWhite, vec3(1e-5)));
      adjustedColor = applyTint(adjustedColor, uLayerTint[l]);
      
      // Exposure & Contrast
      adjustedColor = applyExposure(adjustedColor, uLayerExposure[l]);
      adjustedColor = applyLogContrast(adjustedColor, uLayerContrast[l], 0.18);
      
      // Highlights & Shadows
      adjustedColor = applyHighlights(adjustedColor, -uLayerHighlights[l]);
      adjustedColor = applyShadows(adjustedColor, uLayerShadows[l]);
      
      // Saturation (simple linear RGB multiplier for local edits to save instructions)
      float y = luma709(adjustedColor);
      adjustedColor = mix(vec3(y), adjustedColor, 1.0 + uLayerSaturation[l]);
      
      // Blend using the mask
      finalColor = mix(finalColor, adjustedColor, layerMask);
    }
  }
  
  gl_FragColor = vec4(finalColor, texColor.a);
}
`;

export class LocalAdjustmentsPass extends RenderPass {
  private material: THREE.ShaderMaterial;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        tBrushMask: { value: null },
        uNumLayers: { value: 0 },
        
        uLayerOpacity: { value: new Float32Array(MAX_LAYERS) },
        uLayerExposure: { value: new Float32Array(MAX_LAYERS) },
        uLayerContrast: { value: new Float32Array(MAX_LAYERS) },
        uLayerHighlights: { value: new Float32Array(MAX_LAYERS) },
        uLayerShadows: { value: new Float32Array(MAX_LAYERS) },
        uLayerTemperature: { value: new Float32Array(MAX_LAYERS) },
        uLayerTint: { value: new Float32Array(MAX_LAYERS) },
        uLayerSaturation: { value: new Float32Array(MAX_LAYERS) },
        uLayerClarity: { value: new Float32Array(MAX_LAYERS) },
        uLayerMaskCount: { value: new Int32Array(MAX_LAYERS) },
        uLayerMaskStart: { value: new Int32Array(MAX_LAYERS) },
        
        uMaskType: { value: new Int32Array(MAX_MASKS) },
        uMaskBlendMode: { value: new Int32Array(MAX_MASKS) },
        uMaskCenter: { value: new Float32Array(MAX_MASKS * 2) },
        uMaskRadius: { value: new Float32Array(MAX_MASKS) },
        uMaskAngle: { value: new Float32Array(MAX_MASKS) },
        uMaskPosition: { value: new Float32Array(MAX_MASKS) },
        uMaskFeather: { value: new Float32Array(MAX_MASKS) },
        uMaskInvert: { value: new Int32Array(MAX_MASKS) },
        uMaskLumaTarget: { value: new Float32Array(MAX_MASKS) },
        uMaskLumaRange: { value: new Float32Array(MAX_MASKS) },
      }
    });
    this.fsQuad.material = this.material;
  }

  public setup() {}

  public setBrushMask(texture: THREE.Texture) {
    this.material.uniforms.tBrushMask.value = texture;
  }

  public updateUniforms(settings: EditorSettings) {
    const layers = settings.adjustmentLayers || [];
    const masks = settings.masks || [];
    
    const numLayers = Math.min(layers.length, MAX_LAYERS);
    this.material.uniforms.uNumLayers.value = numLayers;
    
    let maskIdx = 0;
    
    for (let l = 0; l < numLayers; l++) {
      const layer = layers[l];
      this.material.uniforms.uLayerOpacity.value[l] = layer.opacity;
      this.material.uniforms.uLayerExposure.value[l] = layer.params.exposure;
      this.material.uniforms.uLayerContrast.value[l] = layer.params.contrast;
      this.material.uniforms.uLayerHighlights.value[l] = layer.params.highlights;
      this.material.uniforms.uLayerShadows.value[l] = layer.params.shadows;
      this.material.uniforms.uLayerTemperature.value[l] = layer.params.temperature;
      this.material.uniforms.uLayerTint.value[l] = layer.params.tint;
      this.material.uniforms.uLayerSaturation.value[l] = layer.params.saturation;
      this.material.uniforms.uLayerClarity.value[l] = layer.params.clarity;
      
      const layerMasks = layer.maskIds.map(id => masks.find(m => m.id === id)).filter(Boolean) as MaskLayer[];
      const numMasks = Math.min(layerMasks.length, MAX_MASKS - maskIdx);
      
      this.material.uniforms.uLayerMaskStart.value[l] = maskIdx;
      this.material.uniforms.uLayerMaskCount.value[l] = numMasks;
      
      for (let m = 0; m < numMasks; m++) {
        const mask = layerMasks[m];
        
        let typeInt = 0;
        if (mask.type === 'radial') typeInt = 1;
        else if (mask.type === 'linear') typeInt = 2;
        else if (mask.type === 'luminosity') typeInt = 3;
        else if (mask.type === 'brush') typeInt = 4;
        
        let blendInt = 0;
        if (mask.blendMode === 'SUBTRACT') blendInt = 1;
        else if (mask.blendMode === 'INTERSECT') blendInt = 2;
        
        this.material.uniforms.uMaskType.value[maskIdx] = typeInt;
        this.material.uniforms.uMaskBlendMode.value[maskIdx] = blendInt;
        
        if (mask.type === 'radial') {
          this.material.uniforms.uMaskCenter.value[maskIdx * 2] = mask.params.center.x;
          this.material.uniforms.uMaskCenter.value[maskIdx * 2 + 1] = mask.params.center.y;
          this.material.uniforms.uMaskRadius.value[maskIdx] = mask.params.radius;
          this.material.uniforms.uMaskFeather.value[maskIdx] = mask.params.feather;
          this.material.uniforms.uMaskInvert.value[maskIdx] = mask.params.invert ? 1 : 0;
        } else if (mask.type === 'linear') {
          this.material.uniforms.uMaskAngle.value[maskIdx] = mask.params.angle;
          this.material.uniforms.uMaskPosition.value[maskIdx] = mask.params.position;
          this.material.uniforms.uMaskFeather.value[maskIdx] = mask.params.feather;
          this.material.uniforms.uMaskInvert.value[maskIdx] = mask.params.invert ? 1 : 0;
        } else if (mask.type === 'luminosity') {
          this.material.uniforms.uMaskLumaTarget.value[maskIdx] = mask.params.target;
          this.material.uniforms.uMaskLumaRange.value[maskIdx] = mask.params.range;
          this.material.uniforms.uMaskFeather.value[maskIdx] = mask.params.feather;
        }
        
        maskIdx++;
      }
    }
  }

  public render(
    renderer: THREE.WebGLRenderer,
    readBuffer: THREE.WebGLRenderTarget,
    writeBuffer: THREE.WebGLRenderTarget | null
  ) {
    if (this.material.uniforms.uNumLayers.value === 0) {
      // Nothing to do, but we must pass through if needed. 
      // The graph usually handles bypass if enabled=false, but we'll render anyway to pass texture forward.
    }
    
    this.material.uniforms.tDiffuse.value = readBuffer.texture ?? readBuffer;

    if (writeBuffer) {
      renderer.setRenderTarget(writeBuffer);
    } else {
      renderer.setRenderTarget(null);
    }
    
    renderer.clear();
    this.fsQuad.render(renderer);
  }
}
