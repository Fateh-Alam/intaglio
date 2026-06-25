"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Eye,
  Search,
  Star,
  Upload,
  X,
} from "lucide-react";
import { BRAND, FORMAT, STORAGE_KEYS } from "../lib/brand";

type Preset = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  settings: Record<string, unknown>;
  source?: "built-in" | "imported";
};

// Built-in Ormond collections reuse the existing editor settings.
const PRESETS: Preset[] = [
  {
    id: "noir",
    name: "Morning Newspaper",
    description:
      "High contrast shadows, restrained highlights, and a black-and-white editorial print character.",
    tags: ["Editorial", "B&W", "Archive"],
    settings: {
      contrast: 0.4,
      brightness: -0.15,
      tealOrange: 0,
      temperature: -0.1,
      tint: 0,
      skinProtect: 0,
      grain: 0.08,
      vignette: 0.5,
      halation: 0,
      sharpness: 0.15,
      dehaze: 0.2,
      aberration: 0,
      structure: 0.25,
      filmBorder: false,
      falseColor: false,
      anamorphicDistortion: 0,
      anamorphicStreaks: 0,
      godLightStrength: 0,
      godLightX: 0.5,
      godLightY: 0.5,
      lutTexture: null,
      lutStrength: 0,
      targetHue: 0,
      hueShift: 0,
      rotate: 0,
      zoom: 1,
      wiperActive: false,
    },
  },
  {
    id: "teal-orange",
    name: "1968 Rome",
    description:
      "Warm stone, cool shade, and a gentle travel-journal separation.",
    tags: ["Travel", "Warm", "Color"],
    settings: {
      contrast: 0.25,
      brightness: 0.05,
      tealOrange: 0.6,
      temperature: 0.15,
      tint: -0.05,
      skinProtect: 0.8,
      grain: 0.04,
      vignette: 0.25,
      halation: 0.15,
      sharpness: 0.2,
      dehaze: 0.15,
      aberration: 0.002,
      structure: 0.15,
      filmBorder: false,
      falseColor: false,
      anamorphicDistortion: 0.05,
      anamorphicStreaks: 0.1,
      godLightStrength: 0,
      godLightX: 0.5,
      godLightY: 0.5,
      lutTexture: null,
      lutStrength: 0,
      targetHue: 0,
      hueShift: 0,
      rotate: 0,
      zoom: 1,
      wiperActive: false,
    },
  },
  {
    id: "blade-runner",
    name: "English Rain",
    description:
      "Muted contrast, lifted darks, and weathered color for overcast street photographs.",
    tags: ["Muted", "Rain", "Street"],
    settings: {
      contrast: 0.15,
      brightness: -0.1,
      tealOrange: 0.35,
      temperature: 0.25,
      tint: -0.15,
      skinProtect: 0.6,
      grain: 0.12,
      vignette: 0.3,
      halation: 0.35,
      sharpness: 0.05,
      dehaze: -0.2,
      aberration: 0.003,
      structure: 0,
      filmBorder: false,
      falseColor: false,
      anamorphicDistortion: 0.08,
      anamorphicStreaks: 0.25,
      godLightStrength: 0,
      godLightX: 0.5,
      godLightY: 0.5,
      lutTexture: null,
      lutStrength: 0,
      targetHue: 0,
      hueShift: 0,
      rotate: 0,
      zoom: 1,
      wiperActive: false,
    },
  },
  {
    id: "golden-hour",
    name: "Late Autumn",
    description:
      "Soft warmth, protected skin, and quiet glow for low afternoon light.",
    tags: ["Warm", "Portrait", "Seasonal"],
    settings: {
      contrast: 0.1,
      brightness: 0.12,
      tealOrange: 0.25,
      temperature: 0.35,
      tint: 0.05,
      skinProtect: 1.0,
      grain: 0.02,
      vignette: 0.15,
      halation: 0.25,
      sharpness: 0.1,
      dehaze: 0.1,
      aberration: 0,
      structure: 0.1,
      filmBorder: false,
      falseColor: false,
      anamorphicDistortion: 0,
      anamorphicStreaks: 0,
      godLightStrength: 0.4,
      godLightX: 0.7,
      godLightY: 0.3,
      lutTexture: null,
      lutStrength: 0,
      targetHue: 0,
      hueShift: 0,
      rotate: 0,
      zoom: 1,
      wiperActive: false,
    },
  },
  {
    id: "wes-anderson",
    name: "Museum Print",
    description:
      "Controlled color, clean detail, and a slightly softened gallery-print balance.",
    tags: ["Gallery", "Soft", "Print"],
    settings: {
      contrast: 0.2,
      brightness: 0.08,
      tealOrange: 0.15,
      temperature: 0.05,
      tint: 0.08,
      skinProtect: 0.9,
      grain: 0.06,
      vignette: 0.1,
      halation: 0.1,
      sharpness: 0.25,
      dehaze: 0.25,
      aberration: 0,
      structure: 0.2,
      filmBorder: true,
      falseColor: false,
      anamorphicDistortion: 0,
      anamorphicStreaks: 0,
      godLightStrength: 0,
      godLightX: 0.5,
      godLightY: 0.5,
      lutTexture: null,
      lutStrength: 0,
      targetHue: 0,
      hueShift: 0,
      rotate: 0,
      zoom: 1,
      wiperActive: false,
    },
  },
  {
    id: "horror",
    name: "Old Cinema",
    description:
      "Cooler shadows, deeper blacks, and a restrained theatrical edge.",
    tags: ["Dark", "Cool", "Film"],
    settings: {
      contrast: 0.35,
      brightness: -0.2,
      tealOrange: 0.4,
      temperature: -0.25,
      tint: -0.1,
      skinProtect: 0.3,
      grain: 0.15,
      vignette: 0.6,
      halation: 0,
      sharpness: 0,
      dehaze: 0.3,
      aberration: 0.004,
      structure: 0.3,
      filmBorder: false,
      falseColor: false,
      anamorphicDistortion: 0,
      anamorphicStreaks: 0,
      godLightStrength: 0,
      godLightX: 0.5,
      godLightY: 0.5,
      lutTexture: null,
      lutStrength: 0,
      targetHue: 0,
      hueShift: 0,
      rotate: 0,
      zoom: 1,
      wiperActive: false,
    },
  },
];

