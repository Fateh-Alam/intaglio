import { IntaglioRecipe } from "../types/recipe";

// Built-in collections that heavily utilize all editor capabilities.
export const PRESETS: IntaglioRecipe[] = [
  {
    id: "intaglio-poster",
    name: "Intaglio Poster Mode",
    description: "The ultimate 4:5 cinematic layout. Heavy film emulation, film borders, and halation, designed to be paired with a Title Overlay.",
    tags: ["Intaglio Signatures", "Poster", "Cinematic"],
    intensityDefault: 1.0,
    settings: {
      film: {
        filmEmulation: "kodak_portra_400",
        filmEmulationStrength: 0.6,
        filmBorder: true
      },
      optics: {
        halation: 0.35,
        vignette: 0.15
      },
      texture: {
        grain: 0.12
      },
      base: {
        contrast: 0.25,
        temperature: 0.1
      },
      finishing: {
        sharpness: 0.1,
        skinProtect: 0.8
      },
      raw: {
        safeSkinEnabled: true
      }
    }
  },
  {
    id: "kodak-portra-400",
    name: "Kodak Portra 400",
    description: "The gold standard of portrait film. Warm, glowing highlights, soft contrast roll-off, and perfectly protected skin tones.",
    tags: ["Vintage", "Warm", "Intaglio Signatures", "Portrait"],
    intensityDefault: 1.0,
    settings: {
      film: {
        filmEmulation: "kodak_portra_400",
        filmEmulationStrength: 1.0,
        filmBorder: false
      },
      optics: {
        halation: 0.1,
        bloom: 0.1
      },
      texture: {
        grain: 0.08
      },
      base: {
        contrast: 0.15,
        brightness: 0.05,
        temperature: 0.12,
        tint: 0.02
      },
      raw: {
        safeSkinEnabled: true,
        protectHighlights: true,
        filmToeStrength: 0.2,
        filmShoulderStrength: 0.15,
        lumaDesat: 0.1,
        hslOrangeSat: -0.05,
        hslYellowHue: -0.1
      }
    }
  },
  {
    id: "cinematic-teal-orange",
    name: "Blockbuster Teal & Orange",
    description: "Modern cinematic look. Aggressive color separation pushing shadows to teal and highlights to orange.",
    tags: ["Intaglio Signatures", "Cinematic", "Cool"],
    intensityDefault: 1.0,
    settings: {
      film: {
        filmEmulation: "teal_and_orange",
        filmEmulationStrength: 0.85,
        filmBorder: false
      },
      optics: {
        halation: 0.25,
        vignette: 0.4
      },
      texture: {
        grain: 0.15
      },
      base: {
        contrast: 0.35,
        brightness: -0.1,
        temperature: -0.05
      },
      raw: {
        safeSkinEnabled: true,
        hslBlueHue: -0.2,
        hslBlueSat: 0.2,
        hslOrangeSat: 0.15,
        filmGamma: 1.1
      }
    }
  },
  {
    id: "fuji-superia-400",
    name: "Fuji Superia 400",
    description: "Classic 90s point-and-shoot. Distinct magenta tint, punchy greens, and gritty contrast.",
    tags: ["Vintage", "Cool", "Street"],
    intensityDefault: 1.0,
    settings: {
      film: {
        filmEmulation: "fuji_superia_400",
        filmEmulationStrength: 1.0,
        filmBorder: false
      },
      optics: {
        halation: 0.05,
        vignette: 0.2
      },
      texture: {
        grain: 0.18
      },
      base: {
        contrast: 0.4,
        brightness: -0.05,
        temperature: -0.08,
        tint: 0.15
      },
      raw: {
        safeSkinEnabled: false,
        colorCrossover: 0.3,
        hslGreenHue: 0.2,
        hslGreenSat: 0.2
      }
    }
  },
  {
    id: "bleach-bypass",
    name: "Bleach Bypass",
    description: "Gritty, desaturated, extremely high contrast look famous in 90s war films and thrillers.",
    tags: ["Cinematic", "Intaglio Signatures"],
    intensityDefault: 1.0,
    settings: {
      film: {
        filmEmulation: "bleach_bypass",
        filmEmulationStrength: 1.0,
        filmBorder: false
      },
      optics: {
        halation: 0.15,
        vignette: 0.5
      },
      texture: {
        grain: 0.3
      },
      base: {
        contrast: 0.6,
        brightness: -0.15,
        vibrance: -0.6
      },
      raw: {
        safeSkinEnabled: false,
        filmToeStrength: 0.4,
        filmShoulderStrength: 0.4
      }
    }
  },
  {
    id: "ilford-hp5",
    name: "Ilford HP5 Plus",
    description: "Classic photojournalism black and white with punchy contrast and beautiful granular noise.",
    tags: ["Vintage", "B&W", "Monochrome"],
    intensityDefault: 1.0,
    settings: {
      film: {
        filmEmulation: "ilford_hp5",
        filmEmulationStrength: 1.0,
        filmBorder: false
      },
      optics: {
        vignette: 0.3
      },
      texture: {
        grain: 0.25
      },
      base: {
        contrast: 0.45,
        brightness: 0.05,
        vibrance: -1.0,
        temperature: 0,
        tint: 0
      },
      raw: {
        filmToeStrength: 0.1,
        filmGamma: 0.9
      }
    }
  },
  {
    id: "cinestill-800t",
    name: "CineStill 800T",
    description: "Tungsten-balanced night film. Deep blue shadows and glowing red halation.",
    tags: ["Vintage", "Night", "Cinematic"],
    intensityDefault: 1.0,
    settings: {
      film: {
        filmEmulation: "cinestill_800t",
        filmEmulationStrength: 1.0,
        filmBorder: false
      },
      optics: {
        halation: 0.6,
        bloom: 0.2
      },
      texture: {
        grain: 0.15
      },
      base: {
        contrast: 0.3,
        temperature: -0.2
      }
    }
  }
];
