import { expect, test } from "@playwright/test";

test("large project creation is disk-backed or fails before work with recovery guidance", async ({ page }, testInfo) => {
  test.slow();
  await page.goto("/archive-contract");
  const output = page.getByTestId("archive-contract-result");
  await expect(output).toHaveAttribute("data-status", /passed|failed/, { timeout: 120_000 });
  const result = JSON.parse(await output.textContent() || "{}") as { status: string; error?: string; evidence?: { sourceBytes: number; archiveBytes: number; diskBackedFile: boolean; signature: string; usesOpfs: boolean } };
  if (result.status === "failed") {
    expect(testInfo.project.name).toBe("webkit");
    expect(result.error).toMatch(/70 MB portable save needs origin-private file storage.*Private Browsing.*free local storage/i);
    return;
  }
  expect(result.status, `${testInfo.project.name}: ${result.error}`).toBe("passed");
  expect(result.evidence?.usesOpfs).toBe(true);
  expect(result.evidence?.diskBackedFile).toBe(true);
  expect(result.evidence?.sourceBytes).toBe(65 * 1024 * 1024);
  expect(result.evidence?.archiveBytes).toBeGreaterThan(65 * 1024 * 1024);
  expect(result.evidence?.signature).toBe("504b0304");
});
