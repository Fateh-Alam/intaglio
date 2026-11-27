import { describe, expect, it } from "vitest";
import { frameSettings, hasAnimatedEffects, videoSize } from "../../app/editor/render/videoExport";
import { DEFAULT_SETTINGS } from "../../app/editor/pageTypes";
import { createEffect } from "../../app/editor/effects/settings";
import type { EditorSettings } from "../../app/types/editor";

const withEffects = (...layers: ReturnType<typeof createEffect>[]): EditorSettings => ({ ...DEFAULT_SETTINGS, creativeEffects: layers });

describe("video export", () => {
  it("only treats enabled effects with a phase control as animated", () => {
    expect(hasAnimatedEffects(withEffects(createEffect("ripple")))).toBe(true);
    expect(hasAnimatedEffects(withEffects({ ...createEffect("ripple"), enabled: false }))).toBe(false);
    expect(hasAnimatedEffects(withEffects(createEffect("color-overlay")))).toBe(false);
  });

  it("runs each animated layer through one full cycle so the clip loops", () => {
    const settings = withEffects({ ...createEffect("ripple"), phase: 0.25 }, createEffect("color-overlay"));
    expect(frameSettings(settings, 0).creativeEffects[0].phase).toBeCloseTo(0.25);
    expect(frameSettings(settings, 0.5).creativeEffects[0].phase).toBeCloseTo(0.75);
    expect(frameSettings(settings, 0.9).creativeEffects[0].phase).toBeCloseTo(0.15);
    // Still layers keep their phase.
    expect(frameSettings(settings, 0.5).creativeEffects[1].phase).toBe(settings.creativeEffects[1].phase);
  });

  it("sizes video to even dimensions without upscaling", () => {
    const full = { x: 0, y: 0, width: 1, height: 1 };
    expect(videoSize(2000, 2500, full, 1080)).toEqual({ width: 1080, height: 1350 });
    expect(videoSize(1001, 667, full, 2160)).toEqual({ width: 1002, height: 668 });
  });
});
