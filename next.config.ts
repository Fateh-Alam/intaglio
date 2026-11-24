import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

// `ETCH_TARGET=desktop` builds a static export (`out/`) for the Tauri shell in
// `src-tauri/`. The web build is unchanged and still deploys to Cloudflare.
const isDesktop = process.env.ETCH_TARGET === "desktop";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  env: {
    NEXT_PUBLIC_ETCH_TARGET: isDesktop ? "desktop" : "web",
  },
  ...(isDesktop
    ? {
        output: "export" as const,
        // `editor/index.html` resolves the same way in every webview.
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default withSerwist(nextConfig);

if (!isDesktop) import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
