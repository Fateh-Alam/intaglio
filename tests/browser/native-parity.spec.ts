import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { measureParity } from "../../app/lib/parityMetrics";
import cases from "../../app/native-parity/cases.json";

// The Mac app's native engine (crates/etch-core) must produce the web renderer's
// pixels for every develop control. Needs a Rust toolchain and a GPU; skips without.

// Headless Chromium defaults to SwiftShader. Use the same hardware backend
// this macOS comparison targets. The regular web tests still use their default.
test.use({
  launchOptions: async ({ browserName }, apply) => {
    await apply(process.platform === "darwin" && browserName === "chromium" && process.env.ETCH_PARITY_SOFTWARE !== "1"
      ? { args: ["--use-angle=metal"] }
      : {});
  },
});

const root = process.cwd();
const cargo = process.env.CARGO ?? [path.join(os.homedir(), ".cargo", "bin", "cargo")].find(existsSync) ?? "cargo";

function renderNative(outDir: string, atlases: Record<string, string>, gradePlans: Record<string, unknown>): string | null {
  mkdirSync(outDir, { recursive: true });
  const entries = Object.entries(atlases).map(([ramp, encoded], index) => {
    const file = `glyphs-${index}.r8`;
    writeFileSync(path.join(outDir, file), Buffer.from(encoded, "base64"));
    return [ramp, file];
  });
  const manifest = path.join(outDir, "atlases.json");
  writeFileSync(manifest, JSON.stringify(Object.fromEntries(entries)));
  const nativeCases = path.join(outDir, "cases.json");
  writeFileSync(nativeCases, JSON.stringify(Object.fromEntries(Object.entries(cases).map(([name, settings]) =>
    [name, { ...settings, gradeNodes: gradePlans[name] }]))));
  const run = spawnSync(cargo, [
    "run", "--quiet", "--release", "--manifest-path", "crates/etch-core/Cargo.toml", "--example", "parity_cases", "--",
    "render", "public/parity/native-fixture.png", nativeCases, outDir, manifest,
  ], { cwd: root, encoding: "utf8", timeout: 600_000 });
  return run.status === 0 ? null : `${run.error?.message ?? ""}${run.stderr ?? ""}`.trim() || "cargo failed";
}

