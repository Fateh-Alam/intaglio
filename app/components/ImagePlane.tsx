"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { EditorSettings, HistogramData } from "../types/editor";
import { IntaglioRenderer } from "../editor/render/IntaglioRenderer";
import { createLinearSourceTexture, type LinearSourceBuffer } from "../editor/render/sourceTexture";
import { onBrushTexturesChanged } from "../editor/render/brushTextures";
import type { MaskColorSampler } from "../lib/maskGeometry";
import { computeHistogramMetrics } from "../utils/histogram";
import { extractDominantColors } from "../utils/swatch";
import { cropSize, fitPhoto, isFullCrop } from "../lib/cropGeometry";
import { CROP_GLSL, GEOMETRY_GLSL } from "../editor/render/shaders/geometryChunk";
import { hasCreativeEffects } from "../editor/effects/settings";
import { loupeLayout, planLoupeRender, PIXEL_GRID_SCALE, type LoupeRenderPlan } from "../editor/shell/loupe";

/** Magnification relative to Fit and the image-space point at the viewport center. */
export interface LoupeView { zoom: number; cx: number; cy: number }

const STATS_WIDTH = 192;
const STATS_DELAY_MS = 120;

const statsCopyVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const statsCopyFragmentShader = `
  uniform sampler2D uTexture;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(uTexture, vUv);
  }
`;

const finalDisplayVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// View-only display stage: before/after compare and clipping warnings are
// drawn here, after the render graph, so they can never reach an export.
const finalDisplayFragmentShader = `
  uniform sampler2D uTexture;
  uniform sampler2D uOriginalTexture;
  uniform sampler2D uMaskCoverage;
  uniform bool uShowMask;
  uniform float uSplit;
  uniform float uClipping;
  uniform vec4 uCrop;
  uniform vec4 uGeometry;
  uniform vec3 uPerspective;
  uniform bool uMatchCrop;
  // Loupe: the visible image region (uView) and the region held by the render
  // target (uRender), both as (x0, y0, x1, y1) in UV space with a bottom origin.
  uniform vec4 uView;
  uniform vec4 uRender;
  uniform vec2 uTexSize;
  uniform bool uNearest;
  uniform float uGrid;
  varying vec2 vUv;

  ${CROP_GLSL}
  ${GEOMETRY_GLSL}

  void main() {
    vec2 imageUv = mix(uView.xy, uView.zw, vUv);
    vec2 texUv = (imageUv - uRender.xy) / (uRender.zw - uRender.xy);
    vec2 texel = texUv * uTexSize;
    if (uNearest) texUv = (floor(texel) + 0.5) / uTexSize;
    vec4 after = texture2D(uTexture, texUv);
    bool showBefore = uSplit >= 1.5 || (uSplit >= 0.0 && imageUv.x < uSplit);
    vec4 color = after;
    if (showBefore) {
      vec2 uv = imageUv;
      if (uMatchCrop) uv = sourceUv(uncropUv(imageUv, uCrop), uGeometry.x, uGeometry.y,
        uGeometry.z, uGeometry.w, uPerspective.x, uPerspective.y, uPerspective.z);
      color = texture2D(uOriginalTexture, uv);
      if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) color = vec4(0.0);
    }
    if (uClipping > 0.5 && !showBefore) {
      float brightest = max(after.r, max(after.g, after.b));
      if (brightest >= 0.994) color.rgb = vec3(1.0, 0.2, 0.16);
      else if (brightest <= 0.006) color.rgb = vec3(0.12, 0.38, 1.0);
    }
    if (uShowMask && !showBefore) {
      float coverage = texture2D(uMaskCoverage, texUv).a;
      color.rgb = mix(color.rgb, vec3(1.0, 0.16, 0.19), coverage * 0.56);
    }
    if (uGrid > 0.0) {
      vec2 f = fract(texel);
      float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * uGrid;
      if (edge < 0.5) color.rgb = mix(color.rgb, vec3(0.5), 0.22);
    }
    gl_FragColor = color;
  }
`;

