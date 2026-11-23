import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createSerwistRoute } from "@serwist/turbopack";

const publicFiles = [
  "demo.jpg",
  "logo.svg",
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
  "apple-touch-icon.png",
  "libraw/index.js",
  "libraw/worker.js",
  "libraw/libraw.js",
  "libraw/libraw.wasm",
];

const revision = createHash("sha256");
for (const filename of publicFiles) revision.update(readFileSync(path.join(process.cwd(), "public", filename)));
const shellRevision = revision.digest("hex").slice(0, 16);

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "app/sw.ts",
  useNativeEsbuild: true,
  additionalPrecacheEntries: ["/", "/editor", "/presets", "/changelog", "/offline"].map((url) => ({ url, revision: shellRevision })),
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
  globDirectory: process.cwd(),
  globPatterns: [
    ".next/static/**/*.{js,css,woff2}",
    "public/**/*.{ico,apng,png,avif,jpg,jpeg,svg,webp,json,webmanifest,woff2,wasm,js}",
  ],
  globIgnores: [
    "**/test-results/**",
    "**/*.{etch,etchlook,int,intaglio,cube,dng,cr2,cr3,nef,arw,raf,orf,rw2,zip,woff,ttf,otf}",
  ],
});
