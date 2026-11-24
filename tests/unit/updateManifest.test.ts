import { describe, expect, it } from "vitest";
import { buildUpdateManifest, releaseAssetUrl } from "../../scripts/lib/updateManifest.mjs";

describe("Mac updater manifest", () => {
  it("points Apple Silicon installs at the signed archive on the release", () => {
    const manifest = buildUpdateManifest({ version: "0.2.0", signature: "dW50cnVzdGVk\n", notes: "Faster RAW", date: new Date("2026-12-01T10:00:00Z") });
    expect(manifest).toEqual({
      version: "0.2.0",
      notes: "Faster RAW",
      pub_date: "2026-12-01T10:00:00.000Z",
      platforms: { "darwin-aarch64": { signature: "dW50cnVzdGVk", url: "https://github.com/Fateh-Alam/intaglio/releases/download/v0.2.0/Etch.app.tar.gz" } },
    });
  });

  it("refuses unsigned or oddly versioned releases", () => {
    expect(() => buildUpdateManifest({ version: "0.2.0", signature: " " })).toThrow(/signature/);
    expect(() => buildUpdateManifest({ version: "v0.2", signature: "x" })).toThrow(/1\.2\.3/);
  });

  it("builds release asset URLs from the tag", () => expect(releaseAssetUrl("1.0.0", "Etch_1.0.0_aarch64.dmg")).toBe("https://github.com/Fateh-Alam/intaglio/releases/download/v1.0.0/Etch_1.0.0_aarch64.dmg"));
});
