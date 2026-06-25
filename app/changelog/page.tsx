"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Archive, Brush, Camera, FileText } from "lucide-react";
import { BRAND, FORMAT } from "../lib/brand";

const entries = [
  {
    date: "2026-06-25",
    title: "The Ormond Rebuild",
    icon: Camera,
    body: "Rebuilt the visible product around a quieter editorial darkroom: new name, mark, palette, typography, home page, session desk, and collections language.",
  },
  {
    date: "2026-06-25",
    title: "Archive and Recipe Formats",
    icon: Archive,
    body: `Introduced .${FORMAT.archiveExtension} Ormond Archives and .${FORMAT.recipeExtension} Print Recipes while keeping legacy .nyv, .nyvlt, and .nyvproj imports available.`,
  },
  {
    date: "2026-06-25",
    title: "Engine Preserved",
    icon: Brush,
    body: "Kept the existing local rendering capabilities intact: light, color, LUTs, masks, history, metadata, text overlays, proof marks, and browser export.",
  },
  {
    date: "2026-06-25",
    title: "Collections",
    icon: FileText,
    body: "Renamed the preset library into Ormond Collections with era-led Print Recipes such as Morning Newspaper, Late Autumn, Museum Print, English Rain, and 1968 Rome.",
  },
];

export default function Changelog() {
  return (
    <main className="ormond-page min-h-screen overflow-x-hidden">
      <div className="ormond-grain" />

      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--ormond-line)] bg-[#14130f]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-[rgba(231,223,208,0.56)] transition hover:text-[var(--ormond-paper)]"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            <span className="ormond-label">Back</span>
          </Link>
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Ormond" width={28} height={28} />
            <span className="font-ormond-serif text-xl">{BRAND.name}</span>
          </Link>
          <div className="w-12" />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-24 pt-32 md:px-8">
        <div className="mb-16 max-w-3xl">
          <p className="ormond-label text-[var(--ormond-brass)]">
            Release Journal
          </p>
          <h1 className="font-ormond-serif mt-6 text-6xl font-light leading-tight md:text-8xl">
            Notes from the darkroom.
          </h1>
          <p className="mt-7 max-w-2xl text-sm leading-7 text-[rgba(231,223,208,0.58)]">
            A concise record of changes that affect how Ormond feels, reads,
            and preserves work. The capability engine remains local-first.
          </p>
        </div>

        <div className="mt-16 border-y border-[var(--ormond-line)]">
          {entries.map((entry) => {
            const Icon = entry.icon;
            return (
              <article
                key={entry.title}
                className="grid gap-6 border-b border-[var(--ormond-line)] py-8 last:border-b-0 md:grid-cols-[150px_56px_1fr]"
              >
                <time className="ormond-label text-[rgba(231,223,208,0.42)]">
                  {entry.date}
                </time>
                <div className="flex h-12 w-12 items-center justify-center border border-[var(--ormond-line)] text-[var(--ormond-brass)]">
                  <Icon size={20} strokeWidth={1.25} />
                </div>
                <div>
                  <h2 className="font-ormond-serif text-3xl font-light">
                    {entry.title}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[rgba(231,223,208,0.58)]">
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
