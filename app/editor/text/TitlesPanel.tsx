"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IconAlignCenter, IconAlignLeft, IconAlignRight, IconChevronRight, IconEye, IconEyeOff, IconPlus, IconTrash, IconUpload,
} from "@tabler/icons-react";
import { useEditorState } from "../hooks/useEditorState";
import { useShell } from "../shell/useShell";
import { Segmented, Switch } from "../../ui/Controls";
import { DevSlider } from "../../ui/DevSlider";
import { SubHeading } from "../../ui/Section";
import { WATERMARK_POSITIONS } from "../pageTypes";
import { ensureOverlayFonts } from "../render/overlayCompositor";
import { CAPTION_MAX_CHARS, CAPTION_MAX_LINES, captionReport, drawLayer, drawTitles, layoutLayer, type Measure } from "./titleEngine";
import {
  findLook, frameTone, looksFor, resolveStyle, resolveTitles, TITLE_CARDS, type FontKey, type FrameTone, type LayerOverrides, type MatteRatio, type TextCase,
  type TitleCard, type TitleDocument, type TitleLayer, type TitleLook,
} from "./titleModel";

/** A title card previewed on the person's own photo, by the export renderer. */
function CardTile({ card, document: current, imageSrc, aspect, tone, onApply }: { card: TitleCard; document: TitleDocument; imageSrc: string | null; aspect: number; tone?: FrameTone; onApply: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preview = useMemo(() => card.apply(current, aspect, tone), [card, current, aspect, tone]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    // Tiles show the whole frame, so the card's composition reads at a glance.
    const height = 112 * ratio;
    const width = Math.round(height * aspect);
    const image = new Image();
    const draw = () => {
      if (cancelled) return;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#1a1a1c";
      context.fillRect(0, 0, width, height);
      if (image.complete && image.naturalWidth) context.drawImage(image, 0, 0, width, height);
      drawTitles(context, preview, width, height);
    };
    void ensureOverlayFonts({ text: { titles: preview } as never, watermark: NO_WATERMARK }).then(() => {
      if (!imageSrc) { draw(); return; }
      image.onload = draw;
      image.onerror = draw;
      image.src = imageSrc;
    });
    return () => { cancelled = true; };
  }, [preview, imageSrc, aspect]);
  return (
    <button
      type="button"
      onClick={onApply}
      aria-label={`Apply ${card.name}: ${card.description}`}
      className="ui-focus group flex flex-col gap-1.5 rounded-[11px] p-1.5 text-left transition-colors hover:bg-white/[0.05]"
    >
      <span className="grid h-[112px] w-full place-items-center overflow-hidden rounded-[8px] bg-black/40 ring-1 ring-inset ring-white/[0.06] transition group-hover:ring-white/20">
        <canvas ref={canvasRef} className="h-full w-auto max-w-full object-contain" aria-hidden />
      </span>
      <span className="px-0.5">
        <span className="block text-[11.5px] font-medium text-[var(--ui-text)]">{card.name}</span>
        <span className="block text-[10.5px] text-[var(--ui-text-3)]">{card.description}</span>
      </span>
    </button>
  );
}
import { layerName, TITLE_EDIT_EVENT } from "./TitleStage";

const FONTS: ReadonlyArray<{ id: FontKey; label: string }> = [
  { id: "condensed", label: "Condensed" },
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Mono" },
];

const PLACES: ReadonlyArray<{ id: string; label: string; y: number }> = [
  { id: "top", label: "Top", y: 0.12 },
  { id: "middle", label: "Middle", y: 0.5 },
  { id: "lower", label: "Lower third", y: 0.7 },
  { id: "bottom", label: "Bottom", y: 0.88 },
];

const MATTES: ReadonlyArray<{ id: string; label: string; ratio: MatteRatio }> = [
  { id: "0", label: "None", ratio: 0 },
  { id: "1.85", label: "1.85", ratio: 1.85 },
  { id: "2", label: "2.00", ratio: 2 },
  { id: "2.39", label: "2.39", ratio: 2.39 },
];

