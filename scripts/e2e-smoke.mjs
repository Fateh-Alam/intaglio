const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3005";

const checks = [
  {
    path: "/",
    includes: [
      "Ormond",
      "Made for photographs that deserve patience",
      "Open Darkroom",
      "Amico meo carissimo",
      ".ormond",
    ],
  },
  {
    path: "/editor",
    includes: ["Ormond", "Session Desk", "Open Photograph", "Open Archive"],
  },
  {
    path: "/presets",
    includes: ["Ormond Collections", "Print Recipes", "Morning Newspaper"],
  },
  {
    path: "/changelog",
    includes: ["Release Journal", "The Ormond Rebuild", ".ormond"],
  },
  {
    path: "/manifest.webmanifest",
    includes: ["Ormond", "standalone", "file_handlers", ".ormond"],
  },
  {
    path: "/sw.js",
    includes: ["ormond-darkroom-v1", "APP_SHELL", "/archive-file.svg"],
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
