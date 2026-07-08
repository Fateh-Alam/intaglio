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
  legacyRecipeExtensions: ["orm", "nyv", "json"],
  legacyArchiveExtensions: ["ormond", "nyvlt", "nyvproj"],
  recipeName: "Print Recipe",
  archiveName: "Intaglio Archive",
  legacyRecipeName: "Legacy Recipe",
  legacyArchiveName: "Legacy Session",
  appId: "intaglio-darkroom",
  legacyAppIds: ["ormond-darkroom", "nyvarra-studio"],
  version: "1.0",
  archiveMimeType: "application/x-intaglio-archive",
  legacyArchiveMimeType: "application/x-ormond-archive",
} as const;

export const STORAGE_KEYS = {
  presetPreview: "intaglio_preset_preview",
  legacyPresetPreview: "ormond_preset_preview",
  presetFavorites: "intaglio_preset_favorites",
  legacyPresetFavorites: "ormond_preset_favorites",
  importedPresets: "intaglio_imported_presets",
  legacyImportedPresets: "ormond_imported_presets",
  tutorialsSeen: "intaglio_tutorials_seen",
  legacyTutorialsSeen: "ormond_tutorials_seen",
} as const;

export const ROUTE_LABELS = {
  home: "Atelier",
  editor: "Darkroom",
  presets: "Collections",
  changelog: "Journal",
} as const;
