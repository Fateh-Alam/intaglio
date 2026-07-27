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
uniform vec2 uResolution;
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
uniform float uAnamorphicDistortion;
uniform float uAnamorphicStreaks;
uniform float uGrainStrength;

varying vec2 vUv;

float getLuma(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
  vec2 uv = vUv;
  
  if (uAnamorphicDistortion > 0.0) {
    vec2 d = uv - 0.5;
    float r2 = dot(d, d);
    float f = 1.0 + r2 * (uAnamorphicDistortion * 0.5);
    uv = d * f + 0.5;
  }
  
  float r = texture2D(tDiffuse, uv + vec2(uAberration, 0.0)).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv - vec2(uAberration, 0.0)).b;
  vec3 color = vec3(r, g, b);
  
  if (uAnamorphicStreaks > 0.0) {
    vec3 streak = vec3(0.0);
    float threshold = 0.7;
    for(int i = -20; i < 20; i++) {
      float offset = float(i) * 0.005;
      vec3 s = texture2D(tDiffuse, uv + vec2(offset, 0.0)).rgb;
      float brightness = max(s.r, max(s.g, s.b));
      if(brightness > threshold) {
        streak += s * (1.0 - abs(offset * 10.0));
      }
    }
    streak /= 20.0;
    streak *= vec3(0.5, 0.8, 1.0); 
    color += streak * uAnamorphicStreaks;
  }
  
  if (uGodLightStrength > 0.0) {
    vec2 step = 1.0 / uResolution;
    float t = getLuma(texture2D(tDiffuse, uv + vec2(0.0, step.y)).rgb);
    float bot = getLuma(texture2D(tDiffuse, uv + vec2(0.0, -step.y)).rgb);
    float l = getLuma(texture2D(tDiffuse, uv + vec2(-step.x, 0.0)).rgb);
    float right = getLuma(texture2D(tDiffuse, uv + vec2(step.x, 0.0)).rgb);
    
    float dx = (right - l) * 5.0;
    float dy = (t - bot) * 5.0;
    vec3 normal = normalize(vec3(dx, dy, 1.0));
    
    vec3 lightDir = normalize(vec3(uGodLightPos - uv, 0.5));
    
    float dist = length(uGodLightPos - uv);
    float falloff = 1.0 / (1.0 + dist * dist * uGodLightFalloff * 5.0);
    
    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 diffuseLight = uGodLightColor * diffuse * uGodLightStrength * falloff;
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specularLight = uGodLightColor * spec * uGodLightSpecular * falloff;
    
    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    rim = pow(rim, 3.0);
    vec3 rimLight = uGodLightColor * rim * uGodLightRim;
    
    color += color * diffuseLight * 0.5;
    color += specularLight * 0.3;
    color += rimLight * 0.2;
  }
  
  if (uGrainStrength > 0.0) {
    float noise = random(uv * uResolution + uTime);
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
    vec2 dist = uv - 0.5;
    float vignette = smoothstep(0.8, 0.25 * (1.0 - uVignette), length(dist));
    color *= vignette;
  }

  if (uFilmBorder > 0.5) {
    vec2 border = step(vec2(0.02), uv) * step(uv, vec2(0.98));
    float box = border.x * border.y;
    color *= box;
  }

  gl_FragColor = vec4(color, texture2D(tDiffuse, uv).a);
}
`;

export class OpticalFXPass extends RenderPass {
  private material: THREE.ShaderMaterial;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
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
        uAnamorphicDistortion: { value: 0.0 },
        uAnamorphicStreaks: { value: 0.0 },
        uGrainStrength: { value: 0.0 }
      }
    });
    this.fsQuad.material = this.material;
  }

  public setup() {}

  public updateUniforms(settings: EditorSettings) {
    this.material.uniforms.uTime.value = performance.now() / 1000.0;
    this.material.uniforms.uGodLightStrength.value = settings.godLightStrength || 0.0;
    this.material.uniforms.uGodLightPos.value.set(settings.godLightX || 0.5, settings.godLightY || 0.5);
    this.material.uniforms.uGodLightColor.value.set(
      settings.godLightColorR ?? 1.0,
      settings.godLightColorG ?? 1.0,
      settings.godLightColorB ?? 1.0
    );
    this.material.uniforms.uGodLightSpecular.value = settings.godLightSpecular || 0.0;
    this.material.uniforms.uGodLightRim.value = settings.godLightRim || 0.0;
    this.material.uniforms.uGodLightFalloff.value = settings.godLightFalloff || 0.0;
    
    this.material.uniforms.uVignette.value = settings.vignette || 0.0;
    this.material.uniforms.uAberration.value = settings.aberration || 0.0;
    this.material.uniforms.uFilmBorder.value = settings.filmBorder ? 1.0 : 0.0;
    this.material.uniforms.uAnamorphicDistortion.value = settings.anamorphicDistortion || 0.0;
    this.material.uniforms.uAnamorphicStreaks.value = settings.anamorphicStreaks || 0.0;
    this.material.uniforms.uGrainStrength.value = settings.grain || 0.0;
    
    this.enabled = true; // Grain requires constant updates, or we can check if anything > 0
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
    
    if ((readBuffer as THREE.WebGLRenderTarget).width !== undefined) {
      this.material.uniforms.uResolution.value.set(
        (readBuffer as THREE.WebGLRenderTarget).width,
        (readBuffer as THREE.WebGLRenderTarget).height
      );
    } else {
      const img = inputTexture.image as any;
      if (img && img.width) {
        this.material.uniforms.uResolution.value.set(img.width, img.height);
      }
    }

    if (writeBuffer) renderer.setRenderTarget(writeBuffer);
    else renderer.setRenderTarget(null);
    
    renderer.clear();
    this.fsQuad.render(renderer);
  }
}