test("etch-core matches the web renderer across the native edit pipeline", async ({ page }, testInfo) => {
  test.setTimeout(660_000);
  const outDir = testInfo.outputPath("native");
  await page.goto("/native-parity");
  const output = page.getByTestId("native-parity-result");
  await expect(output).toHaveAttribute("data-status", /done|failed/, { timeout: 60_000 });
  const result = JSON.parse((await output.textContent()) || "{}") as { status: string; error?: string; cases: Record<string, string>; sizes: Record<string, [number, number]>; atlases: Record<string, string>; gradePlans: Record<string, unknown> };
  expect(result.status, result.error).toBe("done");
  expect(Object.keys(result.cases)).toEqual(Object.keys(cases));
  const failure = renderNative(outDir, result.atlases, result.gradePlans);
  test.skip(failure !== null && /ENOENT|No usable GPU/.test(failure), `native engine unavailable: ${failure}`);
  expect(failure, "native render").toBeNull();
  expect(result.cases["custom-develop-then-film"]).not.toBe(result.cases["custom-film-then-develop"]);

  const fixture = new Uint8ClampedArray(Buffer.from(result.cases.defaults, "base64"));
  const rawFixture = new Uint8ClampedArray(Buffer.from(result.cases["raw-defaults"], "base64"));
  const report: string[] = [];
  for (const [name, encoded] of Object.entries(result.cases)) {
    const web = new Uint8ClampedArray(Buffer.from(encoded, "base64"));
    const native = new Uint8ClampedArray(readFileSync(path.join(outDir, `${name}.rgba`)));
    expect(native.length, `${name}: native output size matches the web export (${result.sizes[name].join("×")})`).toBe(web.length);
    // Where a straightened or lens-corrected photo ends, a pixel on the boundary
    // is inside for one renderer and outside for another (Chromium and WebKit
    // disagree there too). Those count separately and must stay on a one-pixel
    // outline; every pixel both renderers draw is held to the full bar.
    const [caseWidth, caseHeight] = result.sizes[name];
    let edgeFlips = 0;
    const both: number[] = [];
    for (let i = 0; i < web.length; i += 4) {
      const [webIn, nativeIn] = [web[i + 3] > 0, native[i + 3] > 0];
      if (webIn !== nativeIn) edgeFlips += 1;
      else if (webIn) both.push(i);
    }
    const pick = (data: Uint8ClampedArray) => {
      const out = new Uint8ClampedArray(both.length * 4);
      both.forEach((index, k) => out.set(data.subarray(index, index + 4), k * 4));
      return out;
    };
    // Guard against matching because nothing happened: every case but the
    // neutral one must visibly change the photo (same-size cases only).
    const overrides = cases[name as keyof typeof cases] as Record<string, unknown>;
    const profiled = typeof overrides.iccSource === "string";
    const original = overrides.linearSource ? rawFixture : fixture;
    if (name !== "defaults" && name !== "raw-defaults" && web.length === original.length) {
      let moved = 0;
      for (let i = 0; i < web.length; i += 1) moved = Math.max(moved, Math.abs(web[i] - original[i]));
      expect.soft(moved, `${name}: the edit must change the photo`).toBeGreaterThanOrEqual(8);
    }
    expect.soft(edgeFlips, `${name}: pixels inside the photo for only one renderer`).toBeLessThanOrEqual(2 * (caseWidth + caseHeight));
    const [webDrawn, nativeDrawn] = [pick(web), pick(native)];
    const metrics = measureParity(webDrawn, nativeDrawn);
    let worst = 0;
    let worstAt = 0;
    let worstDeltaE = 0;
    let worstBeyondQuantization = 0;
    for (const i of both) {
      for (let k = 0; k < 3; k += 1) {
        const difference = Math.abs(web[i + k] - native[i + k]);
        if (difference > worst) [worst, worstAt] = [difference, i];
      }
      // One 8-bit step is the floor both renderers round to, and on some dark
      // saturated colours it alone exceeds ΔE 2; judge only real differences.
      const channelError = Math.max(Math.abs(web[i] - native[i]), Math.abs(web[i + 1] - native[i + 1]), Math.abs(web[i + 2] - native[i + 2]));
      if (channelError <= 1) continue;
      const delta = measureParity(web.subarray(i, i + 4), native.subarray(i, i + 4)).meanDeltaE;
      worstDeltaE = Math.max(worstDeltaE, delta);
      if (channelError > (profiled ? 2 : 1)) worstBeyondQuantization = Math.max(worstBeyondQuantization, delta);
    }
    const pixel = Math.floor(worstAt / 4);
    const sample = `web rgba(${Array.from(web.subarray(worstAt, worstAt + 4)).join(",")}) native rgba(${Array.from(native.subarray(worstAt, worstAt + 4)).join(",")})`;
    const where = result.sizes[name][0] === 64 && result.sizes[name][1] === 48 && name !== "crop" ? ` from rgb(${Array.from(original.subarray(pixel * 4, pixel * 4 + 3)).join(",")})` : "";
    report.push(`${name}: mean ΔE ${metrics.meanDeltaE.toFixed(3)}, p99 ΔE ${metrics.p99DeltaE.toFixed(3)}, SSIM ${metrics.ssim.toFixed(5)}, max ${worst}/255, max ΔE ${worstDeltaE.toFixed(2)}${edgeFlips ? `, ${edgeFlips} edge pixels differ in coverage` : ""}` + (worst > 1 ? ` at (${pixel % caseWidth}, ${Math.floor(pixel / caseWidth)})${where}: ${sample}` : ""));
    // Two engines (WebGL half-float vs Metal f32) round differently, and an
    // 8-bit step is a poor yardstick (7/255 on a near-black can be less visible
    // than 1/255 on a mid-tone), so every pixel is judged perceptually
    // (docs/RENDER_PARITY.md): none that differs by more than one 8-bit step
    // may exceed ΔE2000 2.
    // Resampling (straighten, lens, keystone, zoom) a perfectly hard synthetic
    // edge — red jumps ~220 levels within one texel in this fixture — turns a
    // 1/20-texel difference in sample position into ~11 levels on that one
    // pixel. So resampled cases allow ΔE 5 per pixel; their mean/p99/SSIM bars
    // are unchanged and catch anything systematic. God light counts too: its
    // specular term raises a neighbour-tap normal to the 32nd power, so the
    // same sub-texel difference beside a hard edge is amplified ~32×.
    const resampled = ["rotate", "zoom", "lensDistortion", "keystoneH", "keystoneV", "anamorphicDistortion", "godLightStrength"].some((key) => key in overrides);
    if (profiled) {
      // Independent ICC converters round to sRGB8 before the shaders run.
      // Enforce a separate absolute code limit and retain all aggregate gates.
      expect.soft(worst, `${name} encoded channel error`).toBeLessThanOrEqual(overrides.customNodes ? 3 : 2);
    }
    expect.soft(worstBeyondQuantization, `${name} largest per-pixel CIEDE2000 beyond quantization`).toBeLessThanOrEqual(resampled ? 5 : 2);
    expect.soft(metrics.meanDeltaE, `${name} mean CIEDE2000`).toBeLessThanOrEqual(0.25);
    expect.soft(metrics.p99DeltaE, `${name} p99 CIEDE2000`).toBeLessThanOrEqual(1.5);
    expect.soft(metrics.ssim, `${name} SSIM`).toBeGreaterThanOrEqual(0.9995);
  }
  // Correctness, not just parity: mixer luminance bands must leave the
  // fixture's neutral rows (the top 16) exactly as they were, in the web renderer.
  const rowBytes = 64 * 4;
  const neutral = (name: string) => Buffer.from(result.cases[name], "base64").subarray(0, 16 * rowBytes);
  let greyShift = 0;
  const [plain, mixed] = [neutral("defaults"), neutral("mixer-luminance")];
  for (let i = 0; i < plain.length; i += 1) greyShift = Math.max(greyShift, Math.abs(plain[i] - mixed[i]));
  expect.soft(greyShift, "mixer luminance must not move pure greys (web renderer)").toBeLessThanOrEqual(1);
  report.push(`mixer luminance on pure greys (web): max shift ${greyShift}/255`);

  await testInfo.attach("native-parity.txt", { body: report.join("\n"), contentType: "text/plain" });
  console.log(`[${testInfo.project.name}] native parity\n${report.join("\n")}`);
});
