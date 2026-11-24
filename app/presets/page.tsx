"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconDownload,
  IconEye,
  IconSearch,
  IconStar,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { BRAND, FORMAT, RECIPE_FILE_ACCEPT, STORAGE_KEYS, isRecipeFilename } from "../lib/brand";
import { isColophonQuery } from "../lib/colophon";
import { ColophonCard, ColophonFooterMark } from "../components/ColophonNote";
import { BrandMark } from "../editor/shell/TopBar";

import { PRESETS } from "../lib/presets";
import { IntaglioRecipe } from "../types/recipe";
import { createIntaglioContainer, openIntaglioContainer, triggerContainerDownload } from "../lib/intaglioContainer";
import { createIntaglioDocument, createRuntimeAssetStore } from "../lib/intaglioDocument";
import { applyRecipe } from "../lib/recipeEngine";
import { DEFAULT_ASSET_METADATA, DEFAULT_SETTINGS, DEFAULT_WATERMARK, serializeEditorSettings } from "../editor/pageTypes";
import { DEFAULT_TEXT_OVERLAY } from "../components/CinematicTextOverlay";
import { showError } from "../lib/platform";

interface PresetCardProps {
  preset: IntaglioRecipe;
  onDownload: () => void;
  onPreview: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
}

const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  onDownload,
  onPreview,
  onToggleFavorite,
  isFavorite,
}) => {
  const isEtchSignature = preset.tags.includes("Etch Signatures");

  return (
    <article
      className={`group relative flex h-full flex-col rounded-[20px] p-5 ring-1 ring-inset transition-colors ${
        isEtchSignature
          ? "bg-white/[0.03] ring-[var(--ui-accent)]/25 hover:bg-white/[0.045] hover:ring-[var(--ui-accent)]/40"
          : "bg-white/[0.025] ring-white/[0.06] hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[16px] font-semibold tracking-[-0.015em] text-white">
          {preset.name}
        </h3>
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`ui-focus grid h-8 w-8 shrink-0 place-items-center rounded-[8px] transition-colors ${
            isFavorite
              ? "bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)]"
              : "text-white/40 hover:bg-white/[0.06] hover:text-white"
          }`}
          aria-label={isFavorite ? "Remove favorite" : "Favorite preset"}
          aria-pressed={isFavorite}
        >
          <IconStar size={16} stroke={1.8} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      <p className="mt-2.5 flex-1 text-[13.5px] leading-[1.6] text-white/55">
        {preset.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {preset.source === "imported" && (
          <span className="rounded-full bg-[var(--ui-accent-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ui-accent-strong)]">
            Imported
          </span>
        )}
        {preset.tags.map((tag: string) => (
          <span
            key={tag}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              tag === "Etch Signatures"
                ? "bg-[var(--ui-accent-soft)] text-[var(--ui-accent-strong)]"
                : "bg-white/[0.05] text-white/55"
            }`}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-4">
        <button
          type="button"
          onClick={onPreview}
          aria-label={`Preview ${preset.name}`}
          className="ui-focus inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-white/[0.07] px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-white/[0.12]"
        >
          <IconEye size={15} stroke={1.8} />
          Preview
        </button>
        <button
          type="button"
          onClick={onDownload}
          aria-label={`Download ${preset.name}`}
          className="ui-focus inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-[var(--ui-accent-soft)] px-3.5 text-[12.5px] font-medium text-[var(--ui-accent-strong)] ring-1 ring-inset ring-[var(--ui-accent)]/30 transition-colors hover:bg-[var(--ui-accent)]/25"
        >
          <IconDownload size={15} stroke={1.8} />
          .{FORMAT.recipeExtension}
        </button>
      </div>
    </article>
  );
};

const readPresetFile = async (file: File): Promise<IntaglioRecipe> => {
  if (!isRecipeFilename(file.name)) {
    throw new Error(`Only portable .${FORMAT.recipeExtension} or legacy .int V2 recipes are supported.`);
  }
  const { manifest } = await openIntaglioContainer(file);
  if (manifest.kind !== "recipe") {
    throw new Error(`Choose a .${FORMAT.recipeExtension} recipe, not a project file.`);
  }
  return {
    id: manifest.document.id,
    name: manifest.document.title,
    description: "Imported portable Etch Look Recipe.",
    tags: ["Imported"],
    settings: { raw: Object.fromEntries(Object.entries(manifest.document.editorSettingsSnapshot)) },
    intensityDefault: 1,
    source: "imported",
  };
};

