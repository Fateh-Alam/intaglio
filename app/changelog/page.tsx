"use client";

import Link from "next/link";
import Image from "next/image";
import { IconArrowLeft, IconArchive, IconBrush, IconCamera, IconFileText } from "@tabler/icons-react";
import { BRAND, FORMAT } from "../lib/brand";

const entries = [
  {
    date: "2026-11-24",
    title: "Meet Etch",
    icon: IconCamera,
    body: `Renamed the darkroom to Etch with native .${FORMAT.archiveExtension} projects and .${FORMAT.recipeExtension} look recipes. Existing .intaglio and .int files continue to open seamlessly.`,
  },
  {
    date: "2026-06-25",
    title: "Portable Archive and Recipe Formats",
    icon: IconArchive,
    body: `Introduced portable .${FORMAT.archiveExtension} projects and .${FORMAT.recipeExtension} recipes with embedded, checksum-verified assets.`,
  },
  {
    date: "2026-06-25",
    title: "Deterministic Local Engine",
    icon: IconBrush,
    body: "Every control shares one local WebGL pipeline across preview, 1:1 loupe, proof sheets, and browser export: tone, color mixer, wheels, LUTs, masks, geometry, and creative effects.",
  },
  {
    date: "2026-06-25",
    title: "Collections",
    icon: IconFileText,
    body: "Curated the film room and recipe library with iconic, timeless look profiles ready to apply non-destructively.",
  },
];

export default function Changelog() {
  return (
    <main className="intaglio-page min-h-screen overflow-x-hidden">
      <div className="intaglio-grain" />

      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--intaglio-line)] bg-[#14130f]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-[rgba(231,223,208,0.56)] transition hover:text-[var(--intaglio-paper)]"
          >
            <IconArrowLeft className="intaglio-icon"/>
            <span className="intaglio-label">Back</span>
          </Link>
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Etch" width={28} height={28} />
            <span className="font-intaglio-serif text-xl">{BRAND.name}</span>
          </Link>
          <div className="w-12" />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-24 pt-32 md:px-8">
        <div className="mb-16 max-w-3xl">
          <p className="intaglio-label text-[var(--intaglio-brass)]">
            Release Journal
          </p>
          <h1 className="font-intaglio-serif mt-6 text-6xl font-light leading-tight md:text-8xl">
            Notes from the darkroom.
          </h1>
          <p className="mt-7 max-w-2xl text-sm leading-7 text-white/60">
            A concise record of changes that affect how Etch feels, reads,
            and preserves work. The capability engine remains local-first.
          </p>
        </div>

        <div className="mt-16 border-y border-[var(--intaglio-line)]">
          {entries.map((entry) => {
            const Icon = entry.icon;
            return (
              <article
                key={entry.title}
                className="grid gap-6 border-b border-[var(--intaglio-line)] py-8 last:border-b-0 md:grid-cols-[150px_56px_1fr]"
              >
                <time className="intaglio-label text-[rgba(231,223,208,0.42)]">
                  {entry.date}
                </time>
                <div className="flex h-12 w-12 items-center justify-center border border-[var(--intaglio-line)] text-[var(--intaglio-brass)]">
                  <Icon className="intaglio-icon" />
                </div>
                <div>
                  <h2 className="font-intaglio-serif text-3xl font-light">
                    {entry.title}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">
                    {entry.body}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
