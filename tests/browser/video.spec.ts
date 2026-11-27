import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { ALL_FORMATS, BufferSource, EncodedPacketSink, Input } from "mediabunny";

test("animated Creative Effects export as a looping H.264 MP4", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/editor?sample=1");
  await expect(page.getByRole("slider", { name: "Exposure", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Browse effects" }).click();
  await page.getByRole("searchbox", { name: "Search effects and looks" }).fill("ripple");
  await page.getByRole("list", { name: "Effect results" }).getByRole("button", { name: /^Ripple/ }).first().click();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Export as video…" }).click();
  const dialog = page.getByRole("dialog", { name: "Export video" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name: "3 s" }).click();
  await dialog.getByRole("radio", { name: "720p" }).click();
  await dialog.getByRole("radio", { name: "24 fps" }).click();
  await expect(dialog.getByText("720 × 900 · 72 frames", { exact: false })).toBeVisible();

  // Some browser builds ship without an H.264 encoder; they must say so plainly.
  const unsupported = dialog.getByRole("alert");
  if (await unsupported.isVisible().catch(() => false)) {
    await expect(unsupported).toContainText("can’t encode");
    await expect(dialog.getByRole("button", { name: "Export MP4" })).toBeDisabled();
    test.skip(true, "This browser build has no H.264 encoder.");
  }

  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export MP4" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/_loop_3s\.mp4$/);
  await expect(dialog.getByText(/^Saved .*\.mp4/)).toBeVisible();

  const bytes = await readFile((await file.path())!);
  const input = new Input({ source: new BufferSource(bytes), formats: ALL_FORMATS });
  const track = (await input.getPrimaryVideoTrack())!;
  expect(track).toBeTruthy();
  expect(await track.getCodecParameterString()).toMatch(/^avc1\./);
  expect(track.displayWidth).toBe(720);
  expect(track.displayHeight).toBe(900);
  expect(await track.computeDuration()).toBeCloseTo(3, 1);
  let packets = 0;
  for await (const packet of new EncodedPacketSink(track).packets()) {
    expect(packet.data.byteLength).toBeGreaterThan(0);
    packets++;
  }
  expect(packets).toBe(72);
});
