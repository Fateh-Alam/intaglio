import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import type { IntaglioDocumentV2 } from "../../app/types/document";

async function exportPng(page: Page) {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Single" }).click();
  const bytes = await readFile((await (await download).path())!);
  await page.keyboard.press("Escape");
  return bytes;
}

/** Mean RGB difference between two PNGs inside a normalized region. */
async function regionDiff(page: Page, a: Buffer, b: Buffer, region: { x0: number; y0: number; x1: number; y1: number }) {
  return page.evaluate(async ({ a, b, region }) => {
    const decode = async (base64: string) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const x = Math.floor(region.x0 * image.width);
      const y = Math.floor(region.y0 * image.height);
      return context.getImageData(x, y, Math.max(1, Math.floor((region.x1 - region.x0) * image.width)), Math.max(1, Math.floor((region.y1 - region.y0) * image.height))).data;
    };
    const [first, second] = await Promise.all([decode(a), decode(b)]);
    let sum = 0;
    let count = 0;
    for (let i = 0; i < first.length; i++) if (i % 4 !== 3) { sum += Math.abs(first[i] - second[i]); count++; }
    return sum / count;
  }, { a: a.toString("base64"), b: b.toString("base64"), region });
}

/** The title handle's bounds, normalized to the photo, minus the handle's padding. */
async function titleBounds(page: Page) {
  const frame = (await page.getByTestId("photo-frame").boundingBox())!;
  const handle = (await page.getByTestId("title-handle-title").boundingBox())!;
  const pad = 6;
  return {
    x0: (handle.x + pad - frame.x) / frame.width,
    y0: (handle.y + pad - frame.y) / frame.height,
    x1: (handle.x + handle.width - pad - frame.x) / frame.width,
    y1: (handle.y + handle.height - pad - frame.y) / frame.height,
  };
}

test("title cards export exactly where they preview, move by dragging, and survive save and reopen", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/editor?sample=1");
  await expect(page.getByRole("slider", { name: "Exposure", exact: true })).toBeVisible();
  const plain = await exportPng(page);

  await page.getByRole("radio", { name: /Text/ }).click();
  await page.getByRole("button", { name: /^Apply Opening title/ }).click();
  const handle = page.getByTestId("title-handle-title");
  await expect(handle).toBeVisible();
  await expect(page.getByRole("button", { name: "Hide Title" })).toBeVisible();

  // The export draws the title inside the bounds the on-photo handle shows, and leaves the wall alone.
  const bounds = await titleBounds(page);
  const titled = await exportPng(page);
  expect(await regionDiff(page, plain, titled, bounds)).toBeGreaterThan(12);
  expect(await regionDiff(page, plain, titled, { x0: 0.05, y0: 0.2, x1: 0.3, y1: 0.4 })).toBeLessThan(2);

  // Dragging moves the title on the photo and in the export.
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 200, { steps: 10 });
  await page.mouse.up();
  const moved = await titleBounds(page);
  expect(moved.y0).toBeLessThan(bounds.y0 - 0.1);
  expect((moved.x0 + moved.x1) / 2).toBeCloseTo(0.5, 2);

  // Typing updates the title; the project keeps it.
  await page.getByRole("textbox", { name: "Title text" }).fill("Northern Lights");
  await page.getByRole("button", { name: "File", exact: true }).click();
  const saving = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /^Save project/ }).click();
  const archive = await readFile((await (await saving).path())!);
  const { document: project } = JSON.parse(strFromU8(unzipSync(archive)["manifest.json"])) as { document: IntaglioDocumentV2 };
  const savedTitle = project.overlays.titles?.layers.find((layer) => layer.id === "title");
  expect(savedTitle).toMatchObject({ enabled: true, text: "Northern Lights" });
  expect(savedTitle!.y).toBeLessThan(0.7);

  await page.goto("/editor");
  const open = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /^Open Etch \.etch/ }).click();
  await (await open).setFiles({ name: "titles.etch", mimeType: "application/zip", buffer: archive });
  await expect(page.getByRole("slider", { name: "Exposure", exact: true })).toBeVisible();
  await page.getByRole("radio", { name: /Text/ }).click();
  await expect(page.getByTestId("title-handle-title")).toHaveAccessibleName(/Northern Lights/);
});
