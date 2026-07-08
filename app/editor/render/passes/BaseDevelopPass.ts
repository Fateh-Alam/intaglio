import * as THREE from 'three';
import { RenderPass } from '../RenderPass';
import { EditorSettings } from '../../../types/editor';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D tDiffuse;
uniform float uExposure;
uniform float uContrast;
uniform float uHighlights;
uniform float uShadows;
uniform float uWhites;
uniform float uBlacks;
uniform float uTemperature;
uniform float uTint;

uniform float uVibrance;
uniform float uDehaze;

varying vec2 vUv;

// Linearization
vec3 srgbToLinear(vec3 c) {
  bvec3 cutoff = lessThanEqual(c, vec3(0.04045));
  vec3 lower = c / 12.92;
  vec3 higher = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(higher, lower, vec3(cutoff));
}

float luma709(vec3 linearRgb) {
  return dot(linearRgb, vec3(0.2126, 0.7152, 0.0722));
}

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
  float factor = exp2(-amount * w);
  return color * factor;
}

vec3 applyShadows(vec3 color, float amount) {
  float y = luma709(color);
  float w = 1.0 - smoothstep(0.02, 0.45, y);
  vec3 lifted = color + vec3(amount * 0.18) * w * (1.0 - color);
  vec3 deepened = color * (1.0 + amount * 0.5 * w);
  return amount >= 0.0 ? lifted : deepened;
}

vec3 applyWhites(vec3 color, float whites) {
  float y = luma709(color);
  float w = smoothstep(0.65, 1.0, y);
  // Scale whites to be more pronounced since user couldn't feel it
  return color * exp2(whites * 2.0 * w); 
}

vec3 applyBlacks(vec3 color, float blacks) {
  float y = luma709(color);
  float w = 1.0 - smoothstep(0.0, 0.35, y);
  // Scale blacks to be more pronounced
  return color * exp2(blacks * 2.0 * w);
}

vec3 applyVibrance(vec3 color, float vibrance) {
  float luma = luma709(color);
  float maxC = max(color.r, max(color.g, color.b));
  float minC = min(color.r, min(color.g, color.b));
  float sat = (maxC - minC) / (maxC + 0.001);
  float vibranceWeight = 1.0 - sat;
  return mix(vec3(luma), color, 1.0 + vibrance * vibranceWeight);
}

vec3 applyDehaze(vec3 color, float amount) {
  float y = luma709(color);
  float hazeMask = smoothstep(0.05, 0.75, y);
  vec3 contrastColor = applyLogContrast(color, amount * 0.45, 0.18);
  float satAmount = 1.0 + amount * 0.25;
  vec3 satColor = mix(vec3(y), color, satAmount);
  vec3 dehazed = mix(contrastColor, satColor, 0.35);
  // for negative dehaze add atmospheric lift
  vec3 atmospheric = vec3(y) + vec3(0.08, 0.09, 0.1);
  return amount >= 0.0 ? mix(color, dehazed, amount * hazeMask) : mix(color, atmospheric, -amount * 0.35);
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

void main() {
  vec4 texColor = texture2D(tDiffuse, vUv);
  
  // 1. Linearize Input
  vec3 color = srgbToLinear(texColor.rgb);
  
  // 2. White Balance
  // Base D65 white point
  vec3 referenceWhite = kelvinToRGB(6500.0);
  vec3 targetWhite = kelvinToRGB(uTemperature);
  vec3 wbMultiplier = referenceWhite / max(targetWhite, vec3(1e-5));
  color *= wbMultiplier;
  color = applyTint(color, uTint);

  // 3. Exposure
  color = applyExposure(color, uExposure);
  
  // 4. Contrast
  color = applyLogContrast(color, uContrast, 0.18);
  
  // 5. Highlights / Shadows
  color = applyHighlights(color, uHighlights);
  color = applyShadows(color, uShadows);
  
  // 6. Whites / Blacks
  color = applyWhites(color, uWhites);
  color = applyBlacks(color, uBlacks);
  
  // 7. Vibrance
  color = applyVibrance(color, uVibrance);
  
  // 8. Dehaze
  color = applyDehaze(color, uDehaze);
  
  gl_FragColor = vec4(color, texColor.a);
}
`;

export class BaseDevelopPass extends RenderPass {
  private material: THREE.ShaderMaterial;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uExposure: { value: 0.0 },
        uContrast: { value: 0.0 },
        uHighlights: { value: 0.0 },
        uShadows: { value: 0.0 },
        uWhites: { value: 0.0 },
        uBlacks: { value: 0.0 },
        uTemperature: { value: 6500.0 },
        uTint: { value: 0.0 },
        uVibrance: { value: 0.0 },
        uDehaze: { value: 0.0 }
      }
    });
    this.fsQuad.material = this.material;
  }

  public setup() {
    // Shaders already provided inline
  }

  public updateUniforms(settings: EditorSettings) {
    // Revert scales to match original shader's intensity
    this.material.uniforms.uExposure.value = (settings.brightness || 0.0); // 1.0 = 1 EV
    this.material.uniforms.uContrast.value = (settings.contrast || 0.0);
    
    // Invert highlights so positive values boost, negative values recover
    this.material.uniforms.uHighlights.value = -(settings.highlights || 0.0);
    this.material.uniforms.uShadows.value = (settings.shadows || 0.0);
    this.material.uniforms.uWhites.value = (settings.whites || 0.0);
    this.material.uniforms.uBlacks.value = (settings.blacks || 0.0);
    
    // Temperature mapping (mired shift)
    // Tone down the shift to roughly match the old shader's behavior, 
    // where a value of 1.0 only shifted by ~50 mireds instead of 150.
    const neutralMired = 1000000.0 / 6500.0;
    const miredShift = -(settings.temperature || 0.0) * 50.0;
    const targetMired = neutralMired + miredShift;
    this.material.uniforms.uTemperature.value = 1000000.0 / Math.max(targetMired, 1.0);
    
    this.material.uniforms.uTint.value = (settings.tint || 0.0);
  }

  public render(
    renderer: THREE.WebGLRenderer,
    readBuffer: THREE.WebGLRenderTarget | THREE.Texture,
    writeBuffer: THREE.WebGLRenderTarget | null
  ) {
    // If it's the very first pass, readBuffer might be the raw input THREE.Texture
    const inputTexture = (readBuffer as THREE.WebGLRenderTarget).texture ?? readBuffer;
    this.material.uniforms.tDiffuse.value = inputTexture;

    if (writeBuffer) {
      renderer.setRenderTarget(writeBuffer);
    } else {
      renderer.setRenderTarget(null);
    }
    
    renderer.clear();
    this.fsQuad.render(renderer);
  }
}
