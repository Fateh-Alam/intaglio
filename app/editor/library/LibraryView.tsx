"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { IconArrowLeft, IconChevronLeft, IconChevronRight, IconFlag, IconFolderPlus, IconGridDots, IconPhoto, IconStar, IconX } from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import {
  beginExport, endExport, importFolder, loadCatalog, markPhoto, originalFile, readPreview,
  type LibraryCatalog, type LibraryPhoto,
} from "./bridge";
import { exportPhotos } from "./exportPhotos";
import type { ExportOptions } from "../render/ExportEngine";

const PAGE = 60;
const field = "ui-focus rounded-md border border-[var(--ui-line)] bg-[var(--ui-panel)] px-3 py-1.5 text-[13px] text-[var(--ui-text)]";
const button = field + " inline-flex items-center justify-center gap-2 hover:bg-white/10 disabled:opacity-40";
const accent = "ui-focus inline-flex items-center gap-2 rounded-md bg-[var(--ui-accent)] px-3.5 py-1.5 text-[13px] font-semibold text-black disabled:opacity-40";

type Filter = "all" | "picks" | "unflagged" | "rejects" | "rated";

function message(error: unknown) { return error instanceof Error ? error.message : String(error); }

function Preview({ photo, large = false }: { photo: LibraryPhoto; large?: boolean }) {
  const { id, available, revision } = photo;
  const [picture, setPicture] = useState<{ key: string; url: string | null }>();
  const key = `${id}/${revision}/${large}`;
  useEffect(() => {
    if (!available) return;
    const controller = new AbortController();
    let url: string | undefined;
    void readPreview(id, large, controller.signal).then((blob) => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob);
      setPicture({ key, url });
    }).catch(() => {
      if (!controller.signal.aborted) setPicture({ key, url: null });
    });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [id, available, key, large]);

  if (picture?.key === key && picture.url) {
    /* Object URLs become invalid when their catalog cell leaves the page. */
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={picture.url} alt={large ? photo.name : ""} draggable={false} className="h-full w-full object-contain" />;
  }
  const unavailable = !photo.available || picture?.key === key;
  return <div className="flex h-full items-center justify-center gap-2 text-xs text-[var(--ui-text-3)]">
    <IconPhoto size={18} />{unavailable ? "Preview unavailable" : "Loading preview"}
  </div>;
}

