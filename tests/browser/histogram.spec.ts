import { expect, test, type Locator } from "@playwright/test";

async function canvasHasPaintedPixels(canvas: Locator): Promise<boolean> {
  return canvas.evaluate((element: HTMLCanvasElement) => {
    if (element.width <= 0 || element.height <= 0) return false;
    const context = element.getContext("2d");
    if (!context) return false;
    const { data } = context.getImageData(0, 0, element.width, element.height);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return true;
    }
    return false;
  });
}

test("histogram can be detached, dragged around, docked back, and hidden/restored", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/editor?sample=1");

  const docked = page.getByTestId("histogram-docked");
  const floating = page.getByTestId("histogram-floating");

  // Default state: docked in the Develop panel with rendered histogram tones.
  await expect(docked).toBeVisible();
  await expect(floating).toHaveCount(0);
  await expect
    .poll(() => canvasHasPaintedPixels(docked.getByRole("img", { name: "Histogram" })))
    .toBe(true);

  // Detach from the Develop panel into a floating movable window.
  await docked.getByRole("button", { name: "Detach histogram" }).click();
  await expect(docked).toHaveCount(0);
  await expect(floating).toBeVisible();
  await expect
    .poll(() => canvasHasPaintedPixels(floating.getByRole("img", { name: "Histogram" })))
    .toBe(true);

  // Drag the floating histogram across the workspace.
  const handle = floating.getByTestId("histogram-drag-handle");
  const startBox = (await floating.boundingBox())!;
  const handleBox = (await handle.boundingBox())!;
  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 240, startY + 180, { steps: 10 });
  await page.mouse.up();

  const movedBox = (await floating.boundingBox())!;
  expect(Math.abs((movedBox.x - startBox.x) - (-240))).toBeLessThanOrEqual(6);
  expect(Math.abs((movedBox.y - startBox.y) - 180)).toBeLessThanOrEqual(6);

  // Dragging past the top-left edge keeps the floating histogram clamped inside the workspace.
  const clampHandle = (await handle.boundingBox())!;
  await page.mouse.move(clampHandle.x + clampHandle.width / 2, clampHandle.y + clampHandle.height / 2);
  await page.mouse.down();
  await page.mouse.move(-200, -200, { steps: 8 });
  await page.mouse.up();

  const clampedBox = (await floating.boundingBox())!;
  expect(clampedBox.x).toBeGreaterThanOrEqual(10);
  expect(clampedBox.y).toBeGreaterThanOrEqual(56);

  // Stays visible while switching to Masks mode.
  await page.getByRole("radio", { name: "Masks", exact: true }).click();
  await expect(floating).toBeVisible();
  await page.getByRole("radio", { name: "Edit", exact: true }).click();

  // Detached state and moved position persist across reloads.
  await page.reload();
  await expect(floating).toBeVisible();
  await expect(docked).toHaveCount(0);
  const reloadedBox = (await floating.boundingBox())!;
  expect(Math.abs(reloadedBox.x - clampedBox.x)).toBeLessThanOrEqual(4);
  expect(Math.abs(reloadedBox.y - clampedBox.y)).toBeLessThanOrEqual(4);

  // TopBar menu can reset floating position.
  await page.getByRole("button", { name: "Histogram", exact: true }).click();
  await page.getByRole("menuitem", { name: "Reset position" }).click();
  const resetBox = (await floating.boundingBox())!;
  expect(Math.abs(resetBox.x - startBox.x)).toBeLessThanOrEqual(6);
  expect(Math.abs(resetBox.y - startBox.y)).toBeLessThanOrEqual(6);

  // Hide altogether from the floating header.
  await floating.getByRole("button", { name: "Hide histogram" }).click();
  await expect(floating).toHaveCount(0);
  await expect(docked).toHaveCount(0);

  // Restore via H shortcut (restores floating state), then dock back via button.
  await page.keyboard.press("h");
  await expect(floating).toBeVisible();
  await floating.getByRole("button", { name: "Dock histogram" }).click();
  await expect(floating).toHaveCount(0);
  await expect(docked).toBeVisible();

  // Hide from docked header, then restore via TopBar Histogram menu.
  await docked.getByRole("button", { name: "Hide histogram" }).click();
  await expect(docked).toHaveCount(0);
  await expect(floating).toHaveCount(0);

  await page.getByRole("button", { name: "Histogram", exact: true }).click();
  await page.getByRole("menuitemradio", { name: /Docked histogram/ }).click();
  await expect(docked).toBeVisible();

  // Shift+H detaches and docks cleanly via keyboard.
  await page.keyboard.press("Shift+H");
  await expect(floating).toBeVisible();
  await expect(docked).toHaveCount(0);
  await page.keyboard.press("Shift+H");
  await expect(docked).toBeVisible();
  await expect(floating).toHaveCount(0);

  expect(errors).toEqual([]);
});
