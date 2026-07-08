const fs = require('fs');

const userCode = `
"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Aperture,
  Archive,
  ArrowUpRight,
  BookOpen,
  Camera,
  CheckCircle2,
  CircleDot,
  CloudOff,
  Cpu,
  Crosshair,
  Download,
  Eye,
  FileDown,
  Film,
  Gauge,
  Images,
  Layers,
  MousePointer2,
  Palette,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wand2,
  Workflow,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { BRAND, FORMAT, ROUTE_LABELS } from "./lib/brand";

const principles = [
  {
    eyebrow: "01 / Restraint",
    title: "The photograph leads.",
    body: "The interface stays quiet until the image asks for a decision. Large previews, low visual noise, precise controls, and no dashboard clutter.",
  },
  {
    eyebrow: "02 / Fidelity",
    title: "Beauty without breaking the file.",
    body: "Every cinematic effect is treated as a render decision, not a random overlay. Tone, color, grain, masks, and exports remain intentional.",
  },
  {
    eyebrow: "03 / Ownership",
    title: "Local by nature.",
    body: "Photographs, recipes, archives, LUTs, masks, metadata, and exports stay in the browser. No forced cloud, no hidden pipeline.",
  },
];

const formats = [
  {
    ext: \`.\${FORMAT.recipeExtension}\`,
    name: FORMAT.recipeName,
    note: "Reusable development settings for a photograph, shoot, campaign, or visual identity.",
  },
  {
    ext: \`.\${FORMAT.archiveExtension}\`,
    name: FORMAT.archiveName,
    note: "A portable session containing source state, edit stack, masks, metadata, proofing, and delivery settings.",
  },
  {
    ext: ".nyv / .nyvlt",
    name: "Legacy Import",
    note: "Older Nyvarra recipes and sessions remain readable, preserved, and convertible.",
  },
];

const pipeline = [
  {
    icon: <Images size={18} strokeWidth={1.5} />,
    label: "Input",
    title: "Source-aware ingestion",
    body: "Orientation, resolution, EXIF, preview generation, profile awareness, and non-destructive session state before the first slider moves.",
  },
  {
    icon: <Cpu size={18} strokeWidth={1.5} />,
    label: "Engine",
    title: "Multi-pass WebGL renderer",
    body: "Base color, masks, bloom, halation, grain, optical effects, and final display are separated into professional render passes.",
  },
  {
    icon: <Palette size={18} strokeWidth={1.5} />,
    label: "Color",
    title: "Perceptual color control",
    body: "Tone and chroma adjustments are designed around believable luminance, protected skin, controlled saturation, and cinematic color separation.",
  },
  {
    icon: <Layers size={18} strokeWidth={1.5} />,
    label: "Masks",
    title: "Editable local decisions",
    body: "Brush, radial, linear, luminosity, and future subject masks behave like named creative layers instead of one-off hidden sliders.",
  },
  {
    icon: <Film size={18} strokeWidth={1.5} />,
    label: "Look",
    title: "Recipe-grade finishing",
    body: "Recipes combine grading, texture, optics, motion, film behavior, and output intent into shareable visual systems.",
  },
  {
    icon: <FileDown size={18} strokeWidth={1.5} />,
    label: "Export",
    title: "Delivery profiles",
    body: "Instagram, portfolio, print proof, archive, and client delivery exports are treated as separate, repeatable finishing paths.",
  },
];

const professionalFeatures = [
  {
    icon: <Gauge size={18} strokeWidth={1.5} />,
    title: "High precision previews",
    body: "Designed for half-float render targets, controlled clipping, dithering, and smooth gradients.",
  },
  {
    icon: <Crosshair size={18} strokeWidth={1.5} />,
    title: "Mask-first workflow",
    body: "Local adjustments become named, editable image decisions instead of destructive brush marks.",
  },
  {
    icon: <ShieldCheck size={18} strokeWidth={1.5} />,
    title: "Skin-aware grading",
    body: "Creative looks can push atmosphere aggressively while keeping faces believable and clean.",
  },
  {
    icon: <CloudOff size={18} strokeWidth={1.5} />,
    title: "Browser-local sessions",
    body: "Images, recipes, archives, LUTs, and proofs can stay on the user’s machine.",
  },
  {
    icon: <Workflow size={18} strokeWidth={1.5} />,
    title: "Non-destructive stack",
    body: "Edits are structured as reversible development decisions, not a pile of baked canvas effects.",
  },
  {
    icon: <Download size={18} strokeWidth={1.5} />,
    title: "Export consciousness",
    body: "Preview quality, Instagram delivery, archive files, and client proofs each get their own export logic.",
  },
];

const recipes = [
  {
    name: "Bubblegum Noir",
    tag: "flash portrait / magenta shadow",
    tone: "violet",
  },
  {
    name: "Rain Taxi Halation",
    tag: "wet glass / night city",
    tone: "blue",
  },
  {
    name: "Emerald Wedding Tape",
    tag: "warm skin / green shadow",
    tone: "green",
  },
  {
    name: "Chrome Saffron",
    tag: "metal / gold / luxury",
    tone: "gold",
  },
  {
    name: "Thermal Seraphim",
    tag: "poster / false color / divine chaos",
    tone: "red",
  },
  {
    name: "Black Ice Portrait",
    tag: "cold editorial / protected skin",
    tone: "ice",
  },
];

const proofingModes = [
  "Instagram portrait",
  "Instagram square",
  "Story safe area",
  "Portfolio web",
  "Client proof",
  "Archive master",
  "Recipe export",
  "Before/after plate",
];

const craftNotes = [
  "Tone should roll, not snap.",
  "Skin should survive the look.",
  "Grain should sit inside the image, not on top of it.",
  "Halation should bloom from light, not decorate it.",
  "Masks should remain editable.",
  "Export should match the promise of the preview.",
];

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.setAttribute("data-visible", "true");
          observer.unobserve(node);
        }
      },
      { threshold: 0.18 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={\`nyv-reveal \${className}\`}
      style={{ "--reveal-delay": \`\${delay}ms\` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function ShaderVeil() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      (canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
      }) as WebGLRenderingContext | null) ||
      (canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
      }) as WebGLRenderingContext | null);

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
      uniform vec2 uMouse;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);

        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));

        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
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

      vec3 filmic(vec3 x) {
        x = max(vec3(0.0), x - 0.004);
        return (x * (6.2 * x + 0.5)) / (x * (6.2 * x + 1.7) + 0.06);
      }

      void main() {
        vec2 uv = vUv;
        vec2 centered = uv - 0.5;
        float aspect = uResolution.x / uResolution.y;
        centered.x *= aspect;

        float radius = length(centered);
        float angle = atan(centered.y, centered.x);

        vec2 drift = vec2(
          sin(uTime * 0.07) * 0.18,
          cos(uTime * 0.05) * 0.14
        );

        float aurora = fbm(vec2(
          angle * 1.75 + uTime * 0.035,
          radius * 3.6 - uTime * 0.08
        ) + drift);

        float silk = fbm(uv * vec2(2.2, 8.0) + vec2(uTime * 0.025, -uTime * 0.06));
        float grain = hash(uv * uResolution.xy + uTime);

        float mouseGlow = 1.0 - smoothstep(
          0.0,
          0.54,
          distance(uv, vec2(uMouse.x, 1.0 - uMouse.y))
        );

        vec3 brass = vec3(0.95, 0.64, 0.30);
        vec3 paper = vec3(0.88, 0.82, 0.70);
        vec3 wine = vec3(0.35, 0.08, 0.12);
        vec3 cyan = vec3(0.10, 0.42, 0.46);
        vec3 ink = vec3(0.015, 0.014, 0.012);

        vec3 color = ink;
        color += brass * pow(aurora, 2.8) * 0.42;
        color += cyan * pow(silk, 3.0) * 0.26;
        color += wine * smoothstep(0.12, 0.92, radius) * 0.35;
        color += paper * pow(mouseGlow, 3.0) * 0.18;

        float vignette = smoothstep(0.92, 0.16, radius);
        color *= mix(0.55, 1.25, vignette);
        color += (grain - 0.5) * 0.035;

        color = filmic(color);

        float alpha = 0.72;
        gl_FragColor = vec4(color, alpha);
      }
    \`;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(program));
      return;
    }

    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "aPosition");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");
    const mouseLocation = gl.getUniformLocation(program, "uMouse");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(window.innerWidth * dpr);
      const height = Math.floor(window.innerHeight * dpr);

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = \`\${window.innerWidth}px\`;
      canvas.style.height = \`\${window.innerHeight}px\`;
      gl.viewport(0, 0, width, height);
    };

    const handlePointerMove = (event: PointerEvent) => {
      mouseRef.current = {
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      };
    };

    let frame = 0;

    const render = (time: number) => {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(timeLocation, time * 0.001);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      frame = window.requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove);
    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} className="nyv-shader-veil" aria-hidden />;
}

function CursorGlow() {
  const [cursor, setCursor] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      setCursor({
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  return (
    <div
      className="nyv-cursor-glow"
      style={
        {
          "--cursor-x": \`\${cursor.x}%\`,
          "--cursor-y": \`\${cursor.y}%\`,
        } as CSSProperties
      }
      aria-hidden
    />
  );
}

function BeforeAfterPlate() {
  const [split, setSplit] = useState(58);

  return (
    <div className="nyv-before-after">
      <Image
        src="/demo.jpg"
        alt="Original photograph preview"
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover grayscale contrast-75 brightness-75"
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: \`inset(0 \${100 - split}% 0 0)\` }}
      >
        <Image
          src="/demo.jpg"
          alt="Intaglio graded photograph preview"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover saturate-150 contrast-125 brightness-110"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_18%,rgba(255,210,120,0.34),transparent_34%),linear-gradient(120deg,rgba(28,88,96,0.2),transparent_45%,rgba(255,112,74,0.24))] mix-blend-screen" />
      </div>

      <div
        className="nyv-before-line"
        style={{ left: \`\${split}%\` }}
        aria-hidden
      >
        <div className="nyv-before-handle">
          <MousePointer2 size={15} strokeWidth={1.5} />
        </div>
      </div>

      <input
        aria-label="Compare original and Intaglio grade"
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(event) => setSplit(Number(event.target.value))}
      />

      <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/72 backdrop-blur">
        Original
      </div>
      <div className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/72 backdrop-blur">
        Intaglio
      </div>
    </div>
  );
}

function MagneticLink({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: ReactNode;
  variant?: "default" | "primary";
}) {
  return (
    <Link
      href={href}
      className={\`nyv-magnetic-button \${
        variant === "primary" ? "nyv-magnetic-button-primary" : ""
      }\`}
    >
      <span>{children}</span>
    </Link>
  );
}

export default function OrmondHome() {
  return (
    <main className="nyv-page min-h-screen overflow-x-hidden">
      <ShaderVeil />
      <CursorGlow />

      <div className="ormond-grain" />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--ormond-line)] bg-[#11100d]/72 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <span className="relative grid size-8 place-items-center overflow-hidden rounded-full border border-[var(--ormond-line)] bg-[#211d16]">
              <Image src="/logo.svg" alt="Ormond" width={23} height={23} />
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(226,174,101,0.34),transparent_42%)] opacity-0 transition group-hover:opacity-100" />
            </span>
            <span className="font-ormond-serif text-xl tracking-wide text-[var(--ormond-paper)]">
              {BRAND.name}
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <Link href="/editor" className="nyv-nav-link">
              {ROUTE_LABELS.editor}
            </Link>
            <Link href="/presets" className="nyv-nav-link">
              {ROUTE_LABELS.presets}
            </Link>
            <Link href="/changelog" className="nyv-nav-link">
              {ROUTE_LABELS.changelog}
            </Link>
          </nav>

          <Link href="/editor" className="ormond-button ormond-button-primary">
            Enter
            <ArrowUpRight size={14} strokeWidth={1.5} />
          </Link>
        </div>
      </header>

      <section className="relative min-h-screen overflow-hidden border-b border-[var(--ormond-line)]">
        <Image
          src="/demo.jpg"
          alt="A quiet street photograph used as the Ormond darkroom sample"
          fill
          priority
          sizes="100vw"
          className="scale-[1.03] object-cover opacity-70"
        />

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,11,9,0.96)_0%,rgba(12,11,9,0.78)_36%,rgba(12,11,9,0.24)_78%),linear-gradient(180deg,rgba(12,11,9,0.16)_0%,rgba(12,11,9,0.88)_100%)]" />
        <div className="nyv-scanlines" aria-hidden />
        <div className="nyv-orbital-ring nyv-orbital-ring-one" aria-hidden />
        <div className="nyv-orbital-ring nyv-orbital-ring-two" aria-hidden />

        <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-end gap-12 px-5 pb-10 pt-28 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:pb-14">
          <div className="max-w-4xl">
            <Reveal>
              <p className="ormond-label mb-7 text-[var(--ormond-brass)]">
                {BRAND.descriptor}
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="font-ormond-serif text-[18vw] font-light leading-[0.78] tracking-[-0.08em] text-[var(--ormond-paper)] md:text-[10.5rem]">
                Develop
                <span className="block pl-[0.08em] italic text-[rgba(231,223,208,0.62)]">
                  the impossible.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-8 max-w-2xl text-lg leading-8 text-[rgba(231,223,208,0.76)] md:text-xl">
                A cinematic, local-first digital darkroom for photographs that
                need more than a filter and less than a bloated editing suite.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[rgba(231,223,208,0.54)]">
                Build professional-grade looks, protect image fidelity, create
                shareable recipes, archive complete sessions, and export work
                that feels made for the feed, the portfolio, and the client.
              </p>
            </Reveal>

            <Reveal delay={320}>
              <div className="mt-9 flex flex-wrap gap-3">
                <MagneticLink href="/editor" variant="primary">
                  Open Darkroom
                  <Camera size={15} strokeWidth={1.5} />
                </MagneticLink>
                <MagneticLink href="/presets">
                  View Collections
                  <BookOpen size={15} strokeWidth={1.5} />
                </MagneticLink>
              </div>
            </Reveal>
          </div>

          <Reveal delay={260} className="hidden md:block">
            <div className="nyv-hero-console">
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.26em] text-[var(--ormond-brass)]">
                    Live Render Core
                  </div>
                  <div className="mt-1 text-sm text-[rgba(231,223,208,0.72)]">
                    cinematic pipeline preview
                  </div>
                </div>
                <CircleDot
                  size={18}
                  strokeWidth={1.5}
                  className="animate-pulse text-emerald-300"
                />
              </div>

              <div className="grid gap-px bg-white/10">
                {[
                  ["Base Grade", "linear light"],
                  ["Mask Stack", "editable"],
                  ["Halation", "bright pass"],
                  ["Grain", "luma aware"],
                  ["Export", "profiled"],
                ].map(([name, value]) => (
                  <div
                    key={name}
                    className="grid grid-cols-[1fr_auto] bg-[#15120d]/82 px-4 py-3"
                  >
                    <span className="text-xs text-[rgba(231,223,208,0.52)]">
                      {name}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(231,223,208,0.78)]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-4">
                <div className="nyv-mini-wave" aria-hidden />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative border-b border-[var(--ormond-line)] bg-[var(--ormond-charcoal)]">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-14 md:grid-cols-3 md:px-8">
          {principles.map((principle, index) => (
            <Reveal key={principle.title} delay={index * 90}>
              <article className="nyv-principle-card">
                <div className="ormond-label text-[var(--ormond-brass)]">
                  {principle.eyebrow}
                </div>
                <h2 className="font-ormond-serif mt-6 text-4xl font-light leading-tight text-[var(--ormond-paper)]">
                  {principle.title}
                </h2>
                <p className="mt-5 text-sm leading-7 text-[rgba(231,223,208,0.58)]">
                  {principle.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-[var(--ormond-line)] bg-[#0f0e0b]">
        <div className="nyv-section-glow nyv-section-glow-left" aria-hidden />

        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
          <Reveal>
            <div className="max-w-3xl">
              <p className="ormond-label text-[var(--ormond-brass)]">
                The New Darkroom Standard
              </p>
              <h2 className="font-ormond-serif mt-5 text-5xl font-light leading-[0.95] tracking-[-0.04em] text-[var(--ormond-paper)] md:text-7xl">
                Not a filter app. A visual instrument.
              </h2>
              <p className="mt-7 max-w-2xl text-sm leading-7 text-[rgba(231,223,208,0.6)]">
                Intaglio should feel like the place where photographs become
                deliberate. Every section of the product has one job: make the
                image more memorable without making the tool louder than the
                image.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-px bg-[var(--ormond-line)] md:grid-cols-3">
            {pipeline.map((item, index) => (
              <Reveal key={item.title} delay={index * 55}>
                <article className="nyv-pipeline-card">
                  <div className="flex items-center justify-between">
                    <div className="nyv-icon-shell">{item.icon}</div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(231,223,208,0.3)]">
                      {item.label}
                    </span>
                  </div>
                  <h3 className="mt-8 font-ormond-serif text-3xl font-light text-[var(--ormond-paper)]">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[rgba(231,223,208,0.56)]">
                    {item.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-[var(--ormond-line)] bg-[#171510]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 md:grid-cols-[0.95fr_1.05fr] md:px-8 md:py-32">
          <Reveal>
            <div>
              <p className="ormond-label text-[var(--ormond-brass)]">
                Before / After
              </p>
              <h2 className="font-ormond-serif mt-5 text-5xl font-light leading-tight text-[var(--ormond-paper)] md:text-6xl">
                The grade should feel discovered, not pasted.
              </h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-[rgba(231,223,208,0.58)]">
                The landing page itself should teach the product: Intaglio is
                about comparison, restraint, detail, and the moment an ordinary
                image becomes cinematic without losing its soul.
              </p>

              <div className="mt-9 grid gap-3">
                {craftNotes.map((note) => (
                  <div
                    key={note}
                    className="flex items-start gap-3 text-sm leading-6 text-[rgba(231,223,208,0.64)]"
                  >
                    <CheckCircle2
                      size={16}
                      strokeWidth={1.5}
                      className="mt-1 shrink-0 text-[var(--ormond-brass)]"
                    />
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <BeforeAfterPlate />
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-[var(--ormond-line)] bg-[#e4dccd] text-[#211d16]">
        <div className="nyv-paper-noise" aria-hidden />

        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 md:grid-cols-[0.85fr_1.15fr] md:px-8 md:py-32">
          <Reveal>
            <div>
              <p className="ormond-label text-[#7c5c2e]">
                Instagrammable by design
              </p>
              <h2 className="font-ormond-serif mt-5 text-5xl font-light leading-tight tracking-[-0.04em] md:text-7xl">
                Recipes that look like they came from a secret studio.
              </h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-[#61594d]">
                The recipe system should not feel like preset dumping. It should
                feel like collecting visual worlds: cinematic, named, tested,
                shareable, and instantly recognizable.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-2">
            {recipes.map((recipe, index) => (
              <Reveal key={recipe.name} delay={index * 70}>
                <article className={\`nyv-recipe-card nyv-recipe-\${recipe.tone}\`}>
                  <div className="flex items-center justify-between">
                    <Sparkles size={17} strokeWidth={1.5} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.24em] opacity-60">
                      recipe
                    </span>
                  </div>
                  <h3 className="font-ormond-serif mt-14 text-3xl font-light">
                    {recipe.name}
                  </h3>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] opacity-60">
                    {recipe.tag}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="nyv-marquee border-y border-[#211d16]/10">
          <div>
            Cinematic Color · Halation · Grain · Masking · LUTs · Skin Protect ·
            Local Archives · Proofing · Instagram Export · Film Borders ·
            Before/After · Recipes ·
          </div>
          <div>
            Cinematic Color · Halation · Grain · Masking · LUTs · Skin Protect ·
            Local Archives · Proofing · Instagram Export · Film Borders ·
            Before/After · Recipes ·
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-[var(--ormond-line)] bg-[#11100d]">
        <div className="nyv-section-glow nyv-section-glow-right" aria-hidden />

        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
          <Reveal>
            <div className="max-w-3xl">
              <p className="ormond-label text-[var(--ormond-brass)]">
                Professional underneath
              </p>
              <h2 className="font-ormond-serif mt-5 text-5xl font-light leading-[0.95] tracking-[-0.04em] text-[var(--ormond-paper)] md:text-7xl">
                The magic only works if the engine is disciplined.
              </h2>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-px bg-[var(--ormond-line)] md:grid-cols-3">
            {professionalFeatures.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 60}>
                <article className="nyv-pro-card">
                  <div className="nyv-icon-shell">{feature.icon}</div>
                  <h3 className="mt-8 font-ormond-serif text-3xl font-light text-[var(--ormond-paper)]">
                    {feature.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[rgba(231,223,208,0.56)]">
                    {feature.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-[var(--ormond-line)] bg-[#0d0c0a]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-24 md:grid-cols-[1fr_1fr] md:px-8 md:py-32">
          <Reveal>
            <div className="nyv-device-frame">
              <div className="nyv-device-toolbar">
                <span />
                <span />
                <span />
              </div>
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src="/demo.jpg"
                  alt="Intaglio mobile preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover saturate-125 contrast-110"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,214,150,0.32),transparent_32%),linear-gradient(180deg,transparent,rgba(0,0,0,0.72))]" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="rounded-3xl border border-white/12 bg-black/32 p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.22em] text-white/60">
                        Export Plate
                      </span>
                      <Play size={14} strokeWidth={1.5} className="text-white/70" />
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {[0.3, 0.56, 0.82, 0.44].map((height, index) => (
                        <div
                          key={index}
                          className="rounded-full bg-white/16"
                          style={{ height: \`\${height * 92}px\` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div>
              <p className="ormond-label text-[var(--ormond-brass)]">
                Proofing and delivery
              </p>
              <h2 className="font-ormond-serif mt-5 text-5xl font-light leading-tight text-[var(--ormond-paper)] md:text-6xl">
                Built for where photographs actually live.
              </h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-[rgba(231,223,208,0.58)]">
                The best editor does not end at a download button. It knows the
                difference between a story crop, a portfolio upload, a proofing
                plate, and an archive master.
              </p>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {proofingModes.map((mode) => (
                  <div key={mode} className="nyv-proof-pill">
                    <Eye size={14} strokeWidth={1.5} />
                    {mode}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#e4dccd] text-[#211d16]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-24 md:grid-cols-[1fr_1.2fr] md:px-8 md:py-32">
          <Reveal>
            <div>
              <p className="ormond-label text-[#6f5632]">Archive System</p>
              <h2 className="font-ormond-serif mt-5 text-5xl font-light leading-tight tracking-[-0.04em] md:text-7xl">
                Recipes for looks. Archives for complete sessions.
              </h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-[#5f574b]">
                Intaglio introduces calmer file names while preserving the local
                editing data model, legacy imports, and future professional
                project structure.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-px bg-[#211d16]/12">
            {formats.map((format, index) => (
              <Reveal key={format.ext} delay={index * 70}>
                <div className="grid gap-4 bg-[#e4dccd] p-6 transition hover:bg-[#d9ceb8] md:grid-cols-[120px_180px_1fr]">
                  <div className="font-mono text-xs uppercase tracking-[0.22em] text-[#6f5632]">
                    {format.ext}
                  </div>
                  <div className="text-sm font-medium">{format.name}</div>
                  <p className="text-sm leading-6 text-[#61594d]">
                    {format.note}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-[var(--ormond-line)] bg-[#0f0e0b]">
        <div className="mx-auto max-w-7xl px-5 py-24 text-center md:px-8 md:py-32">
          <Reveal>
            <p className="ormond-label text-[var(--ormond-brass)]">
              Final frame
            </p>
            <h2 className="font-ormond-serif mx-auto mt-5 max-w-5xl text-6xl font-light leading-[0.9] tracking-[-0.06em] text-[var(--ormond-paper)] md:text-8xl">
              Make the browser feel like a private cinema for photographs.
            </h2>
            <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 text-[rgba(231,223,208,0.58)]">
              Intaglio should not feel like another web app. It should feel like
              opening a controlled room where light, color, texture, memory, and
              export all have a place.
            </p>

            <div className="mt-10 flex justify-center gap-3">
              <MagneticLink href="/editor" variant="primary">
                Enter Darkroom
                <Wand2 size={15} strokeWidth={1.5} />
              </MagneticLink>
              <MagneticLink href="/presets">
                Browse Recipes
                <Sparkles size={15} strokeWidth={1.5} />
              </MagneticLink>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-[var(--ormond-line)] bg-[var(--ormond-charcoal)] px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Aperture
              size={18}
              strokeWidth={1.25}
              className="text-[var(--ormond-brass)]"
            />
            <div>
              <span className="text-sm text-[rgba(231,223,208,0.62)]">
                {BRAND.descriptor}
              </span>
              <div className="mt-1 text-[10px] tracking-[0.22em] text-[rgba(231,223,208,0.22)]">
                Amico meo carissimo.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/editor" className="ormond-button">
              <SlidersHorizontal size={14} strokeWidth={1.5} />
              Darkroom
            </Link>
            <Link href="/editor" className="ormond-button">
              <Archive size={14} strokeWidth={1.5} />
              Open Archive
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
`;

