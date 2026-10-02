import { describe, expect, it } from "vitest";
import { assertLandmarkParity, assertLosslessParity, deltaE2000, measureParity } from "../../app/lib/parityMetrics";

describe("render parity metrics", () => {
  it("passes identical pixels", () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 255, 128, 64, 32, 255, 255, 255, 255, 255]);
    const metrics = measureParity(pixels, pixels.slice());
    expect(metrics.ssim).toBe(1);
    expect(metrics.meanDeltaE).toBe(0);
    expect(() => assertLosslessParity(metrics)).not.toThrow();
  });
  it("fails a visible mismatch", () => {
    const reference = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    const candidate = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    expect(() => assertLosslessParity(measureParity(reference, candidate))).toThrow(/parity failed/i);
  });
  it("matches the published CIEDE2000 reference pair", () => {
    expect(deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 4);
  });
  it("enforces the half-pixel geometry and overlay landmark contract", () => {
    expect(() => assertLandmarkParity([{ name: "crop-top-left", x: 2, y: 4 }], [{ name: "crop-top-left", x: 2.5, y: 4 }])).not.toThrow();
    expect(() => assertLandmarkParity([{ name: "baseline", x: 20, y: 30 }], [{ name: "baseline", x: 20.6, y: 30 }])).toThrow(/0.600 px/);
  });
});
