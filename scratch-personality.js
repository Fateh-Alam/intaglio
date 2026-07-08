const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'app', 'components', 'landing');

// 1. Re-add ShaderVeil.tsx
const shaderVeilCode = `
"use client";

import { useEffect, useRef } from "react";
import { motion, useTransform, MotionValue } from "framer-motion";

export function ShaderVeil({ scrollY }: { scrollY: MotionValue<number> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Fade out the veil as we get deep into the sensor
  const opacity = useTransform(scrollY, [0, 0.6, 0.8], [1, 1, 0.3]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false }) as WebGLRenderingContext;
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

      void main() {
        vec2 uv = vUv;
        vec2 centered = uv - 0.5;
        centered.x *= uResolution.x / uResolution.y;

        float radius = length(centered);
        float angle = atan(centered.y, centered.x);

        vec2 drift = vec2(sin(uTime * 0.07) * 0.18, cos(uTime * 0.05) * 0.14);
        float aurora = fbm(vec2(angle * 1.75 + uTime * 0.035, radius * 3.6 - uTime * 0.08) + drift);
        float silk = fbm(uv * vec2(2.2, 8.0) + vec2(uTime * 0.025, -uTime * 0.06));
        
        vec3 brass = vec3(0.95, 0.64, 0.30);
        vec3 wine = vec3(0.35, 0.08, 0.12);
        vec3 cyan = vec3(0.10, 0.42, 0.46);
        vec3 ink = vec3(0.05, 0.04, 0.03); // Warmer dark background

        vec3 color = ink;
        color += brass * pow(aurora, 2.8) * 0.42;
        color += cyan * pow(silk, 3.0) * 0.26;
        color += wine * smoothstep(0.12, 0.92, radius) * 0.35;

        float vignette = smoothstep(0.92, 0.16, radius);
        color *= mix(0.45, 1.25, vignette);
        
        // Add some noise
        color += (hash(uv * uResolution.xy + uTime) - 0.5) * 0.035;

        gl_FragColor = vec4(color, 0.85);
      }
    \`;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if(!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
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
  }, []);

  return (
    <motion.canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none w-full h-full mix-blend-screen"
      style={{ opacity }}
    />
  );
}
`;

// 2. CameraLens.tsx - Warmer, cinematic flares and reflections
const lensCode = `
"use client";

import { motion, MotionValue, useTransform } from "framer-motion";

export function CameraLens({ scrollY }: { scrollY: MotionValue<number> }) {
  const scale1 = useTransform(scrollY, [0, 0.4], [1, 15]);
  const scale2 = useTransform(scrollY, [0.05, 0.45], [1, 12]);
  const scale3 = useTransform(scrollY, [0.1, 0.5], [1, 9]);
  
  const opacity = useTransform(scrollY, [0, 0.4, 0.5], [1, 1, 0]);

  return (
    <motion.div 
      className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none"
      style={{ opacity }}
    >
      {/* Cinematic Anamorphic Flare */}
      <div className="absolute w-[150vw] h-[2px] bg-gradient-to-r from-transparent via-[#e2ae65]/30 to-transparent rotate-[-15deg] blur-sm mix-blend-screen" />
      <div className="absolute w-[100vw] h-[6px] bg-gradient-to-r from-transparent via-[#3e757a]/20 to-transparent rotate-[-15deg] blur-md mix-blend-screen" />

      {/* Front Element (Warm Reflection) */}
      <motion.div 
        className="absolute rounded-full border border-[#e2ae65]/10 flex items-center justify-center shadow-[inset_0_0_120px_rgba(226,174,101,0.05)]"
        style={{ width: "80vmin", height: "80vmin", scale: scale1 }}
      >
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(226,174,101,0.08)_45deg,transparent_90deg,rgba(62,117,122,0.06)_180deg,transparent_270deg)] animate-[spin_40s_linear_infinite]" />
      </motion.div>

      {/* Middle Element (Deep Glass) */}
      <motion.div 
        className="absolute rounded-full border border-white/5 flex items-center justify-center shadow-[inset_0_0_80px_rgba(15,14,11,0.9)] backdrop-blur-[2px]"
        style={{ width: "50vmin", height: "50vmin", scale: scale2 }}
      >
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(226,174,101,0.08),transparent_60%)]" />
      </motion.div>

      {/* Rear Element (Magenta/Teal Coating) */}
      <motion.div 
        className="absolute rounded-full border border-white/10 flex items-center justify-center shadow-[0_0_60px_rgba(15,14,11,0.95)] backdrop-blur-[4px] bg-[#11100d]/40"
        style={{ width: "30vmin", height: "30vmin", scale: scale3 }}
      >
        {/* Anti-reflective coating glow */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_70%_70%,rgba(155,79,134,0.15),transparent_60%)]" />
      </motion.div>
    </motion.div>
  );
}
`;

