import { describe, expect, it } from "vitest";
import { sha256Hex } from "../../app/lib/crypto";

describe("streaming SHA-256", () => {
  it("matches published SHA-256 vectors across input forms", async () => {
    expect(await sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(await sha256Hex(new Uint8Array([97, 98, 99]))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("hashes a multi-chunk Blob without materializing it through arrayBuffer", async () => {
    const bytes = new Uint8Array(2 * 1024 * 1024 + 17);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = (index * 31 + 7) & 0xff;
    const blob = new Blob([bytes]);
    Object.defineProperty(blob, "arrayBuffer", { value: () => { throw new Error("contiguous allocation forbidden"); } });
    expect(await sha256Hex(blob)).toBe("11dfe296abfa9b1873538ebf1d018e57f7508a5cc08a43a29b512e4bf7d63a2f");
  });
});
