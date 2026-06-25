"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  Aperture,
  BookOpen,
  Camera,
  SlidersHorizontal,
} from "lucide-react";
import { BRAND, FORMAT, ROUTE_LABELS } from "./lib/brand";

const principles = [
  {
    title: "The photograph leads",
    body: "Large pictures, quiet surfaces, and tools that recede until they are needed.",
  },
  {
    title: "Craft without spectacle",
    body: "Precision controls for light, tone, color, grain, masks, metadata, and delivery.",
  },
  {
    title: "Local by nature",
    body: "Photographs, recipes, archives, LUTs, masks, and exports remain in the browser.",
  },
];

const formats = [
  {
    ext: `.${FORMAT.recipeExtension}`,
    name: FORMAT.recipeName,
    note: "Reusable development settings for a photograph or series.",
  },
  {
    ext: `.${FORMAT.archiveExtension}`,
    name: FORMAT.archiveName,
    note: "A complete portable session with image source, edit, metadata, and delivery state.",
  },
  {
    ext: ".nyv / .nyvlt",
    name: "Legacy Import",
    note: "Existing legacy recipes and sessions remain readable.",
  },
];

const tools = [
  ["Light", "Exposure, contrast, highlight and shadow recovery."],
  ["Color", "White balance, color wheels, HSL channels, LUTs, and reference matching."],
  ["Mask", "Brush, radial, linear, and luminosity selections."],
  ["Print", "Export recipes, proof marks, rights metadata, and archives."],
];

export default function OrmondHome() {
  return (
    <main className="ormond-page min-h-screen overflow-x-hidden">
      <div className="ormond-grain" />

      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--ormond-line)] bg-[#14130f]/78 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Ormond" width={28} height={28} />
            <span className="font-ormond-serif text-xl tracking-wide text-[var(--ormond-paper)]">
              {BRAND.name}
            </span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <Link
              href="/editor"
              className="ormond-label transition hover:text-[var(--ormond-paper)]"
            >
              {ROUTE_LABELS.editor}
            </Link>
            <Link
              href="/presets"
              className="ormond-label transition hover:text-[var(--ormond-paper)]"
            >
              {ROUTE_LABELS.presets}
            </Link>
            <Link
              href="/changelog"
              className="ormond-label transition hover:text-[var(--ormond-paper)]"
            >
              {ROUTE_LABELS.changelog}
            </Link>
          </nav>
          <Link href="/editor" className="ormond-button ormond-button-primary">
            Enter
            <ArrowUpRight size={14} strokeWidth={1.5} />
          </Link>
        </div>
      </header>

      <section className="relative min-h-[92vh] overflow-hidden border-b border-[var(--ormond-line)]">
        <Image
          src="/demo.jpg"
          alt="A quiet street photograph used as the Ormond darkroom sample"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,19,15,0.9)_0%,rgba(20,19,15,0.58)_38%,rgba(20,19,15,0.18)_72%),linear-gradient(180deg,rgba(20,19,15,0.22)_0%,rgba(20,19,15,0.7)_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-5 pb-10 pt-28 md:px-8 md:pb-14">
          <div className="max-w-3xl pb-10">
            <p className="ormond-label mb-8 text-[var(--ormond-brass)]">
              {BRAND.descriptor}
            </p>
            <h1 className="font-ormond-serif text-7xl font-light leading-[0.9] text-[var(--ormond-paper)] md:text-9xl">
              {BRAND.name}
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[rgba(231,223,208,0.76)] md:text-xl">
              Made for photographs that deserve patience.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[rgba(231,223,208,0.56)]">
              A local-first digital darkroom for developing, proofing, archiving,
              and returning to images without the noise of a dashboard.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/editor"
                className="ormond-button ormond-button-primary"
              >
                Open Darkroom
                <Camera size={15} strokeWidth={1.5} />
              </Link>
              <Link href="/presets" className="ormond-button">
                View Collections
                <BookOpen size={15} strokeWidth={1.5} />
              </Link>
            </div>
          </div>

          <div className="grid max-w-4xl grid-cols-1 border border-[var(--ormond-line)] bg-[#14130f]/58 backdrop-blur-sm md:grid-cols-3">
            {principles.map((principle) => (
              <div
                key={principle.title}
                className="border-b border-[var(--ormond-line)] p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              >
                <div className="ormond-label text-[var(--ormond-brass)]">
                  {principle.title}
                </div>
                <p className="mt-3 text-sm leading-6 text-[rgba(231,223,208,0.58)]">
                  {principle.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--ormond-line)] bg-[var(--ormond-charcoal)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-28">
          <div>
            <p className="ormond-label text-[var(--ormond-brass)]">
              Digital Darkroom
            </p>
            <h2 className="font-ormond-serif mt-5 max-w-xl text-5xl font-light leading-tight text-[var(--ormond-paper)] md:text-6xl">
              Editing begins after looking.
            </h2>
          </div>
          <div className="grid gap-px bg-[var(--ormond-line)]">
            {tools.map(([name, body], index) => (
              <div
                key={name}
                className="grid gap-4 bg-[var(--ormond-charcoal-2)] p-6 md:grid-cols-[120px_1fr]"
              >
                <div className="ormond-label text-[var(--ormond-silver)]">
                  {String(index + 1).padStart(2, "0")} / {name}
                </div>
                <p className="text-sm leading-7 text-[rgba(231,223,208,0.62)]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#e4dccd] text-[#211d16]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:grid-cols-[1fr_1.2fr] md:px-8 md:py-28">
          <div>
            <p className="ormond-label text-[#6f5632]">Archive System</p>
            <h2 className="font-ormond-serif mt-5 text-5xl font-light leading-tight md:text-6xl">
              Recipes for looks. Archives for sessions.
            </h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-[#5f574b]">
              Ormond introduces calmer file names while preserving the existing
              local editing data model and legacy imports.
            </p>
          </div>
          <div className="grid gap-px bg-[#211d16]/12">
            {formats.map((format) => (
              <div
                key={format.ext}
                className="grid gap-4 bg-[#e4dccd] p-6 md:grid-cols-[120px_180px_1fr]"
              >
                <div className="font-mono text-xs uppercase tracking-[0.22em] text-[#6f5632]">
                  {format.ext}
                </div>
                <div className="text-sm font-medium">{format.name}</div>
                <p className="text-sm leading-6 text-[#61594d]">
                  {format.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--ormond-line)] bg-[var(--ormond-charcoal)] px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Aperture size={18} strokeWidth={1.25} className="text-[var(--ormond-brass)]" />
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
