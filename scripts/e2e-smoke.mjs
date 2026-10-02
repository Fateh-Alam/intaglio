const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3005";

const checks = [
  {
    path: "/",
    includes: [
      "Intaglio",
      "LOCAL PROCESSING. MEASURABLE OUTPUT.",
      "Open Darkroom",
      "Your photographs and edits remain local",
    ],
  },
  {
    path: "/editor",
    includes: ["Intaglio", "Open Photograph", "Open Archive"],
  },
  {
    path: "/presets",
    includes: ["Intaglio Collections", "Print Recipes", "Intaglio Poster Mode"],
  },
  {
    path: "/changelog",
    includes: ["Release Journal", "Intaglio", ".intaglio"],
  },
  {
    path: "/manifest.webmanifest",
    includes: ["Intaglio", "standalone", "file_handlers", ".intaglio"],
  },
  {
    path: "/serwist/sw.js",
    includes: ["intaglio", "libraw.wasm", "/offline"],
  },
  {
    path: "/archive-file.svg",
    includes: ["svg", "#B08A52"],
  },
];

const failures = [];

for (const check of checks) {
  const response = await fetch(`${baseUrl}${check.path}`);
  if (!response.ok) {
    failures.push(`${check.path}: HTTP ${response.status}`);
    continue;
  }

  const body = await response.text();
  for (const expected of check.includes) {
    if (!body.includes(expected)) {
      failures.push(`${check.path}: missing "${expected}"`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`E2E smoke checks passed against ${baseUrl}`);
