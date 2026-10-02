import { describe, expect, it } from "vitest";
import { allocateBatchFilename, safeFileStem } from "../../app/lib/batchExport";

describe("batch export naming", () => {
  it("normalizes unsafe source names", () => expect(safeFileStem("../My Photo (Final).CR3")).toBe("my-photo-final"));
  it("allocates deterministic collision-safe names", () => {
    const used = new Set<string>();
    expect(allocateBatchFilename("frame.CR3", "jpg", used)).toBe("frame.jpg");
    expect(allocateBatchFilename("FRAME.NEF", "jpg", used)).toBe("frame-2.jpg");
    expect(allocateBatchFilename("frame.png", "jpg", used)).toBe("frame-3.jpg");
  });
});
