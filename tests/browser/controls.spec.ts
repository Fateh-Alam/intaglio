import { expect, test, type Locator, type Page } from "@playwright/test";
import { FILM_EMULATIONS } from "../../app/lib/filmEmulations";

const SAMPLE_W = 96;
const SAMPLE_H = 120;

interface FrameSample {
  rgb: number[];
  w: number;
  h: number;
}

/**
 * Reads a 96x120 RGB sample cropped strictly to [data-testid="photo-frame"]
 * mapped onto #main-editor-canvas canvas using bounding-rect ratios so
 * WebKit DPR=2 and responsive canvas scaling remain exact.
 */
async function samplePhotoFrame(page: Page, w = SAMPLE_W, h = SAMPLE_H): Promise<FrameSample> {
  const rgb = await page.evaluate(({ w, h }) => {
    const canvas = document.querySelector("#main-editor-canvas canvas") as HTMLCanvasElement | null;
    const frame = document.querySelector('[data-testid="photo-frame"]') as HTMLElement | null;
    if (!canvas || !frame) throw new Error("Missing #main-editor-canvas canvas or photo-frame");
    const cr = canvas.getBoundingClientRect();
    const fr = frame.getBoundingClientRect();
    const sx = Math.max(0, Math.round(((fr.left - cr.left) / cr.width) * canvas.width));
    const sy = Math.max(0, Math.round(((fr.top - cr.top) / cr.height) * canvas.height));
    const sw = Math.max(1, Math.min(canvas.width - sx, Math.round((fr.width / cr.width) * canvas.width)));
    const sh = Math.max(1, Math.min(canvas.height - sy, Math.round((fr.height / cr.height) * canvas.height)));
    const probe = document.createElement("canvas");
    probe.width = w;
    probe.height = h;
    const ctx = probe.getContext("2d")!;
    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const out = new Array<number>(w * h * 3);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
      out[j] = data[i];
      out[j + 1] = data[i + 1];
      out[j + 2] = data[i + 2];
    }
    return out;
  }, { w, h });
  return { rgb, w, h };
}

function meanAbsDiff(a: FrameSample, b: FrameSample): number {
  let sum = 0;
  for (let i = 0; i < a.rgb.length; i++) sum += Math.abs(a.rgb[i] - b.rgb[i]);
  return sum / a.rgb.length;
}

function meanChroma(sample: FrameSample): { mean: number; max: number } {
  let sum = 0;
  let max = 0;
  const count = sample.rgb.length / 3;
  for (let i = 0; i < sample.rgb.length; i += 3) {
    const r = sample.rgb[i];
    const g = sample.rgb[i + 1];
    const b = sample.rgb[i + 2];
    const c = Math.max(r, g, b) - Math.min(r, g, b);
    sum += c;
    if (c > max) max = c;
  }
  return { mean: sum / count, max };
}

/** Average [R, G, B] over a normalized [x0..x1, y0..y1] box in the sample. */
function regionMeanRgb(sample: FrameSample, x0: number, y0: number, x1: number, y1: number): [number, number, number] {
  const ix0 = Math.max(0, Math.floor(x0 * sample.w));
  const ix1 = Math.min(sample.w, Math.ceil(x1 * sample.w));
  const iy0 = Math.max(0, Math.floor(y0 * sample.h));
  const iy1 = Math.min(sample.h, Math.ceil(y1 * sample.h));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = iy0; y < iy1; y++) {
    for (let x = ix0; x < ix1; x++) {
      const idx = (y * sample.w + x) * 3;
      r += sample.rgb[idx];
      g += sample.rgb[idx + 1];
      b += sample.rgb[idx + 2];
      n++;
    }
  }
  return n ? [r / n, g / n, b / n] : [0, 0, 0];
}

function regionAbsDiff(a: FrameSample, b: FrameSample, x0: number, y0: number, x1: number, y1: number): number {
  const ix0 = Math.max(0, Math.floor(x0 * a.w));
  const ix1 = Math.min(a.w, Math.ceil(x1 * a.w));
  const iy0 = Math.max(0, Math.floor(y0 * a.h));
  const iy1 = Math.min(a.h, Math.ceil(y1 * a.h));
  let sum = 0;
  let n = 0;
  for (let y = iy0; y < iy1; y++) {
    for (let x = ix0; x < ix1; x++) {
      const idx = (y * a.w + x) * 3;
      sum += Math.abs(a.rgb[idx] - b.rgb[idx]) + Math.abs(a.rgb[idx + 1] - b.rgb[idx + 1]) + Math.abs(a.rgb[idx + 2] - b.rgb[idx + 2]);
      n += 3;
    }
  }
  return n ? sum / n : 0;
}

