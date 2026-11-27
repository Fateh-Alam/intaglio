import * as THREE from 'three';
import { EditorSettings } from '../../types/editor';

export type RenderInput = THREE.Texture | THREE.WebGLRenderTarget;

export function textureFromRenderInput(input: RenderInput): THREE.Texture {
  return input instanceof THREE.WebGLRenderTarget ? input.texture : input;
}

export function dimensionsFromRenderInput(input: RenderInput, fallback = 256): { width: number; height: number } {
  if (input instanceof THREE.WebGLRenderTarget) return { width: input.width, height: input.height };
  const image = input.image as { width?: number; height?: number } | undefined;
  return { width: image?.width ?? fallback, height: image?.height ?? fallback };
}

/**
 * A simple fullscreen quad geometry for running fragment shaders.
 */
class FullScreenQuad {
  private camera: THREE.OrthographicCamera;
  private geometry: THREE.BufferGeometry;
  private mesh: THREE.Mesh;

  constructor(material?: THREE.Material) {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)
    );
    this.geometry.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2)
    );
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
  }

  get material(): THREE.Material | THREE.Material[] {
    return this.mesh.material;
  }

  set material(value: THREE.Material | THREE.Material[]) {
    this.mesh.material = value;
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.render(this.mesh, this.camera);
  }

  setViewOffset(fullWidth: number, fullHeight: number, x: number, y: number, width: number, height: number) {
    this.camera.setViewOffset(fullWidth, fullHeight, x, y, width, height);
  }

  clearViewOffset() {
    this.camera.clearViewOffset();
  }

  dispose() {
    this.geometry.dispose();
  }
}

export abstract class RenderPass {
  public enabled: boolean = true;
  protected fsQuad: FullScreenQuad;
  protected effectSize = { width: 1, height: 1 };

  constructor() {
    this.fsQuad = new FullScreenQuad();
  }

  /**
   * Called to compile the shader.
   */
  public abstract setup(): void;

  /**
   * Called per frame to set uniforms based on current settings.
   */
  public abstract updateUniforms(settings: EditorSettings): void;

  /**
   * Execute the pass.
   * @param renderer The WebGL renderer
   * @param readBuffer The buffer containing the previous pass output
   * @param writeBuffer The buffer to write to (if null, render to screen)
   */
  public abstract render(
    renderer: THREE.WebGLRenderer,
    readBuffer: RenderInput,
    writeBuffer: THREE.WebGLRenderTarget | null
  ): void;

  public dispose() {
    this.fsQuad.dispose();
  }

  public setViewOffset(fullWidth: number, fullHeight: number, x: number, y: number, width: number, height: number) {
    void fullWidth; void fullHeight; void x; void y; void width; void height;
  }

  public clearViewOffset() {}

  /** Unscaled cropped document dimensions for effects expressed in photo pixels. */
  public setEffectSize(width: number, height: number) {
    this.effectSize = { width, height };
  }

  /** Source passes receive the decoded source texture before each graph run. */
  public setSource(texture: THREE.Texture) {
    void texture;
  }
}

export type SourceEncoding = 'srgb' | 'linear';

/** Encoding of a source texture's values; image files default to sRGB-encoded. */
export function sourceEncodingOf(texture: THREE.Texture): SourceEncoding {
  if (texture.colorSpace === THREE.SRGBColorSpace) return 'linear'; // GPU decodes on sample
  return (texture.userData as { intaglioEncoding?: SourceEncoding }).intaglioEncoding === 'linear' ? 'linear' : 'srgb';
}
