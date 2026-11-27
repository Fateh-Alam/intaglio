import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { cropSize, rotatePhotoPoint } from "../../app/lib/cropGeometry";
import type { IntaglioDocumentV2 } from "../../app/types/document";

const sourceWidth = 240;
const sourceHeight = 160;
const brushPoint = { x: 0.65, y: 0.55 };

async function exportPng(page: Page) {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Single" }).click();
  return readFile((await (await download).path())!);
}

async function previewPoints(page: Page, points: { x: number; y: number }[]) {
  return page.locator("#main-editor-canvas canvas").evaluate((canvas: HTMLCanvasElement, points) => {
    const frame = document.querySelector('[data-testid="photo-frame"]')!.getBoundingClientRect();
    const rect = canvas.getBoundingClientRect();
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    const context = probe.getContext("2d")!;
    return points.map(({ x, y }) => {
      const px = Math.floor((frame.left + x * frame.width - rect.left) / rect.width * canvas.width);
      const py = Math.floor((frame.top + y * frame.height - rect.top) / rect.height * canvas.height);
      context.drawImage(canvas, px, py, 1, 1, 0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    });
  }, points);
}

async function decodedPoints(page: Page, bytes: Buffer, points: { x: number; y: number }[]) {
  return page.evaluate(async ({ bytes, points }) => {
    const image = await createImageBitmap(new Blob([Uint8Array.from(bytes)], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    image.close();
    return {
      width: canvas.width, height: canvas.height,
      colors: points.map(({ x, y }) => Array.from(ctx.getImageData(Math.floor(x * canvas.width), Math.floor(y * canvas.height), 1, 1).data)),
    };
  }, { bytes: Array.from(bytes), points });
}

const maxDiff = (a: number[], b: number[]) => Math.max(...a.map((channel, index) => Math.abs(channel - b[index])));

test("crop and straighten remain identical on save, reopen and export with a brush mask and Creative Effects", async ({ page }) => {
  await page.goto("/editor");
  const source = await page.evaluate(({ width, height }) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#606060";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#b4a488";
    ctx.fillRect(0, 0, width * 0.36, height);
    ctx.fillStyle = "#36516a";
    ctx.fillRect(width * 0.78, 0, width, height);
    ctx.fillStyle = "#507b50";
    ctx.fillRect(0, height * 0.79, width, height);
    return canvas.toDataURL("image/png").split(",")[1];
  }, { width: sourceWidth, height: sourceHeight });
  const chooser = page.waitForEvent("filechooser");
  await page.getByText("Open Photograph", { exact: true }).click();
  await (await chooser).setFiles({ name: "crop-fixture.png", mimeType: "image/png", buffer: Buffer.from(source, "base64") });

  const photo = page.getByTestId("photo-frame");
  const cropTool = page.getByRole("button", { name: "Crop & Straighten", exact: true });
  await expect(cropTool).toBeVisible();
  await page.keyboard.press("r");
  const ratio = page.getByRole("combobox", { name: "Aspect ratio" });
  await ratio.selectOption("square");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(cropTool).toBeVisible();
  const originalBox = (await photo.boundingBox())!;
  expect(originalBox.width / originalBox.height).toBeCloseTo(1.5, 2);

  await page.getByRole("radio", { name: "Masks" }).click();
  await page.getByRole("button", { name: /^Brush/ }).click();
  const brushBox = (await page.getByTestId("mask-brush-surface").boundingBox())!;
  const brushY = brushBox.y + brushPoint.y * brushBox.height;
  await page.mouse.move(brushBox.x + 0.59 * brushBox.width, brushY);
  await page.mouse.down();
  await page.mouse.move(brushBox.x + 0.72 * brushBox.width, brushY, { steps: 9 });
  await page.mouse.up();
  await page.getByRole("switch", { name: "Show overlay" }).click();
  await page.getByRole("slider", { name: "Exposure", exact: true }).press("End");

  await page.getByRole("radio", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Browse effects" }).click();
  await page.getByRole("searchbox", { name: "Search effects and looks" }).fill("color overlay");
  await page.getByRole("list", { name: "Effect results" }).getByRole("button", { name: /^Color Overlay/ }).click();

  await cropTool.click();
  await ratio.selectOption("square");
  const corner = (await page.getByRole("button", { name: "Resize crop · Top left" }).boundingBox())!;
  const cropFrame = (await page.getByTestId("crop-frame").boundingBox())!;
  await page.mouse.move(corner.x + corner.width / 2, corner.y + corner.height / 2);
  await page.mouse.down();
  await page.mouse.move(corner.x + corner.width / 2 + cropFrame.width * 0.2, corner.y + corner.height / 2 + cropFrame.height * 0.2, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Draw horizon", exact: true }).click();
  const horizon = (await page.getByTestId("horizon-surface").boundingBox())!;
  const startX = horizon.x + horizon.width * 0.2;
  const startY = horizon.y + horizon.height * 0.4;
  const span = horizon.width * 0.6;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + span, startY + span * 0.1, { steps: 8 });
  await page.mouse.up();
  const angle = page.getByRole("slider", { name: "Angle" });
  await expect.poll(async () => Number(await angle.getAttribute("aria-valuenow"))).toBeCloseTo(-5.7, 0);
  await page.getByRole("button", { name: "Apply crop", exact: true }).click();

  await expect.poll(async () => {
    const { width, height } = (await photo.boundingBox())!;
    return width / height;
  }).toBeCloseTo(1, 2);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(async () => {
    const { width, height } = (await photo.boundingBox())!;
    return width / height;
  }).toBeCloseTo(1.5, 2);
  await page.getByRole("button", { name: "Redo", exact: true }).click();

  await page.getByRole("button", { name: "File", exact: true }).click();
  const saving = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /^Save project/ }).click();
  const archive = await readFile((await (await saving).path())!);
  const entries = unzipSync(archive);
  const { document: project } = JSON.parse(strFromU8(entries["manifest.json"])) as { document: IntaglioDocumentV2 };
  const { crop, rotationDegrees } = project.geometry;
  expect(project.editorSettingsSnapshot.crop).toEqual(crop);
  expect(project.editorSettingsSnapshot.creativeEffects).toMatchObject([{ effect: "color-overlay" }]);
  expect(project.editorSettingsSnapshot.masks[0].type).toBe("brush");
  expect(project.history[project.historyIndex].action).toBe("Crop & Straighten");
  expect(crop.x).toBeGreaterThan(0.2);
  expect(rotationDegrees).toBeCloseTo(-5.7, 0);
  const aligned = rotatePhotoPoint(brushPoint, rotationDegrees, sourceWidth / sourceHeight);
  const masked = { x: (aligned.x - crop.x) / crop.width, y: (aligned.y - crop.y) / crop.height };
  const points = [masked, { x: masked.x, y: masked.y + 0.14 }, { x: 0.1, y: 0.17 }, { x: 0.87, y: 0.25 }, { x: 0.87, y: 0.86 }];
  const preview = await previewPoints(page, points);
  expect(maxDiff(preview[0], preview[1])).toBeGreaterThan(35);
  const first = await exportPng(page);
  const rendered = await decodedPoints(page, first, points);
  expect({ width: rendered.width, height: rendered.height }).toEqual(cropSize(sourceWidth, sourceHeight, crop));
  rendered.colors.forEach((color, index) => expect(maxDiff(color, preview[index]), `Pixel ${index} ${preview[index]} vs ${color}`).toBeLessThanOrEqual(3));

  await page.reload();
  const open = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /^Open Etch \.etch/ }).click();
  await (await open).setFiles({ name: "crop-fixture.etch", mimeType: "application/zip", buffer: archive });
  await expect(cropTool).toBeVisible();
  await expect.poll(async () => {
    const { width, height } = (await photo.boundingBox())!;
    return width / height;
  }).toBeCloseTo(1, 2);
  await expect.poll(async () => maxDiff((await previewPoints(page, points))[0], preview[0])).toBeLessThanOrEqual(3);
  expect(await exportPng(page)).toEqual(first);
});
