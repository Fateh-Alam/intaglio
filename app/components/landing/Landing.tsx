import React from "react";
import Link from "next/link";
import {
  IconAdjustmentsHorizontal, IconArchive, IconArrowRight, IconBrush, IconDeviceDesktop, IconFocus2, IconLock,
  IconShieldCheck, IconSparkles, IconTimeline, IconZoomScan,
} from "@tabler/icons-react";
import { BrandMark } from "../../editor/shell/TopBar";
import { BeforeAfter } from "./BeforeAfter";
import { LookSwitcher, type LookFrame } from "./LookSwitcher";
import { Reveal } from "./Reveal";

const LOOKS: readonly LookFrame[] = [
  { id: "warm", label: "Warm film", caption: "Soft skin, honey highlights", src: "/landing/frame-warm.jpg" },
  { id: "cine", label: "Cine matte", caption: "Lifted blacks, cool shadows", src: "/landing/frame-cine.jpg" },
  { id: "silver", label: "Silver print", caption: "Quiet black and white", src: "/landing/frame-mono.jpg" },
  { id: "dither", label: "Dither print", caption: "One of 136 creative effects", src: "/landing/frame-dither.png" },
  { id: "original", label: "Original", caption: "Straight out of camera", src: "/landing/frame-original.jpg" },
];

const SHORTCUTS: ReadonlyArray<[string, string]> = [
  ["\\", "Before / after"],
  ["R", "Crop & straighten"],
  ["Z", "Fit / 100%"],
  ["J", "Clipping"],
  ["M", "Masks"],
  ["⌘Z", "Undo"],
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#7aafff]">{children}</p>;
}

function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`type-display text-[40px] leading-[1.04] text-white sm:text-[56px] ${className}`}>{children}</h2>;
}

function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="ui-focus group inline-flex h-12 items-center gap-2 rounded-full bg-white pl-6 pr-5 text-[14.5px] font-semibold text-[#0c0c0d] shadow-[0_10px_40px_-10px_rgba(255,255,255,0.35)] transition-[background-color,transform] hover:bg-[#ececee] active:scale-[0.98]"
    >
      {children}
      <IconArrowRight size={17} stroke={2} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function SecondaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="ui-focus inline-flex h-12 items-center rounded-full px-5 text-[14.5px] font-medium text-white/80 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/[0.06] hover:text-white">
      {children}
    </Link>
  );
}

/* ── Feature visuals: small, honest renderings of real editor surfaces. ── */

function SliderRow({ label, value, fill, track }: { label: string; value: string; fill: number; track?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[11.5px]"><span className="text-white/70">{label}</span><span className="tabular-nums text-white/40">{value}</span></div>
      <div className="relative h-[3px] rounded-full" style={{ background: track ?? "rgba(255,255,255,0.12)" }}>
        <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: `${fill * 100}%` }} />
      </div>
    </div>
  );
}

function ControlsVisual() {
  return (
    <div className="space-y-3.5 rounded-[14px] bg-black/30 p-4 ring-1 ring-inset ring-white/[0.06]">
      <SliderRow label="Temperature" value="+12" fill={0.58} track="linear-gradient(90deg,#4d7fd6,#d9b75a)" />
      <SliderRow label="Exposure" value="+0.35" fill={0.57} />
      <SliderRow label="Highlights" value="−28" fill={0.36} />
      <SliderRow label="Shadows" value="+19" fill={0.6} />
    </div>
  );
}

function MaskVisual() {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] ring-1 ring-inset ring-white/[0.06]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/landing/frame-original.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_62%]" loading="lazy" />
      <svg viewBox="0 0 320 200" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="mask-feather">
            <stop offset="55%" stopColor="rgb(255,40,48)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(255,40,48)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="196" cy="128" rx="92" ry="70" fill="url(#mask-feather)" />
        <ellipse cx="196" cy="128" rx="62" ry="47" fill="none" stroke="white" strokeOpacity="0.85" strokeWidth="1.2" strokeDasharray="4 4" />
        <circle cx="196" cy="128" r="4" fill="white" />
      </svg>
      <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10.5px] font-medium text-white/85 backdrop-blur">Radial mask · overlay on</span>
    </div>
  );
}

