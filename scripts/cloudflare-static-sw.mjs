// Ship the service worker as a static asset on Cloudflare.
//
// app/serwist/[path]/route.ts builds sw.js by reading and globbing files on
// disk. That works during `next build`, which prerenders the result, but a
// Cloudflare Worker has no filesystem, so running the route there fails with
// HTTP 500 and offline support breaks. Static assets are served before the
// Worker runs, so copying the prerendered output into the asset directory
// makes Cloudflare serve it directly.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const source = path.join(".next", "server", "app", "serwist");
const target = path.join(".open-next", "assets", "serwist");
const files = ["sw.js", "sw.js.map"];

for (const file of files) {
  const body = path.join(source, `${file}.body`);
  if (!existsSync(body)) {
    console.error(`Missing prerendered ${body}. Run the Cloudflare build first.`);
    process.exit(1);
  }
}

mkdirSync(target, { recursive: true });
for (const file of files) copyFileSync(path.join(source, `${file}.body`), path.join(target, file));

// The worker must always be revalidated and may control the whole site.
const headersPath = path.join(".open-next", "assets", "_headers");
const rule = "\n/serwist/sw.js\n  Content-Type: application/javascript\n  Cache-Control: no-cache\n  Service-Worker-Allowed: /\n";
const headers = existsSync(headersPath) ? readFileSync(headersPath, "utf8") : "";
if (!headers.includes("/serwist/sw.js")) writeFileSync(headersPath, headers.trimEnd() + "\n" + rule);

console.log("Copied the prerendered service worker to static assets.");