interface PresetCardProps {
  preset: Preset;
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
}) => (
  <article className="group relative border border-white/10 bg-[#080808] p-6 transition-all duration-500 hover:bg-[#0a0a0a] hover:border-amber-500/30">
    {/* Hover glow */}
    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
      <div className="absolute -inset-24 bg-radial from-amber-900/20 via-transparent to-transparent blur-3xl" />
    </div>

    <div className="relative z-10">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="font-mono text-xl font-light tracking-wide text-white">
          {preset.name}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onToggleFavorite}
            className={`transition p-2 hover:bg-white/5 border border-white/10 ${
              isFavorite ? "text-amber-300" : "text-gray-500 hover:text-white"
            }`}
            aria-label={isFavorite ? "Remove favorite" : "Favorite preset"}
          >
            <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          <button
            onClick={onPreview}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/5 border border-white/10"
            aria-label="Preview preset"
          >
            <Eye size={14} className="text-gray-400" />
          </button>
          <button
            onClick={onDownload}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/5 border border-white/10"
            aria-label="Download preset"
          >
            <Download size={14} className="text-amber-400" />
          </button>
        </div>
      </div>

      <p className="mb-4 text-sm font-light leading-relaxed text-gray-500 group-hover:text-gray-400 transition-colors">
        {preset.description}
      </p>

      <div className="flex flex-wrap gap-2">
        {preset.source === "imported" && (
          <span className="border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-cyan-300/80">
            Imported
          </span>
        )}
        {preset.tags.map((tag) => (
          <span
            key={tag}
            className="border border-white/10 bg-black/40 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-gray-500"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  </article>
);

const readPresetFile = (file: File) =>
  new Promise<Preset>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? "")) as {
          id?: string;
          name?: string;
          description?: string;
          tags?: string[];
          settings?: Record<string, unknown>;
        };
        const settings = parsed.settings ?? parsed;
        resolve({
          id: parsed.id || `imported-${file.name}-${Date.now()}`,
          name:
            parsed.name ||
            file.name.replace(/\.(orm|nyv|json)$/i, "") ||
            "Imported Look",
          description:
            parsed.description || "Imported local Ormond Print Recipe.",
          tags: parsed.tags?.length ? parsed.tags : ["Imported"],
          settings,
          source: "imported",
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

export default function PresetsPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [activeTag, setActiveTag] = React.useState("All");
  const [favorites, setFavorites] = React.useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_KEYS.presetFavorites) ||
          localStorage.getItem(STORAGE_KEYS.legacyPresetFavorites) ||
          "[]"
      ) as string[];
    } catch {
      return [];
    }
  });
  const [importedPresets, setImportedPresets] = React.useState<Preset[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_KEYS.importedPresets) ||
          localStorage.getItem(STORAGE_KEYS.legacyImportedPresets) ||
          "[]"
      ) as Preset[];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.presetFavorites, JSON.stringify(favorites));
  }, [favorites]);

  React.useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.importedPresets,
      JSON.stringify(importedPresets)
    );
  }, [importedPresets]);

  const allPresets = React.useMemo(
    () => [...PRESETS, ...importedPresets],
    [importedPresets]
  );

  const presetTags = React.useMemo(() => {
    const tags = new Set<string>(["All", "Favorites"]);
    allPresets.forEach((preset) => {
      preset.tags.forEach((tag) => tags.add(tag));
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
      const haystack = [
        preset.name,
        preset.description,
        preset.source,
        ...preset.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesTag && haystack.includes(normalizedQuery);
    });
  }, [activeTag, allPresets, favorites, query]);

  const handleDownload = (preset: Preset) => {
    const payload = {
      version: "2.7",
      id: preset.id,
      name: preset.name,
      description: preset.description,
      tags: preset.tags,
      settings: preset.settings,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ormond-${preset.id}.${FORMAT.recipeExtension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = (preset: Preset) => {
    // Store preset in localStorage and redirect to editor
    localStorage.setItem(
      STORAGE_KEYS.presetPreview,
      JSON.stringify(preset.settings)
    );
    router.push("/editor");
  };

  const handleToggleFavorite = (presetId: string) => {
    setFavorites((prev) =>
      prev.includes(presetId)
        ? prev.filter((id) => id !== presetId)
        : [...prev, presetId]
    );
  };

  const handleImportPreset = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      const imported = await Promise.all(files.map(readPresetFile));
      setImportedPresets((prev) => [...prev, ...imported]);
      setActiveTag("Imported");
    } catch (error) {
      console.error("Failed to import preset:", error);
      alert("Could not import one or more preset files.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="ormond-page relative min-h-screen w-full overflow-x-hidden font-sans">
      {/* Film grain overlay */}
      <div className="ormond-grain" />

      <div className="relative z-10">
        {/* Header */}
        <nav className="fixed top-0 z-40 w-full border-b border-[var(--ormond-line)] bg-[#14130f]/80 backdrop-blur-md">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative h-8 w-8">
                <Image
                  src="/logo.svg"
                  alt="Ormond Logo"
                  fill
                  className="object-contain opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                />
              </div>
              <span className="font-ormond-serif text-xl font-light tracking-wide text-[var(--ormond-paper)] transition-colors group-hover:text-white">
                {BRAND.name}
              </span>
            </Link>

            <Link
              href="/"
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-gray-400 transition-colors hover:text-white"
            >
              <ArrowLeft size={14} />
              Back
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-6 pt-32 pb-20">
          {/* Header */}
          <div className="mb-16 text-center">
            <span className="mb-6 inline-block border border-[var(--ormond-line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--ormond-brass)]">
              Ormond Collections
            </span>
            <h1 className="font-ormond-serif mb-8 text-5xl font-light text-[var(--ormond-paper)] md:text-7xl">
              Print Recipes
            </h1>
            <p className="mx-auto max-w-2xl text-lg font-light leading-relaxed text-[rgba(231,223,208,0.62)]">
              Quiet starting points inspired by eras, weather, paper, and
              rooms. Search by mood, keep your staples, import packs, and
              download native .{FORMAT.recipeExtension} Print Recipes.
            </p>
          </div>

          {/* Library Controls */}
          <div className="mb-10 border border-white/10 bg-black/30 p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search recipes by mood, era, tag..."
                  className="w-full border border-white/10 bg-black/40 py-3 pl-11 pr-10 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-amber-500/40"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <label className="inline-flex cursor-pointer items-center justify-center gap-2 border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-500/15">
                <Upload size={14} />
                Import .{FORMAT.recipeExtension}
                <input
                  type="file"
                  accept={`.${FORMAT.recipeExtension},.nyv,.json,application/json`}
                  multiple
                  onChange={handleImportPreset}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {presetTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] transition ${
                    activeTag === tag
                      ? "border-amber-500/45 bg-amber-500/10 text-amber-200"
                      : "border-white/10 bg-black/25 text-white/40 hover:border-white/25 hover:text-white/70"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Presets Grid */}
          {filteredPresets.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          ) : (
            <div className="border border-white/10 bg-black/30 p-12 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/35">
                No Recipes Found
              </div>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/45">
                Clear the search or switch tags to browse the full Print Recipe
                library.
              </p>
            </div>
          )}

          {/* Coming Soon Section */}
          <div className="mt-20 border-t border-white/5 pt-20 text-center">
            <h2 className="mb-6 font-serif text-3xl italic text-white/60">
              More Coming Soon
            </h2>
            <p className="mx-auto max-w-xl text-sm font-light text-gray-500">
              New collections will stay close to real light, remembered places,
              and photographs that ask for restraint.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
