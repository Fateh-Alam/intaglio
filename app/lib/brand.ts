export const BRAND = {
  name: "Etch",
  productName: "Etch",
  descriptor: "A precision-machined digital darkroom.",
  shortDescription:
    "A fast, private digital darkroom in your browser. Non-destructive editing, masks, a true 1:1 loupe, node grading, and portable projects.",
  domain: "https://etch.app",
  author: "Etch",
} as const;

export const FORMAT = {
  recipeExtension: "etchlook",
  legacyRecipeExtensions: ["int"] as readonly string[],
  archiveExtension: "etch",
  legacyArchiveExtensions: ["intaglio"] as readonly string[],
  recipeName: "Look Recipe",
  archiveName: "Etch Project",
  appId: "etch-darkroom",
  legacyAppIds: ["intaglio-darkroom"] as readonly string[],
  version: "2.0.0",
  recipeMimeType: "application/x-etch-recipe",
  archiveMimeType: "application/x-etch-project",
  legacyRecipeMimeType: "application/x-intaglio-recipe",
  legacyArchiveMimeType: "application/x-intaglio-archive",
} as const;

export const isArchiveFilename = (name: string): boolean => {
  const lower = name.toLowerCase();
  return [FORMAT.archiveExtension, ...FORMAT.legacyArchiveExtensions].some((ext) =>
    lower.endsWith(`.${ext}`)
  );
};

export const isRecipeFilename = (name: string): boolean => {
  const lower = name.toLowerCase();
  return [FORMAT.recipeExtension, ...FORMAT.legacyRecipeExtensions].some((ext) =>
    lower.endsWith(`.${ext}`)
  );
};

export const ARCHIVE_FILE_ACCEPT = [
  `.${FORMAT.archiveExtension}`,
  ...FORMAT.legacyArchiveExtensions.map((ext) => `.${ext}`),
  FORMAT.archiveMimeType,
  FORMAT.legacyArchiveMimeType,
].join(",");

export const RECIPE_FILE_ACCEPT = [
  `.${FORMAT.recipeExtension}`,
  ...FORMAT.legacyRecipeExtensions.map((ext) => `.${ext}`),
  FORMAT.recipeMimeType,
  FORMAT.legacyRecipeMimeType,
].join(",");

// Kept on existing key names so returning users keep favorites and imported looks.
export const STORAGE_KEYS = {
  presetPreview: "intaglio_preset_preview",
  presetFavorites: "intaglio_preset_favorites",
  importedPresets: "intaglio_imported_presets",
  tutorialsSeen: "intaglio_tutorials_seen",
} as const;

export const ROUTE_LABELS = {
  home: "Studio",
  editor: "Darkroom",
  presets: "Collections",
  changelog: "Journal",
} as const;
