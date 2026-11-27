"use client";

import React, { useMemo, useState } from "react";
import { IconCheck, IconSearch } from "@tabler/icons-react";
import { FILM_EMULATIONS, type FilmEmulation } from "../../lib/filmEmulations";
import { PRESETS } from "../../lib/presets";
import { applyRecipe } from "../../lib/recipeEngine";
import { Segmented } from "../../ui/Controls";
import { useEditorState } from "../hooks/useEditorState";
import { useShell } from "./useShell";

type Collection = "films" | "recipes";

function LookRow({ name, detail, swatch, selected, onPreview, onApply }: { name: string; detail: string; swatch: string; selected: boolean; onPreview: () => void; onApply: () => void }) {
  return (
    <button
      type="button"
      onPointerEnter={onPreview}
      onFocus={onPreview}
      onClick={onApply}
      aria-pressed={selected}
      className={`ui-focus group/look flex w-full items-center gap-3 rounded-[10px] p-1.5 pr-2.5 text-left transition-colors ${selected ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"}`}
    >
      <span className="h-10 w-10 shrink-0 rounded-[8px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]" style={{ background: swatch }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-[var(--ui-text)]">{name}</span>
        <span className="block truncate text-[11px] text-[var(--ui-text-3)]">{detail}</span>
      </span>
      {selected && <IconCheck size={15} stroke={2.2} className="shrink-0 text-[var(--ui-accent-strong)]" />}
    </button>
  );
}

/** Browse film stocks and recipes; hover previews on the photo, click applies. */
export function LooksTab() {
  const { settings, updateSettings, handleApplyRecipe } = useEditorState();
  const shell = useShell();
  const [collection, setCollection] = useState<Collection>("films");
  const [query, setQuery] = useState("");

  const films = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = FILM_EMULATIONS.filter((film) => !needle || `${film.name} ${film.category} ${film.bestFor} ${film.description}`.toLowerCase().includes(needle));
    return matches.reduce<Record<string, FilmEmulation[]>>((groups, film) => {
      (groups[film.category] ??= []).push(film);
      return groups;
    }, {});
  }, [query]);

  const recipes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PRESETS.filter((recipe) => !needle || `${recipe.name} ${recipe.description} ${recipe.tags.join(" ")}`.toLowerCase().includes(needle));
  }, [query]);

  const filmPatch = (film: FilmEmulation) => ({
    filmEmulation: film.id,
    filmEmulationStrength: settings.filmEmulation === "none" ? 1 : settings.filmEmulationStrength,
  });

  return (
    <div className="flex h-full flex-col" onPointerLeave={() => shell.setPreview(null)}>
      <div className="space-y-2 px-3 pb-2 pt-1">
        <Segmented
          label="Look collections"
          value={collection}
          onChange={(value) => { setCollection(value); shell.setPreview(null); }}
          options={[{ id: "films", label: "Film stocks" }, { id: "recipes", label: "Recipes" }]}
        />
        <label className="flex h-8 items-center gap-2 rounded-[8px] bg-black/30 px-2.5 ring-1 ring-inset ring-[var(--ui-line)] focus-within:ring-[var(--ui-accent)]">
          <IconSearch size={14} className="text-[var(--ui-text-3)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={collection === "films" ? "Search films, moods, uses" : "Search recipes"}
            className="h-full min-w-0 flex-1 bg-transparent text-[12px] text-[var(--ui-text)] outline-none placeholder:text-[var(--ui-text-3)]"
          />
        </label>
      </div>
      <div className="ui-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {collection === "films" ? (
          Object.entries(films).map(([category, items]) => (
            <div key={category} className="mb-2">
              <div className="sticky top-0 z-10 bg-[var(--ui-panel)] px-1.5 py-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ui-text-3)]">{category}</div>
              {items.map((film) => (
                <LookRow
                  key={film.id}
                  name={film.name}
                  detail={film.id === "none" ? "No film emulation" : film.bestFor}
                  swatch={film.swatch}
                  selected={settings.filmEmulation === film.id}
                  onPreview={() => shell.setPreview({ ...settings, ...filmPatch(film) })}
                  onApply={() => { shell.setPreview(null); updateSettings(filmPatch(film), `Film: ${film.name}`); }}
                />
              ))}
            </div>
          ))
        ) : (
          recipes.map((recipe) => (
            <LookRow
              key={recipe.id}
              name={recipe.name}
              detail={recipe.description}
              swatch={FILM_EMULATIONS.find((film) => film.id === recipe.settings.film?.filmEmulation)?.swatch ?? "linear-gradient(135deg,#3a3a3e,#6a6a70)"}
              selected={settings.appliedRecipeId === recipe.id}
              onPreview={() => shell.setPreview(applyRecipe(settings, recipe, recipe.intensityDefault ?? 1))}
              onApply={() => { shell.setPreview(null); handleApplyRecipe(recipe.id, recipe.intensityDefault ?? 1); }}
            />
          ))
        )}
        {collection === "films" && Object.keys(films).length === 0 && <p className="px-2 py-8 text-center text-[12px] text-[var(--ui-text-3)]">No films match “{query}”.</p>}
        {collection === "recipes" && recipes.length === 0 && <p className="px-2 py-8 text-center text-[12px] text-[var(--ui-text-3)]">No recipes match “{query}”.</p>}
      </div>
    </div>
  );
}
