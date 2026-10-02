/** Per-viewer UI preferences. Storage may be unavailable (private mode), so every access is guarded. */
export function readPreference<T>(key: string, fallback: T, accept: (value: unknown) => value is T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return accept(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writePreference(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Non-essential preference.
  }
}
