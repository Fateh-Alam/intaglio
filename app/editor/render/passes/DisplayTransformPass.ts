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
uniform float uTime;
varying vec2 vUv;

// Linear to sRGB display transform
vec3 linearToSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  bvec3 cutoff = lessThanEqual(c, vec3(0.0031308));
  vec3 lower = c * 12.92;
  vec3 higher = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(higher, lower, vec3(cutoff));
}

// Simple hash for dithering
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Triangular dither to prevent banding on 8-bit output
float triangularDither(vec2 uv, float seed) {
  float a = hash(uv + seed);
  float b = hash(uv + seed + 19.19);
  return a - b;
}

vec3 applyDither(vec3 srgb, vec2 uv, float seed) {
  float d = triangularDither(uv, seed) / 255.0;
  return srgb + vec3(d);
}

void main() {
  vec4 texColor = texture2D(tDiffuse, vUv);
  
  // 1. Display Transform (Linear -> sRGB)
  vec3 color = linearToSrgb(texColor.rgb);
  
  // 2. Dithering
  // Generate a deterministic seed based on UV so it's stable, or use uTime to crawl.
  // The spec recommends a stable seed for export, subtle for preview. We'll use a static seed for now.
  color = applyDither(color, vUv, 1.0);
  
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), texColor.a);
}
`;

export class DisplayTransformPass extends RenderPass {
  private material: THREE.ShaderMaterial;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0.0 }
      }
    });
    this.fsQuad.material = this.material;
  }

  public setup() {
    // Shaders inline
  }

  public updateUniforms(settings: EditorSettings) {
    this.material.uniforms.uTime.value = performance.now() / 1000.0;
  }

  public render(
    renderer: THREE.WebGLRenderer,
    readBuffer: THREE.WebGLRenderTarget | THREE.Texture,
    writeBuffer: THREE.WebGLRenderTarget | null
  ) {
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
