import type { MetadataRoute } from "next";
import { BRAND } from "./lib/brand";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", "/editor", "/presets", "/changelog"] as const;
  return routes.map((route) => ({
    url: `${BRAND.domain}${route === "/" ? "" : route}`,
    changeFrequency: route === "/changelog" ? "monthly" : "weekly",
    priority: route === "/" || route === "/editor" ? 1 : 0.7,
  }));
}
