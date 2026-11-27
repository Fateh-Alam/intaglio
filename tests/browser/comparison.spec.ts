import { expect, test } from "@playwright/test";

test("a snapshot captures the edit and stays independent of Before and later edits", async ({ page }) => {
  await page.goto("/editor");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 160;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#808080";
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const chooser = page.waitForEvent("filechooser");
  await page.getByText("Open Photograph", { exact: true }).click();
  await (await chooser).setFiles({ name: "comparison.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });

  const pixel = (x: number) => page.locator("#main-editor-canvas canvas").evaluate((canvas: HTMLCanvasElement, x) => {
    const photo = document.querySelector('[data-testid="photo-frame"]')!.getBoundingClientRect();
    const viewport = canvas.getBoundingClientRect();
    const px = Math.floor((photo.left + x * photo.width - viewport.left) / viewport.width * canvas.width);
    const py = Math.floor((photo.top + photo.height / 2 - viewport.top) / viewport.height * canvas.height);
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    const context = probe.getContext("2d")!;
    context.drawImage(canvas, px, py, 1, 1, 0, 0, 1, 1);
    return context.getImageData(0, 0, 1, 1).data[0];
  }, x);

  const exposure = page.getByRole("slider", { name: "Exposure", exact: true });
  await exposure.press("End");
  await expect.poll(() => pixel(0.25)).toBeGreaterThan(240);
  await page.getByRole("button", { name: "Show before" }).click();
  await expect.poll(() => pixel(0.25)).toBeCloseTo(128, 0);
  await page.getByRole("button", { name: "Show looks & history" }).click();
  await page.getByRole("radio", { name: "Versions" }).click();
  await page.getByRole("button", { name: "Take snapshot" }).click();
  const compare = page.getByRole("button", { name: "Compare with current" });
  await expect(compare).toBeAttached();
  await exposure.press("Home");
  await compare.click();
  await expect(page.getByRole("slider", { name: "Before and after divider" })).toBeVisible();
  await expect.poll(() => pixel(0.25)).toBeGreaterThan(240);
  await expect.poll(() => pixel(0.75)).toBeLessThan(35);

  await page.getByRole("button", { name: "Stop comparing with snapshot" }).click();
  await expect.poll(() => pixel(0.25)).toBeLessThan(35);
});
