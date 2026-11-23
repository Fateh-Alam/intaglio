import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, hydrateEditorSettings } from "../../app/editor/pageTypes";
import { applyRecipe } from "../../app/lib/recipeEngine";
import type { EditorSettings } from "../../app/types/editor";
import type { IntaglioRecipe } from "../../app/types/recipe";

const RETIRED_LEGACY_KEYS = [
  "tealOrange",
  "targetHue",
  "hueShift",
  "filmBlackLift",
  "filmWhiteRolloff",
  "tiltShiftAmount",
  "tiltShiftPosition",
  "tiltShiftAngle",
  "falseColor",
] as const;

describe("legacy settings compatibility", () => {
  it("hydrates legacy .intaglio/.int snapshots without crashing and strips retired dead keys", () => {
    const legacySnapshot = {
      brightness: 0.45,
      saturation: -0.2,
      filmEmulation: "agfa_apx_100",
      tealOrange: 0.6,
      targetHue: 0.3,
      hueShift: 0.15,
      filmBlackLift: 0.25,
      filmWhiteRolloff: 0.4,
      tiltShiftAmount: 0.8,
      tiltShiftPosition: 0.5,
      tiltShiftAngle: 15,
      falseColor: true,
      adjustmentLayers: [
        {
          id: "plate-1",
          name: "Mask 1",
          maskIds: ["m-1"],
          opacity: 0.8,
          blendMode: "normal" as const,
          params: {
            brightness: 0.5,
            tealOrange: 0.9,
            falseColor: true,
          } as Partial<EditorSettings>,
        },
      ],
    } as unknown as Partial<EditorSettings>;

    const hydrated = hydrateEditorSettings(legacySnapshot);

    expect(hydrated.brightness).toBe(0.45);
    expect(hydrated.saturation).toBe(-0.2);
    expect(hydrated.filmEmulation).toBe("agfa_apx_100");
    expect(hydrated.adjustmentLayers).toHaveLength(1);
    expect(hydrated.adjustmentLayers[0].params.brightness).toBe(0.5);

    const hydratedRecord = hydrated as unknown as Record<string, unknown>;
    const plateParamsRecord = hydrated.adjustmentLayers[0].params as unknown as Record<string, unknown>;
    for (const key of RETIRED_LEGACY_KEYS) {
      expect(key in hydratedRecord).toBe(false);
      expect(key in plateParamsRecord).toBe(false);
      expect(key in (DEFAULT_SETTINGS as unknown as Record<string, unknown>)).toBe(false);
    }
  });

  it("applies recipes containing retired legacy keys safely without polluting EditorSettings", () => {
    const legacyRecipe: IntaglioRecipe = {
      id: "legacy-import",
      name: "Legacy Recipe",
      description: "Saved before dead keys were retired.",
      tags: ["Imported"],
      intensityDefault: 1,
      settings: {
        base: { contrast: 0.2, saturation: 0.15 },
        color: { tealOrange: 0.5, targetHue: 0.1, hueShift: 0.2 },
        raw: { filmBlackLift: 0.3, falseColor: true, halation: 0.25 },
      },
    };

    const applied = applyRecipe(DEFAULT_SETTINGS, legacyRecipe, 1);
    expect(applied.contrast).toBeCloseTo(0.2);
    expect(applied.saturation).toBeCloseTo(0.15);
    expect(applied.halation).toBeCloseTo(0.25);

    const record = applied as unknown as Record<string, unknown>;
    for (const key of RETIRED_LEGACY_KEYS) {
      expect(key in record).toBe(false);
    }
  });
});
