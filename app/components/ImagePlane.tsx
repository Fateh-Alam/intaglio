"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { EditorSettings, HistogramData } from "../types/editor";
import { IntaglioRenderer } from "../editor/render/IntaglioRenderer";
import { createLinearSourceTexture, type LinearSourceBuffer } from "../editor/render/sourceTexture";
import { computeHistogramMetrics } from "../utils/histogram";
import { extractDominantColors } from "../utils/swatch";

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

const finalDisplayFragmentShader = `
  uniform sampler2D uTexture;
  uniform sampler2D uOriginalTexture;
  uniform float uMouseX;
  uniform float uCompareEnabled;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(uTexture, vUv);
    
    if (uCompareEnabled > 0.5 && uMouseX < 1.0) {
      float wiper = step(vUv.x, uMouseX);
      vec4 source = texture2D(uOriginalTexture, vUv);
      
      vec4 finalColor = mix(source, color, wiper);
      float line = step(abs(vUv.x - uMouseX), 0.002);
      finalColor = mix(finalColor, vec4(1.0), line);
      gl_FragColor = finalColor;
    } else {
      gl_FragColor = color;
    }
  }
`;

export default function ImagePlane({
  imageUrl,
  settings,
  wiperPosition = 0.5,
  brushCanvas,
  brushCanvasDirty,
  rawSource,
  onStatsUpdate,
}: {
  imageUrl: string;
  settings: EditorSettings;
  wiperPosition?: number;
  brushCanvas?: HTMLCanvasElement | null;
  brushCanvasDirty?: number;
  rawSource?: LinearSourceBuffer | null;
  onStatsUpdate?: (data: HistogramData) => void;
}) {
  // The 8-bit display proxy doubles as the "original" for before/after.
  const previewTexture = useLoader(THREE.TextureLoader, imageUrl);
  const { size, viewport, gl, invalidate } = useThree();
  const texture = useMemo(
    () => rawSource ? createLinearSourceTexture(rawSource, gl.capabilities.maxTextureSize) : previewTexture,
    [rawSource, previewTexture, gl],
  );
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const aspect = useMemo(() => {
    if (!texture.image) return 1;
    return texture.image.width / texture.image.height;
  }, [texture]);

  const scale = useMemo(() => {
    const maxWidth = viewport.width * 0.9;
    const maxHeight = viewport.height * 0.9;
    let w = maxWidth;
    let h = w / aspect;
    if (h > maxHeight) {
      h = maxHeight;
      w = h * aspect;
    }
    return new THREE.Vector3(w, h, 1);
  }, [viewport, aspect]);

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

  // Handle Resize & Proxy Resolution
  useEffect(() => {
    if (texture.image) {
      // Proxy Rendering: Use the CSS pixel size of the canvas instead of world units.
      const pixelRatio = gl.getPixelRatio();
      
      // The image occupies at most 90% of the canvas in either dimension
      const cssWidth = size.width * 0.9;
      const cssHeight = size.height * 0.9;
      
      // Calculate logical pixel size
      const proxyWidth = Math.min(cssWidth * pixelRatio, 2560);
      const proxyHeight = Math.min(cssHeight * pixelRatio, 2560);
      
      // Maintain exact aspect ratio
      const imageAspect = texture.image.width / texture.image.height;
      let targetWidth = proxyWidth;
      let targetHeight = proxyWidth / imageAspect;
      
      if (targetHeight > proxyHeight) {
        targetHeight = proxyHeight;
        targetWidth = targetHeight * imageAspect;
      }
      
      // Ensure we don't upscale a low-res image
      targetWidth = Math.min(targetWidth, texture.image.width);
      targetHeight = Math.min(targetHeight, texture.image.height);

      finalTarget.setSize(Math.floor(targetWidth), Math.floor(targetHeight));
    }
  }, [texture, size, gl, finalTarget]);

  // Handle Brush Canvas updates
  const brushTexture = useMemo(() => {
    void brushCanvasDirty;
    if (!brushCanvas) return null;
    return new THREE.CanvasTexture(brushCanvas);
  }, [brushCanvas, brushCanvasDirty]); // dirty is the version signal for the mutable canvas

  useEffect(() => {
    return () => brushTexture?.dispose();
  }, [brushTexture]);

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
  }, [invalidate, settings, wiperPosition, brushTexture, texture, finalTarget]);

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

  const scheduleStats = () => {
    if (!onStatsUpdate) return;
    if (statsTimerRef.current) clearTimeout(statsTimerRef.current);
    statsTimerRef.current = setTimeout(() => {
      statsTimerRef.current = null;
      const width = Math.min(STATS_WIDTH, finalTarget.width);
      const height = Math.max(1, Math.round(width * finalTarget.height / Math.max(finalTarget.width, 1)));
      stats.target.setSize(width, height);
      stats.material.uniforms.uTexture.value = finalTarget.texture;
      const previous = gl.getRenderTarget();
      gl.setRenderTarget(stats.target);
      gl.render(stats.quad, stats.camera);
      const pixels = new Uint8Array(width * height * 4);
      gl.readRenderTargetPixels(stats.target, 0, 0, width, height, pixels);
      gl.setRenderTarget(previous);
      onStatsUpdate({ ...computeHistogramMetrics(pixels), palette: extractDominantColors(pixels, 5, 10) });
    }, STATS_DELAY_MS);
  };

  useFrame((state) => {
    // 1. Execute the Render Graph
    // This renders the pipeline into finalTarget
    const oldRenderTarget = state.gl.getRenderTarget();
    intaglioRenderer.render({
      renderer: gl,
      sourceTexture: texture,
      settings,
      target: finalTarget,
      width: finalTarget.width,
      height: finalTarget.height,
      brushMaskTexture: brushTexture,
    });
    state.gl.setRenderTarget(oldRenderTarget);
    scheduleStats();

    // 2. Update final display material uniforms
    if (materialRef.current) {
      materialRef.current.uniforms.uTexture.value = finalTarget.texture;
      materialRef.current.uniforms.uOriginalTexture.value = settings.compareTexture ?? previewTexture;
      materialRef.current.uniforms.uCompareEnabled.value = settings.compareEnabled ? 1.0 : 0.0;
      
      if (settings.wiperActive) {
        materialRef.current.uniforms.uMouseX.value = wiperPosition;
      } else {
        materialRef.current.uniforms.uMouseX.value = 1.0;
      }
    }
  });

  return (
    <mesh scale={scale}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={finalDisplayVertexShader}
        fragmentShader={finalDisplayFragmentShader}
        uniforms={{
          uTexture: { value: null },
          uOriginalTexture: { value: settings.compareTexture ?? previewTexture },
          uMouseX: { value: 1.0 },
          uCompareEnabled: { value: settings.compareEnabled ? 1.0 : 0.0 }
        }}
        transparent={true}
      />
    </mesh>
  );
}
