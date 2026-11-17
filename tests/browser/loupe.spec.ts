import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

// A 1 px checkerboard averages to flat grey when fitted and resolves into
// black and white only when the loupe shows real image pixels.
const sourceWidth = 2400;
const sourceHeight = 1600;
const BLOCK = 16;

async function exportPng(page: Page) {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Single" }).click();
  const bytes = await readFile((await (await download).path())!);
  await page.keyboard.press("Escape");
  return bytes;
}

/** RGBA block of canvas pixels centered on a point of the photo frame (0…1). */
async function canvasBlock(page: Page, at = { x: 0.5, y: 0.5 }) {
  return page.locator("#main-editor-canvas canvas").evaluate((canvas: HTMLCanvasElement, { at, size }) => {
    const frame = document.querySelector('[data-testid="photo-frame"]')!.getBoundingClientRect();
    const rect = canvas.getBoundingClientRect();
    const px = Math.round((frame.left + at.x * frame.width - rect.left) / rect.width * canvas.width) - size / 2;
    const py = Math.round((frame.top + at.y * frame.height - rect.top) / rect.height * canvas.height) - size / 2;
    const probe = document.createElement("canvas");
    probe.width = probe.height = size;
    const context = probe.getContext("2d")!;
    context.drawImage(canvas, px, py, size, size, 0, 0, size, size);
    return Array.from(context.getImageData(0, 0, size, size).data);
  }, { at, size: BLOCK });
}

async function exportBlocks(page: Page, bytes: Buffer, reach: number) {
  return page.evaluate(async ({ base64, size, reach }) => {
    const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const x = Math.floor(image.width / 2) - size / 2;
    const y = Math.floor(image.height / 2) - size / 2;
    const blocks: number[][] = [];
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) blocks.push(Array.from(ctx.getImageData(x + dx, y + dy, size, size).data));
    return { width: image.width, height: image.height, blocks };
  }, { base64: bytes.toString("base64"), size: BLOCK, reach });
}

const contrast = (block: number[]) => {
  let low = 255;
  let high = 0;
  for (let i = 0; i < block.length; i += 4) {
    const luma = 0.2126 * block[i] + 0.7152 * block[i + 1] + 0.0722 * block[i + 2];
    low = Math.min(low, luma);
    high = Math.max(high, luma);
  }
  return high - low;
};
const meanDiff = (a: number[], b: number[]) => {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < a.length; i++) if (i % 4 !== 3) { sum += Math.abs(a[i] - b[i]); count++; }
  return sum / count;
};

async function expectLoupeMatchesExport(page: Page) {
  const zoomLevel = page.getByRole("button", { name: /^Zoom level/ });
  await expect.poll(async () => contrast(await canvasBlock(page)), { message: "Fit should not resolve single pixels" }).toBeLessThan(60);
  await page.keyboard.press("z");
  await expect(zoomLevel).toHaveAccessibleName("Zoom level 100%");
  await expect.poll(async () => contrast(await canvasBlock(page)), { message: "100% should resolve single pixels" }).toBeGreaterThan(120);
  const loupe = await canvasBlock(page);
  const exported = await exportBlocks(page, await exportPng(page), 3);
  expect({ width: exported.width, height: exported.height }).toEqual({ width: sourceWidth, height: sourceHeight });
  // The loupe shows the exported pixels, give or take dither and a 1 px registration.
  expect(Math.min(...exported.blocks.map((block) => meanDiff(loupe, block)))).toBeLessThanOrEqual(4);
}

test("true 1:1 loupe shows real image pixels with a brush mask and Creative Effects", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/editor");
  const source = await page.evaluate(({ width, height }) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const image = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const value = (x + y) % 2 ? 210 : 50;
      const i = (y * width + x) * 4;
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL("image/png").split(",")[1];
  }, { width: sourceWidth, height: sourceHeight });
  const chooser = page.waitForEvent("filechooser");
  await page.getByText("Open Photograph", { exact: true }).click();
  await (await chooser).setFiles({ name: "loupe-fixture.png", mimeType: "image/png", buffer: Buffer.from(source, "base64") });
  const zoomLevel = page.getByRole("button", { name: /^Zoom level/ });
  await expect(zoomLevel).toHaveAccessibleName("Zoom level Fit");

  // A brush mask through the center lifts exposure locally.
  await page.getByRole("radio", { name: "Masks" }).click();
  await page.getByRole("button", { name: /^Brush/ }).click();
  const brush = (await page.getByTestId("mask-brush-surface").boundingBox())!;
  await page.mouse.move(brush.x + 0.4 * brush.width, brush.y + 0.5 * brush.height);
  await page.mouse.down();
  await page.mouse.move(brush.x + 0.6 * brush.width, brush.y + 0.5 * brush.height, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("slider", { name: "Exposure", exact: true }).press("ArrowRight");
  await page.getByRole("radio", { name: "Edit" }).click();

  // Tiled loupe: only the visible region is rendered, at full resolution.
  await expectLoupeMatchesExport(page);

  // The navigator moves the view; the photo stays sharp there too.
  const before = (await page.getByTestId("photo-frame").boundingBox())!;
  await page.getByRole("group", { name: "Navigator" }).click({ position: { x: 20, y: 20 } });
  await expect.poll(async () => (await page.getByTestId("photo-frame").boundingBox())!.x).toBeGreaterThan(before.x + 50);
  await expect.poll(async () => contrast(await canvasBlock(page, { x: 0.15, y: 0.15 }))).toBeGreaterThan(120);

  // Z returns to Fit.
  await page.keyboard.press("z");
  await expect(zoomLevel).toHaveAccessibleName("Zoom level Fit");
  await expect(page.getByRole("group", { name: "Navigator" })).toBeHidden();

  // Creative Effects render the whole frame at full resolution behind the loupe.
  await page.getByRole("button", { name: "Creative Effects", exact: true }).click();
  await page.getByRole("button", { name: "Browse effects" }).click();
  await page.getByRole("searchbox", { name: "Search effects and looks" }).fill("color overlay");
  await page.getByRole("list", { name: "Effect results" }).getByRole("button", { name: /^Color Overlay/ }).click();
  await page.keyboard.press("Escape");
  await expectLoupeMatchesExport(page);

  // Clicking the photo returns to Fit; ⌘+ steps up from Fit.
  const viewport = page.viewportSize()!;
  const frame = (await page.getByTestId("photo-frame").boundingBox())!;
  await page.mouse.click(Math.min(frame.x + frame.width / 2, viewport.width / 2), Math.min(frame.y + frame.height / 2, viewport.height / 2));
  await expect(zoomLevel).toHaveAccessibleName("Zoom level Fit");
  await page.keyboard.press("ControlOrMeta+Equal");
  await expect(zoomLevel).not.toHaveAccessibleName("Zoom level Fit");
});
