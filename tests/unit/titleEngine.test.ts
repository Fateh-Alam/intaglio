import { describe, expect, it } from "vitest";
import { applyCase, captionReport, fontString, layoutLayer, matteBar, trackedWidth, type Measure } from "../../app/editor/text/titleEngine";
import { DEFAULT_TITLES, resolveStyle, resolveTitles, titlesFromLegacy, type TitleLayer } from "../../app/editor/text/titleModel";

// Monospace stand-in: every character is half the font size wide.
const measure: Measure = (text, font) => {
  const px = Number(/([\d.]+)px/.exec(font)?.[1] ?? 16);
  return Array.from(text).length * px * 0.5;
};

const layer = (overrides: Partial<TitleLayer>): TitleLayer => ({ ...DEFAULT_TITLES.layers[0], enabled: true, ...overrides });

describe("title layout", () => {
  it("scales with the image so every output size matches", () => {
    const small = layoutLayer(layer({ text: "Firebird" }), 1000, 1250, measure);
    const large = layoutLayer(layer({ text: "Firebird" }), 4000, 5000, measure);
    expect(large.px / small.px).toBeCloseTo(4);
    expect(large.bounds.x0).toBeCloseTo(small.bounds.x0, 5);
    expect(large.bounds.y1).toBeCloseTo(small.bounds.y1, 5);
  });

  it("counts tracking between letters but not after the last one", () => {
    expect(trackedWidth("ABC", "10px x", 2, measure)).toBe(15 + 4);
  });

  it("wraps long titles inside the measure", () => {
    const result = layoutLayer(layer({ text: "the quiet road out of the old town at dawn", maxWidth: 0.4, overrides: { tracking: 0, textCase: "none" } }), 1000, 1000, measure);
    expect(result.lines.length).toBeGreaterThan(1);
    result.lines.forEach((line) => expect(line.width).toBeLessThanOrEqual(400 + 0.01));
  });

  it("balances caption lines instead of leaving a short orphan", () => {
    const caption = layer({ kind: "caption", look: "caption_cinema", text: "I kept the car for years. I never could let it go, not even once.", size: 0.04, maxWidth: 0.9 });
    const result = layoutLayer(caption, 1000, 1000, measure);
    expect(result.lines).toHaveLength(2);
    const [a, b] = result.lines.map((line) => line.width);
    expect(Math.abs(a - b) / Math.max(a, b)).toBeLessThan(0.2);
  });

  it("reports caption reading rules", () => {
    const caption = layer({ kind: "caption", look: "caption_cinema", text: "Short line.", size: 0.04 });
    expect(captionReport(layoutLayer(caption, 1000, 1000, measure)).ok).toBe(true);
    const long = layer({ kind: "caption", look: "caption_cinema", text: "word ".repeat(60), size: 0.04, maxWidth: 0.9 });
    expect(captionReport(layoutLayer(long, 1000, 1000, measure)).ok).toBe(false);
  });

  it("sets credit roles small and fits the block to the measure", () => {
    const credits = layer({ kind: "credits", text: "directed by JANE DOE  music by SAM ROE", size: 0.08, maxWidth: 0.5 });
    const result = layoutLayer(credits, 1000, 1000, measure);
    const runs = result.lines[0].runs;
    expect(runs.map((run) => run.role)).toEqual([true, false, true, false]);
    expect(runs[0].px).toBeLessThan(runs[1].px);
    expect(runs.every((run) => run.text === run.text.toUpperCase())).toBe(true);
    expect(result.box.width).toBeLessThanOrEqual(500 + 0.01);
  });

  it("never asks bundled single-weight faces for synthetic bold", () => {
    expect(fontString({ font: "condensed", weight: 800, italic: false }, 20)).toMatch(/^400 /);
    expect(fontString({ font: "sans", weight: 800, italic: true }, 20)).toMatch(/^italic 800 /);
  });

  it("applies title case without lowering existing capitals", () => {
    expect(applyCase("the long way home", "title")).toBe("The Long Way Home");
    expect(applyCase("NASA at night", "title")).toBe("NASA At Night");
  });

  it("computes cinema matte bars only when the frame is narrower than the ratio", () => {
    expect(matteBar(2000, 2500, 2.39)).toBeCloseTo((2500 - 2000 / 2.39) / 2);
    expect(matteBar(4000, 1000, 2.39)).toBe(0);
  });
});

describe("title model", () => {
  it("lets layer overrides win over the look", () => {
    const style = resolveStyle(layer({ look: "dune", overrides: { color: "#ff0000", tracking: 0.5 } }));
    expect(style.color).toBe("#ff0000");
    expect(style.tracking).toBe(0.5);
    expect(style.font).toBe("serif");
  });

  it("migrates legacy text settings onto the frame", () => {
    const titles = titlesFromLegacy({
      subtitleEnabled: true, subtitleText: "Night Drive", subtitleStyle: "drive", dateEnabled: true, dateText: "MAY 1", locationText: "OSLO",
      billingBlockEnabled: false, billingBlockText: "", subtitleX: 400, subtitleY: 30, dateX: 0, dateY: 10, billingX: 0, billingY: 5,
      fontSize: 1, letterSpacing: 0, lineHeight: 1.2, opacity: 1, textAlign: "center", customFontEnabled: false, customFontName: "Inter",
      customFontWeight: "400", customFontStyle: "normal", customTextTransform: "none",
    });
    const title = titles.layers.find((item) => item.id === "title")!;
    expect(title).toMatchObject({ enabled: true, text: "Night Drive", look: "drive" });
    expect(title.x).toBeLessThanOrEqual(0.98);
    expect(titles.layers.find((item) => item.id === "dateline")!.text).toBe("MAY 1 · OSLO");
  });

  it("prefers a saved title document over legacy fields", () => {
    const saved = { ...DEFAULT_TITLES, scrim: 0.5 };
    expect(resolveTitles({ titles: saved } as unknown as Parameters<typeof resolveTitles>[0]).scrim).toBe(0.5);
  });
});
