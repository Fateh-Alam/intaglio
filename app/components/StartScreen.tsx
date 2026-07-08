"use client";

import React from "react";
import Image from "next/image";
import {
  IconArchive,
  IconCamera,
  IconFileImport,
  IconMovie,
  IconPhoto,
  IconSparkles,
} from "@tabler/icons-react";
import { BRAND, FORMAT } from "../lib/brand";

interface StartScreenProps {
  onOpenImage: () => void;
  onOpenArchive: () => void;
  onOpenVideo: () => void;
  onTrySample: () => void;
}

const deskActions = [
  {
    title: "Open Photograph",
    meta: "JPG / PNG / WebP",
    icon: IconPhoto,
    tone: "brass",
  },
  {
    title: "Open Archive",
    meta: `.${FORMAT.archiveExtension} session`,
    icon: IconArchive,
    tone: "green",
  },
  {
    title: "Sample Photograph",
    meta: "Local darkroom file",
    icon: IconCamera,
    tone: "navy",
  },
  {
    title: "Lift Frame",
    meta: "Video still workflow",
    icon: IconMovie,
    tone: "copper",
  },
];

const formatRows = [
  [`.${FORMAT.recipeExtension}`, FORMAT.recipeName, "Reusable edit settings"],
  [
    `.${FORMAT.archiveExtension}`,
    FORMAT.archiveName,
    "Full session with metadata and delivery state",
  ],
  [".nyv / .nyvlt", "Legacy Files", "Accepted on import"],
  [".cube", "3D LUT", "Color profile import"],
];

const scopeItems = [
  "Non-destructive development",
  "Local archive restore",
  "Manual culling and rights metadata",
  "Proof marks and browser export",
];

