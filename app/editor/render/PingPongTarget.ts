import * as THREE from 'three';

/**
 * Pro-grade Render Target Options
 * Requires WebGL 2 and OES_texture_half_float
 */
export const PRO_RENDER_TARGET_OPTIONS: THREE.RenderTargetOptions = {
  type: THREE.HalfFloatType,
  format: THREE.RGBAFormat,
  colorSpace: THREE.NoColorSpace, // Linear operations
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  depthBuffer: false,
  stencilBuffer: false,
};

export class PingPongTarget {
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;

  constructor(width: number, height: number, options = PRO_RENDER_TARGET_OPTIONS) {
    this.read = new THREE.WebGLRenderTarget(width, height, options);
    this.write = new THREE.WebGLRenderTarget(width, height, options);
  }

  setSize(width: number, height: number) {
    if (this.read.width !== width || this.read.height !== height) {
      this.read.setSize(width, height);
      this.write.setSize(width, height);
    }
  }

  swap() {
    const temp = this.read;
    this.read = this.write;
    this.write = temp;
  }

  dispose() {
    this.read.dispose();
    this.write.dispose();
  }
}
