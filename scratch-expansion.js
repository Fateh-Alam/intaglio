const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'app', 'components', 'landing');

// 1. MasterShader.tsx (Upgraded with mind-bending effects)
const shaderCode = `
"use client";

import { useEffect, useRef } from "react";
import { motion, MotionValue, useVelocity, useSpring, useTransform } from "framer-motion";

export function MasterShader({ scrollY }: { scrollY: MotionValue<number> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Calculate scroll velocity for extreme chromatic burst effects
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityUniform = useTransform(smoothVelocity, [-1, 1], [-1, 1]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false }) as WebGLRenderingContext;
    if (!gl) return;

    const vertexSource = \`
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    \`;

    const fragmentSource = \`
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uScroll;
      uniform float uVelocity;

      #define PI 3.14159265359

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p = rot * p * 2.03;
          amplitude *= 0.5;
        }
        return value;
      }

      mat2 rotate2d(float _angle){
          return mat2(cos(_angle),-sin(_angle),
                      sin(_angle),cos(_angle));
      }

      float sdPolygon(in vec2 p, in int v) {
          float a = atan(p.x, p.y) + PI;
          float r = 2.0 * PI / float(v);
          return cos(floor(0.5 + a / r) * r - a) * length(p);
      }

      // --- Mind-Bending Transition Warps ---
      
      // Vortex warp based on distance to a transition point
      vec2 vortexWarp(vec2 uv, vec2 centered, float progress, float transitionPoint) {
          float distToTransition = 1.0 - smoothstep(0.0, 0.1, abs(progress - transitionPoint));
          float angle = distToTransition * 3.0 * sin(uTime + length(centered) * 10.0);
          return centered * rotate2d(angle) * (1.0 + distToTransition * 2.0);
      }

      // Glitch block melt transition
      vec2 glitchWarp(vec2 uv, float progress, float transitionPoint) {
          float distToTransition = 1.0 - smoothstep(0.0, 0.1, abs(progress - transitionPoint));
          float blockY = floor(uv.y * 50.0) / 50.0;
          float shiftX = hash(vec2(blockY, uTime)) * 0.5 * distToTransition;
          return vec2(uv.x + shiftX, uv.y);
      }

      // --- Scenes ---

      // 1. Lens Optics (0.0 -> 0.3)
      vec3 sceneLens(vec2 uv, vec2 centered, float progress) {
          vec2 warped = vortexWarp(uv, centered, progress, 0.3);
          float d = length(warped);
          float ring1 = sin(d * 30.0 - uTime * 0.8 + uVelocity * 10.0);
          float ring2 = sin(d * 50.0 + uTime * 0.4 - uVelocity * 5.0);
          
          vec3 col = vec3(0.0);
          col += vec3(0.9, 0.5, 0.2) * smoothstep(0.9, 1.0, ring1) * 0.6;
          col += vec3(0.2, 0.6, 0.8) * smoothstep(0.9, 1.0, ring2) * 0.5;
          col += vec3(0.1) * smoothstep(0.3, 0.7, fbm(uv * 4.0 + uTime * 0.2));
          return col * (1.0 - d);
      }

      // 2. Aperture / God Rays (0.2 -> 0.6)
      vec3 sceneAperture(vec2 uv, vec2 centered, float progress) {
          vec2 warped = vortexWarp(uv, centered, progress, 0.6);
          float size = mix(1.2, 0.05, smoothstep(0.2, 0.6, progress));
          vec2 rotP = warped * rotate2d(uTime * 0.2 + progress * 5.0 + uVelocity * 2.0);
          
          float d = sdPolygon(rotP, 9);
          vec3 col = vec3(0.0);
          
          float edge = smoothstep(size + 0.015, size, d) - smoothstep(size, size - 0.015, d);
          col += vec3(1.0, 0.8, 0.5) * edge * 3.0; // Glowing edges
          
          float inside = smoothstep(size + 0.02, size - 0.02, d);
          float angle = atan(warped.y, warped.x);
          float rays = fbm(vec2(angle * 6.0, uTime * -3.0)) * fbm(vec2(angle * 12.0, uTime * -1.5));
          
          col += vec3(1.0, 0.9, 0.7) * inside * 2.5; 
          col += vec3(0.9, 0.7, 0.4) * rays * inside * (1.0 - length(warped)*1.5); 
          col += vec3(0.08, 0.06, 0.04) * (1.0 - inside);
          return col;
      }

      // 3. Sensor Grid (0.5 -> 0.8)
      vec3 sceneSensor(vec2 uv, vec2 centered, float progress) {
          vec2 warpedUV = glitchWarp(uv, progress, 0.8);
          vec2 warpedCentered = warpedUV - 0.5;
          warpedCentered.x *= uResolution.x / uResolution.y;

          float zoom = mix(0.5, 60.0, smoothstep(0.5, 0.8, progress));
          vec2 gridUV = warpedCentered * zoom;
          vec2 id = floor(gridUV);
          vec2 f = fract(gridUV);
          
          vec3 cellColor = vec3(0.0);
          if (mod(id.y, 2.0) == 0.0) {
              if (mod(id.x, 2.0) == 0.0) cellColor = vec3(1.0, 0.15, 0.15); // Red
              else cellColor = vec3(0.15, 1.0, 0.15); // Green
          } else {
              if (mod(id.x, 2.0) == 0.0) cellColor = vec3(0.15, 1.0, 0.15); // Green
              else cellColor = vec3(0.15, 0.15, 1.0); // Blue
          }
          
          float border = smoothstep(0.35, 0.45, abs(f.x - 0.5)) + smoothstep(0.35, 0.45, abs(f.y - 0.5));
          float scan = smoothstep(0.9, 1.0, sin(warpedCentered.y * 15.0 - uTime * 6.0 + uVelocity * 10.0));
          
          vec3 col = cellColor * (1.0 - border) * 0.5;
          col += cellColor * scan * 3.0;
          return col;
      }

      // 4. Film Aura (0.7 -> 1.0)
      vec3 sceneAura(vec2 uv, vec2 centered) {
          float radius = length(centered);
          float angle = atan(centered.y, centered.x);

          vec2 drift = vec2(sin(uTime * 0.1) * 0.2, cos(uTime * 0.08) * 0.15);
          float aurora = fbm(vec2(angle * 2.0 + uTime * 0.05, radius * 4.0 - uTime * 0.1) + drift);
          float silk = fbm(uv * vec2(2.5, 10.0) + vec2(uTime * 0.03, -uTime * 0.08));
          
          vec3 brass = vec3(0.95, 0.64, 0.30);
          vec3 wine = vec3(0.45, 0.1, 0.15);
          vec3 cyan = vec3(0.10, 0.5, 0.55);

          vec3 color = vec3(0.08, 0.06, 0.05);
          color += brass * pow(aurora, 2.5) * 0.5;
          color += cyan * pow(silk, 2.8) * 0.3;
          color += wine * smoothstep(0.1, 0.9, radius) * 0.4;
          return color;
      }

      void main() {
        vec2 uv = vUv;
        vec2 centered = uv - 0.5;
        centered.x *= uResolution.x / uResolution.y;

        // Extreme chromatic aberration based on scroll velocity
        float aberrationAmount = abs(uVelocity) * 0.05;
        vec2 uvR = uv + vec2(aberrationAmount, 0.0);
        vec2 uvB = uv - vec2(aberrationAmount, 0.0);

        vec3 finalColor = vec3(0.0);
        
        float lensWeight = smoothstep(0.35, 0.1, uScroll);
        if (lensWeight > 0.0) {
            finalColor.r += sceneLens(uvR, uvR - 0.5, uScroll).r * lensWeight;
            finalColor.g += sceneLens(uv, centered, uScroll).g * lensWeight;
            finalColor.b += sceneLens(uvB, uvB - 0.5, uScroll).b * lensWeight;
        }
        
        float apWeight = smoothstep(0.2, 0.35, uScroll) * smoothstep(0.65, 0.5, uScroll);
        if (apWeight > 0.0) {
            finalColor.r += sceneAperture(uvR, uvR - 0.5, uScroll).r * apWeight;
            finalColor.g += sceneAperture(uv, centered, uScroll).g * apWeight;
            finalColor.b += sceneAperture(uvB, uvB - 0.5, uScroll).b * apWeight;
        }
        
        float senWeight = smoothstep(0.5, 0.65, uScroll) * smoothstep(0.85, 0.75, uScroll);
        if (senWeight > 0.0) {
            finalColor.r += sceneSensor(uvR, uvR - 0.5, uScroll).r * senWeight;
            finalColor.g += sceneSensor(uv, centered, uScroll).g * senWeight;
            finalColor.b += sceneSensor(uvB, uvB - 0.5, uScroll).b * senWeight;
        }
        
        float auraWeight = smoothstep(0.75, 0.85, uScroll);
        if (auraWeight > 0.0) {
            finalColor += sceneAura(uv, centered) * auraWeight;
        }

        // Global vignette and high-frequency noise
        float vignette = smoothstep(1.0, 0.2, length(centered));
        finalColor *= mix(0.2, 1.0, vignette);
        
        float noiseVal = (hash(uv * uResolution.xy + uTime * 100.0) - 0.5);
        finalColor += noiseVal * (0.05 + abs(uVelocity) * 0.1); 

        // Deep space void for empty areas
        finalColor += vec3(0.01, 0.01, 0.01) * (1.0 - max(lensWeight, max(apWeight, max(senWeight, auraWeight))));

        gl_FragColor = vec4(finalColor, 1.0);
      }
    \`;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if(!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader error:", gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "aPosition");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");
    const scrollLocation = gl.getUniformLocation(program, "uScroll");
    const velocityLocation = gl.getUniformLocation(program, "uVelocity");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    let frame = 0;
    const render = (time: number) => {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(timeLocation, time * 0.001);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(scrollLocation, scrollY.get());
      gl.uniform1f(velocityLocation, velocityUniform.get());
      
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      frame = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [scrollY, velocityUniform]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none w-full h-full bg-[#020202]"
    />
  );
}
`;

fs.writeFileSync(path.join(dir, 'MasterShader.tsx'), shaderCode);
console.log('MasterShader updated with massive effects');
