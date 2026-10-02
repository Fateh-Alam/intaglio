import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { parseCubeData, parseCubeLUT, serializeCubeLUT } from "../../app/utils/lutParser";

const validCube = `TITLE "Fixture"
LUT_3D_SIZE 2
DOMAIN_MIN -1 -0.5 0
DOMAIN_MAX 1 1.5 2
0 0 0
1 0 0
0 1 0
1 1 0
0 0 1
1 0 1
0 1 1
1 1 1`;

describe("cube LUT parsing", () => {
  it("uploads a half-float 3D texture with size and domain metadata", () => {
    const texture = parseCubeLUT(validCube);
    expect(texture).not.toBeNull();
    expect(texture).toBeInstanceOf(THREE.Data3DTexture);
    expect(texture?.type).toBe(THREE.HalfFloatType);
    expect([texture?.image.width, texture?.image.height, texture?.image.depth]).toEqual([2, 2, 2]);
    // Voxel (r=1, g=0, b=1) is entry 5; values are stored unquantized.
    const data = texture?.image.data as Uint16Array;
    expect(THREE.DataUtils.fromHalfFloat(data[5 * 4])).toBe(1);
    expect(THREE.DataUtils.fromHalfFloat(data[5 * 4 + 1])).toBe(0);
    expect(texture?.userData).toMatchObject({ lutSize: 2, domainMin: [-1, -0.5, 0], domainMax: [1, 1.5, 2], title: "Fixture" });
    texture?.dispose();
  });

  it("keeps sub-8-bit precision and round-trips through .cube serialization", () => {
    const lut = parseCubeData(validCube.replace("1 0 1", "0.5004 0.0002 1"));
    expect(lut).not.toBeNull();
    const roundTrip = parseCubeData(serializeCubeLUT(lut!));
    expect(roundTrip?.size).toBe(2);
    expect(roundTrip?.domainMin).toEqual([-1, -0.5, 0]);
    expect(roundTrip?.title).toBe("Fixture");
    expect(roundTrip?.values[15]).toBeCloseTo(0.5004, 6);
    expect(roundTrip?.values[16]).toBeCloseTo(0.0002, 6);
  });

  it("rejects incomplete, non-finite, and invalid-domain LUTs", () => {
    expect(parseCubeLUT("LUT_3D_SIZE 2\n0 0 0")).toBeNull();
    expect(parseCubeLUT(validCube.replace("1 1 1", "NaN 1 1"))).toBeNull();
    expect(parseCubeLUT(validCube.replace("DOMAIN_MAX 1 1.5 2", "DOMAIN_MAX -2 1.5 2"))).toBeNull();
  });
});