// 3. ApertureIris.tsx - Brass/Metallic Blades
const apertureCode = `
"use client";

import { motion, MotionValue, useTransform } from "framer-motion";

export function ApertureIris({ scrollY }: { scrollY: MotionValue<number> }) {
  const rotation = useTransform(scrollY, [0.2, 0.4], [0, 65]);
  const opacity = useTransform(scrollY, [0.2, 0.4, 0.6, 0.65], [0, 1, 1, 0]);
  const scale = useTransform(scrollY, [0.2, 0.6], [1, 3]);

  const blades = Array.from({ length: 9 });

  return (
    <motion.div 
      className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none"
      style={{ opacity, scale }}
    >
      <div className="relative w-[50vmin] h-[50vmin]">
        {blades.map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 origin-center"
            style={{ rotate: i * 40 }}
          >
            {/* Warm metallic blades */}
            <motion.div 
              className="absolute top-1/2 left-1/2 w-[120%] h-[120%] -translate-y-1/2 origin-[0%_50%] bg-gradient-to-br from-[#1a1815] to-[#0f0e0b] shadow-[-10px_0_20px_rgba(0,0,0,0.9)] border-l border-[#e2ae65]/10"
              style={{ rotate: rotation }}
            />
          </motion.div>
        ))}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_40px_rgba(15,14,11,1)] pointer-events-none mix-blend-multiply" />
      </div>
    </motion.div>
  );
}
`;

// 4. CameraHUD.tsx - Reverting to the Warm/Analog styling
const hudCode = `
"use client";

import React from "react";
import { motion, useTransform, MotionValue } from "framer-motion";

function MotionNumber({ value, prefix = "", suffix = "", decimal = 0 }: { value: MotionValue<number>; prefix?: string; suffix?: string; decimal?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    return value.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = prefix + latest.toFixed(decimal) + suffix;
      }
    });
  }, [value, prefix, suffix, decimal]);
  return <span ref={ref}>{prefix + value.get().toFixed(decimal) + suffix}</span>;
}

export function CameraHUD({ scrollY }: { scrollY: MotionValue<number> }) {
  const iso = useTransform(scrollY, [0.3, 0.6], [100, 12800]);
  const shutterSpeed = useTransform(scrollY, [0.1, 0.4], [125, 8000]);
  const fStop = useTransform(scrollY, [0.1, 0.4], [1.4, 16]);
  const expComp = useTransform(scrollY, [0, 0.2, 0.4, 0.6, 0.8], [0, -1.3, 0.7, -0.3, 0]);

  const hudOpacity = useTransform(scrollY, [0, 0.02, 0.8, 0.9], [0, 1, 1, 0]);
  const bracketScale = useTransform(scrollY, [0, 0.2], [1.02, 1]);
  const bracketBlur = useTransform(scrollY, [0, 0.2], ["blur(4px)", "blur(0px)"]);

  // Use the warm Intaglio Brass color
  const color = "#e2ae65";

  return (
    <motion.div 
      className="pointer-events-none fixed inset-0 z-40 p-4 md:p-8 uppercase tracking-[0.2em] font-mono text-[10px] sm:text-[11px]"
      style={{ opacity: hudOpacity, color: color, textShadow: "0 0 10px rgba(226,174,101,0.3)" }}
    >
      <motion.div 
        className="absolute inset-4 md:inset-8 border border-[#e2ae65]/10"
        style={{ scale: bracketScale, filter: bracketBlur }}
      >
        <div className="absolute top-0 left-0 w-8 h-8 border-t-[2px] border-l-[2px] border-[#e2ae65]/70" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-[2px] border-r-[2px] border-[#e2ae65]/70" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[2px] border-l-[2px] border-[#e2ae65]/70" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[2px] border-r-[2px] border-[#e2ae65]/70" />
        
        <div className="absolute top-1/2 left-1/2 w-16 h-12 border border-[#e2ae65]/30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[2px] h-[2px] bg-[#e2ae65]/80 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_5px_#e2ae65]" />
      </motion.div>

      <div className="absolute top-8 left-12 right-12 flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <span className="font-bold flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
             RAW
          </span>
        </div>
        <div className="flex flex-col items-end gap-2 text-[#e2ae65]/80">
          <span>100% // NO CLOUD</span>
        </div>
      </div>

      <div className="absolute bottom-8 left-12 right-12 flex justify-between items-end">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-6 font-bold">
            <MotionNumber value={iso} prefix="ISO " />
            <MotionNumber value={shutterSpeed} prefix="1/" />
            <MotionNumber value={fStop} prefix="F" decimal={1} />
          </div>
          
          <div className="h-1.5 w-64 bg-[#e2ae65]/10 relative mt-2 rounded-sm">
             <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#e2ae65]/50 z-10" />
             <div className="absolute top-0 bottom-0 right-1/4 w-px bg-[#e2ae65]/20" />
             <div className="absolute top-0 bottom-0 left-1/4 w-px bg-[#e2ae65]/20" />
             <motion.div 
               className="absolute top-0 bottom-0 w-[2px] bg-[#e2ae65] shadow-[0_0_5px_#e2ae65]"
               style={{ left: "50%", x: useTransform(expComp, [-3, 3], ["-128px", "128px"]) }}
             />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-[#e2ae65]/70">
          <span>MF // PEAKING ON</span>
          <span>FILM SIM: UNKNOWN</span>
        </div>
      </div>
    </motion.div>
  );
}
`;

