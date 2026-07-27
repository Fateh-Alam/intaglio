"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { EditorSettings } from "../types/editor";
import { RenderGraph } from "../editor/render/RenderGraph";
import { BaseDevelopPass } from "../editor/render/passes/BaseDevelopPass";
import { LocalAdjustmentsPass } from "../editor/render/passes/LocalAdjustmentsPass";
import { OklchMixerPass } from "../editor/render/passes/OklchMixerPass";
import { ColorWheelsPass } from "../editor/render/passes/ColorWheelsPass";
import { BloomPass } from "../editor/render/passes/BloomPass";
import { HalationPass } from "../editor/render/passes/HalationPass";
import { FilmEmulationPass } from "../editor/render/passes/FilmEmulationPass";
import { OpticalFXPass } from "../editor/render/passes/OpticalFXPass";
import { SharpenPass } from "../editor/render/passes/SharpenPass";
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
  brushCanvas,
  brushCanvasDirty,
}: {
  imageUrl: string;
  settings: EditorSettings;
  wiperPosition?: number;
  brushCanvas?: HTMLCanvasElement | null;
  brushCanvasDirty?: number;
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

    // Pass instantiation — order matches spec §6.1 pipeline
    const baseDevelop = new BaseDevelopPass();       // Exposure, WB, Contrast, Highlights/Shadows, Vibrance, Dehaze
    const localAdjustments = new LocalAdjustmentsPass(); // Layer-based local adjustments with masks
    const oklchMixer = new OklchMixerPass();         // 8-channel OKLCH color mixer + skin protection
    const colorWheels = new ColorWheelsPass();       // Three-way color grading in OKLAB space
    const filmEmulation = new FilmEmulationPass();   // Authentic analog film emulation
    const halation = new HalationPass();             // Film halation (red channel diffusion)
    const bloom = new BloomPass();                   // Soft glow from bright areas
    const optical = new OpticalFXPass();             // God light, vignette, grain, aberration, anamorphic
    const sharpen = new SharpenPass();               // Structure + sharpness (applied last before display)
    const displayTransform = new DisplayTransformPass(); // Linear→sRGB + dithering

    // Pipeline order per spec §6.1:
    // BaseDevelop → LocalAdjustments → OklchMixer → ColorWheels → FilmEmulation → Halation → Bloom → OpticalFX → Sharpen → DisplayTransform
    graph.addPass(baseDevelop);
    graph.addPass(localAdjustments);
    graph.addPass(oklchMixer);
    graph.addPass(colorWheels);
    graph.addPass(filmEmulation);
    graph.addPass(halation);
    graph.addPass(bloom);
    graph.addPass(optical);
    graph.addPass(sharpen);
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

      graph.setSize(Math.floor(targetWidth), Math.floor(targetHeight));
      finalTarget.setSize(Math.floor(targetWidth), Math.floor(targetHeight));
    }
  }, [texture, size, gl, graph, finalTarget]);

  // Handle Brush Canvas updates
  const brushTexture = useMemo(() => {
    if (!brushCanvas) return null;
    return new THREE.CanvasTexture(brushCanvas);
  }, [brushCanvas]);

  useEffect(() => {
    if (brushTexture) {
      brushTexture.needsUpdate = true;
      // Also update the local adjustments pass with the texture
      const localAdjustmentsPass = graph.getPasses().find(p => p instanceof LocalAdjustmentsPass) as LocalAdjustmentsPass;
      if (localAdjustmentsPass) {
        // We can expose a method on LocalAdjustmentsPass to set the brush mask
        // But for now, since material is private, we will add a setter in LocalAdjustmentsPass
        localAdjustmentsPass.setBrushMask(brushTexture);
      }
    }
  }, [brushCanvasDirty, brushTexture, graph]);

  // Clean up
  useEffect(() => {
    return () => {
      // Aggressive disposal when the entire plane unmounts
      graph.dispose();
      finalTarget.dispose();
      if (materialRef.current) {
        materialRef.current.dispose();
      }
    };
  }, [graph, finalTarget]);

  // Texture-swap aggressive cleanup
  useEffect(() => {
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [texture]);

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
