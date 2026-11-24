"use client";

import Link from "next/link";
import { IconArchive, IconBrush, IconCamera, IconFileText } from "@tabler/icons-react";
import { BRAND, FORMAT } from "../lib/brand";
import { BrandMark } from "../editor/shell/TopBar";
import { ColophonFooterMark } from "../components/ColophonNote";

const entries = [
  {
    date: "2026-11-24",
    title: "Meet Etch",
    icon: IconCamera,
    body: `Renamed the darkroom to Etch with native .${FORMAT.archiveExtension} projects, .${FORMAT.recipeExtension} look recipes, iconic film look names, and a unified darkroom UI. Existing .intaglio and .int files continue to open seamlessly.`,
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
    <div className="ui-root flex min-h-screen flex-col overflow-x-clip bg-[#0b0b0c] text-white">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0b0b0c]/75 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6" aria-label="Main">
          <Link href="/" className="ui-focus flex items-center gap-2.5 rounded-[8px]">
            <BrandMark size={20} />
            <span className="text-[14px] font-semibold tracking-[-0.01em]">{BRAND.name}</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/" className="ui-focus hidden rounded-full px-3 py-1.5 text-[13px] text-white/60 transition-colors hover:text-white sm:block">
              Home
            </Link>
            <Link href="/presets" className="ui-focus hidden rounded-full px-3 py-1.5 text-[13px] text-white/60 transition-colors hover:text-white md:block">
              Recipes
            </Link>
            <Link href="/editor" className="ui-focus ml-2 inline-flex h-8 items-center rounded-full bg-white px-3.5 text-[13px] font-semibold text-[#0c0c0d] transition-colors hover:bg-[#ececee]">
              Open editor
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[440px] bg-[radial-gradient(50%_60%_at_30%_0%,rgba(91,155,255,0.10),transparent_70%)]"
        />
        <section className="relative mx-auto max-w-[920px] px-4 pb-24 pt-16 sm:px-6 lg:pt-20">
          <div className="max-w-2xl">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#7aafff]">
              Release Journal
            </p>
            <h1 className="type-display mt-4 text-[48px] leading-[1.02] text-white sm:text-[64px]">
              Notes from the darkroom.
            </h1>
            <p className="mt-5 text-[16px] leading-[1.65] text-white/55">
              A concise record of changes that affect how Etch feels, reads, and preserves work. Everything stays local-first.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {entries.map((entry) => {
              const Icon = entry.icon;
              return (
                <article
                  key={entry.title}
                  className="grid gap-4 rounded-[20px] bg-white/[0.025] p-6 ring-1 ring-inset ring-white/[0.06] sm:grid-cols-[120px_44px_1fr] sm:items-start sm:gap-5"
                >
                  <time className="ui-num pt-1 text-[12.5px] font-medium text-white/40">
                    {entry.date}
                  </time>
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)]">
                    <Icon size={19} stroke={1.7} />
                  </div>
                  <div>
                    <h2 className="type-display text-[28px] leading-[1.12] text-white">
                      {entry.title}
                    </h2>
                    <p className="mt-2.5 text-[14.5px] leading-[1.65] text-white/60">
                      {entry.body}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5 text-white/80">
            <ColophonFooterMark size={18} />
            <span className="text-[13px] font-semibold">{BRAND.name}</span>
            <span className="text-[13px] text-white/35">· Photos stay on your device.</span>
          </div>
          <nav aria-label="Footer" className="flex gap-5 text-[13px] text-white/45">
            <Link href="/" className="ui-focus rounded hover:text-white">Home</Link>
            <Link href="/editor" className="ui-focus rounded hover:text-white">Editor</Link>
            <Link href="/presets" className="ui-focus rounded hover:text-white">Recipes</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
