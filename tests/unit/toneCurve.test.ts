import { describe, expect, it } from "vitest";
import { buildToneCurveTable, isIdentityCurveSet, sampleMonotoneCurve } from "../../app/utils/spline";

const identity = [{ x: 0, y: 0 }, { x: 1, y: 1 }];

describe("PCHIP tone curves", () => {
  it("reproduces the identity and hits every control point", () => {
    const lut = sampleMonotoneCurve(identity, 11);
    lut.forEach((value, index) => expect(value).toBeCloseTo(index / 10, 6));
    const points = [{ x: 0, y: 0.05 }, { x: 0.25, y: 0.2 }, { x: 0.5, y: 0.6 }, { x: 1, y: 0.95 }];
    const curve = sampleMonotoneCurve(points, 5);
    expect(curve[0]).toBeCloseTo(0.05, 6);
    expect(curve[1]).toBeCloseTo(0.2, 6);
    expect(curve[2]).toBeCloseTo(0.6, 6);
    expect(curve[4]).toBeCloseTo(0.95, 6);
  });

  it("never overshoots a steep S-curve or breaks monotonicity", () => {
    const points = [{ x: 0, y: 0 }, { x: 0.45, y: 0.05 }, { x: 0.55, y: 0.95 }, { x: 1, y: 1 }];
    const lut = sampleMonotoneCurve(points, 1024);
    for (let i = 0; i < lut.length; i++) {
      expect(lut[i]).toBeGreaterThanOrEqual(0);
      expect(lut[i]).toBeLessThanOrEqual(1);
      if (i > 0) expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1] - 1e-7);
    }
  });

  it("holds flat between equal neighbours instead of ringing", () => {
    const lut = sampleMonotoneCurve([{ x: 0, y: 0 }, { x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 }, { x: 1, y: 1 }], 101);
    for (let i = 30; i <= 70; i++) expect(lut[i]).toBeCloseTo(0.5, 6);
  });

  it("does not mutate the caller's points", () => {
    const points = [{ x: 0.8, y: 0.9 }, { x: 0, y: 0 }, { x: 1, y: 1 }];
    const before = JSON.stringify(points);
    sampleMonotoneCurve(points);
    expect(JSON.stringify(points)).toBe(before);
  });

  it("packs per-channel curves in RGB and the master curve in alpha", () => {
    const curves = { master: [{ x: 0, y: 0.25 }, { x: 1, y: 0.25 }], red: identity, green: [{ x: 0, y: 1 }, { x: 1, y: 0 }], blue: identity };
    const table = buildToneCurveTable(curves, 4);
    expect(Array.from(table.slice(12, 16))).toEqual([1, 0, 1, 0.25]);
    expect(isIdentityCurveSet(curves)).toBe(false);
    expect(isIdentityCurveSet({ master: identity, red: identity, green: identity, blue: identity })).toBe(true);
  });
});