export default function PresetsPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [activeTag, setActiveTag] = React.useState("All");
  const [favorites, setFavorites] = React.useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.presetFavorites) || "[]") as string[];
    } catch {
      return [];
    }
  });
  const [importedPresets, setImportedPresets] = React.useState<IntaglioRecipe[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.importedPresets) || "[]") as IntaglioRecipe[];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.presetFavorites, JSON.stringify(favorites));
  }, [favorites]);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.importedPresets, JSON.stringify(importedPresets));
  }, [importedPresets]);

  const allPresets = React.useMemo(() => [...PRESETS, ...importedPresets], [importedPresets]);

  const presetTags = React.useMemo(() => {
    const tags = new Set<string>(["All", "Favorites"]);
    allPresets.forEach((preset) => {
      preset.tags.forEach((tag: string) => tags.add(tag));
    });
    return Array.from(tags);
  }, [allPresets]);

  const filteredPresets = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allPresets.filter((preset) => {
      const matchesTag =
        activeTag === "All" ||
        (activeTag === "Favorites" && favorites.includes(preset.id)) ||
        preset.tags.includes(activeTag);
      const haystack = [preset.name, preset.description, preset.source, ...preset.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesTag && haystack.includes(normalizedQuery);
    });
  }, [activeTag, allPresets, favorites, query]);

  const handleDownload = async (preset: IntaglioRecipe) => {
    const settings = applyRecipe(DEFAULT_SETTINGS, preset, 1);
    const document = await createIntaglioDocument({
      id: preset.id,
      title: preset.name,
      sourceFile: null,
      sourceName: "",
      imageInfo: null,
      settings,
      textOverlay: DEFAULT_TEXT_OVERLAY,
      watermark: DEFAULT_WATERMARK,
      metadata: DEFAULT_ASSET_METADATA,
      exportFormat: "image/jpeg",
      exportQuality: 90,
      exportScale: 1,
      exportRecipeId: null,
    });
    const archive = await createIntaglioContainer("recipe", document, createRuntimeAssetStore());
    await triggerContainerDownload(archive, `etch-${preset.id}.${FORMAT.recipeExtension}`);
  };

  const handlePreview = (preset: IntaglioRecipe) => {
    const flattened = serializeEditorSettings(
      applyRecipe(DEFAULT_SETTINGS, preset, preset.intensityDefault ?? 1)
    );
    localStorage.setItem(STORAGE_KEYS.presetPreview, JSON.stringify(flattened));
    router.push("/editor");
  };

  const handleToggleFavorite = (presetId: string) => {
    setFavorites((prev) =>
      prev.includes(presetId) ? prev.filter((id) => id !== presetId) : [...prev, presetId]
    );
  };

  const handleImportPreset = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      const imported = await Promise.all(files.map(readPresetFile));
      setImportedPresets((prev) => [...prev, ...imported]);
      setActiveTag("Imported");
    } catch (error) {
      console.error("Failed to import preset:", error);
      void showError("Could not import one or more recipe files.");
    } finally {
      event.target.value = "";
    }
  };

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
            <Link href="/changelog" className="ui-focus hidden rounded-full px-3 py-1.5 text-[13px] text-white/60 transition-colors hover:text-white md:block">
              What’s new
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
          className="pointer-events-none absolute inset-x-0 top-0 h-[440px] bg-[radial-gradient(50%_60%_at_50%_0%,rgba(91,155,255,0.10),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-[1200px] px-4 pb-24 pt-16 sm:px-6 lg:pt-20">
          <div className="max-w-[660px]">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#7aafff]">
              Etch Collections
            </p>
            <h1 className="type-display mt-4 text-[48px] leading-[1.02] text-white sm:text-[64px]">
              Look recipes.
            </h1>
            <p className="mt-5 text-[16px] leading-[1.65] text-white/55">
              Quiet starting points built for real light and tonal restraint. Search by mood, save favorites, import packs, or download portable .{FORMAT.recipeExtension} files.
            </p>
          </div>

          {/* Search, import & tag filters */}
          <div className="mt-10 rounded-[20px] bg-white/[0.025] p-4 ring-1 ring-inset ring-white/[0.06] sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="relative">
                <IconSearch size={16} stroke={1.8} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search recipes by mood, era, or tag…"
                  className="h-10 w-full rounded-[11px] bg-black/35 pl-10 pr-9 text-[13.5px] text-white outline-none ring-1 ring-inset ring-white/[0.08] placeholder:text-white/35 focus:ring-[var(--ui-accent)]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="ui-focus absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition-colors hover:text-white"
                    aria-label="Clear search"
                  >
                    <IconX size={15} />
                  </button>
                )}
              </div>

              <label className="ui-focus inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[11px] bg-[var(--ui-accent-soft)] px-4 text-[13px] font-medium text-[var(--ui-accent-strong)] ring-1 ring-inset ring-[var(--ui-accent)]/35 transition-colors hover:bg-[var(--ui-accent)]/25">
                <IconUpload size={15} stroke={1.8} />
                Import .{FORMAT.recipeExtension}
                <input
                  type="file"
                  accept={RECIPE_FILE_ACCEPT}
                  multiple
                  onChange={handleImportPreset}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {presetTags.map((tag) => {
                const active = activeTag === tag;
                return (
                  <button
                    type="button"
                    key={tag}
                    aria-pressed={active}
                    onClick={() => setActiveTag(tag)}
                    className={`ui-focus rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      active
                        ? "bg-white text-[#0c0c0d]"
                        : "bg-white/[0.04] text-white/60 ring-1 ring-inset ring-white/[0.07] hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid */}
          <div className="mt-8">
            {filteredPresets.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPresets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    isFavorite={favorites.includes(preset.id)}
                    onToggleFavorite={() => handleToggleFavorite(preset.id)}
                    onDownload={() => handleDownload(preset)}
                    onPreview={() => handlePreview(preset)}
                  />
                ))}
              </div>
            ) : isColophonQuery(query) ? (
              <div className="mx-auto max-w-xl rounded-[18px] bg-[#0c0c0d] ring-1 ring-inset ring-white/[0.1]">
                <ColophonCard />
              </div>
            ) : (
              <div className="rounded-[20px] bg-white/[0.025] p-12 text-center ring-1 ring-inset ring-white/[0.06]">
                <p className="text-[14px] font-medium text-white/80">No recipes found</p>
                <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-white/45">
                  Clear the search or switch tags to browse the full Etch Look Recipe library.
                </p>
              </div>
            )}
          </div>
        </div>
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
            <Link href="/changelog" className="ui-focus rounded hover:text-white">What’s new</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