function LoupeVisual() {
  // The real sample photo at 800%: each square is one pixel of the original file.
  const scale = 8;
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] ring-1 ring-inset ring-white/[0.06]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/demo.jpg)",
          backgroundSize: `${2000 * scale}px ${2500 * scale}px`,
          backgroundPosition: `-${(600) * scale}px -${(1308) * scale}px`,
          imageRendering: "pixelated",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)`, backgroundSize: `${scale}px ${scale}px`, backgroundPosition: "-0.5px -0.5px" }}
      />
      <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10.5px] font-medium tabular-nums text-white/85 backdrop-blur">800% · pixel grid</span>
    </div>
  );
}

function GradingVisual() {
  const nodes = ["Develop", "Curve", "Color", "LUT", "Film"];
  return (
    <div className="rounded-[14px] bg-black/30 p-4 ring-1 ring-inset ring-white/[0.06]">
      <div className="flex items-center">
        {nodes.map((node, index) => (
          <React.Fragment key={node}>
            <span className={`rounded-[8px] px-2.5 py-1.5 text-[11px] font-medium ring-1 ring-inset ${index === 2 ? "bg-[#5b9bff]/15 text-[#a9c9ff] ring-[#5b9bff]/40" : "bg-white/[0.04] text-white/70 ring-white/[0.08]"}`}>{node}</span>
            {index < nodes.length - 1 && <span className="h-px min-w-2 flex-1 bg-white/15" />}
          </React.Fragment>
        ))}
      </div>
      {/* A simple vectorscope graticule with a skin-tone line. */}
      <div className="mt-4 flex items-center gap-4">
        <svg viewBox="0 0 100 100" className="h-20 w-20 shrink-0" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.14)" />
          <circle cx="50" cy="50" r="23" fill="none" stroke="rgba(255,255,255,0.08)" />
          <line x1="50" y1="50" x2="24" y2="12" stroke="rgba(255,190,140,0.6)" />
          {Array.from({ length: 70 }, (_, i) => {
            const angle = -2.15 + Math.sin(i * 12.9898) * 0.5;
            const radius = 8 + ((i * 37) % 23);
            return <circle key={i} cx={50 + Math.cos(angle) * radius} cy={50 + Math.sin(angle) * radius} r="1.1" fill="#9ccaff" fillOpacity="0.55" />;
          })}
        </svg>
        <div className="space-y-1 text-[11.5px] text-white/50">
          <p><span className="text-white/80">Waveform</span> and <span className="text-white/80">vectorscope</span></p>
          <p>Bake the grade to a 33³ or 65³ <span className="text-white/80">.cube</span></p>
        </div>
      </div>
    </div>
  );
}

function ProjectVisual() {
  const rows = ["Original photo", "Every edit and its history", "Masks and brush strokes", "LUTs and looks", "Versions"];
  return (
    <div className="rounded-[14px] bg-black/30 p-4 ring-1 ring-inset ring-white/[0.06]">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-white/[0.05] text-white/70 ring-1 ring-inset ring-white/[0.08]"><IconArchive size={19} stroke={1.5} /></span>
        <div>
          <p className="text-[12.5px] font-medium text-white/90">Firebird.intaglio</p>
          <p className="text-[11px] text-white/40">One file. Opens anywhere Intaglio runs.</p>
        </div>
      </div>
      <ul className="mt-3.5 space-y-1.5">
        {rows.map((row) => (
          <li key={row} className="flex items-center gap-2 text-[11.5px] text-white/60">
            <span className="h-1 w-1 rounded-full bg-[#7aafff]" />{row}
          </li>
        ))}
      </ul>
    </div>
  );
}

const FEATURES = [
  {
    icon: IconAdjustmentsHorizontal,
    title: "Controls you already know",
    body: "Basic, Tone Curve, Color Mixer, Color Grading, Detail and Effects, in the order you expect. Double-click any slider to reset it.",
    visual: <ControlsVisual />,
  },
  {
    icon: IconBrush,
    title: "Masks for local edits",
    body: "Paint with a brush, or select by radial, linear, color or brightness range. Each mask gets its own exposure, color and tone sliders.",
    visual: <MaskVisual />,
  },
  {
    icon: IconZoomScan,
    title: "A true 1:1 loupe",
    body: "At 100%, one pixel of your photo is one pixel on your screen, with masks and effects included. Press Z, or just click the photo.",
    visual: <LoupeVisual />,
  },
  {
    icon: IconTimeline,
    title: "Pro grading when you want it",
    body: "Open a node graph, scopes and LUT Studio from one button. Close it and the everyday panel is exactly as you left it.",
    visual: <GradingVisual />,
  },
  {
    icon: IconFocus2,
    title: "Crop and straighten",
    body: "Drag the frame, pick a ratio, or draw along the horizon. The crop stays editable, and reopens exactly as you left it.",
    visual: (
      <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] ring-1 ring-inset ring-white/[0.06]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/frame-cine.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_55%] opacity-45" loading="lazy" />
        <div className="absolute inset-[14%_18%] overflow-hidden ring-1 ring-white/90">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/frame-cine.jpg" alt="" className="absolute left-[-28.5%] top-[-24%] h-auto w-[156%] max-w-none" loading="lazy" />
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, i) => <span key={i} className="border-[0.5px] border-white/25" />)}
          </div>
        </div>
        {["left-[18%] top-[14%]", "right-[18%] top-[14%]", "left-[18%] bottom-[14%]", "right-[18%] bottom-[14%]"].map((corner) => (
          <span key={corner} className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-white ${corner.includes("right") ? "translate-x-1/2" : ""} ${corner.includes("bottom") ? "translate-y-1/2" : ""} ${corner}`} />
        ))}
      </div>
    ),
  },
  {
    icon: IconArchive,
    title: "Projects that travel",
    body: "Save everything into one .intaglio file. Open it later, on another computer, and pick up exactly where you stopped.",
    visual: <ProjectVisual />,
  },
];

