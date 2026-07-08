"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { EditorSettings } from "../types/editor";
import { RenderGraph } from "../editor/render/RenderGraph";
import { BaseDevelopPass } from "../editor/render/passes/BaseDevelopPass";
import { SharpenPass } from "../editor/render/passes/SharpenPass";
import { OpticalFXPass } from "../editor/render/passes/OpticalFXPass";
import { BloomPass } from "../editor/render/passes/BloomPass";
import { HalationPass } from "../editor/render/passes/HalationPass";
import { DisplayTransformPass } from "../editor/render/passes/DisplayTransformPass";

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
    
    if (uMouseX < 1.0) {
      float wiper = step(vUv.x, uMouseX);
      vec4 source = texture2D(uOriginalTexture, vUv);
      
      // If we had a true compare texture, we would use it here.
      // For now, we compare against the raw original texture.
      // In the old shader, it used uCompareTexture or originalPixel.
      
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
  brushMaskData,
  brushMaskExposure,
  brushMaskContrast,
  brushMaskSaturation,
  brushMaskTemperature,
  brushMaskClarity,
}: {
  imageUrl: string;
  settings: EditorSettings;
  wiperPosition?: number;
  brushMaskData?: string;
  brushMaskExposure?: number;
  brushMaskContrast?: number;
  brushMaskSaturation?: number;
  brushMaskTemperature?: number;
  brushMaskClarity?: number;
}) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  const { size, viewport, gl } = useThree();
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
  const { graph, finalTarget } = useMemo(() => {
    const graph = new RenderGraph();
    const baseDevelop = new BaseDevelopPass();
    const sharpen = new SharpenPass();
    const optical = new OpticalFXPass();
    const halation = new HalationPass();
    const bloom = new BloomPass();
    const displayTransform = new DisplayTransformPass();

    graph.addPass(baseDevelop);
    graph.addPass(sharpen);
    graph.addPass(optical);
    graph.addPass(halation);
    graph.addPass(bloom);
    graph.addPass(displayTransform);

    const finalTarget = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      colorSpace: THREE.NoColorSpace // Output from DisplayTransformPass is already sRGB encoded
    });

    return { graph, finalTarget };
  }, []);

  // Handle Resize
  useEffect(() => {
    if (texture.image) {
      // Use original image resolution for rendering
      const width = texture.image.width;
      const height = texture.image.height;
      graph.setSize(width, height);
      finalTarget.setSize(width, height);
    }
  }, [texture, graph, finalTarget]);

  // Clean up
  useEffect(() => {
    return () => {
      graph.dispose();
      finalTarget.dispose();
    };
  }, [graph, finalTarget]);

  useFrame((state) => {
    // 1. Execute the Render Graph
    // This renders the pipeline into finalTarget
    const oldRenderTarget = state.gl.getRenderTarget();
    graph.render(state.gl, settings, texture, finalTarget);
    state.gl.setRenderTarget(oldRenderTarget);

    // 2. Update final display material uniforms
    if (materialRef.current) {
      materialRef.current.uniforms.uTexture.value = finalTarget.texture;
      
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
          uOriginalTexture: { value: texture },
          uMouseX: { value: 1.0 },
          uCompareEnabled: { value: settings.compareEnabled ? 1.0 : 0.0 }
        }}
        transparent={true}
      />
    </mesh>
  );
}
