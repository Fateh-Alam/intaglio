import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const points = {
  painted: [0.24, 0.34],
  erased: [0.42, 0.34],
  outside: [0.42, 0.68],
} as const;

type Pixel = number[];

async function readPreview(page: Page, x: number, y: number): Promise<Pixel> {
  return page.locator("#main-editor-canvas canvas").evaluate((canvas: HTMLCanvasElement, { x, y }) => {
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    const context = probe.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const px = Math.round((x - rect.left) / rect.width * canvas.width);
    const py = Math.round((y - rect.top) / rect.height * canvas.height);
    context.drawImage(canvas, px, py, 1, 1, 0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data);
  }, { x, y });
}

const colorDifference = (a: Pixel, b: Pixel) => Math.max(...a.slice(0, 3).map((channel, index) => Math.abs(channel - b[index])));

async function openFixture(page: Page, colors: [string, string]) {
  await page.goto("/editor");
  const fixture = await page.evaluate(([left, right]) => {
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 240;
    const context = canvas.getContext("2d")!;
    context.fillStyle = left;
    context.fillRect(0, 0, 180, 240);
    context.fillStyle = right;
    context.fillRect(180, 0, 180, 240);
    return canvas.toDataURL("image/png").split(",")[1];
  }, colors);
  const fileChooser = page.waitForEvent("filechooser");
  await page.getByText("Open Photograph", { exact: true }).click();
  await (await fileChooser).setFiles({ name: "mask-fixture.png", mimeType: "image/png", buffer: Buffer.from(fixture, "base64") });
  await page.getByRole("radio", { name: "Masks" }).click();
}

test("brush painting is live, undoable, and exports the same local edit without the overlay", async ({ page }) => {
  await openFixture(page, ["#606060", "#606060"]);
  await page.getByRole("button", { name: /^Brush/ }).click();

  const overlay = page.getByRole("switch", { name: "Show overlay" });
  await expect(overlay).toHaveAttribute("aria-checked", "true");
  await expect(overlay).toHaveCSS("background-color", "rgb(91, 155, 255)");
  const surface = page.getByTestId("mask-brush-surface");
  await expect(surface).toBeVisible();
  const bounds = (await surface.boundingBox())!;
  const x = (value: number) => bounds.x + bounds.width * value;
  const y = (value: number) => bounds.y + bounds.height * value;
  const pixel = (point: readonly [number, number]) => readPreview(page, x(point[0]), y(point[1]));
  await expect.poll(async () => (await pixel(points.outside))[0]).toBeGreaterThan(50);
  const neutral = await pixel(points.outside);

  await page.mouse.move(x(0.18), y(0.34));
  await page.mouse.down();
  await page.mouse.move(x(0.67), y(0.34), { steps: 12 });
  // Read the actual framebuffer before the stroke is committed.
  await expect.poll(async () => {
    const [r, g] = await pixel(points.painted);
    return r - g;
  }).toBeGreaterThan(70);
  await page.mouse.up();

  await page.keyboard.press("o");
  await expect(overlay).toHaveAttribute("aria-checked", "false");
  await expect(overlay).toHaveCSS("background-color", "rgba(255, 255, 255, 0.12)");
  await expect.poll(async () => colorDifference(await pixel(points.painted), neutral)).toBeLessThanOrEqual(1);
  await page.getByRole("slider", { name: "Exposure", exact: true }).press("End");
  await expect.poll(async () => (await pixel(points.painted))[0] - neutral[0]).toBeGreaterThan(35);
  expect(colorDifference(await pixel(points.outside), neutral)).toBeLessThanOrEqual(1);

  await page.getByRole("radio", { name: "Erase" }).click();
  await page.mouse.click(x(points.erased[0]), y(points.erased[1]));
  await expect.poll(async () => colorDifference(await pixel(points.erased), neutral)).toBeLessThanOrEqual(2);

  await page.keyboard.press("Control+z");
  await expect.poll(async () => (await pixel(points.erased))[0] - neutral[0]).toBeGreaterThan(35);
  await page.keyboard.press("Control+Shift+z");
  await expect.poll(async () => colorDifference(await pixel(points.erased), neutral)).toBeLessThanOrEqual(2);

  const preview = await Promise.all(Object.values(points).map(pixel));
  await overlay.focus();
  await page.keyboard.press("Space");
  await expect(overlay).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => colorDifference(await pixel(points.painted), preview[0])).toBeGreaterThan(30);

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const saving = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Single" }).click();
  const bytes = await readFile((await (await saving).path())!);
  const exported = await page.evaluate(async ({ bytes, points }) => {
    const image = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    image.close();
    return Object.values(points).map(([x, y]) => Array.from(context.getImageData(Math.round(x * canvas.width), Math.round(y * canvas.height), 1, 1).data));
  }, { bytes: Array.from(bytes), points });

  exported.forEach((color, index) => {
    expect(colorDifference(color, preview[index]), `Pixel ${index}, preview ${preview[index]}, export ${color}`).toBeLessThanOrEqual(2);
  });
});

test("range pickers use the photo's colors and keyboard controls reach the overlay", async ({ page, browserName }) => {
  await openFixture(page, ["#0678ca", "#ec9124"]);
  await page.getByRole("button", { name: /^Color range/ }).click();
  const overlay = page.getByRole("switch", { name: "Show overlay" });
  const newMask = page.getByRole("button", { name: "New mask" });
  await newMask.focus();
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(overlay).toBeFocused();
  const sampler = page.getByTestId("mask-color-sample-surface");

  await page.getByRole("button", { name: "Pick from photo" }).click();
  await expect(sampler).toBeVisible();
  const bounds = (await sampler.boundingBox())!;
  await sampler.click({ position: { x: bounds.width * 0.65, y: bounds.height * 0.4 } });
  await expect(page.getByRole("button", { name: "Pick from photo" })).toBeVisible();
  const hue = Number(await page.getByRole("slider", { name: "Hue target" }).getAttribute("aria-valuenow"));
  expect(hue).toBeGreaterThan(10);
  expect(hue).toBeLessThan(30);

  await newMask.click();
  await page.getByRole("menuitemradio", { name: "Luminance range" }).click();
  const lightness = page.getByRole("slider", { name: "Brightness target" });
  await page.getByRole("button", { name: "Pick from photo" }).click();
  await sampler.click({ position: { x: bounds.width * 0.35, y: bounds.height * 0.4 } });
  await expect.poll(async () => Number(await lightness.getAttribute("aria-valuenow"))).toBeLessThan(65);
  expect(Number(await lightness.getAttribute("aria-valuenow"))).toBeGreaterThan(45);
});
