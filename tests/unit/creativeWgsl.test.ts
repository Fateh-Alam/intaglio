import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("keeps the native Creative Effects in sync with the web catalog", () => {
  expect(() => execFileSync(process.execPath, ["scripts/gen-creative-wgsl.mjs", "--check"])).not.toThrow();
});