const PROMISES = [
  {
    icon: IconSparkles,
    title: "No AI. Ever.",
    body: "Every result comes from classical image processing. Nothing is guessed or generated, so the same edit gives the same result every time.",
  },
  {
    icon: IconLock,
    title: "Your photos stay yours.",
    body: "Editing happens on your own device. Photos are never uploaded, and there is no account to create.",
  },
  {
    icon: IconShieldCheck,
    title: "Every control is honest.",
    body: "If a slider is on screen, it changes pixels. Preview and export share one renderer, and automated tests check that they match.",
  },
];

export function Landing() {
  return (
    <div className="ui-root min-h-screen overflow-x-clip bg-[#0b0b0c] text-white">
      {/* ── Navigation ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0b0b0c]/75 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6" aria-label="Main">
          <Link href="/" className="ui-focus flex items-center gap-2.5 rounded-[8px]">
            <BrandMark size={20} />
            <span className="text-[14px] font-semibold tracking-[-0.01em]">Intaglio</span>
          </Link>
          <div className="flex items-center gap-1">
            <a href="#features" className="ui-focus hidden rounded-full px-3 py-1.5 text-[13px] text-white/60 transition-colors hover:text-white sm:block">Features</a>
            <a href="#promises" className="ui-focus hidden rounded-full px-3 py-1.5 text-[13px] text-white/60 transition-colors hover:text-white sm:block">Principles</a>
            <Link href="/changelog" className="ui-focus hidden rounded-full px-3 py-1.5 text-[13px] text-white/60 transition-colors hover:text-white md:block">What’s new</Link>
            <Link href="/editor" className="ui-focus ml-2 inline-flex h-8 items-center rounded-full bg-white px-3.5 text-[13px] font-semibold text-[#0c0c0d] transition-colors hover:bg-[#ececee]">
              Open editor
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(50%_60%_at_70%_30%,rgba(214,170,110,0.13),transparent_70%),radial-gradient(40%_50%_at_20%_20%,rgba(91,155,255,0.08),transparent_70%)]" />
          <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:pb-28 lg:pt-20">
            <Reveal>
              <Eyebrow>A photo editor that runs in your browser</Eyebrow>
              <h1 className="type-display mt-5 text-[52px] leading-[0.98] text-white sm:text-[76px] lg:text-[88px]">
                The darkroom,<br /><em className="text-white/75">in a browser tab.</em>
              </h1>
              <p className="mt-7 max-w-[500px] text-[17px] leading-[1.6] text-white/60">
                Familiar sliders up front. Masks, a true 1:1 loupe, node grading and LUTs when you want them. Your photos are never uploaded.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <PrimaryCta href="/editor">Open the editor</PrimaryCta>
                <SecondaryCta href="/editor?sample=1">Try the sample photo</SecondaryCta>
              </div>
              <p className="mt-6 text-[13px] text-white/40">Free. No account. Nothing to install.</p>
            </Reveal>
            <Reveal delay={0.1} className="mx-auto w-full max-w-[480px] lg:max-w-none">
              <BeforeAfter
                before="/landing/frame-original.jpg"
                after="/landing/frame-warm.jpg"
                beforeLabel="Original"
                afterLabel="Warm film"
                alt="A dark green Firebird parked against a pale wall, graded with a warm film look in Intaglio"
                priority
              />
              <p className="mt-4 text-center text-[12.5px] text-white/40">Drag to compare. Exported from Intaglio, only resized for the web.</p>
            </Reveal>
          </div>
        </section>

        {/* ── Trust strip ────────────────────────────────────────── */}
        <section aria-label="At a glance" className="border-y border-white/[0.06] bg-white/[0.015]">
          <ul className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-5 px-4 py-7 sm:px-6 md:grid-cols-4">
            {[
              [IconLock, "Never uploaded", "Edits happen on your device"],
              [IconDeviceDesktop, "Nothing to install", "Open a link and start"],
              [IconShieldCheck, "Preview = export", "What you see is what you save"],
              [IconSparkles, "No AI, ever", "Deterministic, inspectable results"],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof IconLock;
              return (
                <li key={title as string} className="flex items-start gap-3">
                  <I size={18} stroke={1.6} className="mt-0.5 shrink-0 text-white/45" />
                  <div>
                    <p className="text-[13.5px] font-medium text-white/90">{title as string}</p>
                    <p className="text-[12.5px] text-white/40">{body as string}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── Looks ──────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 lg:py-32">
          <Reveal className="mb-14 max-w-[640px]">
            <Eyebrow>Looks</Eyebrow>
            <SectionTitle className="mt-4">One photograph.<br /><em className="text-white/70">Every mood.</em></SectionTitle>
            <p className="mt-5 text-[16px] leading-[1.65] text-white/55">
              Film stocks, cinematic looks and creative effects, all non-destructive. Every frame here is the same sample photo, exported from Intaglio.
            </p>
          </Reveal>
          <Reveal><LookSwitcher looks={LOOKS} /></Reveal>
        </section>

        {/* ── Product ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#0e0e10] py-24 lg:py-32">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-[40%] h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(91,155,255,0.10),transparent)]" />
          <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
            <Reveal className="mx-auto max-w-[680px] text-center">
              <Eyebrow>The editor</Eyebrow>
              <SectionTitle className="mt-4">Everything in one calm window.</SectionTitle>
              <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-[1.65] text-white/55">
                Your photo stays at the center. Edit, Masks and Text sit on the right. Looks, history and versions slide in only when you ask for them.
              </p>
            </Reveal>
            <Reveal delay={0.05} className="mt-14">
              <figure className="overflow-hidden rounded-[16px] bg-[#0c0c0d] shadow-[0_60px_160px_-50px_rgba(0,0,0,1),0_0_0_1px_rgba(255,255,255,0.08)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/landing/editor.jpg" alt="The Intaglio editor with the sample photo, the Edit panel and its histogram" width={2880} height={1800} className="h-auto w-full" loading="lazy" />
              </figure>
              <figcaption className="mt-4 text-center text-[12.5px] text-white/40">A real screenshot of the editor.</figcaption>
            </Reveal>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────── */}
        <section id="features" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-24 sm:px-6 lg:py-32">
          <Reveal className="mb-14 max-w-[680px]">
            <Eyebrow>Features</Eyebrow>
            <SectionTitle className="mt-4">Pro power,<br /><em className="text-white/70">nothing in your way.</em></SectionTitle>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body, visual }, index) => (
              <Reveal key={title} delay={(index % 3) * 0.06} className="h-full">
                <article className="flex h-full flex-col rounded-[20px] bg-white/[0.025] p-5 ring-1 ring-inset ring-white/[0.06] transition-colors hover:bg-white/[0.035]">
                  {visual}
                  <div className="mt-5 flex items-center gap-2">
                    <Icon size={17} stroke={1.6} className="text-[#7aafff]" />
                    <h3 className="text-[15.5px] font-semibold tracking-[-0.01em] text-white">{title}</h3>
                  </div>
                  <p className="mt-2 text-[14px] leading-[1.6] text-white/55">{body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Promises ───────────────────────────────────────────── */}
        <section id="promises" className="scroll-mt-20 border-t border-white/[0.06] bg-[#0e0e10]">
          <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 lg:py-32">
            <Reveal className="mb-14 max-w-[640px]">
              <Eyebrow>Principles</Eyebrow>
              <SectionTitle className="mt-4">Three promises.</SectionTitle>
            </Reveal>
            <div className="grid gap-10 md:grid-cols-3 md:gap-8">
              {PROMISES.map(({ icon: Icon, title, body }, index) => (
                <Reveal key={title} delay={index * 0.06}>
                  <div className="border-t border-white/15 pt-6">
                    <Icon size={20} stroke={1.5} className="text-white/60" />
                    <h3 className="type-display mt-5 text-[30px] leading-[1.1] text-white">{title}</h3>
                    <p className="mt-3 text-[15px] leading-[1.65] text-white/55">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Shortcuts ──────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
          <Reveal className="flex flex-col items-start justify-between gap-8 rounded-[24px] bg-white/[0.025] p-7 ring-1 ring-inset ring-white/[0.06] sm:p-10 lg:flex-row lg:items-center">
            <div className="max-w-[360px]">
              <h2 className="type-display text-[34px] leading-[1.08] text-white">Your muscle memory already works here.</h2>
            </div>
            <ul className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 lg:max-w-[600px]">
              {SHORTCUTS.map(([key, label]) => (
                <li key={label} className="flex items-center gap-3 rounded-[12px] bg-black/25 px-3 py-2.5 ring-1 ring-inset ring-white/[0.05]">
                  <kbd className="grid h-7 min-w-7 place-items-center rounded-[7px] bg-white/[0.08] px-1.5 font-sans text-[12px] font-semibold text-white/90 shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]">{key}</kbd>
                  <span className="text-[13px] text-white/60">{label}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* ── Final call to action ───────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[520px] bg-[radial-gradient(45%_60%_at_50%_100%,rgba(214,170,110,0.14),transparent_70%)]" />
          <Reveal className="relative mx-auto max-w-[760px] px-4 pb-28 pt-16 text-center sm:px-6 lg:pb-36">
            <h2 className="type-display text-[48px] leading-[1.02] text-white sm:text-[72px]">
              Open a photo.<br /><em className="text-white/70">Start in seconds.</em>
            </h2>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <PrimaryCta href="/editor">Open the editor</PrimaryCta>
              <SecondaryCta href="/editor?sample=1">Try the sample photo</SecondaryCta>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5 text-white/80">
            <BrandMark size={18} />
            <span className="text-[13px] font-semibold">Intaglio</span>
            <span className="text-[13px] text-white/35">· Photos stay on your device.</span>
          </div>
          <nav aria-label="Footer" className="flex gap-5 text-[13px] text-white/45">
            <Link href="/editor" className="ui-focus rounded hover:text-white">Editor</Link>
            <Link href="/presets" className="ui-focus rounded hover:text-white">Recipes</Link>
            <Link href="/changelog" className="ui-focus rounded hover:text-white">What’s new</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
