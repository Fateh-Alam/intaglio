import * as THREE from 'three';
import { RenderPass } from '../RenderPass';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D tDiffuse;
uniform float uDither;
uniform vec2 uFullSize;
uniform vec2 uTileOffset;
uniform vec2 uTileSize;
varying vec2 vUv;

// Linear to sRGB display transform
vec3 linearToSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  bvec3 cutoff = lessThanEqual(c, vec3(0.0031308));
  vec3 lower = c * 12.92;
  vec3 higher = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(higher, lower, vec3(cutoff));
}

// Integer PCG hash matches etch-core on Metal. Keep upper bits so conversion
// to float is exact, and subtract two independent samples for triangular noise.
uint pcgHash(uint value) {
  uint state = value * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

float noiseAt(uvec2 pixel) {
  return float(pcgHash(pixel.x + pcgHash(pixel.y)) >> 8u) / 16777216.0;
}

void main() {
  vec4 texColor = texture2D(tDiffuse, vUv);
  vec3 color = linearToSrgb(texColor.rgb);
  vec2 imageOffset = vec2(uTileOffset.x, uFullSize.y - uTileOffset.y - uTileSize.y);
  uvec2 pixel = uvec2(floor(gl_FragCoord.xy + imageOffset));
  float noise = (noiseAt(pixel) - noiseAt(pixel + uvec2(19u))) / 255.0;
  vec3 dithered = color + noise * uDither;
  bvec3 interior = bvec3(color.r > 0.0 && color.r < 1.0, color.g > 0.0 && color.g < 1.0, color.b > 0.0 && color.b < 1.0);
  color = mix(color, dithered, interior);
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
        uDither: { value: 1 },
        uFullSize: { value: new THREE.Vector2(1, 1) },
        uTileOffset: { value: new THREE.Vector2(0, 0) },
        uTileSize: { value: new THREE.Vector2(1, 1) },
      }
    });
    this.fsQuad.material = this.material;
  }

  setDither(enabled: boolean): void { this.material.uniforms.uDither.value = enabled ? 1 : 0; }

  public setup() {
    // Shaders inline
  }

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
