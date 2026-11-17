import { describe, expect, it } from "vitest";
import { createMaskComponent, linearGeometry, linearMaskValue, radialGeometry, radialMaskValue } from "../../app/lib/maskGeometry";

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

describe("mask geometry", () => {
  it("keeps v2 radial masks circular on wide photos", () => {
    const aspect = 1.5;
    const g = radialGeometry({ center: { x: 0.5, y: 0.5 }, radius: 0.2, radiusX: 0.2, radiusY: 0.2, angle: 0, feather: 0, invert: false }, aspect);
    // 0.2 image heights is 0.2 / aspect of the width: the same physical distance in both axes.
    expect(radialMaskValue(g, 0.5 + 0.19 / aspect, 0.5, aspect)).toBe(1);
    expect(radialMaskValue(g, 0.5, 0.69, aspect)).toBe(1);
    expect(radialMaskValue(g, 0.5 + 0.21 / aspect, 0.5, aspect)).toBe(0);
    expect(radialMaskValue(g, 0.5, 0.71, aspect)).toBe(0);
  });

  it("reproduces the legacy radial mask exactly", () => {
    const legacy = { center: { x: 0.3, y: 0.6 }, radius: 0.25, feather: 0.1, invert: false };
    const aspect = 1.5;
    const g = radialGeometry(legacy, aspect);
    for (const [x, yUp] of [[0.3, 0.6], [0.4, 0.62], [0.45, 0.7], [0.1, 0.5], [0.6, 0.9]]) {
      const oldValue = 1 - smoothstep(legacy.radius - legacy.feather, legacy.radius, Math.hypot(x - legacy.center.x, yUp - legacy.center.y));
      expect(radialMaskValue(g, x, 1 - yUp, aspect)).toBeCloseTo(oldValue, 6);
    }
  });

  it("rotates elliptical masks", () => {
    const g = radialGeometry({ center: { x: 0.5, y: 0.5 }, radius: 0.1, radiusX: 0.3, radiusY: 0.05, angle: 90, feather: 0, invert: false }, 1);
    expect(radialMaskValue(g, 0.5, 0.75, 1)).toBe(1);
    expect(radialMaskValue(g, 0.75, 0.5, 1)).toBe(0);
  });

  it("fades linear gradients from start (full) to end (none)", () => {
    const g = linearGeometry({ angle: 0, position: 0.5, feather: 0.2, invert: false, start: { x: 0.5, y: 0.2 }, end: { x: 0.5, y: 0.6 } }, 1.5);
    expect(linearMaskValue(g, 0.5, 0.1, 1.5)).toBe(1);
    expect(linearMaskValue(g, 0.5, 0.4, 1.5)).toBeCloseTo(0.5, 6);
    expect(linearMaskValue(g, 0.5, 0.7, 1.5)).toBe(0);
  });

  it.each([1, 1.5, 0.75])("reproduces the legacy linear mask at aspect ratio %s", (aspect) => {
    const legacy = { angle: 0.14, position: 0.45, feather: 0.22, invert: false };
    const g = linearGeometry(legacy, aspect);
    const angle = legacy.angle * Math.PI * 2;
    for (const [x, yUp] of [[0.2, 0.3], [0.5, 0.5], [0.7, 0.8], [0.9, 0.1]]) {
      const projection = (x - 0.5) * Math.cos(angle) + (yUp - 0.5) * Math.sin(angle) + 0.5;
      const oldValue = smoothstep(legacy.position - legacy.feather, legacy.position + legacy.feather, projection);
      expect(linearMaskValue(g, x, 1 - yUp, aspect)).toBeCloseTo(oldValue, 6);
    }
  });

  it("creates centred v2 components with unique ids", () => {
    const a = createMaskComponent("radial");
    const b = createMaskComponent("radial", "SUBTRACT");
    expect(a.id).not.toBe(b.id);
    expect(b.blendMode).toBe("SUBTRACT");
    expect(a.type === "radial" && a.params.radiusX).toBe(0.3);
  });
});
