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
  const library = page.getByRole("complementary", { name: "Editor library" });
  await expect(library.getByRole("radio", { name: "Effects", exact: true })).toBeChecked();
  await expect(search).toBeFocused();
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

test("browse categories, render thumbnails and apply studio looks", async ({ page }) => {
  await page.goto("/editor?sample=1");
  await page.getByRole("button", { name: "Show editor library" }).click();
  const library = page.getByRole("complementary", { name: "Editor library" });
  await library.getByRole("radio", { name: "Effects", exact: true }).click();
  await library.getByRole("combobox", { name: "Effect category" }).selectOption("Print & Paper");
  const results = library.getByRole("list", { name: "Effect results" });
  const dither = results.getByRole("button", { name: /^Dither Print/ });
  await expect(results.getByRole("button", { name: /^Characters/ })).toHaveCount(0);
  await expect(dither.locator('img[src^="data:image/jpeg"]')).toBeVisible();
  expect(await dither.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await dither.click();

  await library.getByRole("radio", { name: "Studio looks" }).click();
  await expect(library.getByRole("combobox", { name: "Effect category" })).toHaveValue("");
  await library.getByRole("searchbox").fill("instant frame");
  const stack = page.getByRole("list", { name: "Creative effect stack" });
  await page.getByRole("button", { name: /^Creative Effects/ }).click();
  const look = results.getByRole("button", { name: /^Instant Frame/ });
  const preview = results.getByRole("button", { name: "Preview Instant Frame" });
  await preview.click();
  await expect(preview).toHaveAttribute("aria-pressed", "true");
  await expect(stack.getByRole("listitem")).toHaveCount(1);
  await preview.press("Escape");
  await expect(preview).toHaveAttribute("aria-pressed", "false");
  await library.getByRole("switch", { name: "Add to current stack" }).click();
  await look.click();
  await expect(stack.getByRole("button", { name: "Remove Dither" })).toBeVisible();
  await expect(stack.getByRole("listitem")).toHaveCount(4);
  await library.getByRole("switch", { name: "Add to current stack" }).click();
  await look.click();
  await expect(stack.getByRole("button", { name: "Remove Dither" })).toHaveCount(0);
  await expect(stack.getByRole("listitem")).toHaveCount(3);
  await preview.click();
  await library.getByRole("radio", { name: "Looks", exact: true }).click();
  await expect(page.getByText("Preview", { exact: true })).toHaveCount(0);
});

test("keep the photo visible when browsing effects on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/editor?sample=1");
  await page.getByRole("button", { name: "Continue anyway" }).click();
  await page.getByRole("button", { name: "Creative Effects", exact: true }).click();
  await page.getByRole("button", { name: "Browse effects" }).click();
  const library = page.getByRole("complementary", { name: "Editor library" });
  await expect(library).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Edit controls" })).toBeHidden();
  await library.getByRole("searchbox").fill("dither");
  await library.getByRole("button", { name: "Preview Dither", exact: true }).click();
  await expect(page.getByText("Preview", { exact: true })).toBeVisible();
  const photo = await page.getByTestId("photo-frame").boundingBox();
  const panel = await library.boundingBox();
  expect(photo!.y + photo!.height).toBeLessThan(panel!.y);
  await library.getByRole("button", { name: /^Dither Print/ }).click();
  await library.getByRole("button", { name: "Close panel" }).click();
  await expect(page.getByRole("list", { name: "Creative effect stack" }).getByRole("button", { name: "Remove Dither" })).toBeVisible();
});
