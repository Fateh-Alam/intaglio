import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COLOPHON, isColophonQuery } from "../../app/lib/colophon";

describe("colophon easter egg", () => {
  it("matches only the intended secret queries", () => {
    expect(isColophonQuery("vincibles")).toBe(true);
    expect(isColophonQuery("  Vincibles  ")).toBe(true);
    expect(isColophonQuery('"vincibles"')).toBe(true);
    expect(isColophonQuery("vincible")).toBe(true);
    expect(isColophonQuery("Twin")).toBe(true);

    expect(isColophonQuery("")).toBe(false);
    expect(isColophonQuery("exposure")).toBe(false);
    expect(isColophonQuery("crop")).toBe(false);
    expect(isColophonQuery("film")).toBe(false);
  });

  it("keeps the colophon copy and humans.txt aligned and unsigned", () => {
    const humansTxt = readFileSync(resolve(process.cwd(), "public/humans.txt"), "utf8");
    const combined = [
      COLOPHON.eyebrow,
      COLOPHON.heading,
      ...COLOPHON.paragraphs,
      COLOPHON.closing,
      COLOPHON.signature,
      COLOPHON.stamp,
    ].join("\n");

    for (const content of [combined, humansTxt]) {
      expect(content).toContain("Built for one person.");
      expect(content).toContain("audience of one");
      expect(content).toContain("Twin");
      expect(content).toContain("Vincibles");
      expect(content).toContain("Unsigned");
    }
  });
});
