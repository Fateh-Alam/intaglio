import { describe, expect, it } from "vitest";
import {
  clampHistogramPosition,
  defaultHistogramPosition,
  FLOATING_HISTOGRAM_FALLBACK_HEIGHT,
  FLOATING_HISTOGRAM_WIDTH,
  formatHistogramCaption,
  HISTOGRAM_MARGIN,
  isHistogramPosition,
  RIGHT_PANEL_WIDTH,
  TOP_BAR_HEIGHT,
} from "../../app/editor/develop/histogramLayout";

describe("histogramLayout", () => {
  const desktop = { width: 1440, height: 900 };
  const panel = { width: FLOATING_HISTOGRAM_WIDTH, height: FLOATING_HISTOGRAM_FALLBACK_HEIGHT };

  it("places detached histogram beside the right panel on desktop", () => {
    const pos = defaultHistogramPosition(desktop, panel);
    expect(pos).toEqual({
      x: desktop.width - (RIGHT_PANEL_WIDTH + 16) - panel.width,
      y: TOP_BAR_HEIGHT + 16,
    });
  });

  it("places detached histogram inside narrow viewports without overflowing", () => {
    const mobile = { width: 390, height: 844 };
    const pos = defaultHistogramPosition(mobile, panel);
    expect(pos.x).toBeGreaterThanOrEqual(HISTOGRAM_MARGIN);
    expect(pos.x + panel.width).toBeLessThanOrEqual(mobile.width - HISTOGRAM_MARGIN);
    expect(pos.y).toBe(TOP_BAR_HEIGHT + 16);
  });

  it("clamps dragged positions inside all four viewport boundaries", () => {
    expect(clampHistogramPosition({ x: -500, y: -200 }, desktop, panel)).toEqual({
      x: HISTOGRAM_MARGIN,
      y: TOP_BAR_HEIGHT + HISTOGRAM_MARGIN,
    });
    expect(clampHistogramPosition({ x: 4000, y: 3000 }, desktop, panel)).toEqual({
      x: desktop.width - panel.width - HISTOGRAM_MARGIN,
      y: desktop.height - panel.height - HISTOGRAM_MARGIN,
    });
    expect(clampHistogramPosition({ x: 250.4, y: 180.6 }, desktop, panel, 0)).toEqual({
      x: 250,
      y: 181,
    });
  });

  it("validates stored histogram positions safely", () => {
    expect(isHistogramPosition(null)).toBe(true);
    expect(isHistogramPosition({ x: 120, y: 80 })).toBe(true);
    expect(isHistogramPosition({ x: Number.NaN, y: 80 })).toBe(false);
    expect(isHistogramPosition({ x: 120, y: Number.POSITIVE_INFINITY })).toBe(false);
    expect(isHistogramPosition({ x: "120", y: 80 })).toBe(false);
    expect(isHistogramPosition("bad")).toBe(false);
  });

  it("formats EXIF camera metadata or falls back to pixel dimensions", () => {
    expect(
      formatHistogramCaption(
        { iso: 400, focalLengthMm: 35.2, aperture: 2.0, shutterSeconds: 0.004 },
        { width: 4000, height: 3000 },
      ),
    ).toBe("ISO 400  ·  35 mm  ·  ƒ/2  ·  1/250 s");

    expect(
      formatHistogramCaption({ shutterSeconds: 2.5 }, null),
    ).toBe("2.5 s");

    expect(formatHistogramCaption({}, { width: 2000, height: 2500 })).toBe("2000 × 2500");
    expect(formatHistogramCaption({}, null)).toBe("");
  });
});
