import { readFileSync } from "node:fs";

const path = process.env.ETCH_LIBRARY_BENCH_LOG;
if (!path) throw new Error("Point ETCH_LIBRARY_BENCH_LOG to the native library benchmark log.");
const row = readFileSync(path, "utf8").split("\n").find((line) => line.startsWith("library-bench "));
if (!row) throw new Error("The log has no completed 2,000-photo library benchmark.");
const run = JSON.parse(row.slice("library-bench ".length));
if (run.photos !== 2000) throw new Error("The library benchmark requires 2,000 distinct photo paths.");
console.log(JSON.stringify({
  title: "Etch Mac local library",
  description: "Imports 2,000 camera previews from the Stillwater Bridge capture, generates a fresh library JPEG for each and verifies that all picks and ratings persist.",
  metrics: {
    catalogImport: { label: "Folder import", description: "Time to scan the folder and commit and read back 2,000 catalog records.", value: run.importMs, unit: "ms", better: "lower", hero: true },
    preview: { label: "Uncached preview p95", description: "95th-percentile native JPEG generation time across the 2,000 camera previews.", value: run.previewP95Ms, unit: "ms", better: "lower" },
    cull: { label: "Flag and rating save p95", description: "95th-percentile time to persist a flag and rating pair in the catalog.", value: run.ratingP95Ms, unit: "ms", better: "lower" },
  },
}));