// 5. SensorCore.tsx - More vibrant pixels
const sensorCode = `
"use client";

import { motion, MotionValue, useTransform } from "framer-motion";

export function SensorCore({ scrollY }: { scrollY: MotionValue<number> }) {
  const opacity = useTransform(scrollY, [0.49, 0.51, 0.7, 0.8], [0, 1, 1, 0]);
  const scale = useTransform(scrollY, [0.5, 0.8], [0.8, 2]);
  const scanlineY = useTransform(scrollY, [0.5, 0.7], ["-20%", "120%"]);

  return (
    <motion.div 
      className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none"
      style={{ opacity }}
    >
      <motion.div className="relative w-[100vw] h-[100vh] flex items-center justify-center" style={{ scale }}>
        <div className="absolute w-[80vw] h-[60vw] max-w-[800px] max-h-[600px] bg-[#0c0b09] border-[4px] border-[#1a1815] rounded-lg shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden flex items-center justify-center">
          <div className="relative w-[90%] h-[85%] bg-black border border-white/5 shadow-[inset_0_0_30px_rgba(0,0,0,1)] overflow-hidden">
            
            <div 
              className="absolute inset-0 mix-blend-screen opacity-90"
              style={{
                backgroundImage: \`
                  linear-gradient(45deg, rgba(239,68,68,0.7) 25%, transparent 25%, transparent 75%, rgba(59,130,246,0.7) 75%),
                  linear-gradient(45deg, rgba(34,197,94,0.7) 25%, transparent 25%, transparent 75%, rgba(34,197,94,0.7) 75%),
                  repeating-linear-gradient(to right, transparent, transparent 1px, rgba(0,0,0,0.95) 1px, rgba(0,0,0,0.95) 4px),
                  repeating-linear-gradient(to bottom, transparent, transparent 1px, rgba(0,0,0,0.95) 1px, rgba(0,0,0,0.95) 4px)
                \`,
                backgroundSize: '8px 8px, 8px 8px, 4px 4px, 4px 4px',
                backgroundPosition: '0 0, 4px 4px, 0 0, 0 0'
              }}
            />

            <motion.div 
              className="absolute left-0 right-0 h-[30%] bg-gradient-to-b from-transparent via-[#e2ae65]/40 to-transparent blur-md"
              style={{ top: scanlineY }}
            />
          </div>
          <div className="absolute top-2 bottom-2 left-2 w-2 flex flex-col justify-between">
             {Array.from({length: 20}).map((_, i) => <div key={i} className="w-full h-[2px] bg-[#e2ae65]/40" />)}
          </div>
          <div className="absolute top-2 bottom-2 right-2 w-2 flex flex-col justify-between">
             {Array.from({length: 20}).map((_, i) => <div key={i} className="w-full h-[2px] bg-[#e2ae65]/40" />)}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
`;

// 6. CameraJourney.tsx - Incorporating the ShaderVeil and Film Grain
const journeyCode = `
"use client";

import { useScroll } from "framer-motion";
import { useRef } from "react";
import { ShaderVeil } from "./ShaderVeil";
import { CameraLens } from "./CameraLens";
import { ApertureIris } from "./ApertureIris";
import { ShutterMechanism } from "./ShutterMechanism";
import { SensorCore } from "./SensorCore";
import { CameraHUD } from "./CameraHUD";
import { JourneyContent } from "./JourneyContent";

export function CameraJourney() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });

  return (
    <div ref={containerRef} className="relative w-full bg-[#0a0a0a]" style={{ height: "1000vh" }}>
      {/* Background WebGL Aurora for cinematic personality */}
      <ShaderVeil scrollY={scrollYProgress} />
      
      {/* Film Grain overlay across the entire experience */}
      <div className="intaglio-grain pointer-events-none fixed inset-0 z-50 opacity-[0.06]" />

      <CameraLens scrollY={scrollYProgress} />
      <ApertureIris scrollY={scrollYProgress} />
      <ShutterMechanism scrollY={scrollYProgress} />
      <SensorCore scrollY={scrollYProgress} />
      <CameraHUD scrollY={scrollYProgress} />
      <JourneyContent scrollY={scrollYProgress} />
      
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 mix-blend-screen pointer-events-none flex flex-col items-center gap-2 opacity-50">
        <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-[#e2ae65] to-[#e2ae65]" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-[#e2ae65]">Scroll</span>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(dir, 'ShaderVeil.tsx'), shaderVeilCode);
fs.writeFileSync(path.join(dir, 'CameraLens.tsx'), lensCode);
fs.writeFileSync(path.join(dir, 'ApertureIris.tsx'), apertureCode);
fs.writeFileSync(path.join(dir, 'CameraHUD.tsx'), hudCode);
fs.writeFileSync(path.join(dir, 'SensorCore.tsx'), sensorCode);
fs.writeFileSync(path.join(dir, 'CameraJourney.tsx'), journeyCode);

console.log('Injected personality, warmth, and cinematic flair.');
