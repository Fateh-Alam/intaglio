import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createLinearSourceTexture } from "../../app/editor/render/sourceTexture";
import { sourceEncodingOf } from "../../app/editor/render/RenderPass";

const half = (bits: number) => THREE.DataUtils.fromHalfFloat(bits);

describe("16-bit RAW render source", () => {
  it("uploads linear half floats, bottom-up, tagged as linear", () => {
    // 1x2 image: top pixel mid-grey, bottom pixel white.
    const pixels = Uint16Array.from([32768, 32768, 32768, 65535, 65535, 65535]);
    const texture = createLinearSourceTexture({ width: 1, height: 2, pixels });
    const data = texture.image.data as Uint16Array;
    expect(texture.type).toBe(THREE.HalfFloatType);
    expect(sourceEncodingOf(texture)).toBe("linear");
    expect(half(data[0])).toBe(1);
    expect(half(data[4])).toBeCloseTo(32768 / 65535, 3);
    expect(half(data[7])).toBe(1);
  });

  it("resolves 16-bit steps that 8-bit proxies collapse", () => {
    const pixels = Uint16Array.from([100, 100, 100, 160, 160, 160]);
    const texture = createLinearSourceTexture({ width: 2, height: 1, pixels });
    const data = texture.image.data as Uint16Array;
    expect(half(data[4])).toBeGreaterThan(half(data[0]));
  });

  it("box-downsamples sources larger than the GPU limit", () => {
    const pixels = new Uint16Array(4 * 4 * 3).fill(65535);
    const texture = createLinearSourceTexture({ width: 4, height: 4, pixels }, 2);
    expect([texture.image.width, texture.image.height]).toEqual([2, 2]);
    expect(half((texture.image.data as Uint16Array)[0])).toBe(1);
  });

  it("treats image files as sRGB-encoded unless the GPU decodes them", () => {
    const texture = new THREE.Texture();
    expect(sourceEncodingOf(texture)).toBe("srgb");
    texture.colorSpace = THREE.SRGBColorSpace;
    expect(sourceEncodingOf(texture)).toBe("linear");
  });
});
