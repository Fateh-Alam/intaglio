import { describe, expect, it } from "vitest";
import { EFFECTS, EFFECT_BY_ID } from "../../app/editor/effects/catalog";
import { createEffect, DITHER_METHODS, normalizeCreativeEffects } from "../../app/editor/effects/settings";
import { STUDIO_LOOKS } from "../../app/editor/effects/studioLooks";
import { hydrateEditorSettings, serializeEditorSettings } from "../../app/editor/pageTypes";
import { ditherRgba, sortRgba } from "../../app/editor/render/creative/raster";

describe("creative effect stacks", () => {
  it("keeps identifiers unique and every recipe layer addressable", () => {
    expect(EFFECT_BY_ID.size).toBe(EFFECTS.length);
    expect(new Set(STUDIO_LOOKS.map(({ id }) => id)).size).toBe(STUDIO_LOOKS.length);
    expect(STUDIO_LOOKS.filter(({ group }) => group !== "Classic Recipes")).toHaveLength(171);
    for (const look of STUDIO_LOOKS) {
      expect(look.layers.length).toBeGreaterThan(0);
      for (const [effect] of look.layers) expect(EFFECT_BY_ID.has(effect)).toBe(true);
    }
  });

  it("restores stack order and exact parameters and starts older documents with an empty stack", () => {
    const layers = [
      { ...createEffect("dither", "dither-1"), enabled: false, palette: "custom" as const, customPalette: ["#123456", "#aa5588", "#f0e1d2"] },
      { ...createEffect("ascii-studio", "characters-1"), glyphs: " ·░▓█", opacity: 0.45, phase: 0.23 },
    ];
    const saved = serializeEditorSettings({ ...hydrateEditorSettings(), creativeEffects: layers });
    expect(hydrateEditorSettings(saved).creativeEffects).toEqual(layers);
    expect(hydrateEditorSettings({}).creativeEffects).toEqual([]);
  });

  it("bounds archive values and removes unknown effects safely", () => {
    const layers = normalizeCreativeEffects([
      { effect: "unknown" },
      { effect: "characters", id: "one", size: 9000, opacity: -3, angle: -5000, light: "bad", glyphs: "x".repeat(70) },
      { effect: "dither", id: "one", palette: "invalid", detail: NaN },
    ]);
    expect(layers).toHaveLength(2);
    expect(layers[0]).toMatchObject({ id: "one", size: 120, opacity: 0, angle: -180, light: "#e9efdf", glyphs: "x".repeat(64) });
    expect(layers[1]).toMatchObject({ id: "one-copy", palette: "mono", detail: 1 });
  });
});

describe("raster effects", () => {
  it("dithers deterministically into palette colors without changing alpha", () => {
    const input = Uint8Array.from({ length: 17 * 13 * 4 }, (_, i) => i % 4 === 3 ? 255 : (i * 11) % 256);
    input[3] = 0;
    for (const dither of Object.keys(DITHER_METHODS) as (keyof typeof DITHER_METHODS)[]) {
      const config = { ...createEffect("dither", "test"), dither };
      const a = input.slice(), b = input.slice();
      ditherRgba(a, 17, 13, config);
      ditherRgba(b, 17, 13, config);
      expect(a).toEqual(b);
      expect(a.slice(0, 4)).toEqual(input.slice(0, 4));
      for (let i = 4; i < a.length; i += 4) {
        expect(a[i] === 0 || a[i] === 255).toBe(true);
        expect(a[i]).toBe(a[i + 1]);
        expect(a[i + 1]).toBe(a[i + 2]);
        expect(a[i + 3]).toBe(255);
      }
    }
  });

  it("sorts pixels within bright runs and leaves the dark separators in place", () => {
    const input = Uint8Array.from([220, 160, 4, 250, 150, 10].flatMap((level) => [level, level, level, 255]));
    sortRgba(input, 6, 1, { ...createEffect("pixel-sort", "test"), size: 120, detail: 0.4 });
    expect(Array.from(input.filter((_, index) => index % 4 === 0))).toEqual([160, 220, 4, 150, 250, 10]);
  });
});
