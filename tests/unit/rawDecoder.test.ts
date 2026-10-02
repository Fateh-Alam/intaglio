import { describe, expect, it } from "vitest";
import { DEFAULT_RAW_DEVELOP_STATE } from "../../app/types/document";
import { classifyRawDecodeError, isRawFile, mapRawDevelopSettings, RawDecodeError } from "../../app/lib/rawDecoder";

describe("RAW adapter contract", () => {
  it("recognizes only the declared still RAW families", () => {
    for (const name of ["fixture.dng", "fixture.CR2", "fixture.cr3", "fixture.nef", "fixture.arw", "fixture.raf", "fixture.orf", "fixture.rw2"]) {
      expect(isRawFile({ name, type: "" }), name).toBe(true);
    }
    expect(isRawFile({ name: "clip.mov", type: "video/quicktime" })).toBe(false);
    expect(isRawFile({ name: "legacy.ormond", type: "application/json" })).toBe(false);
  });

  it("maps custom WB, exposure, quality, levels, and highlight recovery deterministically", () => {
    const mapped = mapRawDevelopSettings({ ...DEFAULT_RAW_DEVELOP_STATE, whiteBalance: "custom", temperature: 5200, exposureCompensation: 1.5, demosaicQuality: "quality", highlightMode: "reconstruct", blackLevel: 128, whiteLevel: 15000 });
    expect(mapped).toMatchObject({ outputBps: 16, outputColor: 1, useCameraWb: false, expCorrec: true, expShift: 2 ** 1.5, expPreser: 1, highlight: 5, userQual: 11, userBlack: 128, userSat: 15000, gamm: [1, 1] });
    expect(mapped.userMul).toEqual([0.8, 1, 1.25, 1]);
  });

  it("returns actionable and stable cancellation, memory, unsupported, and corrupt errors", () => {
    expect(classifyRawDecodeError(new Error("anything"), true).code).toBe("cancelled");
    expect(classifyRawDecodeError(new Error("abort(OOM)")).code).toBe("memory");
    expect(classifyRawDecodeError(new Error("unsupported format")).code).toBe("unsupported");
    expect(classifyRawDecodeError(new Error("truncated bytes")).code).toBe("corrupt");
    const existing = new RawDecodeError("unsupported", "fixture");
    expect(classifyRawDecodeError(existing)).toBe(existing);
  });
});
