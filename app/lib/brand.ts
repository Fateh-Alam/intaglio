export const BRAND = {
  name: "Ormond",
  productName: "Ormond",
  descriptor: "A timeless digital darkroom.",
  shortDescription:
    "A quiet local-first darkroom for photographs that deserve patience.",
  domain: "https://ormond.app",
  author: "Ormond",
} as const;

export const FORMAT = {
  recipeExtension: "orm",
  archiveExtension: "ormond",
  legacyRecipeExtensions: ["nyv", "json"],
  legacyArchiveExtensions: ["nyvlt", "nyvproj"],
  recipeName: "Print Recipe",
  archiveName: "Ormond Archive",
  legacyRecipeName: "Legacy Recipe",
  legacyArchiveName: "Legacy Session",
  appId: "ormond-darkroom",
  legacyAppIds: ["nyvarra-studio"],
  version: "1.0",
  archiveMimeType: "application/x-ormond-archive",
  legacyArchiveMimeType: "application/x-nyvarra-vault",
} as const;

export const STORAGE_KEYS = {
  presetPreview: "ormond_preset_preview",
  legacyPresetPreview: "nyvarra_preset_preview",
  presetFavorites: "ormond_preset_favorites",
  legacyPresetFavorites: "nyvarra_preset_favorites",
  importedPresets: "ormond_imported_presets",
  legacyImportedPresets: "nyvarra_imported_presets",
  tutorialsSeen: "ormond_tutorials_seen",
  legacyTutorialsSeen: "nyvarra_tutorials_seen",
} as const;

export const ROUTE_LABELS = {
  home: "Atelier",
  editor: "Darkroom",
  presets: "Collections",
  changelog: "Journal",
} as const;
