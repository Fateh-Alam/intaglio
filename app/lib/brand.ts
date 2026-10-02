export const BRAND = {
  name: "Intaglio",
  productName: "Intaglio",
  descriptor: "An elite, precision-machined digital darkroom.",
  shortDescription:
    "A razor-sharp, heavy digital darkroom for photographs built for absolute, permanent ownership.",
  domain: "https://intaglio.app",
  author: "Intaglio",
} as const;

export const FORMAT = {
  recipeExtension: "int",
  archiveExtension: "intaglio",
  recipeName: "Print Recipe",
  archiveName: "Intaglio Archive",
  appId: "intaglio-darkroom",
  version: "2.0.0",
  recipeMimeType: "application/x-intaglio-recipe",
  archiveMimeType: "application/x-intaglio-archive",
} as const;

export const STORAGE_KEYS = {
  presetPreview: "intaglio_preset_preview",
  presetFavorites: "intaglio_preset_favorites",
  importedPresets: "intaglio_imported_presets",
  tutorialsSeen: "intaglio_tutorials_seen",
} as const;

export const ROUTE_LABELS = {
  home: "Atelier",
  editor: "Darkroom",
  presets: "Collections",
  changelog: "Journal",
} as const;
