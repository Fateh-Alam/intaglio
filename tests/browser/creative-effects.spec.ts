import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";

test("preview, edit, reorder and save a creative effect stack", async ({ page }) => {
  await page.clock.install();
  await page.goto("/editor");
  await page.getByText("Sample Photograph", { exact: true }).click();
  await page.getByRole("button", { name: "Creative Effects", exact: true }).click();

  const search = page.getByRole("searchbox", { name: "Search effects and looks" });
  const stack = page.getByRole("list", { name: "Creative effect stack" });
  const results = page.getByRole("list", { name: "Effect results" });
  await page.getByRole("button", { name: "Browse effects" }).click();
  await search.fill("dither");
  await results.getByRole("button", { name: "Preview Dither", exact: true }).click();
  await expect(results.getByRole("button", { name: "Preview Dither", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(stack).toHaveCount(0);
  await search.press("Escape");
  await expect(results.getByRole("button", { name: "Preview Dither", exact: true })).toHaveAttribute("aria-pressed", "false");

  await results.getByRole("button", { name: /^Dither Print/ }).click();
  await page.getByRole("button", { name: "Play effect", exact: true }).click();
  await expect(page.getByText("Preview", { exact: true })).toBeVisible();
  await page.clock.runFor(250);
  await page.getByRole("button", { name: "Freeze frame", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Phase", exact: true })).not.toHaveAttribute("aria-valuenow", "0");
  await page.getByRole("combobox", { name: "Dither method" }).selectOption("atkinson");
  await page.getByRole("combobox", { name: "Palette", exact: true }).selectOption("gameboy");
  await page.getByRole("button", { name: "Browse effects" }).click();
  await search.fill("fluted");
  await results.getByRole("button", { name: /^Fluted Glass Glass/ }).click();
  await stack.getByRole("button", { name: "Move Fluted Glass up" }).click();
  await expect(stack.getByRole("listitem").first()).toContainText("Fluted Glass");
  await stack.getByRole("button", { name: "Hide Fluted Glass" }).click();
  await expect(stack.getByRole("button", { name: "Show Fluted Glass" })).toBeVisible();

  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("menuitem", { name: "Save look as .etchlook…" }).click();
  await page.getByLabel("Recipe Name").fill("Creative Fixture");
  await page.getByText("Next: Select Settings").click();
  await page.getByText("Next", { exact: true }).click();
  const saved = page.waitForEvent("download");
  await page.getByText("Save Recipe", { exact: true }).click();
  const download = await saved;
  const archive = unzipSync(await readFile((await download.path())!));
  const manifest = JSON.parse(strFromU8(archive["manifest.json"]));
  expect(manifest.document.editorSettingsSnapshot.creativeEffects).toMatchObject([
    { effect: "fluted-glass", enabled: false },
    { effect: "dither", dither: "atkinson", palette: "gameboy" },
  ]);
});