export function LibraryView({ active, onClose }: { active: boolean; onClose: () => void }) {
  const editor = useEditorState();
  const [catalog, setCatalog] = useState<LibraryCatalog>();
  const [folder, setFolder] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [focused, setFocused] = useState<number>();
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [loupe, setLoupe] = useState(false);
  const [busy, setBusy] = useState<"import" | "edit" | "choose" | "export">();
  const [error, setError] = useState("");
  const [job, setJob] = useState<{ current: string; done: number; failed: string[]; total: number; stopped?: boolean }>();
  const write = useRef(Promise.resolve());
  const exporting = useRef<AbortController | null>(null);

  useEffect(() => {
    let current = true;
    void loadCatalog().then((value) => { if (current) setCatalog(value); }).catch((e) => { if (current) setError(message(e)); });
    return () => { current = false; exporting.current?.abort(); };
  }, []);

  const ordered = new Map<number, LibraryPhoto>();
  for (const photo of catalog?.photos ?? []) {
    if (folder && photo.folderId !== folder) continue;
    if (!ordered.has(photo.id) || (!ordered.get(photo.id)!.available && photo.available)) ordered.set(photo.id, photo);
  }
  const visible = [...ordered.values()].filter((photo) =>
    (!folder || photo.folderId === folder)
    && (filter === "all" || (filter === "picks" && photo.flag === 1)
      || (filter === "rejects" && photo.flag === -1) || (filter === "unflagged" && photo.flag === 0)
      || (filter === "rated" && photo.rating > 0)),
  ) ?? [];
  const index = Math.max(0, visible.findIndex((photo) => photo.id === focused));
  const current = visible[index];
  const page = Math.floor(index / PAGE);
  const pageCount = Math.ceil(visible.length / PAGE);
  const selectionSize = visible.filter((photo) => photo.available && selected.has(photo.id)).length;
  const activeCell = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active && !loupe) activeCell.current?.scrollIntoView({ block: "nearest" });
  }, [active, loupe, current?.id]);

  const move = (delta: number) => {
    const item = visible[Math.min(visible.length - 1, Math.max(0, index + delta))];
    if (item) setFocused(item.id);
  };
  const changeScope = (nextFolder: number, nextFilter: Filter) => {
    setFolder(nextFolder);
    setFilter(nextFilter);
    setSelected(new Set());
    setFocused(undefined);
  };
  const choose = (photo: LibraryPhoto, event: MouseEvent) => {
    setFocused(photo.id);
    if (event.shiftKey) {
      const next = visible.findIndex((item) => item.id === photo.id);
      setSelected(new Set(visible.slice(Math.min(next, index), Math.max(next, index) + 1).map((item) => item.id)));
    } else if (event.metaKey || event.ctrlKey) {
      setSelected((previous) => {
        const next = new Set(previous);
        if (!next.delete(photo.id)) next.add(photo.id);
        return next;
      });
    } else {
      setSelected(new Set([photo.id]));
    }
  };

  const importPhotos = async () => {
    if (busy) return;
    setBusy("import");
    setError("");
    try {
      await write.current;
      const result = await importFolder();
      if (result) {
        const [id, updated] = result;
        setCatalog(updated);
        changeScope(id, "all");
        setLoupe(false);
      }
    } catch (e) { setError(message(e)); }
    finally { setBusy(undefined); }
  };

  const mark = (update: Partial<Pick<LibraryPhoto, "rating" | "flag">>, advance = false) => {
    if (!current?.available) return;
    const id = current.id;
    setCatalog((prev) => prev && { ...prev, photos: prev.photos.map((photo) => photo.id === id ? { ...photo, ...update } : photo) });
    write.current = write.current.then(() => markPhoto(id, update)).catch(async (e) => {
      setError(message(e));
      try { setCatalog(await loadCatalog()); } catch { /* keep the previous catalog visible */ }
    });
    if (advance) move(1);
  };

  const open = async (photo = current) => {
    if (!photo?.available || busy) return;
    setBusy("edit");
    setError("");
    try {
      await editor.openDroppedFile(await originalFile(photo));
      onClose();
    } catch (e) { setError(message(e)); }
    finally { setBusy(undefined); }
  };

  const batch = async () => {
    if (busy) return;
    const photos = visible.filter((photo) => photo.available && (!selected.size || selected.has(photo.id)));
    if (!photos.length) return;
    setBusy("choose");
    setError("");
    let destination: number | null = null;
    try {
      destination = await beginExport();
      if (destination === null) return;
      const controller = new AbortController();
      exporting.current = controller;
      setBusy("export");
      setJob({ current: "", done: 0, failed: [], total: photos.length });
      const result = await exportPhotos(destination, photos, {
        settings: editor.settings, gradeGraph: editor.gradeGraph,
        format: editor.exportFormat as ExportOptions["format"], scale: editor.exportScale,
        quality: editor.exportQuality / 100, text: editor.textOverlay, watermark: editor.watermark,
      }, controller.signal, (progress) => setJob({ ...progress, total: photos.length }));
      setJob({ ...result, total: photos.length, stopped: controller.signal.aborted });
    } catch (e) { setError(message(e)); }
    finally {
      exporting.current = null;
      if (destination !== null) await endExport(destination).catch((e: unknown) => setError(message(e)));
      setBusy(undefined);
    }
  };

  const keyActions = useRef<(event: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyActions.current = (event) => {
      if (busy || (event.target instanceof HTMLElement && event.target.closest("select, input, textarea, [contenteditable]"))) return;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "a") {
        event.preventDefault();
        setSelected(new Set(visible.map((photo) => photo.id)));
      } else if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        const grid = document.querySelector<HTMLElement>("[data-library-grid]");
        const columns = grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length : 1;
        const delta = { arrowright: 1, arrowleft: -1, arrowup: -columns, arrowdown: columns }[key];
        if (delta !== undefined) { event.preventDefault(); move(delta); }
        else if (key === "p") { event.preventDefault(); mark({ flag: 1 }, true); }
        else if (key === "x") { event.preventDefault(); mark({ flag: -1 }, true); }
        else if (key === "u") { event.preventDefault(); mark({ flag: 0 }); }
        else if (/^[0-5]$/.test(key)) { event.preventDefault(); mark({ rating: Number(key) }); }
        else if (key === "g") { event.preventDefault(); setLoupe(false); }
        else if (key === " " && current) { event.preventDefault(); setLoupe((value) => !value); }
        else if (key === "e" || (key === "enter" && !(event.target instanceof HTMLButtonElement))) { event.preventDefault(); void open(); }
      }
    };
  });
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => keyActions.current(event);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (!active) return null;
  return (
    <main className="ui-root flex h-[100dvh] w-screen flex-col overflow-hidden text-[var(--ui-text)]" aria-label="Photo library">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ui-line)] bg-[var(--ui-panel)] px-5 py-3">
        <div className="flex items-center gap-3">
          <button type="button" className={button} onClick={onClose} disabled={Boolean(busy)}><IconArrowLeft size={15} /> Editor</button>
          <h1 className="text-[15px] font-semibold">Library</h1>
        </div>
        <button type="button" className={accent} onClick={() => void importPhotos()} disabled={Boolean(busy)}><IconFolderPlus size={17} />{busy === "import" ? "Scanning folder…" : "Import folder"}</button>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--ui-line)] px-5 py-2.5">
        <select className={field} aria-label="Photo folder" value={folder} onChange={(event) => changeScope(Number(event.target.value), filter)} disabled={Boolean(busy)}>
          <option value={0}>All folders</option>
          {catalog?.folders.map((item) => <option key={item.id} value={item.id} title={item.path}>{item.name} ({item.count})</option>)}
        </select>
        <select className={field} aria-label="Filter photos" value={filter} onChange={(event) => changeScope(folder, event.target.value as Filter)} disabled={Boolean(busy)}>
          <option value="all">All photos</option><option value="picks">Picks</option><option value="unflagged">Unflagged</option>
          <option value="rejects">Rejects</option><option value="rated">Rated</option>
        </select>
        <span className="mr-auto text-xs tabular-nums text-[var(--ui-text-2)]">{visible.length} photos{selectionSize ? ` · ${selectionSize} selected` : ""}</span>
        <button type="button" className={button} aria-pressed={loupe} onClick={() => setLoupe(!loupe)} disabled={!current || Boolean(busy)}>
          {loupe ? <><IconGridDots size={16} /> Grid</> : <><IconPhoto size={16} /> Preview</>}
        </button>
        <button type="button" className={button} onClick={() => void open()} disabled={!current?.available || Boolean(busy)}>{busy === "edit" ? "Opening…" : "Open in Edit"}</button>
        <button type="button" className={button} onClick={() => void batch()} title="Uses the current editor adjustments and export settings" disabled={!visible.some((item) => item.available) || Boolean(busy)}>
          {selectionSize ? `Export ${selectionSize}` : "Batch export"}
        </button>
      </div>

      {error && <div role="alert" className="border-b border-[var(--ui-line)] bg-red-950/40 px-5 py-2 text-sm">{error}</div>}
      {job && <section className="flex flex-wrap items-center gap-3 border-b border-[var(--ui-line)] px-5 py-2.5 text-sm" aria-label="Batch export status">
        <span role="status">{job.stopped ? "Stopped" : busy === "export" ? job.current || "Exporting" : "Export finished"} · {job.done} of {job.total} saved{job.failed.length ? ` · ${job.failed.length} failed` : ""}</span>
        {busy === "export" ? <button className={button} onClick={() => exporting.current?.abort()}>Stop</button> :
          <button className={button} onClick={() => setJob(undefined)} aria-label="Dismiss export result"><IconX size={15} /></button>}
        {job.failed.length > 0 && <details><summary>Errors</summary><ul className="max-h-24 overflow-auto">{job.failed.map((item, i) => <li key={i}>{item}</li>)}</ul></details>}
      </section>}

      {!current ? (
        <div className="grid flex-1 place-content-center px-6 text-center">
          <p className="text-lg font-medium">{!catalog && !error ? "Loading library" : catalog?.folders.length ? "No photos match this filter" : "Open a folder of photos"}</p>
          {catalog?.folders.length === 0 && <p className="mt-2 text-sm text-[var(--ui-text-2)]">Etch keeps your originals where they are.</p>}
        </div>
      ) : loupe ? (
        <div className="min-h-0 flex-1 bg-black p-4" aria-label="Photo preview"><Preview photo={current} large /></div>
      ) : (
        <div className="ui-scroll min-h-0 flex-1 overflow-auto px-5 py-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(155px,1fr))] gap-3" data-library-grid>
            {visible.slice(page * PAGE, (page + 1) * PAGE).map((photo) => (
              <button className={`ui-focus min-w-0 overflow-hidden rounded-md bg-[var(--ui-panel)] text-left ring-1 ${photo.id === current.id ? "ring-[var(--ui-accent)]" : selected.has(photo.id) ? "ring-[var(--ui-text-2)]" : "ring-[var(--ui-line)]"}`}
                key={photo.id} ref={photo.id === current.id ? activeCell : null} aria-pressed={selected.has(photo.id)} aria-label={photo.name} onClick={(event) => choose(photo, event)}
                onDoubleClick={() => { setFocused(photo.id); setLoupe(true); }}>
                <div className="aspect-[4/3] bg-black"><Preview photo={photo} /></div>
                <div className="flex min-h-12 flex-col justify-center px-2 py-1.5">
                  <span className="truncate text-xs">{photo.name}</span>
                  <span className="text-[11px] text-[var(--ui-text-2)]">
                    {photo.available ? (photo.raw ? "RAW" : "Image") : "Missing"}{photo.flag ? photo.flag === 1 ? " · Pick" : " · Reject" : ""}{photo.rating ? ` · ${photo.rating}★` : ""}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {current && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ui-line)] bg-[var(--ui-panel)] px-5 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <button className={button} aria-label="Previous photo or page" onClick={() => move(loupe ? -1 : -PAGE)} disabled={loupe ? index === 0 : page === 0}><IconChevronLeft size={15} /></button>
          <span className="tabular-nums">{loupe ? `${index + 1} / ${visible.length}` : `Page ${page + 1} / ${pageCount}`}</span>
          <button className={button} aria-label="Next photo or page" onClick={() => move(loupe ? 1 : PAGE)} disabled={loupe ? index + 1 >= visible.length : page + 1 >= pageCount}><IconChevronRight size={15} /></button>
          <span className="max-w-48 truncate text-[var(--ui-text-2)]" title={current.name}>{current.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className={button} aria-label="Pick photo" aria-pressed={current.flag === 1} onClick={() => mark({ flag: current.flag === 1 ? 0 : 1 })}><IconFlag size={15} /></button>
          <button className={button} aria-label="Reject photo" aria-pressed={current.flag === -1} onClick={() => mark({ flag: current.flag === -1 ? 0 : -1 })}><IconX size={15} /></button>
          {[1, 2, 3, 4, 5].map((rating) => <button className="ui-focus p-1.5 text-[var(--ui-accent)]" key={rating} aria-label={`Rate ${rating} stars`}
            aria-pressed={rating === current.rating} onClick={() => mark({ rating: rating === current.rating ? 0 : rating })}>
            <IconStar size={17} fill={current.rating >= rating ? "currentColor" : "none"} />
          </button>)}
        </div>
        <span className="text-[var(--ui-text-3)]">← → Browse · P Pick · X Reject · U Clear · 0–5 Rate · Space Preview</span>
      </footer>}
    </main>
  );
}