const userCSS = `
.nyv-page {
  position: relative;
  background:
    radial-gradient(circle at 20% 0%, rgba(226, 174, 101, 0.08), transparent 32%),
    radial-gradient(circle at 80% 20%, rgba(80, 130, 136, 0.1), transparent 34%),
    #11100d;
  color: var(--ormond-paper);
}

.nyv-shader-veil {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.92;
  mix-blend-mode: screen;
}

.nyv-cursor-glow {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(
      circle at var(--cursor-x) var(--cursor-y),
      rgba(226, 174, 101, 0.13),
      transparent 28rem
    );
  opacity: 0.85;
}

.nyv-nav-link {
  position: relative;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(231, 223, 208, 0.45);
  transition: color 260ms ease;
}

.nyv-nav-link::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -8px;
  height: 1px;
  transform: scaleX(0);
  transform-origin: left;
  background: var(--ormond-brass);
  transition: transform 260ms ease;
}

.nyv-nav-link:hover {
  color: var(--ormond-paper);
}

.nyv-nav-link:hover::after {
  transform: scaleX(1);
}

.nyv-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.025) 0,
    rgba(255, 255, 255, 0.025) 1px,
    transparent 1px,
    transparent 5px
  );
  opacity: 0.22;
  mix-blend-mode: overlay;
}

.nyv-orbital-ring {
  position: absolute;
  border: 1px solid rgba(231, 223, 208, 0.12);
  border-radius: 999px;
  pointer-events: none;
  transform: rotate(-18deg);
}

.nyv-orbital-ring-one {
  right: -16rem;
  top: 8rem;
  width: 42rem;
  height: 42rem;
  animation: nyv-drift 16s ease-in-out infinite alternate;
}

.nyv-orbital-ring-two {
  right: 6rem;
  bottom: -18rem;
  width: 34rem;
  height: 34rem;
  animation: nyv-drift 20s ease-in-out infinite alternate-reverse;
}

.nyv-reveal {
  opacity: 0;
  transform: translateY(28px);
  filter: blur(14px);
  transition:
    opacity 900ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 900ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 900ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--reveal-delay);
}

.nyv-reveal[data-visible="true"] {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

.nyv-magnetic-button {
  position: relative;
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  overflow: hidden;
  border: 1px solid rgba(231, 223, 208, 0.14);
  background: rgba(231, 223, 208, 0.055);
  padding: 0.7rem 1rem;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(231, 223, 208, 0.74);
  backdrop-filter: blur(14px);
  transition:
    transform 240ms ease,
    border-color 240ms ease,
    background 240ms ease,
    color 240ms ease;
}

.nyv-magnetic-button::before {
  content: "";
  position: absolute;
  inset: -60%;
  background:
    radial-gradient(circle, rgba(226, 174, 101, 0.28), transparent 36%),
    conic-gradient(
      from 120deg,
      transparent,
      rgba(231, 223, 208, 0.22),
      transparent
    );
  opacity: 0;
  transform: rotate(0deg);
  transition: opacity 260ms ease;
}

.nyv-magnetic-button:hover {
  transform: translateY(-2px);
  border-color: rgba(226, 174, 101, 0.42);
  background: rgba(231, 223, 208, 0.09);
  color: var(--ormond-paper);
}

.nyv-magnetic-button:hover::before {
  opacity: 1;
  animation: nyv-spin 5s linear infinite;
}

.nyv-magnetic-button span {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.nyv-magnetic-button-primary {
  border-color: rgba(226, 174, 101, 0.46);
  background: linear-gradient(
    135deg,
    rgba(226, 174, 101, 0.96),
    rgba(169, 108, 48, 0.94)
  );
  color: #17120c;
}

.nyv-magnetic-button-primary:hover {
  color: #17120c;
  background: linear-gradient(
    135deg,
    rgba(245, 199, 125, 1),
    rgba(194, 126, 55, 1)
  );
}

.nyv-hero-console {
  overflow: hidden;
  border: 1px solid rgba(231, 223, 208, 0.12);
  background:
    radial-gradient(circle at 20% 0%, rgba(226, 174, 101, 0.12), transparent 34%),
    rgba(15, 14, 11, 0.78);
  box-shadow:
    0 40px 120px rgba(0, 0, 0, 0.5),
    inset 0 1px rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(22px);
}

.nyv-mini-wave {
  height: 94px;
  border: 1px solid rgba(231, 223, 208, 0.08);
  background:
    linear-gradient(
      90deg,
      transparent,
      rgba(226, 174, 101, 0.18),
      transparent
    ),
    repeating-linear-gradient(
      90deg,
      rgba(231, 223, 208, 0.08) 0,
      rgba(231, 223, 208, 0.08) 1px,
      transparent 1px,
      transparent 24px
    ),
    repeating-linear-gradient(
      180deg,
      rgba(231, 223, 208, 0.08) 0,
      rgba(231, 223, 208, 0.08) 1px,
      transparent 1px,
      transparent 24px
    );
  mask-image: radial-gradient(circle at 50% 50%, black, transparent 75%);
  animation: nyv-wave 5s ease-in-out infinite alternate;
}

.nyv-principle-card {
  min-height: 280px;
  border: 1px solid var(--ormond-line);
  background:
    radial-gradient(circle at 20% 0%, rgba(226, 174, 101, 0.08), transparent 35%),
    rgba(231, 223, 208, 0.025);
  padding: 1.45rem;
  transition:
    transform 260ms ease,
    background 260ms ease,
    border-color 260ms ease;
}

.nyv-principle-card:hover {
  transform: translateY(-4px);
  border-color: rgba(226, 174, 101, 0.34);
  background:
    radial-gradient(circle at 20% 0%, rgba(226, 174, 101, 0.13), transparent 38%),
    rgba(231, 223, 208, 0.045);
}

.nyv-section-glow {
  position: absolute;
  width: 38rem;
  height: 38rem;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(40px);
  opacity: 0.5;
}

.nyv-section-glow-left {
  left: -20rem;
  top: 12rem;
  background: radial-gradient(circle, rgba(226, 174, 101, 0.13), transparent 62%);
}

.nyv-section-glow-right {
  right: -20rem;
  top: 10rem;
  background: radial-gradient(circle, rgba(62, 117, 122, 0.16), transparent 62%);
}

.nyv-pipeline-card,
.nyv-pro-card {
  min-height: 300px;
  background:
    linear-gradient(180deg, rgba(231, 223, 208, 0.035), transparent),
    #11100d;
  padding: 1.5rem;
  transition:
    transform 280ms ease,
    background 280ms ease;
}

.nyv-pipeline-card:hover,
.nyv-pro-card:hover {
  transform: translateY(-4px);
  background:
    radial-gradient(circle at 50% 0%, rgba(226, 174, 101, 0.09), transparent 36%),
    #15130f;
}

.nyv-icon-shell {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid rgba(226, 174, 101, 0.22);
  background: rgba(226, 174, 101, 0.06);
  color: var(--ormond-brass);
}

.nyv-before-after {
  position: relative;
  min-height: 640px;
  overflow: hidden;
  border: 1px solid rgba(231, 223, 208, 0.13);
  background: #0d0c0a;
  box-shadow: 0 40px 120px rgba(0, 0, 0, 0.38);
}

.nyv-before-after::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 34% 18%, rgba(255, 224, 170, 0.18), transparent 34%),
    linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.42));
}

.nyv-before-after input[type="range"] {
  position: absolute;
  inset: 0;
  z-index: 5;
  width: 100%;
  height: 100%;
  cursor: ew-resize;
  opacity: 0;
}

.nyv-before-line {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 4;
  width: 1px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 0 30px rgba(226, 174, 101, 0.45);
}

.nyv-before-handle {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.38);
  color: white;
  backdrop-filter: blur(14px);
}

.nyv-paper-noise {
  position: absolute;
  inset: 0;
  opacity: 0.28;
  pointer-events: none;
  background-image:
    radial-gradient(rgba(33, 29, 22, 0.14) 1px, transparent 1px);
  background-size: 4px 4px;
  mix-blend-mode: multiply;
}

.nyv-recipe-card {
  position: relative;
  min-height: 250px;
  overflow: hidden;
  border: 1px solid rgba(33, 29, 22, 0.12);
  padding: 1.35rem;
  color: #f4ecdc;
  isolation: isolate;
  transition:
    transform 260ms ease,
    box-shadow 260ms ease;
}

.nyv-recipe-card::before {
  content: "";
  position: absolute;
  inset: -20%;
  z-index: -2;
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.3), transparent 28%),
    radial-gradient(circle at 80% 80%, rgba(0, 0, 0, 0.38), transparent 36%);
  opacity: 0.78;
}

.nyv-recipe-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.12), transparent 35%),
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.045) 0,
      rgba(255, 255, 255, 0.045) 1px,
      transparent 1px,
      transparent 7px
    );
  mix-blend-mode: overlay;
}

.nyv-recipe-card:hover {
  transform: translateY(-5px) rotate(-0.4deg);
  box-shadow: 0 28px 70px rgba(33, 29, 22, 0.18);
}

.nyv-recipe-violet {
  background: linear-gradient(135deg, #26132f, #9b4f86 48%, #e0aa6b);
}

.nyv-recipe-blue {
  background: linear-gradient(135deg, #071926, #174c62 48%, #f4a44d);
}

.nyv-recipe-green {
  background: linear-gradient(135deg, #10251f, #2f6955 46%, #e8b66a);
}

.nyv-recipe-gold {
  background: linear-gradient(135deg, #17130d, #8d642a 50%, #f0d49a);
}

.nyv-recipe-red {
  background: linear-gradient(135deg, #1d0809, #9a222d 46%, #f5aa55);
}

.nyv-recipe-ice {
  background: linear-gradient(135deg, #071018, #4c7180 52%, #d8ecf0);
  color: #f6fbff;
}

.nyv-marquee {
  display: flex;
  overflow: hidden;
  white-space: nowrap;
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(33, 29, 22, 0.58);
}

.nyv-marquee div {
  min-width: 100%;
  padding: 1rem 0;
  animation: nyv-marquee 28s linear infinite;
}

.nyv-device-frame {
  overflow: hidden;
  border: 1px solid rgba(231, 223, 208, 0.12);
  border-radius: 2rem;
  background: rgba(231, 223, 208, 0.04);
  box-shadow:
    0 40px 120px rgba(0, 0, 0, 0.44),
    inset 0 1px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
}

.nyv-device-toolbar {
  display: flex;
  gap: 0.45rem;
  border-bottom: 1px solid rgba(231, 223, 208, 0.1);
  padding: 1rem;
}

.nyv-device-toolbar span {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: rgba(231, 223, 208, 0.28);
}

.nyv-proof-pill {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid rgba(231, 223, 208, 0.1);
  background: rgba(231, 223, 208, 0.035);
  padding: 0.85rem 0.9rem;
  font-size: 12px;
  color: rgba(231, 223, 208, 0.64);
  transition: all 240ms ease;
}

.nyv-proof-pill:hover {
  background: rgba(231, 223, 208, 0.08);
  color: var(--ormond-paper);
}

@keyframes nyv-drift {
  from {
    transform: rotate(-18deg) scale(1) translateY(0);
  }
  to {
    transform: rotate(-8deg) scale(1.05) translateY(-30px);
  }
}

@keyframes nyv-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes nyv-wave {
  from {
    background-position: 0 0, 0 0, 0 0;
  }
  to {
    background-position: 100px 0, 0 24px, -24px 0;
  }
}

@keyframes nyv-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
}
`;

const processContent = (str) => {
  return str
    .replace(/OrmondHome/g, 'IntaglioHome')
    .replace(/ormond-/g, 'intaglio-')
    .replace(/Ormond/g, 'Intaglio')
    .replace(/nyv-/g, 'intaglio-')
    .replace(/nyvlt/g, 'intgliolt')
    .replace(/Nyvarra/g, 'Intaglio')
    .replace(/Nyvarra grade/g, 'Intaglio grade');
};

const finalCode = processContent(userCode);
const finalCSS = processContent(userCSS);

// We need to append the import to finalCode
const importsAdded = finalCode.replace('import { BRAND, FORMAT, ROUTE_LABELS } from "./lib/brand";', 'import { BRAND, FORMAT, ROUTE_LABELS } from "./lib/brand";\nimport "./landing.css";');

fs.writeFileSync('app/page.tsx', importsAdded);

const oldLandingCSS = fs.readFileSync('app/landing.css', 'utf-8');
if (!oldLandingCSS.includes('.intaglio-page')) {
  fs.appendFileSync('app/landing.css', '\n\n' + finalCSS);
} else {
    // If we've already done it
    console.log("Already appended");
}

console.log("Done updating landing page");