export default function ImagePlane({
  imageUrl,
  settings,
  gradeGraph,
  split = -1,
  showClipping = false,
  maskOverlayPlateId = null,
  maskColorSamplerRef,
  pickingMaskColor = false,
  rawSource,
  onStatsUpdate,
  view,
  onOutputSize,
}: {
  imageUrl: string;
  gradeGraph?: import("../types/document").GradeGraph;
  settings: EditorSettings;
  /** −1 off, 0…1 split position (before on the left), 2 full before. */
  split?: number;
  showClipping?: boolean;
  /** Preview only: inspect this mask and its input colors. */
  maskOverlayPlateId?: string | null;
  maskColorSamplerRef?: React.RefObject<MaskColorSampler | null>;
  pickingMaskColor?: boolean;
  rawSource?: LinearSourceBuffer | null;
  onStatsUpdate?: (data: HistogramData) => void;
  /** Absent or zoom 1: fitted preview. Above 1: the loupe renders real image pixels. */
  view?: LoupeView;
  /** Reports the cropped output size in image pixels. */
  onOutputSize?: (width: number, height: number) => void;
}) {
  // The 8-bit display proxy doubles as the "original" for before/after.
  const previewTexture = useLoader(THREE.TextureLoader, imageUrl);
  const { size, viewport, gl, invalidate } = useThree();
  const texture = useMemo(
    () => rawSource ? createLinearSourceTexture(rawSource, gl.capabilities.maxTextureSize) : previewTexture,
    [rawSource, previewTexture, gl],
  );
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { crop } = settings;
  const croppedSize = useMemo(() => cropSize(texture.image.width, texture.image.height, crop), [crop, texture]);
  const aspect = croppedSize.width / croppedSize.height;

  useEffect(() => onOutputSize?.(croppedSize.width, croppedSize.height), [croppedSize, onOutputSize]);

  const creative = hasCreativeEffects(settings.creativeEffects);
  const dpr = gl.getPixelRatio();
  // Loupe: where the zoomed photo sits and which pixels the render must produce.
  const loupe = useMemo(() => {
    if (!view || view.zoom <= 1.0001) return null;
    const fitCss = fitPhoto(size.width * 0.9, size.height * 0.9, aspect);
    const layout = loupeLayout(size, fitCss, view.zoom, view.cx, view.cy);
    if (layout.visible.width < 1 || layout.visible.height < 1) return null;
    const plan: LoupeRenderPlan = planLoupeRender(layout, croppedSize, dpr, creative, gl.capabilities.maxTextureSize);
    return { layout, plan };
  }, [view, size, aspect, croppedSize, dpr, creative, gl]);

  const meshTransform = useMemo(() => {
    const toWorld = viewport.width / Math.max(1, size.width);
    if (loupe) {
      const { visible } = loupe.layout;
      return {
        scale: new THREE.Vector3(visible.width * toWorld, visible.height * toWorld, 1),
        position: new THREE.Vector3((visible.left + visible.width / 2 - size.width / 2) * toWorld, -(visible.top + visible.height / 2 - size.height / 2) * toWorld, 0),
      };
    }
    const { width, height } = fitPhoto(viewport.width * 0.9, viewport.height * 0.9, aspect);
    return { scale: new THREE.Vector3(width, height, 1), position: new THREE.Vector3(0, 0, 0) };
  }, [viewport, size, aspect, loupe]);

  // Created once: three.js caches uniform objects per compiled program, so a
  // fresh object on each render would leave the GPU reading stale values.
  const displayUniforms = useMemo(() => ({
    uTexture: { value: null as THREE.Texture | null },
    uOriginalTexture: { value: null as THREE.Texture | null },
    uMaskCoverage: { value: null as THREE.Texture | null },
    uShowMask: { value: false },
    uSplit: { value: -1 },
    uClipping: { value: 0 },
    uCrop: { value: new THREE.Vector4() },
    uGeometry: { value: new THREE.Vector4() },
    uPerspective: { value: new THREE.Vector3() },
    uMatchCrop: { value: false },
    uView: { value: new THREE.Vector4(0, 0, 1, 1) },
    uRender: { value: new THREE.Vector4(0, 0, 1, 1) },
    uTexSize: { value: new THREE.Vector2(1, 1) },
    uNearest: { value: false },
    uGrid: { value: 0 },
  }), []);

  // Pro-Grade Render Graph Pipeline
  const { intaglioRenderer, finalTarget } = useMemo(() => {
    const intaglioRenderer = new IntaglioRenderer();

    const finalTarget = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      colorSpace: THREE.NoColorSpace // Output from DisplayTransformPass is already sRGB encoded
    });

    return { intaglioRenderer, finalTarget };
  }, []);

  const maskCoverage = useMemo(() => new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    stencilBuffer: false,
    colorSpace: THREE.NoColorSpace,
  }), []);

  useEffect(() => () => maskCoverage.dispose(), [maskCoverage]);
  const pendingMaskSample = useRef<{
    x: number;
    y: number;
    resolve: (color: [number, number, number] | null) => void;
  } | null>(null);
  useEffect(() => {
    if (!maskColorSamplerRef) return;
    maskColorSamplerRef.current = (x, y) => new Promise((resolve) => {
      pendingMaskSample.current?.resolve(null);
      pendingMaskSample.current = { x, y, resolve };
      invalidate();
    });
    return () => {
      pendingMaskSample.current?.resolve(null);
      pendingMaskSample.current = null;
      maskColorSamplerRef.current = null;
    };
  }, [invalidate, maskColorSamplerRef]);

  // Fitted preview resolution: the screen size, capped at the image and 2560 px.
  const fitRender = useMemo(() => {
    const ratio = dpr * 0.9;
    const { width, height } = fitPhoto(
      Math.min(size.width * ratio, croppedSize.width, 2560),
      Math.min(size.height * ratio, croppedSize.height, 2560),
      aspect,
    );
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  }, [aspect, croppedSize, size, dpr]);

  // Live brush painting updates mask textures outside React; redraw on change.
  const brushVersion = useRef(0);
  useEffect(() => onBrushTexturesChanged(() => { brushVersion.current += 1; invalidate(); }), [invalidate]);

  // Clean up
  useEffect(() => {
    const material = materialRef.current;
    return () => {
      // Aggressive disposal when the entire plane unmounts
      intaglioRenderer.dispose();
      finalTarget.dispose();
      material?.dispose();
    };
  }, [intaglioRenderer, finalTarget]);

  // Texture-swap aggressive cleanup
  useEffect(() => {
    return () => {
      previewTexture.dispose();
    };
  }, [previewTexture]);

  useEffect(() => {
    if (texture === previewTexture) return;
    return () => texture.dispose();
  }, [texture, previewTexture]);

  // The canvas renders on demand; request a frame whenever an input changes.
  useEffect(() => {
    invalidate();
  }, [invalidate, gradeGraph, settings, split, showClipping, maskOverlayPlateId, pickingMaskColor, texture, finalTarget, loupe]);

  // Histogram/palette stats come from the rendered image itself (not the
  // letterboxed canvas), read back once rendering settles.
  const stats = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false, colorSpace: THREE.NoColorSpace });
    const material = new THREE.ShaderMaterial({ vertexShader: statsCopyVertexShader, fragmentShader: statsCopyFragmentShader, uniforms: { uTexture: { value: null } } });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry, material);
    quad.frustumCulled = false;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return { target, material, geometry, quad, camera };
  }, []);

  const statsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (statsTimerRef.current) clearTimeout(statsTimerRef.current);
    stats.target.dispose();
    stats.material.dispose();
    stats.geometry.dispose();
  }, [stats]);

  // While zoomed, the main target holds only part of the photo. Histogram,
  // scopes and the navigator still describe the whole frame.
  const frameStats = useMemo(() => ({
    renderer: new IntaglioRenderer(),
    target: new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false, colorSpace: THREE.NoColorSpace }),
  }), []);
  useEffect(() => () => {
    frameStats.renderer.dispose();
    frameStats.target.dispose();
  }, [frameStats]);

  const scheduleStats = () => {
    if (!onStatsUpdate) return;
    if (statsTimerRef.current) clearTimeout(statsTimerRef.current);
    statsTimerRef.current = setTimeout(() => {
      statsTimerRef.current = null;
      const previous = gl.getRenderTarget();
      let frame = finalTarget;
      if (loupe) {
        frameStats.renderer.render({ renderer: gl, sourceTexture: texture, settings, gradeGraph, target: frameStats.target, width: fitRender.width, height: fitRender.height });
        frame = frameStats.target;
      }
      const width = Math.min(STATS_WIDTH, frame.width);
      const height = Math.max(1, Math.round(width * frame.height / Math.max(frame.width, 1)));
      stats.target.setSize(width, height);
      stats.material.uniforms.uTexture.value = frame.texture;
      gl.setRenderTarget(stats.target);
      gl.render(stats.quad, stats.camera);
      const pixels = new Uint8Array(width * height * 4);
      gl.readRenderTargetPixels(stats.target, 0, 0, width, height, pixels);
      gl.setRenderTarget(previous);
      onStatsUpdate({ ...computeHistogramMetrics(pixels), palette: extractDominantColors(pixels, 5, 10), scopeSample: { pixels, width, height } });
    }, STATS_DELAY_MS);
  };

  // A full-frame loupe render does not change while panning; reuse it.
  const lastRender = useRef<{ key: string; inputs: unknown[] } | null>(null);

  useFrame((state) => {
    // 1. Execute the Render Graph
    // This renders the pipeline into finalTarget
    const oldRenderTarget = state.gl.getRenderTarget();
    const inspectMask = maskOverlayPlateId !== null && settings.adjustmentLayers.some((plate) => plate.id === maskOverlayPlateId);
    const plan = loupe?.plan;
    const renderSize = plan ?? fitRender;
    if (inspectMask && (maskCoverage.width !== renderSize.width || maskCoverage.height !== renderSize.height)) {
      maskCoverage.setSize(renderSize.width, renderSize.height);
    }
    const key = plan ? JSON.stringify([plan.mode, plan.width, plan.height, plan.mode === "tile" ? plan.tile : null]) : "fit";
    const inputs = [settings, gradeGraph, texture, maskOverlayPlateId, pickingMaskColor, brushVersion.current];
    const reuse = plan?.mode === "full" && lastRender.current?.key === key && lastRender.current.inputs.every((input, index) => input === inputs[index]);
    if (!reuse) {
      intaglioRenderer.render({
        renderer: gl,
        sourceTexture: texture,
        settings,
        gradeGraph,
        target: finalTarget,
        width: renderSize.width,
        height: renderSize.height,
        tile: plan?.mode === "tile" ? plan.tile : undefined,
        maskOverlay: inspectMask ? { plateId: maskOverlayPlateId, target: maskCoverage } : undefined,
        liveBrush: true,
      });
      lastRender.current = { key, inputs };
    }
    const held = plan?.window ?? { x0: 0, y0: 0, x1: 1, y1: 1 };
    const sample = pendingMaskSample.current;
    if (sample) {
      pendingMaskSample.current = null;
      const tx = (sample.x - held.x0) / (held.x1 - held.x0);
      const ty = (sample.y - held.y0) / (held.y1 - held.y0);
      if (inspectMask && pickingMaskColor && tx >= 0 && tx <= 1 && ty >= 0 && ty <= 1) {
        const px = Math.max(0, Math.min(maskCoverage.width - 1, Math.floor(tx * maskCoverage.width)));
        const py = Math.max(0, Math.min(maskCoverage.height - 1, Math.floor((1 - ty) * maskCoverage.height)));
        const context = gl.getContext();
        const pixel = new Float32Array(4);
        gl.setRenderTarget(maskCoverage);
        context.readPixels(px, py, 1, 1, context.RGBA, context.FLOAT, pixel);
        sample.resolve([pixel[0], pixel[1], pixel[2]]);
      } else {
        sample.resolve(null);
      }
    }
    state.gl.setRenderTarget(oldRenderTarget);
    scheduleStats();

    // 2. Update final display material uniforms
    if (materialRef.current) {
      materialRef.current.uniforms.uTexture.value = finalTarget.texture;
      materialRef.current.uniforms.uOriginalTexture.value = settings.compareTexture ?? previewTexture;
      materialRef.current.uniforms.uMaskCoverage.value = inspectMask ? maskCoverage.texture : null;
      materialRef.current.uniforms.uShowMask.value = inspectMask && !pickingMaskColor;
      materialRef.current.uniforms.uSplit.value = split;
      materialRef.current.uniforms.uClipping.value = showClipping ? 1.0 : 0.0;
      materialRef.current.uniforms.uCrop.value.set(crop.x, crop.y, crop.width, crop.height);
      materialRef.current.uniforms.uGeometry.value.set(texture.image.width / texture.image.height,
        THREE.MathUtils.degToRad(settings.rotate), settings.zoom, settings.anamorphicDistortion);
      materialRef.current.uniforms.uPerspective.value.set(settings.keystoneH, settings.keystoneV, settings.lensDistortion);
      materialRef.current.uniforms.uMatchCrop.value = !settings.compareTexture && !isFullCrop(crop);
      const shown = loupe?.layout.window ?? { x0: 0, y0: 0, x1: 1, y1: 1 };
      materialRef.current.uniforms.uView.value.set(shown.x0, 1 - shown.y1, shown.x1, 1 - shown.y0);
      materialRef.current.uniforms.uRender.value.set(held.x0, 1 - held.y1, held.x1, 1 - held.y0);
      materialRef.current.uniforms.uTexSize.value.set(renderSize.width, renderSize.height);
      // Device pixels per rendered pixel. At one image pixel per render pixel,
      // magnify with hard edges so pixels read as pixels, not blur.
      const devicePerTexel = loupe ? (loupe.layout.visible.width * dpr) / ((shown.x1 - shown.x0) / (held.x1 - held.x0) * renderSize.width) : 0;
      const truePixels = plan !== undefined && plan.resolution >= 0.999;
      materialRef.current.uniforms.uNearest.value = truePixels && devicePerTexel >= 0.999;
      materialRef.current.uniforms.uGrid.value = truePixels && devicePerTexel >= PIXEL_GRID_SCALE - 0.001 ? devicePerTexel : 0;
    }
  });

  return (
    <mesh scale={meshTransform.scale} position={meshTransform.position}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={finalDisplayVertexShader}
        fragmentShader={finalDisplayFragmentShader}
        uniforms={displayUniforms}
        transparent={true}
      />
    </mesh>
  );
}
