"use client";

import React, { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { IconCheck, IconEye, IconPhoto, IconSearch } from "@tabler/icons-react";
import { AnimatePresence } from "framer-motion";
import type { EditorSettings } from "../../types/editor";
import { Segmented, Switch } from "../../ui/Controls";
import { useEditorState } from "../hooks/useEditorState";
import { EFFECT_GROUPS, EFFECTS } from "../effects/catalog";
import { createEffect, type CreativeEffect } from "../effects/settings";
import { createLookLayers, STUDIO_GROUPS, STUDIO_LOOKS } from "../effects/studioLooks";
import { EffectThumbnailRenderer } from "../effects/effectThumbnails";
import { CreativeEffectsStack } from "../effects/CreativeEffectsStack";
import { useShell } from "./useShell";

type Collection = "effects" | "looks";
interface Item { id: string; name: string; group: string; layers: () => CreativeEffect[] }
interface EffectPreview {
  id: string;
  source: "hover" | "eye";
  settings: EditorSettings;
  held?: EffectPreview;
}

const EFFECT_ITEMS: readonly Item[] = EFFECTS.map((effect) => ({ id: effect.id, name: effect.name, group: effect.group, layers: () => [createEffect(effect.id)] }));
const LOOK_ITEMS: readonly Item[] = STUDIO_LOOKS.map((look) => ({ id: look.id, name: look.name, group: look.group, layers: () => createLookLayers(look) }));

/** A thumbnail that renders only once it scrolls into view. */
function Thumbnail({ item, collection, renderer, onPointerEnter, onPointerLeave }: {
  item: Item;
  collection: Collection;
  renderer: EffectThumbnailRenderer | null;
  onPointerEnter: React.PointerEventHandler<HTMLSpanElement>;
  onPointerLeave: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [thumbnail, setThumbnail] = useState<{ renderer: EffectThumbnailRenderer; url: string | null }>();
  const url = thumbnail?.renderer === renderer ? thumbnail?.url : undefined;
  useEffect(() => {
    const element = ref.current;
    if (!element || !renderer) return;
    let cancelled = false;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      void renderer.get(`${collection}:${item.id}`, item.layers).then((result) => {
        if (!cancelled) setThumbnail({ renderer, url: result });
      });
    }, { rootMargin: "120px" });
    observer.observe(element);
    return () => { cancelled = true; observer.disconnect(); };
  }, [item, collection, renderer]);
  return (
    <span ref={ref} aria-hidden="true" onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}
      className="relative isolate grid size-14 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-[var(--ui-raised)] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-inset after:ring-white/[0.12]">
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
        : <IconPhoto size={16} className="text-[var(--ui-text-3)]" />}
    </span>
  );
}

