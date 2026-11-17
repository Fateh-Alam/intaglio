import * as THREE from "three";
import type { EditorSettings } from "../../../types/editor";
import { RenderPass, type RenderInput, dimensionsFromRenderInput, textureFromRenderInput } from "../RenderPass";
import { isFullCrop } from "../../../lib/cropGeometry";
import { CROP_GLSL, GEOMETRY_GLSL } from "../shaders/geometryChunk";

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
uniform sampler2D tDiffuse;
uniform float uRotation;
uniform float uZoom;
uniform float uLensDistortion;
uniform float uKeystoneH;
uniform float uKeystoneV;
uniform float uAnamorphic;
uniform float uAspect;
uniform vec4 uCrop;
uniform vec2 uFullSize;
uniform vec2 uTileOffset;
uniform vec2 uTileSize;
varying vec2 vUv;

${CROP_GLSL}
${GEOMETRY_GLSL}

void main() {
  vec2 globalUv = vec2(
    (uTileOffset.x + vUv.x * uTileSize.x) / uFullSize.x,
    (uFullSize.y - uTileOffset.y - uTileSize.y + vUv.y * uTileSize.y) / uFullSize.y
  );
  vec2 uv = sourceUv(uncropUv(globalUv, uCrop), uAspect, uRotation, uZoom,
    uAnamorphic, uKeystoneH, uKeystoneV, uLensDistortion);
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
    gl_FragColor = vec4(0.0);
  } else {
    gl_FragColor = texture2D(tDiffuse, uv);
  }
}`;

export class GeometryPass extends RenderPass {
  private readonly material: THREE.ShaderMaterial;
  private tiled = false;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uRotation: { value: 0 },
        uZoom: { value: 1 },
        uLensDistortion: { value: 0 },
        uKeystoneH: { value: 0 },
        uKeystoneV: { value: 0 },
        uAnamorphic: { value: 0 },
        uAspect: { value: 1 },
        uCrop: { value: new THREE.Vector4(0, 0, 1, 1) },
        uFullSize: { value: new THREE.Vector2(1, 1) },
        uTileOffset: { value: new THREE.Vector2(0, 0) },
        uTileSize: { value: new THREE.Vector2(1, 1) },
      },
    });
    this.fsQuad.material = this.material;
  }

  setup(): void {}

  updateUniforms(settings: EditorSettings): void {
    const { crop } = settings;
    this.material.uniforms.uCrop.value.set(crop.x, crop.y, crop.width, crop.height);
    this.material.uniforms.uRotation.value = THREE.MathUtils.degToRad(settings.rotate);
    this.material.uniforms.uZoom.value = settings.zoom || 1;
    this.material.uniforms.uLensDistortion.value = settings.lensDistortion;
    this.material.uniforms.uKeystoneH.value = settings.keystoneH;
    this.material.uniforms.uKeystoneV.value = settings.keystoneV;
    this.material.uniforms.uAnamorphic.value = settings.anamorphicDistortion;
    this.enabled = this.tiled || !isFullCrop(crop) || settings.rotate !== 0 || settings.zoom !== 1 || settings.lensDistortion !== 0 || settings.keystoneH !== 0 || settings.keystoneV !== 0 || settings.anamorphicDistortion !== 0;
  }

  override setSource(texture: THREE.Texture): void {
    const { width, height } = dimensionsFromRenderInput(texture, 1);
    this.material.uniforms.uAspect.value = width / Math.max(height, 1);
  }

  render(renderer: THREE.WebGLRenderer, readBuffer: RenderInput, writeBuffer: THREE.WebGLRenderTarget | null): void {
    this.material.uniforms.tDiffuse.value = textureFromRenderInput(readBuffer);
    renderer.setRenderTarget(writeBuffer);
    renderer.clear();
    this.fsQuad.render(renderer);
  }

  override setViewOffset(fullWidth: number, fullHeight: number, x: number, y: number, width: number, height: number): void {
    this.tiled = true;
    this.material.uniforms.uFullSize.value.set(fullWidth, fullHeight);
    this.material.uniforms.uTileOffset.value.set(x, y);
    this.material.uniforms.uTileSize.value.set(width, height);
    this.enabled = true;
  }

  override clearViewOffset(): void {
    this.tiled = false;
    this.material.uniforms.uFullSize.value.set(1, 1);
    this.material.uniforms.uTileOffset.value.set(0, 0);
    this.material.uniforms.uTileSize.value.set(1, 1);
  }

  override dispose(): void {
    this.material.dispose();
    super.dispose();
  }
}