const luma = ([r, g, b]: [number, number, number]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

async function flushFrames(page: Page, count = 2): Promise<void> {
  await page.evaluate(
    (n) =>
      new Promise<void>((resolve) => {
        let left = n;
        const tick = () => {
          if (--left <= 0) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    count,
  );
}

async function waitForDiffAbove(page: Page, baseline: FrameSample, minDiff: number, label: string): Promise<FrameSample> {
  let latest = baseline;
  await expect
    .poll(
      async () => {
        await flushFrames(page, 2);
        latest = await samplePhotoFrame(page);
        return meanAbsDiff(latest, baseline);
      },
      { message: `${label} should change pixels by > ${minDiff}`, timeout: 6_000, intervals: [50, 100, 150] },
    )
    .toBeGreaterThan(minDiff);
  return latest;
}

async function waitForReset(page: Page, baseline: FrameSample, label: string, maxResidual = 0.75): Promise<void> {
  await expect
    .poll(
      async () => {
        await flushFrames(page, 2);
        const curr = await samplePhotoFrame(page);
        return meanAbsDiff(curr, baseline);
      },
      { message: `${label} should reset back to baseline (<= ${maxResidual})`, timeout: 6_000, intervals: [50, 100, 150] },
    )
    .toBeLessThanOrEqual(maxResidual);
}

/**
 * Opens a fast 360x240 calibration chart containing:
 * - Top-left (0..0.5, 0..0.33): pure neutral mid-grey #808080
 * - Top-right (0.5..1, 0..0.33): bright highlight #e4e4e4 with #fcfcfc specular core
 * - Mid-left (0..0.5, 0.33..0.67): deep shadow #242424, #0f0f0f black, and crisp 6px checkerboard
 * - Mid-right (0.5..1, 0.33..0.67): natural skin-tone patch #d29978 next to #f2f2f2
 * - Bottom (0..1, 0.67..1): 8 vivid OKLCh hue bands (Red..Magenta)
 */
async function openCalibrationChart(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/editor");
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 240;
    const ctx = canvas.getContext("2d")!;

    // Top-left: pure mid-grey #808080
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 180, 80);

    // Top-right: bright highlight + specular center
    ctx.fillStyle = "#e4e4e4";
    ctx.fillRect(180, 0, 180, 80);
    ctx.fillStyle = "#fcfcfc";
    ctx.fillRect(220, 16, 100, 48);

    // Mid-left: deep shadows + crisp black/white checkerboard
    ctx.fillStyle = "#242424";
    ctx.fillRect(0, 80, 90, 80);
    ctx.fillStyle = "#0f0f0f";
    ctx.fillRect(15, 95, 60, 50);
    for (let y = 80; y < 160; y += 6) {
      for (let x = 90; x < 180; x += 6) {
        ctx.fillStyle = ((x / 6 + y / 6) & 1) === 0 ? "#101010" : "#f0f0f0";
        ctx.fillRect(x, y, 6, 6);
      }
    }

    // Mid-right: warm skin tone + bright white edge
    ctx.fillStyle = "#d29978";
    ctx.fillRect(180, 80, 120, 80);
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(300, 80, 60, 80);

    // Bottom: 8 vivid color strips across all Color Mixer bands
    const bands = ["#e62626", "#f07d18", "#e6d218", "#28b838", "#18c4c4", "#2458e6", "#7e32e0", "#df28a8"];
    const bandW = 360 / bands.length;
    bands.forEach((hex, idx) => {
      ctx.fillStyle = hex;
      ctx.fillRect(Math.round(idx * bandW), 160, Math.ceil(bandW), 80);
    });
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const fileChooser = page.waitForEvent("filechooser");
  await page.getByText("Open Photograph", { exact: true }).click();
  await (await fileChooser).setFiles({
    name: "calibration.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  });
  await expect(page.getByRole("slider", { name: "Exposure", exact: true })).toBeVisible();
  await expect(page.locator("#main-editor-canvas canvas")).toBeVisible();
  await expect(page.getByTestId("photo-frame")).toBeVisible();
  // Wait for WebGL to paint the mid-grey quadrant (~128)
  await expect
    .poll(async () => {
      await flushFrames(page, 2);
      const s = await samplePhotoFrame(page);
      return regionMeanRgb(s, 0.1, 0.08, 0.4, 0.25)[0];
    })
    .toBeGreaterThan(115);
}

async function openSection(page: Page, title: string): Promise<void> {
  const header = page.getByRole("button", { name: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s+Modified)?$`) });
  await header.scrollIntoViewIfNeeded();
  if ((await header.getAttribute("aria-expanded")) !== "true") {
    await header.click();
  }
}

async function setSliderByTyping(page: Page, slider: Locator, text: string): Promise<void> {
  const group = slider.locator("..");
  const valueBtn = group.locator("button").first();
  await valueBtn.click();
  const input = group.locator("input");
  await input.fill(text);
  await input.press("Enter");
  await flushFrames(page, 2);
}

async function testSliderLiveAndReset(
  page: Page,
  slider: Locator,
  baseline: FrameSample,
  label: string,
  options: { key?: "End" | "Home"; minDiff?: number } = {},
): Promise<FrameSample> {
  const { key = "End", minDiff = 0.4 } = options;
  await slider.scrollIntoViewIfNeeded();
  const initialVal = await slider.getAttribute("aria-valuenow");
  await slider.focus();
  await slider.press(key);
  const changed = await waitForDiffAbove(page, baseline, minDiff, `${label} (${key})`);
  await slider.dblclick();
  await expect
    .poll(() => slider.getAttribute("aria-valuenow"), { message: `${label} aria-valuenow after dblclick reset` })
    .toBe(initialVal);
  await waitForReset(page, baseline, label);
  return changed;
}

test.describe("control honesty regression contract", () => {
  test.setTimeout(180_000);

  test("Basic tone, white balance direction, highlight protection, and exact resets", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await openCalibrationChart(page);
    const baseline = await samplePhotoFrame(page);
    const baseGrey = regionMeanRgb(baseline, 0.08, 0.06, 0.42, 0.26);
    const baseHi = regionMeanRgb(baseline, 0.56, 0.06, 0.94, 0.26);
    const baseShadow = regionMeanRgb(baseline, 0.04, 0.38, 0.22, 0.6);

    expect(Math.abs(baseGrey[0] - 128)).toBeLessThanOrEqual(4);
    expect(Math.abs(baseGrey[1] - 128)).toBeLessThanOrEqual(4);
    expect(Math.abs(baseGrey[2] - 128)).toBeLessThanOrEqual(4);

    // 1. Exposure +1 EV brightens #808080 by ~1 stop (~176 in sRGB)
    const exposure = page.getByRole("slider", { name: "Exposure", exact: true });
    await setSliderByTyping(page, exposure, "1");
    const expPlus1 = await waitForDiffAbove(page, baseline, 10, "Exposure +1 EV");
    const greyPlus1 = regionMeanRgb(expPlus1, 0.08, 0.06, 0.42, 0.26);
    expect(luma(greyPlus1), `Exposure +1 EV mid-grey ${greyPlus1}`).toBeGreaterThanOrEqual(168);
    expect(luma(greyPlus1), `Exposure +1 EV mid-grey ${greyPlus1}`).toBeLessThanOrEqual(186);
    await exposure.dblclick();
    await waitForReset(page, baseline, "Exposure");

    // 2. Temperature: +1 warms (R > B, luma-neutral), -1 cools (B > R, luma-neutral)
    const temp = page.getByRole("slider", { name: "Temperature", exact: true });
    await temp.focus();
    await temp.press("End");
    const tempWarm = await waitForDiffAbove(page, baseline, 2, "Temperature +1");
    const warmGrey = regionMeanRgb(tempWarm, 0.08, 0.06, 0.42, 0.26);
    expect(warmGrey[0] - warmGrey[2], `Temperature +1 warm grey ${warmGrey}`).toBeGreaterThan(10);
    expect(Math.abs(luma(warmGrey) - luma(baseGrey)), `Temperature +1 luma preservation ${warmGrey}`).toBeLessThan(8);

    await temp.press("Home");
    const tempCool = await waitForDiffAbove(page, baseline, 2, "Temperature -1");
    const coolGrey = regionMeanRgb(tempCool, 0.08, 0.06, 0.42, 0.26);
    expect(coolGrey[2] - coolGrey[0], `Temperature -1 cool grey ${coolGrey}`).toBeGreaterThan(10);
    expect(Math.abs(luma(coolGrey) - luma(baseGrey)), `Temperature -1 luma preservation ${coolGrey}`).toBeLessThan(8);
    await temp.dblclick();
    await waitForReset(page, baseline, "Temperature");

    // 3. Tint: +1 shifts magenta (R,B > G), -1 shifts green (G > R,B)
    const tint = page.getByRole("slider", { name: "Tint", exact: true });
    await tint.focus();
    await tint.press("End");
    const tintMag = await waitForDiffAbove(page, baseline, 2, "Tint +1");
    const magGrey = regionMeanRgb(tintMag, 0.08, 0.06, 0.42, 0.26);
    expect(magGrey[0] - magGrey[1], `Tint +1 magenta ${magGrey}`).toBeGreaterThan(8);
    expect(magGrey[2] - magGrey[1], `Tint +1 magenta ${magGrey}`).toBeGreaterThan(8);

    await tint.press("Home");
    const tintGreen = await waitForDiffAbove(page, baseline, 2, "Tint -1");
    const greenGrey = regionMeanRgb(tintGreen, 0.08, 0.06, 0.42, 0.26);
    expect(greenGrey[1] - greenGrey[0], `Tint -1 green ${greenGrey}`).toBeGreaterThan(8);
    expect(greenGrey[1] - greenGrey[2], `Tint -1 green ${greenGrey}`).toBeGreaterThan(8);
    await tint.dblclick();
    await waitForReset(page, baseline, "Tint");

    // 4. Highlights & Whites direction (+ brightens highlights, - recovers highlights)
    for (const name of ["Highlights", "Whites"] as const) {
      const slider = page.getByRole("slider", { name, exact: true });
      await slider.focus();
      await slider.press("End");
      const up = await waitForDiffAbove(page, baseline, 0.8, `${name} +1`);
      expect(luma(regionMeanRgb(up, 0.56, 0.06, 0.94, 0.26)), `${name} +1 brightens highlights`).toBeGreaterThan(luma(baseHi) + 3);
      await slider.press("Home");
      const down = await waitForDiffAbove(page, baseline, 0.8, `${name} -1`);
      expect(luma(regionMeanRgb(down, 0.56, 0.06, 0.94, 0.26)), `${name} -1 recovers highlights`).toBeLessThan(luma(baseHi) - 3);
      await slider.dblclick();
      await waitForReset(page, baseline, name);
    }

    // 5. Shadows & Blacks direction (+ lifts shadows, - deepens shadows)
    for (const name of ["Shadows", "Blacks"] as const) {
      const slider = page.getByRole("slider", { name, exact: true });
      await slider.focus();
      await slider.press("End");
      const up = await waitForDiffAbove(page, baseline, 0.8, `${name} +1`);
      expect(luma(regionMeanRgb(up, 0.04, 0.38, 0.22, 0.6)), `${name} +1 lifts shadows`).toBeGreaterThan(luma(baseShadow) + 3);
      await slider.press("Home");
      const down = await waitForDiffAbove(page, baseline, 0.5, `${name} -1`);
      expect(luma(regionMeanRgb(down, 0.04, 0.38, 0.22, 0.6)), `${name} -1 deepens shadows`).toBeLessThan(luma(baseShadow) - 3);
      await slider.dblclick();
      await waitForReset(page, baseline, name);
    }

    // 6. Contrast, Clarity, Dehaze, Vibrance, Saturation
    for (const name of ["Contrast", "Clarity", "Dehaze", "Vibrance", "Saturation"] as const) {
      await testSliderLiveAndReset(page, page.getByRole("slider", { name, exact: true }), baseline, name, { minDiff: 1.0 });
    }

    // 7. Dependent switch: Protect highlights disabled at default, active when Exposure pushed
    const protect = page.getByRole("switch", { name: "Protect highlights", exact: true });
    await expect(protect).toBeDisabled();
    await expect(page.getByText("Adjust Exposure or tone first")).toBeVisible();

    await setSliderByTyping(page, exposure, "2");
    await expect(protect).toBeEnabled();
    const pushed = await waitForDiffAbove(page, baseline, 15, "Exposure +2 EV");
    const pushedHi = luma(regionMeanRgb(pushed, 0.56, 0.06, 0.94, 0.26));

    await protect.click();
    await expect(protect).toHaveAttribute("aria-checked", "true");
    const protectedFrame = await waitForDiffAbove(page, pushed, 1.0, "Protect highlights enabled");
    expect(luma(regionMeanRgb(protectedFrame, 0.56, 0.06, 0.94, 0.26)), "Protect highlights rolls back clipped highs").toBeLessThan(pushedHi - 2);

    await protect.click();
    await exposure.dblclick();
    await expect(protect).toBeDisabled();
    await waitForReset(page, baseline, "Basic reset");
    expect(errors).toEqual([]);
  });

  test("Color Mixer, Color Grading, Detail, Geometry, Effects, and Film Response controls are honest", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await openCalibrationChart(page);
    const baseline = await samplePhotoFrame(page);

    // --- Color Mixer: all 24 band sliders + dependent Protect skin tones ---
    await openSection(page, "Color Mixer");
    const skinSwitch = page.getByRole("switch", { name: "Protect skin tones", exact: true });
    await expect(skinSwitch).toBeDisabled();
    await expect(page.getByText("Adjust a color slider first")).toBeVisible();

    const bands = ["Red", "Orange", "Yellow", "Green", "Aqua", "Blue", "Purple", "Magenta"] as const;
    for (const mode of ["Hue", "Saturation", "Luminance"] as const) {
      await page.getByRole("radio", { name: mode, exact: true }).click();
      for (const band of bands) {
        const slider = page.getByRole("slider", { name: band, exact: true });
        await testSliderLiveAndReset(page, slider, baseline, `Color Mixer ${mode} ${band}`, { minDiff: 0.3 });
      }
    }

    // Enable Orange Hue -> Protect skin tones unlocks and changes skin patch pixels
    await page.getByRole("radio", { name: "Hue", exact: true }).click();
    const orangeHue = page.getByRole("slider", { name: "Orange", exact: true });
    await orangeHue.focus();
    await orangeHue.press("End");
    await expect(skinSwitch).toBeEnabled();
    const shiftedOrange = await waitForDiffAbove(page, baseline, 0.8, "Orange Hue");
    await skinSwitch.click();
    await waitForDiffAbove(page, shiftedOrange, 0.3, "Protect skin tones active");
    await skinSwitch.click();
    await orangeHue.dblclick();
    await expect(skinSwitch).toBeDisabled();
    await waitForReset(page, baseline, "Color Mixer reset");

    // --- Color Grading: 3 wheels (keyboard + dblclick), 3 Lum sliders, dependent Balance ---
    await openSection(page, "Color Grading");
    const balance = page.getByRole("slider", { name: "Balance", exact: true });
    await expect(balance).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText("Adjust a color wheel first")).toBeVisible();

    for (const zone of ["Midtones", "Shadows", "Highlights"] as const) {
      const wheel = page.getByRole("slider", { name: `${zone} color`, exact: true });
      await wheel.scrollIntoViewIfNeeded();
      await wheel.focus();
      await wheel.press("End");
      await waitForDiffAbove(page, baseline, 0.8, `${zone} color wheel (End)`);
      await wheel.dblclick();
      await expect(wheel).toHaveAttribute("aria-valuenow", "0");
      await waitForReset(page, baseline, `${zone} color wheel reset`);

      const lumSlider = page.getByRole("slider", { name: `${zone} luminance`, exact: true });
      await testSliderLiveAndReset(page, lumSlider, baseline, `${zone} luminance`, { minDiff: 0.8 });
    }

    // Tint Shadows cool blue & Highlights warm -> Balance unlocks & shifts positive toward highlights
    const shadowsWheel = page.getByRole("slider", { name: "Shadows color", exact: true });
    const highlightsWheel = page.getByRole("slider", { name: "Highlights color", exact: true });
    await shadowsWheel.focus();
    for (let i = 0; i < 10; i++) await shadowsWheel.press("PageUp");
    await shadowsWheel.press("End");
    await highlightsWheel.focus();
    await highlightsWheel.press("PageUp");
    await highlightsWheel.press("End");
    await expect(balance).not.toHaveAttribute("aria-disabled", "true");
    const gradedBase = await waitForDiffAbove(page, baseline, 2, "Shadows + Highlights graded");
    await balance.focus();
    await balance.press("Home");
    const balLow = await waitForDiffAbove(page, gradedBase, 0.5, "Balance -1");
    await balance.press("End");
    const balHigh = await waitForDiffAbove(page, balLow, 1.0, "Balance +1 vs -1");
    const lowGrey = regionMeanRgb(balLow, 0.08, 0.06, 0.42, 0.26);
    const highGrey = regionMeanRgb(balHigh, 0.08, 0.06, 0.42, 0.26);
    expect(highGrey[0] - highGrey[2], `Balance +1 favours warm highlights over cool shadows (${highGrey} vs ${lowGrey})`).toBeGreaterThan(
      lowGrey[0] - lowGrey[2] + 3,
    );
    await page.getByRole("button", { name: "Reset Color Grading", exact: true }).click();
    await waitForReset(page, baseline, "Color Grading section reset");

    // --- Detail & Geometry ---
    await openSection(page, "Detail");
    await testSliderLiveAndReset(page, page.getByRole("slider", { name: "Sharpening", exact: true }), baseline, "Sharpening", { minDiff: 0.4 });

    await openSection(page, "Geometry");
    for (const name of ["Scale", "Distortion", "Vertical", "Horizontal"] as const) {
      await testSliderLiveAndReset(page, page.getByRole("slider", { name, exact: true }), baseline, `Geometry ${name}`, { minDiff: 0.5 });
    }
    const geomMore = page.locator("section", { hasText: "Geometry" }).getByRole("button", { name: "More", exact: true });
    await geomMore.click();
    await testSliderLiveAndReset(page, page.getByRole("slider", { name: "Anamorphic squeeze", exact: true }), baseline, "Anamorphic squeeze", { minDiff: 0.5 });

    // --- Effects: independent + dependent Glow & Light beam controls ---
    await openSection(page, "Effects");
    for (const name of ["Vignette", "Grain", "Halation", "Bloom", "Anamorphic streaks", "Color fringing"] as const) {
      await testSliderLiveAndReset(page, page.getByRole("slider", { name, exact: true }), baseline, `Effects ${name}`, { minDiff: 0.4 });
    }
    const filmBorder = page.getByRole("switch", { name: "Film border", exact: true });
    await filmBorder.click();
    await waitForDiffAbove(page, baseline, 0.5, "Film border");
    await filmBorder.click();
    await waitForReset(page, baseline, "Film border reset");

    // Glow More: Halation & Bloom sub-controls disabled at 0, active once parent raised (including Home=0!)
    const effectsSection = page.locator("section").filter({ has: page.getByRole("button", { name: /^Effects(?:\s+Modified)?$/ }) });
    await effectsSection.getByRole("button", { name: "More", exact: true }).click();
    const halThresh = page.getByRole("slider", { name: "Halation threshold", exact: true });
    const halSpread = page.getByRole("slider", { name: "Halation spread", exact: true });
    const bloomThresh = page.getByRole("slider", { name: "Bloom threshold", exact: true });
    const bloomSpread = page.getByRole("slider", { name: "Bloom spread", exact: true });
    await expect(halThresh).toHaveAttribute("aria-disabled", "true");
    await expect(halSpread).toHaveAttribute("aria-disabled", "true");
    await expect(bloomThresh).toHaveAttribute("aria-disabled", "true");
    await expect(bloomSpread).toHaveAttribute("aria-disabled", "true");

    const halation = page.getByRole("slider", { name: "Halation", exact: true });
    await halation.focus();
    await halation.press("End");
    await expect(halThresh).not.toHaveAttribute("aria-disabled", "true");
    const halBase = await waitForDiffAbove(page, baseline, 1.0, "Halation max");
    await testSliderLiveAndReset(page, halThresh, halBase, "Halation threshold (Home=0)", { key: "Home", minDiff: 1.0 });
    await testSliderLiveAndReset(page, halSpread, halBase, "Halation spread", { key: "End", minDiff: 0.3 });
    await halation.dblclick();
    await expect(halThresh).toHaveAttribute("aria-disabled", "true");

    const bloom = page.getByRole("slider", { name: "Bloom", exact: true });
    await bloom.focus();
    await bloom.press("End");
    await expect(bloomThresh).not.toHaveAttribute("aria-disabled", "true");
    const bloomBase = await waitForDiffAbove(page, baseline, 1.0, "Bloom max");
    await testSliderLiveAndReset(page, bloomThresh, bloomBase, "Bloom threshold (Home=0)", { key: "Home", minDiff: 1.0 });
    await testSliderLiveAndReset(page, bloomSpread, bloomBase, "Bloom spread", { key: "End", minDiff: 0.3 });
    await bloom.dblclick();
    await expect(bloomThresh).toHaveAttribute("aria-disabled", "true");
    await waitForReset(page, baseline, "Glow reset");

    // Light beam: Strength + Position X/Y (including Home=0), Falloff, Shine, Rim glow, Warm/Cool
    const beamStrength = page.getByRole("slider", { name: "Strength", exact: true });
    await beamStrength.focus();
    await beamStrength.press("End");
    const beamBase = await waitForDiffAbove(page, baseline, 1.5, "Light beam Strength");
    await effectsSection.getByRole("button", { name: "Position & color", exact: true }).click();
    await testSliderLiveAndReset(page, page.getByRole("slider", { name: "Position X", exact: true }), beamBase, "Light beam Position X (Home=0)", { key: "Home", minDiff: 0.5 });
    await testSliderLiveAndReset(page, page.getByRole("slider", { name: "Position Y", exact: true }), beamBase, "Light beam Position Y (Home=0)", { key: "Home", minDiff: 0.5 });
    await testSliderLiveAndReset(page, page.getByRole("slider", { name: "Falloff", exact: true }), beamBase, "Light beam Falloff", { key: "End", minDiff: 0.5 });
    await testSliderLiveAndReset(page, page.getByRole("slider", { name: "Shine", exact: true }), beamBase, "Light beam Shine", { key: "End", minDiff: 0.3 });
    await testSliderLiveAndReset(page, page.getByRole("slider", { name: "Rim glow", exact: true }), beamBase, "Light beam Rim glow", { key: "End", minDiff: 0.3 });
    await effectsSection.getByRole("button", { name: "Cool", exact: true }).click();
    await waitForDiffAbove(page, beamBase, 0.4, "Light beam Cool tint");
    await page.getByRole("button", { name: "Reset Effects", exact: true }).click();
    await waitForReset(page, baseline, "Effects reset");

    // --- Film Response: monotonic & directionally honest Toe, Shoulder, Density, Crossover, Desat ---
    await openSection(page, "Film Response");
    const baseShadowLuma = luma(regionMeanRgb(baseline, 0.04, 0.38, 0.22, 0.6));
    const baseHiLuma = luma(regionMeanRgb(baseline, 0.56, 0.06, 0.94, 0.26));
    const baseMidLuma = luma(regionMeanRgb(baseline, 0.08, 0.06, 0.42, 0.26));

    const toeFrame = await testSliderLiveAndReset(page, page.getByRole("slider", { name: "Toe", exact: true }), baseline, "Film Toe", { minDiff: 1.0 });
    expect(luma(regionMeanRgb(toeFrame, 0.04, 0.38, 0.22, 0.6)), "Toe lifts shadows").toBeGreaterThan(baseShadowLuma + 5);

    const shoulderFrame = await testSliderLiveAndReset(page, page.getByRole("slider", { name: "Shoulder", exact: true }), baseline, "Film Shoulder", { minDiff: 1.0 });
    expect(luma(regionMeanRgb(shoulderFrame, 0.56, 0.06, 0.94, 0.26)), "Shoulder rolls off highlights (darkens, never brightens)").toBeLessThan(baseHiLuma - 5);

    const density = page.getByRole("slider", { name: "Density", exact: true });
    await density.focus();
    await density.press("End");
    const denseFrame = await waitForDiffAbove(page, baseline, 5.0, "Density > 1");
    expect(luma(regionMeanRgb(denseFrame, 0.08, 0.06, 0.42, 0.26)), "Density > 1 is denser/darker").toBeLessThan(baseMidLuma - 10);
    await density.press("Home");
    const lightFrame = await waitForDiffAbove(page, baseline, 5.0, "Density < 1");
    expect(luma(regionMeanRgb(lightFrame, 0.08, 0.06, 0.42, 0.26)), "Density < 1 is lighter/brighter").toBeGreaterThan(baseMidLuma + 10);
    await density.dblclick();
    await waitForReset(page, baseline, "Density reset");

    await testSliderLiveAndReset(page, page.getByRole("slider", { name: "Color crossover", exact: true }), baseline, "Color crossover", { minDiff: 1.0 });
    await testSliderLiveAndReset(page, page.getByRole("slider", { name: "Tonal desaturation", exact: true }), baseline, "Tonal desaturation", { minDiff: 0.4 });

    expect(errors).toEqual([]);
  });

  test("All 31 film looks change the real sample photo and every B&W stock is monochrome", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/editor?sample=1");
    await expect(page.getByRole("slider", { name: "Exposure", exact: true })).toBeVisible();
    await expect(page.locator("#main-editor-canvas canvas")).toBeVisible();
    await expect(page.getByTestId("photo-frame")).toBeVisible();

    // Wait for the real sample photograph to paint on the WebGL canvas
    await expect
      .poll(async () => {
        await flushFrames(page, 2);
        const s = await samplePhotoFrame(page);
        return meanChroma(s).mean;
      }, { timeout: 15_000 })
      .toBeGreaterThan(5);

    const baseline = await samplePhotoFrame(page);

    await openSection(page, "Look");
    await page.getByRole("button", { name: /Film\s+None\s+Browse/ }).click();
    await expect(page.getByRole("radio", { name: "Film stocks", exact: true })).toBeVisible();
    const looksPanel = page.locator("aside").filter({ has: page.getByRole("radio", { name: "Film stocks", exact: true }) });

    for (const film of FILM_EMULATIONS) {
      if (film.id === "none") continue;
      const btn = looksPanel.locator("button").filter({ has: page.getByText(film.name, { exact: true }) }).first();
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      const sample = await waitForDiffAbove(page, baseline, 1.0, `Film look "${film.name}" (${film.id})`);
      if (film.type === "bw") {
        const chroma = meanChroma(sample);
        expect(chroma.mean, `B&W film "${film.name}" must be monochrome (mean chroma=${chroma.mean.toFixed(3)}, max=${chroma.max})`).toBeLessThan(1.0);
        expect(chroma.max, `B&W film "${film.name}" max pixel chroma`).toBeLessThanOrEqual(3);
      }
    }

    // Returning to None restores the exact original photo
    const noneBtn = looksPanel.locator("button").filter({ has: page.getByText("None", { exact: true }) }).first();
    await noneBtn.scrollIntoViewIfNeeded();
    await noneBtn.click();
    await waitForReset(page, baseline, "Film None reset");
    expect(errors).toEqual([]);
  });

  test("Masks isolate edits to painted region, gate Amount until adjusted, and reset cleanly", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/editor");
    const greyBase64 = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 360;
      c.height = 240;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#707070";
      ctx.fillRect(0, 0, 360, 240);
      return c.toDataURL("image/png").split(",")[1];
    });
    const chooser = page.waitForEvent("filechooser");
    await page.getByText("Open Photograph", { exact: true }).click();
    await (await chooser).setFiles({ name: "grey.png", mimeType: "image/png", buffer: Buffer.from(greyBase64, "base64") });
    await expect(page.getByRole("slider", { name: "Exposure", exact: true })).toBeVisible();
    await expect(page.locator("#main-editor-canvas canvas")).toBeVisible();
    await expect(page.getByTestId("photo-frame")).toBeVisible();

    await expect
      .poll(async () => {
        await flushFrames(page, 2);
        return regionMeanRgb(await samplePhotoFrame(page), 0.2, 0.2, 0.8, 0.8)[0];
      })
      .toBeGreaterThan(90);
    const baseline = await samplePhotoFrame(page);

    await page.getByRole("radio", { name: "Masks", exact: true }).click();
    await page.getByRole("button", { name: /^Brush/ }).click();

    const surface = page.getByTestId("mask-brush-surface");
    await expect(surface).toBeVisible();
    const box = (await surface.boundingBox())!;

    // Paint strictly in the upper band (y = 0.22), leaving bottom half (y = 0.7..0.95) untouched
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.22);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.22, { steps: 10 });
    await page.mouse.up();

    // Hide red mask overlay
    await page.keyboard.press("o");
    await waitForReset(page, baseline, "Mask painted before local edits");

    // Amount must be disabled until a local adjustment slider is moved
    const amount = page.getByRole("slider", { name: "Amount", exact: true });
    await expect(amount).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText("Adjust a slider below first")).toBeVisible();

    // Raise local Exposure -> only top band changes, bottom band stays untouched, Amount unlocks
    const localExposure = page.getByRole("slider", { name: "Exposure", exact: true });
    await localExposure.focus();
    await localExposure.press("End");
    await expect(amount).not.toHaveAttribute("aria-disabled", "true");
    const edited = await waitForDiffAbove(page, baseline, 5.0, "Local mask Exposure");

    const insideDiff = regionAbsDiff(edited, baseline, 0.25, 0.14, 0.75, 0.3);
    const outsideDiff = regionAbsDiff(edited, baseline, 0.1, 0.72, 0.9, 0.94);
    expect(insideDiff, `Painted mask region should brighten strongly (${insideDiff.toFixed(2)})`).toBeGreaterThan(40);
    expect(outsideDiff, `Unpainted region must remain untouched (${outsideDiff.toFixed(2)})`).toBeLessThanOrEqual(0.5);

    // Setting Amount to 0 removes the local adjustment cleanly
    await amount.focus();
    await amount.press("Home");
    await waitForReset(page, baseline, "Mask Amount=0");
    await amount.dblclick();
    await waitForDiffAbove(page, baseline, 5.0, "Mask Amount reset to 100%");

    // Double-click local Exposure resets cleanly and re-disables Amount
    await localExposure.dblclick();
    await waitForReset(page, baseline, "Local Exposure reset");
    await expect(amount).toHaveAttribute("aria-disabled", "true");
    expect(errors).toEqual([]);
  });

  test("Creative Effects expose only active color pickers and update pixels honestly", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await openCalibrationChart(page);
    const baseline = await samplePhotoFrame(page);

    await openSection(page, "Creative Effects");

    // Verify all 6 single-color effects show strictly 1 color picker with an honest label that changes pixels
    const singleColorEffects = [
      { name: "Pointillize", slot: "Canvas", color: "#00ff44" },
      { name: "Scanline", slot: "Line color", color: "#ff22aa" },
      { name: "Stamp Ink", slot: "Ink", color: "#00e5ff" },
      { name: "Vignette", slot: "Vignette color", color: "#ff3300" },
      { name: "Bloom", slot: "Glow color", color: "#22ff88" },
      { name: "Character Bloom", slot: "Glow color", color: "#ff00cc" },
    ] as const;

    const search = page.getByRole("searchbox", { name: "Search effects and looks" });
    const results = page.getByRole("list", { name: "Effect results" });
    const stack = page.getByRole("list", { name: "Creative effect stack" });

    for (const item of singleColorEffects) {
      await page.getByRole("button", { name: "Browse effects", exact: true }).click();
      await search.fill(item.name);
      await results.locator("button").filter({ has: page.getByText(item.name, { exact: true }) }).first().click();

      const applied = await waitForDiffAbove(page, baseline, 0.5, `Creative effect ${item.name}`);
      const pickers = stack.locator('input[type="color"]');
      await expect(pickers, `${item.name} must show exactly 1 active color picker`).toHaveCount(1);
      await expect(stack.getByText(item.slot, { exact: true })).toBeVisible();

      await pickers.first().fill(item.color);
      await waitForDiffAbove(page, applied, 0.3, `${item.name} ${item.slot} color change`);

      await stack.getByRole("button", { name: `Remove ${item.name}`, exact: true }).click();
      await waitForReset(page, baseline, `Remove ${item.name}`);
    }

    // Also verify Dither controls including interior Phase (0.5) & Invert tone mapping
    await page.getByRole("button", { name: "Browse effects", exact: true }).click();
    await search.fill("Dither");
    await results.locator("button").filter({ has: page.getByText("Dither", { exact: true }) }).first().click();
    const ditherBase = await waitForDiffAbove(page, baseline, 5.0, "Creative Dither");

    const phase = stack.getByRole("slider", { name: "Phase", exact: true });
    await setSliderByTyping(page, phase, "50");
    await waitForDiffAbove(page, ditherBase, 0.3, "Dither Phase 50%");

    const invert = stack.getByRole("switch", { name: "Invert tone mapping", exact: true });
    await invert.click();
    await waitForDiffAbove(page, ditherBase, 5.0, "Dither Invert tone mapping");

    expect(errors).toEqual([]);
  });
});