export default function StartScreen({
  onOpenImage,
  onOpenArchive,
  onOpenVideo,
  onTrySample,
}: StartScreenProps) {
  const handlers = [onOpenImage, onOpenArchive, onTrySample, onOpenVideo];

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[var(--intaglio-charcoal)] text-[var(--intaglio-paper)]">
      <div className="intaglio-grain" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 md:px-8">
        <header className="flex min-h-16 items-center justify-between border border-[var(--intaglio-line)] bg-[rgba(32,29,23,0.86)] px-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Intaglio" width={34} height={34} />
            <div>
              <div className="font-intaglio-serif text-xl leading-none">
                {BRAND.name}
              </div>
              <div className="intaglio-label mt-1">Session Desk</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {["Local", "Quiet", "Archive", "Print"].map((item) => (
              <div
                key={item}
                className="border border-[var(--intaglio-line)] px-3 py-2"
              >
                <span className="intaglio-label text-[rgba(231,223,208,0.42)]">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </header>

        <main className="grid flex-1 gap-5 py-5 lg:grid-cols-[380px_minmax(0,1fr)]">
          <section className="flex flex-col border border-[var(--intaglio-line)] bg-[var(--intaglio-panel)]">
            <div className="border-b border-[var(--intaglio-line)] p-6">
              <div className="intaglio-label text-[var(--intaglio-brass)]">
                Session Desk
              </div>
              <h1 className="font-intaglio-serif mt-5 text-4xl font-light leading-tight">
                Begin with a photograph.
              </h1>
              <p className="mt-5 text-sm leading-7 text-[rgba(231,223,208,0.55)]">
                Open a local image, restore an archive, or load the sample file
                into the darkroom.
              </p>
            </div>

            <div className="grid gap-px bg-[var(--intaglio-line)]">
              {deskActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <div role="button" tabIndex={0}
                    key={action.title}
                    onClick={handlers[index]}
                    className="group grid min-h-[96px] grid-cols-[52px_1fr_auto] items-center gap-4 bg-[var(--intaglio-panel)] px-5 py-4 text-left transition duration-300 hover:bg-[var(--intaglio-panel-soft)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center border border-[var(--intaglio-line-strong)] text-[var(--intaglio-brass)]">
                      <Icon size={22} stroke={1.25} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[rgba(231,223,208,0.88)]">
                        {action.title}
                      </div>
                      <div className="intaglio-label mt-1 text-[rgba(231,223,208,0.34)]">
                        {action.meta}
                      </div>
                    </div>
                    <div className="font-mono text-lg text-[rgba(231,223,208,0.28)] transition group-hover:text-[var(--intaglio-brass)]">
                      +
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto border-t border-[var(--intaglio-line)] p-5">
              <div className="grid grid-cols-2 gap-2">
                {scopeItems.map((item) => (
                  <div
                    key={item}
                    className="border border-[var(--intaglio-line)] bg-black/10 px-3 py-3 text-xs leading-5 text-[rgba(231,223,208,0.52)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="border border-[var(--intaglio-line)] bg-[var(--intaglio-panel)]">
              <div className="flex items-center justify-between border-b border-[var(--intaglio-line)] px-5 py-4">
                <div className="intaglio-label">Workbench</div>
                <div className="intaglio-label text-[var(--intaglio-green)]">
                  Ready
                </div>
              </div>

              <div className="relative min-h-[360px] overflow-hidden">
                <Image
                  src="/demo.jpg"
                  alt="Intaglio sample photograph"
                  fill
                  sizes="(min-width: 1280px) 700px, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,19,15,0.55),rgba(20,19,15,0.06)),linear-gradient(180deg,transparent,rgba(20,19,15,0.82))]" />
                <div className="absolute bottom-5 left-5 right-5 max-w-xl">
                  <div className="intaglio-label text-[var(--intaglio-brass)]">
                    Sample Negative
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[rgba(231,223,208,0.68)]">
                    A calm source image for checking tone, grain, warmth, and
                    shadow detail before importing your own work.
                  </p>
                </div>
              </div>

              <div className="border-t border-[var(--intaglio-line)] p-5">
                <div className="mb-4 intaglio-label">Format Map</div>
                <div className="grid gap-px bg-[var(--intaglio-line)]">
                  {formatRows.map(([ext, title, desc]) => (
                    <div
                      key={ext}
                      className="grid gap-3 bg-[var(--intaglio-panel)] px-4 py-3 md:grid-cols-[110px_180px_1fr]"
                    >
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--intaglio-brass)]">
                        {ext}
                      </div>
                      <div className="text-xs text-[rgba(231,223,208,0.75)]">
                        {title}
                      </div>
                      <div className="text-xs leading-5 text-[rgba(231,223,208,0.44)]">
                        {desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="border border-[var(--intaglio-line)] bg-[var(--intaglio-panel)]">
              <div className="border-b border-[var(--intaglio-line)] p-5">
                <div className="intaglio-label">Current Scope</div>
                <p className="mt-4 text-sm leading-7 text-[rgba(231,223,208,0.54)]">
                  The darkroom keeps the existing editing engine intact: color,
                  masks, text overlays, LUTs, history, culling, archives, and
                  export recipes.
                </p>
              </div>
              <div className="space-y-3 p-5">
                {[
                  "RAW development remains roadmap scope",
                  "Archives are local JSON session artifacts",
                  "Exports run through the browser render pipeline",
                  "Legacy files remain importable",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 border border-[var(--intaglio-line)] bg-black/10 px-3 py-3 text-xs leading-5 text-[rgba(231,223,208,0.48)]"
                  >
                    <IconSparkles
                      size={13}
                      stroke={1.25}
                      className="mt-0.5 shrink-0 text-[var(--intaglio-brass)]"
                    />
                    {item}
                  </div>
                ))}
              </div>
              <div className="border-t border-[var(--intaglio-line)] p-5">
                <div role="button" tabIndex={0} onClick={onOpenArchive} className="intaglio-button w-full">
                  <IconFileImport size={14} stroke={1.25} />
                  Open Archive
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
