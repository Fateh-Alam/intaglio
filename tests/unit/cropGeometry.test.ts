import { describe, expect, it } from "vitest";
import { constrainStraightenedCrop, cropSize, cropWithRatio, dragCrop, FULL_CROP, horizonCorrection, normalizeCrop, rotatePhotoPoint } from "../../app/lib/cropGeometry";

describe("crop geometry", () => {
  it("normalizes missing and out-of-bounds crops from projects", () => {
    expect(normalizeCrop(undefined)).toEqual(FULL_CROP);
    expect(normalizeCrop({ x: 0.25, y: -1, width: 2, height: 0.5 })).toEqual({ x: 0.25, y: 0, width: 0.75, height: 0.5 });
  });

  it("locks the pixel aspect while resizing and moving off-center crops", () => {
    const square = cropWithRatio(FULL_CROP, 2 / 3);
    const moved = dragCrop(dragCrop(square, "nw", { x: 0.12, y: 0.13 }, 2 / 3), "move", { x: 0.7, y: -0.8 }, 2 / 3);
    const size = cropSize(3600, 2400, moved);
    expect(moved.y).toBe(0);
    expect(moved.x + moved.width).toBe(1);
    expect(size.width).toBe(size.height);
  });

  it.each([0.7, 1.5, 2.2])("fits an off-center crop's corners inside a rotated image at source aspect %s", (aspect) => {
    const cropped = constrainStraightenedCrop({ x: 0.2, y: 0.12, width: 0.8, height: 0.8 }, -17, aspect, 1);
    expect(cropped.width / cropped.height).toBeCloseTo(1, 8);
    for (const x of [cropped.x, cropped.x + cropped.width]) {
      for (const y of [cropped.y, cropped.y + cropped.height]) {
        const inside = rotatePhotoPoint({ x, y }, 17, aspect);
        expect(Math.min(inside.x, inside.y)).toBeGreaterThanOrEqual(-1e-8);
        expect(Math.max(inside.x, inside.y)).toBeLessThanOrEqual(1 + 1e-8);
      }
    }
  });

  it("levels a horizon in either drag direction and aligns vertical references", () => {
    expect(horizonCorrection(100, 10)).toBeCloseTo(5.71);
    expect(horizonCorrection(-100, -10)).toBeCloseTo(5.71);
    expect(horizonCorrection(10, 100)).toBeCloseTo(-5.71);
  });
});
