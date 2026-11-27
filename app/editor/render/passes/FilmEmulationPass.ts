import * as THREE from 'three';
import { RenderPass, textureFromRenderInput, type RenderInput } from '../RenderPass';
import { EditorSettings } from '../../../types/editor';
import { FILM_EMULATION_SHADER_CHUNK } from '../../../lib/filmShaderChunk';
import { FILM_EMULATIONS } from '../../../lib/filmEmulations';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D tDiffuse;
uniform int uFilmType;
uniform float uFilmStrength;
varying vec2 vUv;

// Helper functions needed by the chunk
float getLuma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 rgb2hsl(vec3 color) {
    float maxColor = max(max(color.r, color.g), color.b);
    float minColor = min(min(color.r, color.g), color.b);
    vec3 hsl = vec3(0.0, 0.0, (maxColor + minColor) / 2.0);
    if (maxColor == minColor) {
        hsl.x = 0.0;
        hsl.y = 0.0;
    } else {
        float d = maxColor - minColor;
        // Bounded so channels above 1 can't divide by zero (NaN spreads through the glows).
        hsl.y = clamp(hsl.z > 0.5 ? d / max(2.0 - maxColor - minColor, 1e-6) : d / max(maxColor + minColor, 1e-6), 0.0, 1.0);
        if (maxColor == color.r) {
            hsl.x = (color.g - color.b) / d + (color.g < color.b ? 6.0 : 0.0);
        } else if (maxColor == color.g) {
            hsl.x = (color.b - color.r) / d + 2.0;
        } else {
            hsl.x = (color.r - color.g) / d + 4.0;
        }
        hsl.x /= 6.0;
    }
    return hsl;
}

float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0) hue += 1.0;
    else if (hue > 1.0) hue -= 1.0;
    float res;
    if ((6.0 * hue) < 1.0) res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0) res = f2;
    else if ((3.0 * hue) < 2.0) res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else res = f1;
    return res;
}

vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb;
    if (hsl.y == 0.0) {
        rgb = vec3(hsl.z);
    } else {
        float f2;
        if (hsl.z < 0.5) f2 = hsl.z * (1.0 + hsl.y);
        else f2 = (hsl.z + hsl.y) - (hsl.y * hsl.z);
        float f1 = 2.0 * hsl.z - f2;
        rgb.r = hue2rgb(f1, f2, hsl.x + (1.0/3.0));
        rgb.g = hue2rgb(f1, f2, hsl.x);
        rgb.b = hue2rgb(f1, f2, hsl.x - (1.0/3.0));
    }
    return rgb;
}

${FILM_EMULATION_SHADER_CHUNK}

void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  
  if (uFilmType > 0 && uFilmStrength > 0.0) {
    texel.rgb = applyFilmEmulation(texel.rgb, uFilmType, uFilmStrength);
  }
  
  gl_FragColor = texel;
}
`;

export class FilmEmulationPass extends RenderPass {
  private material: THREE.ShaderMaterial;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uFilmType: { value: 0 },
        uFilmStrength: { value: 1.0 }
      }
    });
  }

  public setup(): void {
    this.fsQuad.material = this.material;
  }

  public updateUniforms(settings: EditorSettings): void {
    const filmIndex = FILM_EMULATIONS.findIndex(f => f.id === settings.filmEmulation);
    
    // Fallback to 0 (none) if not found
    this.material.uniforms.uFilmType.value = filmIndex >= 0 ? filmIndex : 0;
    this.material.uniforms.uFilmStrength.value = settings.filmEmulationStrength !== undefined ? settings.filmEmulationStrength : 1.0;
  }

  public render(
    renderer: THREE.WebGLRenderer,
    readBuffer: RenderInput,
    writeBuffer: THREE.WebGLRenderTarget | null
  ): void {
    this.material.uniforms.tDiffuse.value = textureFromRenderInput(readBuffer);
    
    renderer.setRenderTarget(writeBuffer);
    this.fsQuad.render(renderer);
  }
}
