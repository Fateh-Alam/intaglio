import * as THREE from 'three';
import { EditorSettings } from '../../types/editor';

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
    readBuffer: THREE.WebGLRenderTarget,
    writeBuffer: THREE.WebGLRenderTarget | null
  ): void;

  public dispose() {
    this.fsQuad.dispose();
  }

  public setViewOffset(fullWidth: number, fullHeight: number, x: number, y: number, width: number, height: number) {
    this.fsQuad.setViewOffset(fullWidth, fullHeight, x, y, width, height);
  }

  public clearViewOffset() {
    this.fsQuad.clearViewOffset();
  }
}
