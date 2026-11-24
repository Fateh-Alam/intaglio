export const COLOPHON_EVENT = "etch:colophon";
export const COLOPHON_PASSPHRASE = "vincibles";

export const COLOPHON = {
  eyebrow: "Colophon · Edition of One",
  heading: "Built for one person.",
  paragraphs: [
    "Look past the sliders, the film stocks, the loupe, and the fine print. This entire website — start to finish — was really built for an audience of one.",
    "No name in the margins, and none in the source. If you’re reading this, Twin, you already know it’s yours.",
  ],
  closing: "For my best friend.",
  signature: "— Vincibles",
  stamp: "Proof 01 / 02 · Unsigned",
} as const;

const COLOPHON_TRIGGERS = new Set([
  "vincibles",
  "vincible",
  "twin",
]);

export function isColophonQuery(raw: string): boolean {
  const normalized = raw.trim().toLowerCase().replace(/^["']|["']$/g, "");
  return COLOPHON_TRIGGERS.has(normalized);
}

export function openColophon(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COLOPHON_EVENT));
}
