import * as THREE from 'three';
import { dimensionsFromRenderInput, RenderPass } from '../RenderPass';
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
uniform vec2 uResolution;
uniform vec2 uFullSize;
uniform vec2 uEffectSize;
uniform vec2 uTileOffset;
uniform vec2 uTileSize;
uniform float uTime;

uniform float uGodLightStrength;
uniform vec2 uGodLightPos;
uniform vec3 uGodLightColor;
uniform float uGodLightSpecular;
uniform float uGodLightRim;
uniform float uGodLightFalloff;

uniform float uVignette;
uniform float uAberration;
uniform float uFilmBorder;
uniform float uAnamorphicStreaks;
uniform float uGrainStrength;

varying vec2 vUv;

float getLuma(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

float linearToSrgbScalar(float c) {
  c = max(c, 0.0);
  return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

// Integer hash (PCG) of a pixel: the same on every GPU, so grain is part of
// the document. fract(sin(x)) differed between browsers and the Mac app.
uint pcgHash(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

float grainNoise(vec2 pixel) {
  uvec2 p = uvec2(max(pixel, vec2(0.0)));
  return float(pcgHash(p.x + pcgHash(p.y)) >> 8u) / 16777216.0;
}

float filteredGrain(vec2 center, vec2 footprint) {
  float scale = max(footprint.x, footprint.y);
  if (scale <= 1.001) return grainNoise(floor(center) + uTime);
  // Average the grain under the output pixel. Fine grain drops away once
  // the preview can no longer resolve individual grains.
  if (scale >= 3.0) return 0.5;
  vec2 first = center - footprint * 0.5;
  vec2 last = center + footprint * 0.5;
  vec2 start = floor(first);
  float sum = 0.0;
  for (int y = 0; y < 4; y++) {
    for (int x = 0; x < 4; x++) {
      vec2 cell = start + vec2(float(x), float(y));
      vec2 coverage = max(vec2(0.0), min(last, cell + 1.0) - max(first, cell));
      sum += coverage.x * coverage.y * (grainNoise(cell + uTime) - 0.5);
    }
  }
  return 0.5 + (1.0 - smoothstep(2.0, 3.0, scale)) * sum / (footprint.x * footprint.y);
}

void main() {
  vec2 uv = vUv;
  vec2 globalUv = vec2(
    (uTileOffset.x + vUv.x * uTileSize.x) / uFullSize.x,
    (uFullSize.y - uTileOffset.y - uTileSize.y + vUv.y * uTileSize.y) / uFullSize.y
  );
  
  float r = texture2D(tDiffuse, uv + vec2(uAberration, 0.0)).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv - vec2(uAberration, 0.0)).b;
  vec3 color = vec3(r, g, b);
  
  if (uAnamorphicStreaks > 0.0) {
    vec3 streak = vec3(0.0);
    for(int i = -20; i <= 20; i++) {
      float offset = float(i) * 0.005;
      vec3 s = texture2D(tDiffuse, clamp(uv + vec2(offset, 0.0), 0.0, 1.0)).rgb;
      float brightness = linearToSrgbScalar(max(s.r, max(s.g, s.b)));
      float weight = smoothstep(0.66, 0.84, brightness);
      if(weight > 0.0) {
        streak += s * weight * (1.0 - abs(offset * 9.5));
      }
    }
    streak /= 14.0;
    streak *= vec3(0.45, 0.78, 1.0);
    color += streak * uAnamorphicStreaks;
  }
  
  if (uGodLightStrength > 0.0) {
    // Scale gradient tap spacing to full image size so rim/specular stay consistent across preview and export
    float tapScale = max(1.0, min(uFullSize.x, uFullSize.y) / 480.0);
    vec2 step = tapScale / uResolution;
    float t = linearToSrgbScalar(getLuma(texture2D(tDiffuse, clamp(uv + vec2(0.0, step.y), 0.0, 1.0)).rgb));
    float bot = linearToSrgbScalar(getLuma(texture2D(tDiffuse, clamp(uv + vec2(0.0, -step.y), 0.0, 1.0)).rgb));
    float l = linearToSrgbScalar(getLuma(texture2D(tDiffuse, clamp(uv + vec2(-step.x, 0.0), 0.0, 1.0)).rgb));
    float right = linearToSrgbScalar(getLuma(texture2D(tDiffuse, clamp(uv + vec2(step.x, 0.0), 0.0, 1.0)).rgb));
    
    float dx = (right - l) * 4.0;
    float dy = (t - bot) * 4.0;
    vec3 normal = normalize(vec3(dx, dy, 1.0));
    
    vec3 lightDir = normalize(vec3(uGodLightPos - globalUv, 0.5));
    
    float dist = length(uGodLightPos - globalUv);
    float falloff = 1.0 / (1.0 + dist * dist * uGodLightFalloff * 5.0);
    
    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 diffuseLight = uGodLightColor * diffuse * uGodLightStrength * falloff;
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specularLight = uGodLightColor * spec * uGodLightSpecular * falloff;
    
    float edgeMag = length(vec2(right - l, t - bot));
    float rimFacing = 0.35 + 0.65 * max(dot(normalize(vec2(right - l, t - bot) + vec2(1e-5)), normalize(uGodLightPos - globalUv + vec2(1e-5))), 0.0);
    float rim = smoothstep(0.02, 0.22, edgeMag) * rimFacing * falloff;
    vec3 rimLight = uGodLightColor * rim * uGodLightRim * uGodLightStrength;
    
    color += color * diffuseLight * 0.5;
    color += specularLight * 0.3;
    color += rimLight * 0.65;
  }
  
  if (uGrainStrength > 0.0) {
    float noise = filteredGrain(globalUv * uEffectSize, uEffectSize / uFullSize);
    float luma = getLuma(color);
    
    // Film grain is typically most visible in midtones, present in shadows, 
    // and less visible in dense highlights where the emulsion is fully exposed.
    // This creates a characteristic film grain profile.
    float grainWeight = 1.0 - smoothstep(0.7, 1.0, luma);
    float shadowWeight = smoothstep(0.0, 0.1, luma) * 0.5 + 0.5; // Slightly less in pure blacks
    
    float lumaResponse = grainWeight * shadowWeight;
    
    // Non-linear response curve for grain density
    float grainAmount = uGrainStrength * lumaResponse;
    color += (noise - 0.5) * grainAmount;
  }

  if (uVignette > 0.0) {
    vec2 dist = globalUv - 0.5;
    float vignette = smoothstep(0.8, 0.25 * (1.0 - uVignette), length(dist));
    color *= vignette;
  }

  if (uFilmBorder > 0.5) {
    vec2 border = step(vec2(0.02), globalUv) * step(globalUv, vec2(0.98));
    float box = border.x * border.y;
    color *= box;
  }

  gl_FragColor = vec4(color, texture2D(tDiffuse, uv).a);
}
`;

export class OpticalFXPass extends RenderPass {
  private material: THREE.ShaderMaterial;
  private tiled = false;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uFullSize: { value: new THREE.Vector2(1, 1) },
        uEffectSize: { value: new THREE.Vector2(1, 1) },
        uTileOffset: { value: new THREE.Vector2(0, 0) },
        uTileSize: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0.0 },
        uGodLightStrength: { value: 0.0 },
        uGodLightPos: { value: new THREE.Vector2(0.5, 0.5) },
        uGodLightColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
        uGodLightSpecular: { value: 0.0 },
        uGodLightRim: { value: 0.0 },
        uGodLightFalloff: { value: 0.0 },
        uVignette: { value: 0.0 },
        uAberration: { value: 0.0 },
        uFilmBorder: { value: 0.0 },
        uAnamorphicStreaks: { value: 0.0 },
        uGrainStrength: { value: 0.0 }
      }
    });
    this.fsQuad.material = this.material;
  }

  public setup() {}

  public updateUniforms(settings: EditorSettings) {
    // Grain is intentionally fixed in output coordinates so preview, proof,
    // tiled export, and repeated exports render the same document pixels.
    this.material.uniforms.uTime.value = 0.0;
    const godLightStrength = settings.godLightStrength ?? 0.0;
    const vignette = settings.vignette ?? 0.0;
    const aberration = settings.aberration ?? 0.0;
    const filmBorder = Boolean(settings.filmBorder);
    const anamorphicStreaks = settings.anamorphicStreaks ?? 0.0;
    const grain = settings.grain ?? 0.0;

    this.material.uniforms.uGodLightStrength.value = godLightStrength;
    this.material.uniforms.uGodLightPos.value.set(settings.godLightX ?? 0.5, settings.godLightY ?? 0.5);
    this.material.uniforms.uGodLightColor.value.set(
      settings.godLightColorR ?? 1.0,
      settings.godLightColorG ?? 1.0,
      settings.godLightColorB ?? 1.0
    );
    this.material.uniforms.uGodLightSpecular.value = settings.godLightSpecular ?? 0.0;
    this.material.uniforms.uGodLightRim.value = settings.godLightRim ?? 0.0;
    this.material.uniforms.uGodLightFalloff.value = settings.godLightFalloff ?? 1.0;
    
    this.material.uniforms.uVignette.value = vignette;
    this.material.uniforms.uAberration.value = aberration;
    this.material.uniforms.uFilmBorder.value = filmBorder ? 1.0 : 0.0;
    this.material.uniforms.uAnamorphicStreaks.value = anamorphicStreaks;
    this.material.uniforms.uGrainStrength.value = grain;
    
    this.enabled =
      godLightStrength > 0.0 ||
      vignette > 0.0 ||
      aberration > 0.0 ||
      filmBorder ||
      anamorphicStreaks > 0.0 ||
      grain > 0.0;
  }

  override setViewOffset(fullWidth: number, fullHeight: number, x: number, y: number, width: number, height: number): void {
    this.tiled = true;
    this.material.uniforms.uFullSize.value.set(fullWidth, fullHeight);
    this.material.uniforms.uTileOffset.value.set(x, y);
    this.material.uniforms.uTileSize.value.set(width, height);
  }

  override clearViewOffset(): void {
    this.tiled = false;
    this.material.uniforms.uTileOffset.value.set(0, 0);
  }

  public render(
    renderer: THREE.WebGLRenderer,
    readBuffer: THREE.WebGLRenderTarget | THREE.Texture,
    writeBuffer: THREE.WebGLRenderTarget | null
  ) {
    if (!this.enabled) {
      this.material.uniforms.tDiffuse.value = (readBuffer as THREE.WebGLRenderTarget).texture ?? readBuffer;
      this.material.uniforms.uGodLightStrength.value = 0.0;
      this.fsQuad.material = this.material;
      if (writeBuffer) renderer.setRenderTarget(writeBuffer);
      else renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
      return;
    }

    const inputTexture = (readBuffer as THREE.WebGLRenderTarget).texture ?? readBuffer;
    this.material.uniforms.tDiffuse.value = inputTexture;
    this.material.uniforms.uEffectSize.value.set(this.effectSize.width, this.effectSize.height);
    
    if ((readBuffer as THREE.WebGLRenderTarget).width !== undefined) {
      const width = (readBuffer as THREE.WebGLRenderTarget).width;
      const height = (readBuffer as THREE.WebGLRenderTarget).height;
      this.material.uniforms.uResolution.value.set(width, height);
      if (!this.tiled) {
        this.material.uniforms.uFullSize.value.set(width, height);
        this.material.uniforms.uTileSize.value.set(width, height);
      }
    } else {
      const dimensions = dimensionsFromRenderInput(readBuffer);
      this.material.uniforms.uResolution.value.set(dimensions.width, dimensions.height);
      if (!this.tiled) {
        this.material.uniforms.uFullSize.value.set(dimensions.width, dimensions.height);
        this.material.uniforms.uTileSize.value.set(dimensions.width, dimensions.height);
      }
    }

    if (writeBuffer) renderer.setRenderTarget(writeBuffer);
    else renderer.setRenderTarget(null);
    
    renderer.clear();
    this.fsQuad.render(renderer);
  }
}
