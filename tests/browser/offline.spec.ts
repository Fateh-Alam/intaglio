import { expect, test } from "@playwright/test";

test("installed shell caches the editor for offline restart", async ({ page, context, browserName }) => {
  await page.goto("/editor");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const cacheReady = async () => {
      for (const key of await caches.keys()) {
        const requests = await (await caches.open(key)).keys();
        if (requests.some((request) => new URL(request.url).pathname === "/editor")) return true;
      }
      return false;
    };
    for (let attempt = 0; attempt < 80 && !(await cacheReady()); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 100));
  });
  const cachedEditor = await page.evaluate(async () => {
    let response: Response | undefined;
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      const request = (await cache.keys()).find((candidate) => new URL(candidate.url).pathname === "/editor");
      if (request) { response = await cache.match(request); break; }
    }
    return response ? { status: response.status, html: await response.text() } : null;
  });
  expect(cachedEditor?.status).toBe(200);
  expect(cachedEditor?.html).toContain("Intaglio");

  // Playwright WebKit blocks inspector-driven reloads once interception is
  // active. Chromium exercises the complete restart here; actual Safari's
  // restart remains an explicit manual release gate.
  if (browserName === "chromium") {
    await context.route("**/*", (route) => route.abort("internetdisconnected"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Open Photograph")).toBeVisible();
  }
});
