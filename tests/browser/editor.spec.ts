import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";

test("editor shell opens a sample and exposes develop, proof, batch, and export workflows", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByText("Open Photograph")).toBeVisible();
  await page.getByText("Sample Photograph", { exact: true }).click();
  await expect(page.getByRole("slider", { name: "Exposure" })).toBeVisible();
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("menuitem", { name: "Batch export…" }).click();
  await expect(page.getByText("Local batch export")).toBeVisible();
  await page.getByLabel("Close batch export").click();
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("menuitem", { name: "Proof sheet…" }).click();
  await expect(page.getByText("Select Variation")).toBeVisible();
});

test("manifest exposes current portable project handler and install icons", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.name).toContain("Etch");
  expect(manifest.file_handlers[0].accept["application/x-etch-project"]).toEqual([".etch"]);
  expect(manifest.file_handlers[0].accept["application/x-intaglio-archive"]).toEqual([".intaglio"]);
  expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === "192x192")).toBe(true);
  expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === "512x512")).toBe(true);
});

test("editor creates a portable V2 ZIP recipe rather than disguised JSON", async ({ page }) => {
  await page.goto("/editor");
  await page.getByText("Sample Photograph", { exact: true }).click();
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("menuitem", { name: "Save look as .etchlook…" }).click();
  await page.getByLabel("Recipe Name").fill("Portable Fixture");
  await page.getByText("Next: Select Settings").click();
  await page.getByText("Next", { exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByText("Save Recipe", { exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("portable_fixture.etchlook");
  const archivePath = await download.path();
  expect(archivePath).not.toBeNull();
  const bytes = await readFile(archivePath!);
  expect(Array.from(bytes.subarray(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
  const entries = unzipSync(bytes);
  expect(entries["checksums.sha256"]).toBeDefined();
  const manifest = JSON.parse(strFromU8(entries["manifest.json"])) as { appId: string; formatVersion: string; kind: string };
  expect(manifest).toMatchObject({ appId: "etch-darkroom", formatVersion: "2.0.0", kind: "recipe" });
});
