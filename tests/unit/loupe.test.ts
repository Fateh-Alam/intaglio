import { describe, expect, it } from "vitest";
import { clampCenter, fitScale, formatScale, loupeLayout, magnification, planLoupeRender, stepScale } from "../../app/editor/shell/loupe";

const view = { width: 1000, height: 800 };
const fitCss = { width: 900, height: 600 };
const output = { width: 6000, height: 4000 };

describe("loupe", () => {
  it("defines 100% as one image pixel per device pixel", () => {
    const fit = fitScale(fitCss, output, 2);
    expect(fit).toBeCloseTo(0.3);
    expect(magnification({ scale: 1, cx: 0.5, cy: 0.5 }, fit)).toBeCloseTo(1 / 0.3);
    expect(magnification({ scale: 0.1, cx: 0.5, cy: 0.5 }, fit)).toBe(1);
  });

  it("keeps the photo covering the viewport when panning", () => {
    expect(clampCenter(0, 1, { width: 2000, height: 600 }, view)).toEqual({ cx: 0.25, cy: 0.5 });
    const layout = loupeLayout(view, fitCss, 4, 0.9, 0.1);
    expect(layout.visible).toEqual({ left: 0, top: 0, width: 1000, height: 800 });
    expect(layout.window.x1).toBeCloseTo(1);
    expect(layout.window.y0).toBeCloseTo(0);
  });

  it("maps the viewport center to the stored image center", () => {
    const layout = loupeLayout(view, fitCss, 3, 0.4, 0.6);
    expect((layout.window.x0 + layout.window.x1) / 2).toBeCloseTo(0.4);
    expect((layout.window.y0 + layout.window.y1) / 2).toBeCloseTo(0.6);
    expect(layout.pan.x).toBeCloseTo(0.1 * 2700);
  });

  it("renders only the visible tile at one image pixel per render pixel at 100% and above", () => {
    const fit = fitScale(fitCss, output, 2);
    const layout = loupeLayout(view, fitCss, 2 / fit, 0.5, 0.5);
    const plan = planLoupeRender(layout, output, 2, false, 16384);
    expect(plan.mode).toBe("tile");
    expect(plan.resolution).toBe(1);
    if (plan.mode !== "tile") return;
    expect(plan.tile.fullWidth).toBe(6000);
    expect(plan.width).toBeLessThanOrEqual(1000 + 128);
    expect(plan.window.x0).toBeLessThanOrEqual(layout.window.x0);
    expect(plan.window.x1).toBeGreaterThanOrEqual(layout.window.x1);
  });

  it("renders Creative Effects as a whole frame, capped by the GPU", () => {
    const fit = fitScale(fitCss, output, 2);
    const plan = planLoupeRender(loupeLayout(view, fitCss, 1 / fit, 0.5, 0.5), output, 2, true, 16384);
    expect(plan).toMatchObject({ mode: "full", width: 6000, height: 4000, resolution: 1, window: { x0: 0, y0: 0, x1: 1, y1: 1 } });
    const capped = planLoupeRender(loupeLayout(view, fitCss, 1 / fit, 0.5, 0.5), output, 2, true, 4096);
    expect(capped.width).toBe(4096);
    expect(capped.resolution).toBeLessThan(1);
  });

  it("steps through zoom stops above Fit and back to Fit", () => {
    expect(stepScale(0.3, 0.3, 1)).toBe(0.5);
    expect(stepScale(1, 0.3, 1)).toBe(2);
    expect(stepScale(0.5, 0.3, -1)).toBeNull();
    expect(stepScale(2, 0.3, -1)).toBe(1);
    expect(formatScale(null)).toBe("Fit");
    expect(formatScale(1)).toBe("100%");
  });
});
