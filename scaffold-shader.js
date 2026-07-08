const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'app', 'components', 'landing');

// Remove old files
const toDelete = ['EditorialParallax.tsx', 'ShaderVeil.tsx'];
toDelete.forEach(file => {
  const p = path.join(dir, file);
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

// 1. MasterShader.tsx
const shaderCode = `
"use client";

import { useEffect, useRef } from "react";
import { motion, MotionValue, useTransform } from "framer-motion";

export function MasterShader({ scrollY }: { scrollY: MotionValue<number> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    // The Master GLSL Fragment Shader
    const fragmentSource = \`
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uScroll;

      #define PI 3.14159265359

      // --- Utilities ---
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

      // --- SDFs ---
      float sdPolygon(in vec2 p, in int v) {
          float a = atan(p.x, p.y) + PI;
          float r = 2.0 * PI / float(v);
          return cos(floor(0.5 + a / r) * r - a) * length(p);
      }

      // --- Scenes ---

      // Scene 1: Lens Optics (0.0 -> 0.3)
      vec3 sceneLens(vec2 uv, vec2 centered) {
          float d = length(centered);
          // Concentric chromatic rings
          float ring1 = sin(d * 20.0 - uTime * 0.5);
          float ring2 = sin(d * 40.0 + uTime * 0.3);
          
          vec3 col = vec3(0.0);
          col += vec3(0.8, 0.4, 0.2) * smoothstep(0.9, 1.0, ring1) * 0.5; // Brass flare
          col += vec3(0.1, 0.5, 0.6) * smoothstep(0.9, 1.0, ring2) * 0.4; // Teal flare
          
          // Outer glass distortion
          float distort = fbm(uv * 3.0 + uTime * 0.1);
          col += vec3(0.1) * smoothstep(0.3, 0.7, distort);
          
          return col * (1.0 - d);
      }

      // Scene 2: Aperture / God Rays (0.2 -> 0.6)
      vec3 sceneAperture(vec2 uv, vec2 centered, float progress) {
          // Progress 0 to 1 controls aperture closing
          float size = mix(1.0, 0.1, smoothstep(0.0, 1.0, progress));
          vec2 rotP = centered * rotate2d(uTime * 0.1 + progress * 2.0);
          
          // 9-blade iris
          float d = sdPolygon(rotP, 9);
          
          vec3 col = vec3(0.0);
          
          // Blade edges (metallic)
          float edge = smoothstep(size + 0.01, size, d) - smoothstep(size, size - 0.01, d);
          col += vec3(0.9, 0.7, 0.4) * edge * 2.0; // Brass edges
          
          // Inside hole (bright light)
          float inside = smoothstep(size + 0.02, size - 0.02, d);
          
          // Volumetric rays coming from center
          float angle = atan(centered.y, centered.x);
          float rays = fbm(vec2(angle * 5.0, uTime * -2.0)) * fbm(vec2(angle * 10.0, uTime * -1.0));
          
          col += vec3(1.0, 0.8, 0.5) * inside * 2.0; // Core light
          col += vec3(0.8, 0.6, 0.3) * rays * inside * (1.0 - length(centered)*2.0); // God rays
          
          // Dark metallic background
          col += vec3(0.05, 0.04, 0.03) * (1.0 - inside);
          
          return col;
      }

      // Scene 3: Sensor Grid (0.5 -> 0.8)
      vec3 sceneSensor(vec2 uv, vec2 centered, float progress) {
          // Progress controls zoom into the grid
          float zoom = mix(2.0, 50.0, progress);
          vec2 gridUV = centered * zoom;
          
          vec2 id = floor(gridUV);
          vec2 f = fract(gridUV);
          
          // Bayer pattern colors
          vec3 cellColor = vec3(0.0);
          float checker = mod(id.x + id.y, 2.0);
          if (mod(id.y, 2.0) == 0.0) {
              if (mod(id.x, 2.0) == 0.0) cellColor = vec3(1.0, 0.1, 0.1); // Red
              else cellColor = vec3(0.1, 1.0, 0.1); // Green
          } else {
              if (mod(id.x, 2.0) == 0.0) cellColor = vec3(0.1, 1.0, 0.1); // Green
              else cellColor = vec3(0.1, 0.1, 1.0); // Blue
          }
          
          // Pixel borders
          float border = smoothstep(0.4, 0.45, abs(f.x - 0.5)) + smoothstep(0.4, 0.45, abs(f.y - 0.5));
          
          // Scanning light wave
          float scan = smoothstep(0.9, 1.0, sin(centered.y * 10.0 - uTime * 4.0));
          
          vec3 col = cellColor * (1.0 - border) * 0.4;
          col += cellColor * scan * 2.0; // Bright readout
          
          return col;
      }

      // Scene 4: Film Aura (0.7 -> 1.0)
      vec3 sceneAura(vec2 uv, vec2 centered) {
          float radius = length(centered);
          float angle = atan(centered.y, centered.x);

          vec2 drift = vec2(sin(uTime * 0.07) * 0.18, cos(uTime * 0.05) * 0.14);
          float aurora = fbm(vec2(angle * 1.75 + uTime * 0.035, radius * 3.6 - uTime * 0.08) + drift);
          float silk = fbm(uv * vec2(2.2, 8.0) + vec2(uTime * 0.025, -uTime * 0.06));
          
          vec3 brass = vec3(0.95, 0.64, 0.30);
          vec3 wine = vec3(0.35, 0.08, 0.12);
          vec3 cyan = vec3(0.10, 0.42, 0.46);

          vec3 color = vec3(0.05, 0.04, 0.03);
          color += brass * pow(aurora, 2.8) * 0.42;
          color += cyan * pow(silk, 3.0) * 0.26;
          color += wine * smoothstep(0.12, 0.92, radius) * 0.35;
          
          return color;
      }

      void main() {
        vec2 uv = vUv;
        vec2 centered = uv - 0.5;
        centered.x *= uResolution.x / uResolution.y;

        vec3 finalColor = vec3(0.0);

        // Blending between scenes based on scroll (uScroll goes 0.0 to 1.0)
        
        // 1. Lens Optics (0.0 to 0.3)
        float lensWeight = smoothstep(0.3, 0.1, uScroll);
        if (lensWeight > 0.0) finalColor += sceneLens(uv, centered) * lensWeight;
        
        // 2. Aperture (0.2 to 0.6)
        float apProgress = smoothstep(0.2, 0.6, uScroll);
        float apWeight = smoothstep(0.2, 0.3, uScroll) * smoothstep(0.6, 0.5, uScroll);
        if (apWeight > 0.0) finalColor += sceneAperture(uv, centered, apProgress) * apWeight;
        
        // 3. Sensor (0.5 to 0.8)
        float senProgress = smoothstep(0.5, 0.8, uScroll);
        float senWeight = smoothstep(0.5, 0.6, uScroll) * smoothstep(0.8, 0.7, uScroll);
        if (senWeight > 0.0) finalColor += sceneSensor(uv, centered, senProgress) * senWeight;
        
        // 4. Aura (0.7 to 1.0)
        float auraWeight = smoothstep(0.7, 0.8, uScroll);
        if (auraWeight > 0.0) finalColor += sceneAura(uv, centered) * auraWeight;

        // Global vignette and grain
        float vignette = smoothstep(1.0, 0.2, length(centered));
        finalColor *= mix(0.3, 1.0, vignette);
        finalColor += (hash(uv * uResolution.xy + uTime) - 0.5) * 0.04; // Noise

        // Base dark background
        finalColor += vec3(0.02, 0.02, 0.02) * (1.0 - max(lensWeight, max(apWeight, max(senWeight, auraWeight))));

        gl_FragColor = vec4(finalColor, 1.0);
      }
    \`;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if(!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
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
      gl.uniform1f(scrollLocation, scrollY.get()); // Pass real-time scroll!
      
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
  }, [scrollY]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none w-full h-full bg-[#050505]"
    />
  );
}
`;

// 2. CameraJourney.tsx
const journeyCode = `
"use client";

import { useScroll, motion, useTransform, MotionValue } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Camera, BookOpen } from "lucide-react";
import { MasterShader } from "./MasterShader";
import { CameraHUD } from "./CameraHUD";

function TextSection({ 
  scrollY, 
  start, 
  end, 
  eyebrow,
  title,
  body,
  align = "left"
}: { 
  scrollY: MotionValue<number>; 
  start: number; 
  end: number;
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  align?: "left" | "center" | "right";
}) {
  const opacity = useTransform(scrollY, [start + 0.05, start + 0.1, end - 0.1, end - 0.05], [0, 1, 1, 0]);
  const y = useTransform(scrollY, [start + 0.05, start + 0.1, end - 0.1, end - 0.05], [40, 0, 0, -40]);

  const alignClass = align === "center" ? "items-center text-center mx-auto" : align === "left" ? "items-start text-left ml-auto mr-auto lg:ml-24 lg:mr-auto" : "items-end text-right ml-auto mr-auto lg:mr-24 lg:ml-auto";

  return (
    <div className="h-[200vh] w-full flex items-center">
       <motion.div 
          className={\`w-full max-w-4xl px-8 flex flex-col \${alignClass} relative z-30\`}
          style={{ opacity, y }}
       >
         <p className="intaglio-label mb-6 text-[#e2ae65] tracking-[0.4em] uppercase text-sm drop-shadow-md">{eyebrow}</p>
         <h2 className="font-intaglio-serif text-6xl md:text-8xl font-light leading-[1.1] text-white mb-8 drop-shadow-2xl">
           {title}
         </h2>
         <p className="text-xl md:text-2xl text-white/80 max-w-2xl font-light leading-relaxed drop-shadow-lg">
           {body}
         </p>
       </motion.div>
    </div>
  );
}

export function CameraJourney() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 1000vh provides immense runway for the math in the shader to evolve.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "1000vh" }}>
      
      {/* 1. The Pure Math WebGL Shader */}
      <MasterShader scrollY={scrollYProgress} />
      
      <div className="intaglio-grain pointer-events-none fixed inset-0 z-50 opacity-[0.06]" />
      <CameraHUD scrollY={scrollYProgress} />

      {/* 2. The DOM Content Layer */}
      <div className="relative z-20 w-full pt-[50vh]">
        
        {/* Intro */}
        <motion.div 
          className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative -top-[20vh]"
          style={{ opacity: useTransform(scrollYProgress, [0, 0.05], [1, 0]) }}
        >
          <h1 className="font-intaglio-serif text-7xl md:text-[12rem] font-light leading-[0.85] text-white drop-shadow-2xl">
            Intaglio
          </h1>
          <p className="mt-8 text-xl text-[#e2ae65] uppercase tracking-[0.5em] font-light">
            Pure Math. Pure Optics.
          </p>
        </motion.div>

        {/* Syncs with Lens Optics (0.0 -> 0.3) */}
        <TextSection 
          scrollY={scrollYProgress} start={0} end={0.25} align="left"
          eyebrow="01 / The Optics"
          title={<>Calculated<br/><span className="italic text-white/70">glass.</span></>}
          body="No heavy models. No slideshows. Just raw mathematics simulating light bending through anti-reflective coatings at 60 frames per second."
        />

        {/* Syncs with Aperture Iris (0.2 -> 0.6) */}
        <TextSection 
          scrollY={scrollYProgress} start={0.25} end={0.5} align="right"
          eyebrow="02 / The Mechanism"
          title={<>Perfect<br/><span className="italic text-white/70">restraint.</span></>}
          body="A signed distance field calculating the exact edges of a 9-blade iris. Volumetric light calculated per-pixel. Total control over the hardware."
        />

        {/* Syncs with Sensor Grid (0.5 -> 0.8) */}
        <TextSection 
          scrollY={scrollYProgress} start={0.5} end={0.75} align="left"
          eyebrow="03 / The Sensor"
          title={<>Uncompressed<br/><span className="italic text-white/70">data.</span></>}
          body="An infinite grid of red, green, and blue sub-pixels. As you scroll, watch the readout wave scan across the array, capturing light in real-time."
        />

        {/* Syncs with Aura (0.7 -> 1.0) */}
        <TextSection 
          scrollY={scrollYProgress} start={0.75} end={0.95} align="center"
          eyebrow="04 / The Result"
          title={<>Analog<br/><span className="italic text-white/70">soul.</span></>}
          body="Math turns back into feeling. Dithered gradients. Grain. Film-like density. The digital substrate dissolves into pure cinematic expression."
        />

        {/* Outro */}
        <motion.div 
          className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent"
          style={{ 
            opacity: useTransform(scrollYProgress, [0.85, 0.95], [0, 1]),
            y: useTransform(scrollYProgress, [0.85, 0.95], [100, 0])
          }}
        >
          <div className="max-w-3xl">
            <h2 className="font-intaglio-serif text-6xl md:text-9xl font-light leading-tight text-white mb-12">
              Enter the<br/><span className="italic">darkroom.</span>
            </h2>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link href="/editor" className="intaglio-button intaglio-button-primary px-10 py-5 text-sm tracking-widest uppercase">
                Open Darkroom
                <Camera size={16} />
              </Link>
              <Link href="/presets" className="intaglio-button px-10 py-5 text-sm tracking-widest uppercase">
                View Recipes
                <BookOpen size={16} />
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(dir, 'MasterShader.tsx'), shaderCode);
fs.writeFileSync(path.join(dir, 'CameraJourney.tsx'), journeyCode);

console.log('Shader architecture built.');

// 3. Update app/page.tsx
const pageCode = `
import { CameraJourney } from "./components/landing/CameraJourney";

export default function Home() {
  return (
    <main className="bg-[#0a0a0a] min-h-screen selection:bg-[#e2ae65]/30">
      <CameraJourney />
    </main>
  );
}
`;

fs.writeFileSync('app/page.tsx', pageCode);
console.log('page.tsx updated.');