const NO_WATERMARK = { enabled: false, text: "", position: "bottom-right" as const, opacity: 0, size: 0 };

/** A look's name drawn in the look itself, by the same renderer the export uses. */
function LookTile({ look, kind, selected, onSelect }: { look: TitleLook; kind: TitleLayer["kind"]; selected: boolean; onSelect: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = 132 * ratio;
    const height = 60 * ratio;
    const layer: TitleLayer = {
      id: look.id, kind: kind === "caption" ? "caption" : "title", enabled: true,
      text: kind === "caption" ? "Captions read here." : look.name, look: look.id,
      size: kind === "caption" ? 0.2 : 0.3, x: 0.5, y: 0.52, align: "center", maxWidth: 0.9, opacity: 1, overrides: {},
    };
    const draft = { titles: { version: 1, layers: [layer], matte: { ratio: 0, color: "#000", opacity: 1 }, scrim: 0 } } as never;
    void ensureOverlayFonts({ text: draft, watermark: NO_WATERMARK }).then(() => {
      if (cancelled) return;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, width, height);
      const measure: Measure = (value, font) => { context.font = font; return context.measureText(value).width; };
      const layout = layoutLayer({ ...layer, size: layer.size }, width, height, measure);
      // Long names: shrink to fit the tile.
      const fit = Math.min(1, (width * 0.88) / Math.max(1, layout.box.width));
      const fitted = fit < 1 ? layoutLayer({ ...layer, size: layer.size * fit }, width, height, measure) : layout;
      drawLayer(context, { ...layer, size: layer.size * fit }, fitted);
    });
    return () => { cancelled = true; };
  }, [look, kind]);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${look.name}: ${look.mood}`}
      title={look.mood}
      className={`ui-focus group relative overflow-hidden rounded-[9px] bg-[radial-gradient(120%_120%_at_50%_0%,#2a2a2e,#121214)] ring-1 ring-inset transition-[box-shadow] ${selected ? "ring-[var(--ui-accent)] shadow-[0_0_0_3px_var(--ui-accent-soft)]" : "ring-white/[0.07] hover:ring-white/20"}`}
    >
      <canvas ref={canvasRef} className="block h-[60px] w-full" aria-hidden />
      {kind === "caption" && <span className="block truncate border-t border-white/[0.05] px-2 py-1 text-left text-[10.5px] text-[var(--ui-text-3)] group-hover:text-[var(--ui-text-2)]">{look.name}</span>}
    </button>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff";
  return (
    <label className="flex h-8 items-center justify-between text-[12px] text-[var(--ui-text-2)]">
      {label}
      <span className="flex items-center gap-2">
        <span className="ui-num text-[11px] uppercase text-[var(--ui-text-3)]">{hex}</span>
        <span className="relative h-6 w-6 overflow-hidden rounded-[6px] ring-1 ring-inset ring-white/15" style={{ background: hex }}>
          <input type="color" aria-label={label} value={hex} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </span>
      </span>
    </label>
  );
}

export function TitlesPanel() {
  const { textOverlay, setTextOverlay, handleFontUpload, watermark, setWatermark, imageInfo, imageSrc, histogram } = useEditorState();
  const shell = useShell();
  const titles = useMemo(() => resolveTitles(textOverlay), [textOverlay]);
  const aspect = imageInfo && imageInfo.height > 0 ? imageInfo.width / imageInfo.height : 0.8;
  const sample = histogram?.scopeSample;
  const tone = useMemo(() => (sample ? frameTone(sample.pixels, sample.width, sample.height) : undefined), [sample]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const selected = titles.layers.find((layer) => layer.id === shell.selectedTitleId) ?? null;
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [fontError, setFontError] = useState<string | null>(null);

  const setTitles = (change: (document: TitleDocument) => TitleDocument) =>
    setTextOverlay((current) => ({ ...current, titles: change(resolveTitles(current)) }));
  const updateLayer = (id: string, change: Partial<TitleLayer>) =>
    setTitles((document) => ({ ...document, layers: document.layers.map((layer) => (layer.id === id ? { ...layer, ...change } : layer)) }));
  const override = (id: string, change: LayerOverrides) =>
    setTitles((document) => ({ ...document, layers: document.layers.map((layer) => (layer.id === id ? { ...layer, overrides: { ...layer.overrides, ...change } } : layer)) }));

  // Double-click or Enter on the photo jumps to the text field.
  useEffect(() => {
    const onEdit = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      shell.setSelectedTitleId(id);
      requestAnimationFrame(() => { textRef.current?.focus(); textRef.current?.select(); });
    };
    window.addEventListener(TITLE_EDIT_EVENT, onEdit);
    return () => window.removeEventListener(TITLE_EDIT_EVENT, onEdit);
  }, [shell]);

  const style = selected ? resolveStyle(selected) : null;

  // Caption reading rules, measured with the real fonts at the photo's proportions.
  const [report, setReport] = useState<ReturnType<typeof captionReport> | null>(null);
  useEffect(() => {
    if (!selected || selected.kind !== "caption") return;
    let cancelled = false;
    void ensureOverlayFonts({ text: textOverlay, watermark: NO_WATERMARK }).then(() => {
      const context = document.createElement("canvas").getContext("2d");
      if (cancelled || !context) return;
      const measure: Measure = (value, font) => { context.font = font; return context.measureText(value).width; };
      const aspect = imageInfo ? imageInfo.height / imageInfo.width : 1.25;
      setReport(captionReport(layoutLayer(selected, 1000, 1000 * aspect, measure)));
    });
    return () => { cancelled = true; };
  }, [selected, textOverlay, imageInfo]);

  const addText = () => {
    const id = `text-${Date.now().toString(36)}`;
    setTitles((document) => ({
      ...document,
      layers: [...document.layers, { id, kind: "text", enabled: true, text: "Your words", look: document.layers.find((layer) => layer.kind === "title")?.look ?? "blade_runner", size: 0.05, x: 0.5, y: 0.5, align: "center", maxWidth: 0.8, opacity: 1, overrides: {} }],
    }));
    shell.setSelectedTitleId(id);
    requestAnimationFrame(() => { textRef.current?.focus(); textRef.current?.select(); });
  };

  const uploadFont = async (file: File, layerId: string) => {
    setFontError(null);
    try {
      await handleFontUpload(file);
      setTextOverlay((current) => {
        const document = resolveTitles(current);
        return { ...current, titles: { ...document, layers: document.layers.map((layer) => (layer.id === layerId ? { ...layer, overrides: { ...layer.overrides, font: `custom:${current.customFontName}` as FontKey } } : layer)) } };
      });
    } catch (error) {
      setFontError(error instanceof Error ? error.message : "That font could not be loaded.");
    }
  };

  const customFamily = textOverlay.customFontEnabled && textOverlay.customFontName.trim() ? textOverlay.customFontName.trim() : null;
  const fontOptions = customFamily ? [...FONTS, { id: `custom:${customFamily}` as FontKey, label: "Uploaded" }] : FONTS;
  const singleWeight = style?.font === "condensed" || style?.font === "serif";

  return (
    <div className="ui-scroll h-full overflow-y-auto">
      {/* ── Title cards ──────────────────────────────────── */}
      <div className="border-b border-[var(--ui-line)] px-2.5 pb-2.5 pt-3">
        <p className="mb-1 px-1.5 text-[12.5px] font-semibold text-[var(--ui-text)]">Title cards</p>
        <p className="mb-2 px-1.5 text-[11px] text-[var(--ui-text-3)]">One tap for a finished frame. Your words are kept.</p>
        <div className="grid grid-cols-2 gap-0.5">
          {TITLE_CARDS.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              document={titles}
              imageSrc={imageSrc}
              aspect={aspect}
              tone={tone}
              onApply={() => {
                setTitles((document) => card.apply(document, aspect, tone));
                const first = card.apply(titles, aspect, tone).layers.find((layer) => layer.enabled);
                if (first) shell.setSelectedTitleId(first.id);
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Layers ───────────────────────────────────────── */}
      <div className="border-b border-[var(--ui-line)] px-3 pb-3 pt-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[12.5px] font-semibold text-[var(--ui-text)]">Titles & captions</span>
          <button type="button" onClick={addText} className="ui-focus flex h-7 items-center gap-1 rounded-[7px] px-2 text-[11.5px] font-medium text-[var(--ui-text-2)] transition-colors hover:bg-white/[0.06] hover:text-[var(--ui-text)]">
            <IconPlus size={13} stroke={2} /> Add text
          </button>
        </div>
        <ul aria-label="Text layers" className="space-y-0.5">
          {titles.layers.map((layer) => {
            const active = layer.id === shell.selectedTitleId;
            return (
              <li key={layer.id}>
                <div className={`group flex h-10 items-center gap-1 rounded-[9px] pr-1 transition-colors ${active ? "bg-white/[0.07]" : "hover:bg-white/[0.035]"}`}>
                  <button
                    type="button"
                    aria-label={layer.enabled ? `Hide ${layerName(layer)}` : `Show ${layerName(layer)}`}
                    aria-pressed={layer.enabled}
                    onClick={() => { updateLayer(layer.id, { enabled: !layer.enabled }); shell.setSelectedTitleId(layer.id); }}
                    className={`ui-focus grid h-8 w-8 shrink-0 place-items-center rounded-[7px] transition-colors ${layer.enabled ? "text-[var(--ui-text)]" : "text-[var(--ui-text-3)] hover:text-[var(--ui-text-2)]"}`}
                  >
                    {layer.enabled ? <IconEye size={15} stroke={1.7} /> : <IconEyeOff size={15} stroke={1.7} />}
                  </button>
                  <button type="button" onClick={() => shell.setSelectedTitleId(layer.id)} aria-current={active} className="ui-focus flex h-full min-w-0 flex-1 flex-col justify-center rounded-[7px] text-left">
                    <span className={`text-[12px] font-medium ${layer.enabled ? "text-[var(--ui-text)]" : "text-[var(--ui-text-2)]"}`}>{layerName(layer)}</span>
                    <span className="truncate text-[11px] text-[var(--ui-text-3)]">{layer.text.split("\n")[0] || "Empty"}</span>
                  </button>
                  {layer.kind === "text" && (
                    <button
                      type="button"
                      aria-label="Delete text layer"
                      onClick={() => { setTitles((document) => ({ ...document, layers: document.layers.filter((item) => item.id !== layer.id) })); shell.setSelectedTitleId(null); }}
                      className="ui-focus grid h-7 w-7 place-items-center rounded-[7px] text-[var(--ui-text-3)] opacity-0 transition hover:bg-white/[0.06] hover:text-[var(--ui-danger)] group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <IconTrash size={14} stroke={1.7} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {selected && style ? (
        <div className="space-y-5 border-b border-[var(--ui-line)] px-4 py-4">
          {/* Text */}
          <div>
            <SubHeading right={selected.kind === "caption" && report ? (
              <span className={`ui-num text-[10.5px] ${report.ok ? "text-[var(--ui-text-3)]" : "text-[var(--ui-warn)]"}`} title={`Caption guideline: up to ${CAPTION_MAX_CHARS} characters per line, ${CAPTION_MAX_LINES} lines`}>
                {report.longest}/{CAPTION_MAX_CHARS} per line · {report.lines} {report.lines === 1 ? "line" : "lines"}
              </span>
            ) : undefined}>{layerName(selected)}</SubHeading>
            <textarea
              ref={textRef}
              aria-label={`${layerName(selected)} text`}
              value={selected.text}
              rows={selected.kind === "credits" ? 4 : 2}
              onChange={(event) => updateLayer(selected.id, { text: event.target.value, enabled: true })}
              className="ui-focus w-full resize-y rounded-[9px] bg-black/30 px-3 py-2.5 text-[13px] leading-relaxed text-[var(--ui-text)] outline-none ring-1 ring-inset ring-[var(--ui-line)] placeholder:text-[var(--ui-text-3)] focus:ring-[var(--ui-accent)]"
            />
            {selected.kind === "credits" && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--ui-text-3)]">Type roles in lowercase and names in capitals. Two spaces separate credits; each line is fitted to the frame.</p>
            )}
            {selected.kind === "caption" && report && !report.ok && (
              <p role="status" className="mt-1.5 text-[11px] leading-relaxed text-[var(--ui-warn)]">Long for a caption. Viewers read up to {CAPTION_MAX_CHARS} characters a line, on {CAPTION_MAX_LINES} lines.</p>
            )}
          </div>

          {/* Looks */}
          <div>
            <SubHeading>{selected.kind === "caption" ? "Caption style" : "Look"}</SubHeading>
            <div className="grid grid-cols-2 gap-1.5">
              {looksFor(selected.kind).map((item) => (
                <LookTile key={item.id} look={item} kind={selected.kind} selected={findLook(selected.look, selected.kind).id === item.id} onSelect={() => updateLayer(selected.id, { look: item.id, overrides: {}, enabled: true })} />
              ))}
            </div>
          </div>

          <button
            type="button"
            aria-expanded={adjustOpen}
            onClick={() => setAdjustOpen((open) => !open)}
            className="ui-focus -mx-1 flex h-8 w-[calc(100%+0.5rem)] items-center gap-1.5 rounded-[8px] px-1 text-left text-[12px] font-medium text-[var(--ui-text-2)] transition-colors hover:text-[var(--ui-text)]"
          >
            <IconChevronRight size={14} stroke={2} className="transition-transform duration-200" style={{ transform: adjustOpen ? "rotate(90deg)" : "none" }} />
            Adjust
            <span className="font-normal text-[var(--ui-text-3)]">· type, finish, placement</span>
            {Object.keys(selected.overrides).length > 0 && <span aria-label="Adjusted" className="ml-auto h-[5px] w-[5px] rounded-full bg-[var(--ui-accent)]" />}
          </button>

          {adjustOpen && <>
          {/* Typography */}
          <div>
            <SubHeading right={Object.keys(selected.overrides).length > 0 ? (
              <button type="button" onClick={() => updateLayer(selected.id, { overrides: {} })} className="ui-focus rounded px-1 text-[10.5px] text-[var(--ui-accent)] hover:text-[var(--ui-accent-strong)]">Reset to look</button>
            ) : undefined}>Type</SubHeading>
            <Segmented
              value={fontOptions.some((option) => option.id === style.font) ? style.font : "sans"}
              onChange={(font) => override(selected.id, { font })}
              options={fontOptions}
              className="mb-2"
            />
            <label className="ui-focus mb-3 flex h-7 cursor-pointer items-center gap-1.5 rounded-[7px] px-1 text-[11.5px] text-[var(--ui-text-3)] transition-colors hover:text-[var(--ui-text)] focus-within:text-[var(--ui-text)]">
              <IconUpload size={13} stroke={1.8} /> Use your own font (.woff2, .ttf, .otf)
              <input type="file" accept=".woff2,.ttf,.otf" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFont(file, selected.id); event.target.value = ""; }} />
            </label>
            {fontError && <p role="alert" className="-mt-2 mb-2 text-[11px] text-[var(--ui-danger)]">{fontError}</p>}
            <div className="mb-2 flex gap-2">
              <Segmented
                className="flex-1"
                value={style.textCase}
                onChange={(textCase: TextCase) => override(selected.id, { textCase })}
                options={[{ id: "none", label: "Aa", hint: "As typed" }, { id: "upper", label: "AA", hint: "All caps" }, { id: "title", label: "Title", hint: "Title Case" }]}
              />
              <Segmented
                value={selected.align}
                onChange={(align) => updateLayer(selected.id, { align })}
                options={[
                  { id: "left", label: <IconAlignLeft size={14} />, hint: "Align left" },
                  { id: "center", label: <IconAlignCenter size={14} />, hint: "Align center" },
                  { id: "right", label: <IconAlignRight size={14} />, hint: "Align right" },
                ]}
              />
            </div>
            {style.font !== "condensed" && style.font !== "mono" && (
              <Switch label="Italic" checked={style.italic} onChange={(italic) => override(selected.id, { italic })} />
            )}
            <DevSlider label="Size" value={selected.size} defaultValue={0.05} min={0.008} max={0.2} step={0.001} onChange={(size) => updateLayer(selected.id, { size })} format={(value) => `${(value * 100).toFixed(1)}%`} hint="Font size as a share of the photo's shorter edge" />
            <DevSlider label="Weight" value={style.weight} defaultValue={findLook(selected.look, selected.kind).weight} min={100} max={900} step={100} onChange={(weight) => override(selected.id, { weight })} format={(value) => String(Math.round(value))} disabled={singleWeight} disabledHint="This typeface has one weight" />
            <DevSlider label="Tracking" value={style.tracking} defaultValue={findLook(selected.look, selected.kind).tracking} min={-0.05} max={0.6} step={0.005} onChange={(tracking) => override(selected.id, { tracking })} format={(value) => `${Math.round(value * 1000)}`} hint="Space between letters, in thousandths of an em" />
            <DevSlider label="Leading" value={style.leading} defaultValue={findLook(selected.look, selected.kind).leading} min={0.8} max={2} step={0.01} onChange={(leading) => override(selected.id, { leading })} format={(value) => value.toFixed(2)} hint="Space between lines" />
            <ColorField label="Color" value={style.color} onChange={(color) => override(selected.id, { color })} />
          </div>

          {/* Effects */}
          <div>
            <SubHeading>Finish</SubHeading>
            <DevSlider label="Shadow" value={style.shadow} defaultValue={findLook(selected.look, selected.kind).shadow} min={0} max={1} step={0.01} onChange={(shadow) => override(selected.id, { shadow })} />
            <DevSlider label="Glow" value={style.glow} defaultValue={findLook(selected.look, selected.kind).glow} min={0} max={1} step={0.01} onChange={(glow) => override(selected.id, { glow })} />
            <DevSlider label="Outline" value={style.outline} defaultValue={findLook(selected.look, selected.kind).outline} min={0} max={0.12} step={0.002} onChange={(outline) => override(selected.id, { outline })} format={(value) => `${Math.round(value * 1000)}`} />
            <DevSlider label="Caption box" value={style.plate} defaultValue={findLook(selected.look, selected.kind).plate} min={0} max={1} step={0.01} onChange={(plate) => override(selected.id, { plate })} hint="A dark box behind each line for legibility" />
            <DevSlider label="Opacity" value={selected.opacity} defaultValue={1} min={0} max={1} step={0.01} onChange={(opacity) => updateLayer(selected.id, { opacity })} />
          </div>

          {/* Placement */}
          <div>
            <SubHeading>Place</SubHeading>
            <div className="grid grid-cols-4 gap-1">
              {PLACES.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  aria-pressed={Math.abs(selected.y - place.y) < 0.005 && Math.abs(selected.x - 0.5) < 0.005}
                  onClick={() => updateLayer(selected.id, { x: 0.5, y: place.y })}
                  className="ui-focus h-8 rounded-[7px] text-[11px] text-[var(--ui-text-2)] ring-1 ring-inset ring-white/[0.06] transition-colors hover:bg-white/[0.05] hover:text-[var(--ui-text)] aria-pressed:bg-white/[0.1] aria-pressed:text-[var(--ui-text)]"
                >
                  {place.label}
                </button>
              ))}
            </div>
            <DevSlider label="Wrap width" value={selected.maxWidth} defaultValue={0.86} min={0.2} max={1} step={0.01} onChange={(maxWidth) => updateLayer(selected.id, { maxWidth })} hint="How wide a line can run before wrapping" />
          </div>
          </>}
          <p className="text-[11px] leading-relaxed text-[var(--ui-text-3)]">Drag text on the photo to move it; it snaps to the center. Arrow keys nudge, Shift moves further, Enter edits.</p>
        </div>
      ) : (
        <p className="border-b border-[var(--ui-line)] px-5 py-6 text-[12px] leading-relaxed text-[var(--ui-text-3)]">Choose a layer to edit it, or click text on the photo.</p>
      )}

      {/* ── Frame ─────────────────────────────────────────── */}
      <div className="space-y-1 border-b border-[var(--ui-line)] px-4 py-4">
        <SubHeading>Frame</SubHeading>
        <div className="flex h-8 items-center justify-between gap-3 text-[12px] text-[var(--ui-text-2)]">
          <span>Cinema bars</span>
          <Segmented
            value={String(titles.matte.ratio)}
            onChange={(id) => setTitles((document) => ({ ...document, matte: { ...document.matte, ratio: MATTES.find((matte) => matte.id === id)!.ratio } }))}
            options={MATTES.map(({ id, label }) => ({ id, label }))}
          />
        </div>
        <DevSlider label="Darken behind titles" value={titles.scrim} defaultValue={0} min={0} max={1} step={0.01} onChange={(scrim) => setTitles((document) => ({ ...document, scrim }))} hint="A soft gradient at the bottom of the frame, tinted by the title's look" />
        <Switch label="Show safe areas" checked={shell.showSafeGuides} onChange={shell.setShowSafeGuides} hint="Title safe (90%) and action safe (93%) frames" />
      </div>

      {/* ── Watermark ─────────────────────────────────────── */}
      <div className="px-4 py-4">
        <SubHeading>Watermark</SubHeading>
        <Switch label="Add watermark" checked={watermark.enabled} onChange={(enabled) => setWatermark((current) => ({ ...current, enabled, text: current.text || "PROOF" }))} />
        {watermark.enabled && (
          <>
            <input
              value={watermark.text}
              aria-label="Watermark text"
              onChange={(event) => setWatermark((current) => ({ ...current, text: event.target.value }))}
              placeholder="© Your Name"
              className="my-2 h-8 w-full rounded-[8px] bg-black/30 px-2.5 text-[12px] outline-none ring-1 ring-inset ring-[var(--ui-line)] focus:ring-[var(--ui-accent)]"
            />
            <div className="mb-2 grid grid-cols-3 gap-1">
              {WATERMARK_POSITIONS.map((position) => (
                <button
                  key={position.id}
                  type="button"
                  aria-pressed={watermark.position === position.id}
                  onClick={() => setWatermark((current) => ({ ...current, position: position.id }))}
                  className={`ui-focus h-7 rounded-[7px] text-[11px] transition-colors ${watermark.position === position.id ? "bg-white/[0.1] text-[var(--ui-text)]" : "text-[var(--ui-text-3)] hover:bg-white/[0.05] hover:text-[var(--ui-text-2)]"}`}
                >
                  {position.label}
                </button>
              ))}
            </div>
            <DevSlider label="Watermark opacity" value={watermark.opacity} defaultValue={0.62} min={0} max={1} onChange={(opacity) => setWatermark((current) => ({ ...current, opacity }))} format={(value) => `${Math.round(value * 100)}%`} />
            <DevSlider label="Watermark size" value={watermark.size} defaultValue={0.32} min={0} max={1} onChange={(size) => setWatermark((current) => ({ ...current, size }))} format={(value) => `${Math.round(value * 100)}`} />
          </>
        )}
      </div>
    </div>
  );
}
