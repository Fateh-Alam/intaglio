import type { MetadataRoute } from "next";
import { BRAND, FORMAT, ROUTE_LABELS } from "./lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  const webManifest = {
    name: BRAND.productName,
    short_name: BRAND.name,
    description: BRAND.shortDescription,
    start_url: "/editor",
    scope: "/",
    display: "standalone",
    background_color: "#14130f",
    theme_color: "#14130f",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    file_handlers: [
      {
        action: "/editor",
        accept: {
          [FORMAT.archiveMimeType]: [`.${FORMAT.archiveExtension}`],
        },
        icons: [
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    ],
    shortcuts: [
      {
        name: `Open ${ROUTE_LABELS.editor}`,
        short_name: ROUTE_LABELS.editor,
        description: "Open the Intaglio darkroom.",
        url: "/editor",
        icons: [{ src: "/logo.svg", sizes: "any", type: "image/svg+xml" }],
      },
      {
        name: `Open ${FORMAT.archiveName}`,
        short_name: "Archive",
        description: `Restore a portable .${FORMAT.archiveExtension} editing session.`,
        url: "/editor",
        icons: [
          {
            src: "/archive-file.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
    ],
    categories: ["photo", "productivity", "graphics"],
  };

  return webManifest as MetadataRoute.Manifest;
}