/** Browse effects and Studio looks. Hover to preview, click to apply, or hold a preview with the eye. */
export function EffectsTab() {
  const { settings, updateSettings, imageSrc, rawSource, gradeGraph } = useEditorState();
  const shell = useShell();
  const { focusEffectsSearch, setFocusEffectsSearch } = shell;
  const [collection, setCollection] = useState<Collection>("effects");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [append, setAppend] = useState(false);
  const [preview, setEffectPreview] = useState<EffectPreview | null>(null);
  const previewRef = useRef<EffectPreview | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const stackDockRef = useRef<HTMLElement>(null);
  const [stackHeight, setStackHeight] = useState(0);
  const hasAppliedEffects = settings.creativeEffects.length > 0;

  useEffect(() => {
    if (!hasAppliedEffects || !stackDockRef.current) return;
    const dock = stackDockRef.current;
    const measure = () => setStackHeight(dock.offsetHeight);
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(dock);
    return () => observer.disconnect();
  }, [hasAppliedEffects]);
  const resultPadding = (hasAppliedEffects ? stackHeight : 0) + 16;

  // Thumbnails show the photo as it was graded when the library opened, without
  // its current effects; reopening the library refreshes them.
  const [renderer, setRenderer] = useState<EffectThumbnailRenderer | null>(null);
  const createThumbnailRenderer = useEffectEvent((src: string, raw: typeof rawSource) =>
    new EffectThumbnailRenderer(src, raw, { ...settings, creativeEffects: [] }, gradeGraph));
  useEffect(() => {
    if (!imageSrc) return;
    const next = createThumbnailRenderer(imageSrc, rawSource);
    setRenderer(next);
    return () => next.dispose();
  }, [imageSrc, rawSource]);

  const clearPreview = (restore: EffectPreview | null = null) => {
    const active = previewRef.current?.settings;
    if (active) shell.setPreview((current) => (current === active ? restore?.settings ?? null : current));
    previewRef.current = restore;
    setEffectPreview(restore);
  };

  // Discard the temporary settings when the underlying edit changes or the tab closes.
  const setPreview = shell.setPreview;
  useEffect(() => () => {
    const active = previewRef.current?.settings;
    if (active) setPreview((current) => (current === active ? null : current));
    previewRef.current = null;
  }, [settings, setPreview]);

  useEffect(() => {
    resultsRef.current?.scrollTo(0, 0);
  }, [category, collection, query]);

  useEffect(() => {
    if (!focusEffectsSearch) return;
    if (window.matchMedia("(min-width: 768px)").matches) searchRef.current?.focus({ preventScroll: true });
    setFocusEffectsSearch(false);
  }, [focusEffectsSearch, setFocusEffectsSearch]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const items = (collection === "effects" ? EFFECT_ITEMS : LOOK_ITEMS).filter((item) =>
      (!category || item.group === category) && (!needle || `${item.name} ${item.group}`.toLowerCase().includes(needle)));
    return items.reduce<Record<string, Item[]>>((result, item) => {
      (result[item.group] ??= []).push(item);
      return result;
    }, {});
  }, [category, collection, query]);

  const inStack = useMemo(() => new Set<string>(settings.creativeEffects.map((layer) => layer.effect)), [settings.creativeEffects]);
  const replaceStack = collection === "looks" && !append;

  const add = (item: Item) => {
    clearPreview();
    const layers = item.layers();
    updateSettings((current) => ({ creativeEffects: replaceStack ? layers : [...current.creativeEffects, ...layers] }),
      collection === "looks" ? `Studio look: ${item.name}` : `Add ${item.name}`);
  };

  const activePreview = preview?.settings === shell.preview ? preview : null;
  const heldPreview = activePreview?.source === "eye" ? activePreview : activePreview?.held;
  const showPreview = (item: Item, source: EffectPreview["source"]) => {
    const layers = item.layers();
    const candidate = { ...settings, creativeEffects: replaceStack ? layers : [...settings.creativeEffects, ...layers] };
    const next = { id: item.id, source, settings: candidate, held: source === "hover" ? heldPreview : undefined };
    previewRef.current = next;
    shell.setPreview(candidate);
    setEffectPreview(next);
  };

  const empty = Object.keys(groups).length === 0;

  return (
    <div className="flex h-full flex-col" onKeyDown={(event) => {
      if (event.key !== "Escape") return;
      if (activePreview) clearPreview();
      else if (event.target === searchRef.current && query) setQuery("");
      else return;
      event.preventDefault();
      event.stopPropagation();
    }}>
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2 px-3 pb-2 pt-1 md:grid-cols-1">
        <Segmented
          label="Effect collections"
          className="col-span-2 md:col-span-1"
          value={collection}
          onChange={(value) => { clearPreview(); setCategory(""); setCollection(value); }}
          options={[{ id: "effects", label: "Individual effects" }, { id: "looks", label: "Studio looks" }]}
        />
        <label className="flex h-8 items-center gap-2 rounded-[8px] bg-black/30 px-2.5 ring-1 ring-inset ring-[var(--ui-line)] focus-within:ring-[var(--ui-accent)]">
          <IconSearch size={14} className="text-[var(--ui-text-3)]" />
          <input
            ref={searchRef}
            type="search"
            aria-label="Search effects and looks"
            value={query}
            onChange={(event) => { clearPreview(); setQuery(event.target.value); }}
            placeholder={collection === "effects" ? "Search effects" : "Search studio looks"}
            className="h-full min-w-0 flex-1 bg-transparent text-[12px] text-[var(--ui-text)] outline-none placeholder:text-[var(--ui-text-3)] [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
        <select aria-label="Effect category" value={category}
          onChange={(event) => { clearPreview(); setCategory(event.target.value); }}
          className="ui-focus h-8 min-w-0 w-full rounded-[8px] bg-[var(--ui-control)] px-2 text-[12px] text-[var(--ui-text)] ring-1 ring-inset ring-[var(--ui-line)] md:h-7">
          <option value="">All categories</option>
          {(collection === "effects" ? EFFECT_GROUPS : STUDIO_GROUPS).map((group) => <option key={group}>{group}</option>)}
        </select>
        {collection === "looks" && (
          <div className="col-span-2 md:col-span-1">
            <Switch label="Add to current stack" checked={append} onChange={(checked) => { clearPreview(); setAppend(checked); }} hint="Off replaces your effects with the look's layers" />
          </div>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={resultsRef} role="list" aria-label="Effect results" className="ui-scroll h-full overflow-y-auto px-2"
          style={{ paddingBottom: resultPadding, scrollPaddingBottom: resultPadding }}>
          {Object.entries(groups).map(([group, items]) => (
            <section key={group} className="mb-2" aria-label={group}>
              <div className="bg-[var(--ui-panel)] px-1.5 py-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ui-text-3)] md:sticky md:top-0 md:z-10">{group}</div>
              {items.map((item) => {
                const added = collection === "effects" && inStack.has(item.id);
                const active = activePreview?.id === item.id;
                const held = heldPreview?.id === item.id;
                return (
                  <div key={item.id} role="listitem" className={`flex items-center gap-1 rounded-[9px] pr-1 transition-colors ${active ? "bg-[var(--ui-accent-soft)]" : "hover:bg-white/[0.05]"}`}>
                    <button type="button" onClick={() => add(item)} className="ui-focus flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-[9px] p-1.5 text-left">
                      <Thumbnail item={item} collection={collection} renderer={renderer}
                        onPointerEnter={(event) => {
                          if (event.pointerType !== "touch") showPreview(item, "hover");
                        }}
                        onPointerLeave={() => {
                          const current = previewRef.current;
                          if (current?.source === "hover" && current.id === item.id) clearPreview(current.held);
                        }} />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--ui-text)]">{item.name}</span>
                        <span className="sr-only">{item.group}</span>
                      </span>
                      {added && <IconCheck size={15} stroke={2.2} aria-label="In your stack" className="shrink-0 text-[var(--ui-accent-strong)]" />}
                    </button>
                    <button
                      type="button"
                      aria-label={`Preview ${item.name}`}
                      title={`Preview ${item.name}`}
                      aria-pressed={held}
                      onClick={() => held ? clearPreview() : showPreview(item, "eye")}
                      className={`ui-focus grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-[8px] transition-colors ${held ? "bg-[var(--ui-accent)] text-white" : "text-[var(--ui-text-2)] hover:bg-white/[0.08] hover:text-[var(--ui-text)]"}`}
                    >
                      <IconEye size={15} stroke={1.8} />
                    </button>
                  </div>
                );
              })}
            </section>
          ))}
          {empty && <p className="px-2 py-8 text-center text-[12px] text-[var(--ui-text-3)]">Nothing matches “{query}”.</p>}
        </div>
        <AnimatePresence initial={false}>
          {hasAppliedEffects && <CreativeEffectsStack key="applied-effects" dockRef={stackDockRef} clearLibraryPreview={clearPreview} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
