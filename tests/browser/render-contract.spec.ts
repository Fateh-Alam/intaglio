import { expect, test } from "@playwright/test";

test("preview readback and decoded PNG export satisfy the full render contract", async ({ page }, testInfo) => {
  await page.goto("/render-contract");
  const output = page.getByTestId("render-contract-result");
  await expect(output).toHaveAttribute("data-status", /passed|failed/, { timeout: 45_000 });
  const result = JSON.parse(await output.textContent() || "{}") as { status: string; error?: string; metrics?: { [key: string]: unknown; combined: { ssim: number; meanDeltaE: number; p99DeltaE: number }; tiled: { ssim: number; meanDeltaE: number; p99DeltaE: number }; jpeg90: { ssim: number; meanDeltaE: number; p99DeltaE: number }; webp90: { ssim: number; meanDeltaE: number; p99DeltaE: number }; signatures: { png: string; jpeg: string; webp: string } }; features: string[] };
  expect(result.status, result.error).toBe("passed");
  expect(result.features).toEqual(expect.arrayContaining(["geometry", "lut", "plates", "radial-mask", "linear-mask", "luminance-mask", "color-range-mask", "brush-mask", "text", "watermark"]));
  expect(result.metrics?.combined.ssim, `${testInfo.project.name} SSIM; diagnostics ${JSON.stringify(result.metrics)}`).toBeGreaterThanOrEqual(0.9995);
  expect(result.metrics?.combined.meanDeltaE, `${testInfo.project.name} mean CIEDE2000; diagnostics ${JSON.stringify(result.metrics)}`).toBeLessThanOrEqual(0.25);
  expect(result.metrics?.combined.p99DeltaE, `${testInfo.project.name} p99 CIEDE2000; diagnostics ${JSON.stringify(result.metrics)}`).toBeLessThanOrEqual(0.75);
  expect(result.metrics?.tiled.ssim, `${testInfo.project.name} tiled SSIM; diagnostics ${JSON.stringify(result.metrics)}`).toBeGreaterThanOrEqual(0.9995);
  expect(result.metrics?.tiled.meanDeltaE, `${testInfo.project.name} tiled mean CIEDE2000; diagnostics ${JSON.stringify(result.metrics)}`).toBeLessThanOrEqual(0.25);
  expect(result.metrics?.tiled.p99DeltaE, `${testInfo.project.name} tiled p99 CIEDE2000; diagnostics ${JSON.stringify(result.metrics)}`).toBeLessThanOrEqual(0.75);
  const stages = result.metrics?.stages as Record<string, { ssim: number; meanDeltaE: number }>;
  for (const key of ["croppedMasks", "croppedCreative"]) {
    expect(stages[key]?.ssim, key).toBeGreaterThanOrEqual(0.9995);
    expect(stages[key]?.meanDeltaE, key).toBeLessThanOrEqual(0.25);
  }
  expect(result.metrics?.jpeg90.ssim, `${testInfo.project.name} MozJPEG SSIM; diagnostics ${JSON.stringify(result.metrics)}`).toBeGreaterThanOrEqual(0.995);
  expect(result.metrics?.jpeg90.meanDeltaE, `${testInfo.project.name} MozJPEG mean CIEDE2000; diagnostics ${JSON.stringify(result.metrics)}`).toBeLessThanOrEqual(1);
  expect(result.metrics?.webp90.ssim, `${testInfo.project.name} WebP SSIM; diagnostics ${JSON.stringify(result.metrics)}`).toBeGreaterThanOrEqual(0.995);
  expect(result.metrics?.webp90.meanDeltaE, `${testInfo.project.name} WebP mean CIEDE2000; diagnostics ${JSON.stringify(result.metrics)}`).toBeLessThanOrEqual(1);
  const correctness = (result.metrics as { correctness?: Record<string, { ssim: number; meanDeltaE: number }> } | undefined)?.correctness;
  expect(correctness?.neutralPlate.meanDeltaE, `${testInfo.project.name} neutral plate must be a no-op; ${JSON.stringify(correctness)}`).toBeLessThanOrEqual(0.25);
  expect(correctness?.identityLut.meanDeltaE, `${testInfo.project.name} identity LUT must be a no-op; ${JSON.stringify(correctness)}`).toBeLessThanOrEqual(0.25);
  expect(correctness?.invertedMasterCurve.meanDeltaE, `${testInfo.project.name} master curve must reach export; ${JSON.stringify(correctness)}`).toBeGreaterThanOrEqual(20);
  for (const key of ['graphDefault', 'graphBypass', 'graphNodeParams', 'graphExport']) {
    expect(correctness?.[key].meanDeltaE, `${key}: ${JSON.stringify(correctness)}`).toBeLessThanOrEqual(.25);
  }
  expect(correctness?.graphChangesPixels.meanDeltaE).toBeGreaterThan(2);
  expect(correctness?.graphOpacityChangesPixels.meanDeltaE).toBeGreaterThan(1);
  expect(correctness?.graphLutRoundTrip.meanDeltaE).toBeLessThan(1);
  expect(result.metrics?.signatures.png).toBe("89504e470d0a1a0a");
  expect(result.metrics?.signatures.jpeg).toBe("ffd8ff");
  expect(result.metrics?.signatures.webp.slice(0, 8)).toBe("52494646");
  expect(result.metrics?.signatures.webp.slice(16)).toBe("57454250");
});
