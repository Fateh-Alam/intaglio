export type FilmEmulation = {
  id: string;
  name: string;
  category: string;
  description: string;
  type: "color" | "bw" | "duotone";
  tone: "warm" | "cool" | "neutral";
  /** CSS gradient representing the film's color character */
  swatch: string;
  bestFor: string;
};

export const FILM_EMULATIONS: FilmEmulation[] = [
  {
    id: "none", name: "None", category: "Original",
    description: "No film emulation applied",
    type: "color", tone: "neutral",
    swatch: "linear-gradient(135deg, #888 0%, #aaa 50%, #888 100%)",
    bestFor: "Clean digital",
  },
  // ── Classic Authentic ──────────────────────────────────────
  {
    id: "kodak_portra_400", name: "Portrait 400", category: "Classic Authentic",
    description: "Warm skin tones, soft contrast, pastel highlights. The portrait standard.",
    type: "color", tone: "warm",
    swatch: "linear-gradient(135deg, #d4a574 0%, #e8c9a0 40%, #c49070 100%)",
    bestFor: "Portraits & weddings",
  },
  {
    id: "fujifilm_velvia_50", name: "Velvet 50", category: "Classic Authentic",
    description: "Extreme saturation, punchy contrast, vivid greens and reds. Landscape legend.",
    type: "color", tone: "neutral",
    swatch: "linear-gradient(135deg, #2d6b3a 0%, #e85530 50%, #1a4a8a 100%)",
    bestFor: "Landscapes & nature",
  },
  {
    id: "kodak_tri_x_400", name: "Press 400", category: "Classic Authentic",
    description: "Classic photojournalism B&W. Rich mid-contrast with crisp tonal punch.",
    type: "bw", tone: "neutral",
    swatch: "linear-gradient(135deg, #1a1a1a 0%, #6a6a6a 50%, #d0d0d0 100%)",
    bestFor: "Street & documentary",
  },
  {
    id: "cinestill_800t", name: "Tungsten 800T", category: "Classic Authentic",
    description: "Tungsten-balanced night cinema stock. Deep blue shadows, glowing warm highlights.",
    type: "color", tone: "cool",
    swatch: "linear-gradient(135deg, #1a2a4a 0%, #3a4a6a 50%, #c45a3a 100%)",
    bestFor: "Night & neon",
  },
  {
    id: "ilford_hp5", name: "Street 400", category: "Classic Authentic",
    description: "Versatile everyday B&W. Softer contrast, creamy midtones, forgiving latitude.",
    type: "bw", tone: "neutral",
    swatch: "linear-gradient(135deg, #2a2a2a 0%, #808080 50%, #c8c8c8 100%)",
    bestFor: "All-purpose B&W",
  },
  {
    id: "fujifilm_pro_400h", name: "Sage 400H", category: "Classic Authentic",
    description: "Pastel greens, cool highlights, airy softness. Discontinued cult favorite.",
    type: "color", tone: "cool",
    swatch: "linear-gradient(135deg, #7a9a8a 0%, #a0b8a8 40%, #c8b8a0 100%)",
    bestFor: "Fashion & fine art",
  },
  {
    id: "kodak_ektar_100", name: "Vivid 100", category: "Classic Authentic",
    description: "Fine-grain color negative. Saturated, punchy, crisp clarity.",
    type: "color", tone: "warm",
    swatch: "linear-gradient(135deg, #c84020 0%, #e8a830 50%, #2080c0 100%)",
    bestFor: "Travel & landscape",
  },
  // ── Cinematic Styles ───────────────────────────────────────
  {
    id: "wes_anderson", name: "Wes", category: "Cinematic Styles",
    description: "Desaturated pastels, warm shift, storybook symmetry aesthetic.",
    type: "color", tone: "warm",
    swatch: "linear-gradient(135deg, #e8c0a0 0%, #d0b8a0 40%, #c0a890 100%)",
    bestFor: "Stylized interiors",
  },
  {
    id: "teal_and_orange", name: "Teal & Orange", category: "Cinematic Styles",
    description: "Hollywood's color grading standard. Cool shadows, warm highlights.",
    type: "color", tone: "warm",
    swatch: "linear-gradient(135deg, #1a6a7a 0%, #4a4a4a 50%, #d08030 100%)",
    bestFor: "Cinematic portraits",
  },
  {
    id: "cyberpunk", name: "Cyberpunk", category: "Cinematic Styles",
    description: "Hyper-saturated neon. Electric blues, magentas, and vivid greens.",
    type: "color", tone: "cool",
    swatch: "linear-gradient(135deg, #a020f0 0%, #00e0ff 50%, #ff2080 100%)",
    bestFor: "Urban night & sci-fi",
  },
  {
    id: "matrix", name: "Zion", category: "Cinematic Styles",
    description: "Desaturated with deep green shadows. Dark, late-90s digital tension.",
    type: "color", tone: "cool",
    swatch: "linear-gradient(135deg, #0a1a0a 0%, #1a4a2a 50%, #2a3a2a 100%)",
    bestFor: "Dark moody scenes",
  },
  {
    id: "bleach_bypass", name: "Bleach Bypass", category: "Cinematic Styles",
    description: "Heavily desaturated, high contrast. Silver-retained processing look.",
    type: "color", tone: "neutral",
    swatch: "linear-gradient(135deg, #2a2a2a 0%, #6a6a6a 40%, #a0a098 100%)",
    bestFor: "Gritty drama",
  },
  {
    id: "vintage_70s", name: "Seventies", category: "Cinematic Styles",
    description: "Faded highlights, warm yellow shift, lifted shadows. Nostalgic analog fade.",
    type: "color", tone: "warm",
    swatch: "linear-gradient(135deg, #4a3a28 0%, #b0a070 50%, #e0d8b0 100%)",
    bestFor: "Retro & editorial",
  },
  {
    id: "polaroid_fade", name: "Instant Dream", category: "Cinematic Styles",
    description: "Faded instant-print look. Muted color, compressed dynamic range.",
    type: "color", tone: "warm",
    swatch: "linear-gradient(135deg, #3a2a38 0%, #a08888 50%, #d8c8c0 100%)",
    bestFor: "Casual & memory",
  },
  {
    id: "noir", name: "Noir", category: "Cinematic Styles",
    description: "High-contrast B&W with dramatic shadow play. Hard light, deep blacks.",
    type: "bw", tone: "neutral",
    swatch: "linear-gradient(135deg, #0a0a0a 0%, #3a3a3a 40%, #e0e0e0 100%)",
    bestFor: "Dramatic & moody",
  },
  // ── Heritage Stocks ────────────────────────────────────────
  {
    id: "agfa_apx_100", name: "Silver 100", category: "Heritage Stocks",
    description: "Classic 1990s fine-grain B&W. Clean midtones and delicate highlight roll-off.",
    type: "bw", tone: "neutral",
    swatch: "linear-gradient(135deg, #161616 0%, #686868 50%, #d4d4d4 100%)",
    bestFor: "Fine art & still life",
  },
  {
    id: "kodachrome_64", name: "Chrome 64", category: "Heritage Stocks",
    description: "Iconic archival slide film. Saturated reds, deep blues, golden highlights.",
    type: "color", tone: "warm",
    swatch: "linear-gradient(135deg, #c83020 0%, #d8a020 40%, #1848a0 100%)",
    bestFor: "Everything legendary",
  },
  {
    id: "fuji_superia_400", name: "90s 400", category: "Heritage Stocks",
    description: "Classic point-and-shoot negative. Green-shifted shadows, muted pastels, lifted blacks.",
    type: "color", tone: "cool",
    swatch: "linear-gradient(135deg, #3a5a3a 0%, #8aa080 50%, #c8c0a8 100%)",
    bestFor: "Everyday snapshots",
  },
  {
    id: "ilford_pan_f_50", name: "Fine 50", category: "Heritage Stocks",
    description: "Ultra-fine slow B&W. Extreme tonal range, crisp architectural detail.",
    type: "bw", tone: "neutral",
    swatch: "linear-gradient(135deg, #181818 0%, #787878 50%, #e8e8e8 100%)",
    bestFor: "Architecture & macro",
  },
  {
    id: "kodak_gold_200", name: "Gold 200", category: "Heritage Stocks",
    description: "Warm, nostalgic consumer film. Golden highlights, soft lifted shadows.",
    type: "color", tone: "warm",
    swatch: "linear-gradient(135deg, #4a3820 0%, #c8a050 50%, #e8d8a0 100%)",
    bestFor: "Family & nostalgia",
  },
  {
    id: "lomography_cn_800", name: "Cross 800", category: "Heritage Stocks",
    description: "Oversaturated color chaos. Cross-process feel, bold color shifts, high contrast.",
    type: "color", tone: "warm",
    swatch: "linear-gradient(135deg, #d03050 0%, #e0c020 50%, #2080a0 100%)",
    bestFor: "Experimental & party",
  },
  {
    id: "fomapan_400", name: "Prague 400", category: "Heritage Stocks",
    description: "Czech street B&W. Gritty, crushed blacks, raw contrast.",
    type: "bw", tone: "neutral",
    swatch: "linear-gradient(135deg, #0a0a0a 0%, #505050 50%, #b0b0b0 100%)",
    bestFor: "Raw street & punk",
  },
  {
    id: "cinestill_50d", name: "Daylight 50D", category: "Heritage Stocks",
    description: "Daylight-balanced cinema stock. Clean highlights, rich natural color.",
    type: "color", tone: "neutral",
    swatch: "linear-gradient(135deg, #4a6a3a 0%, #c0a870 50%, #80a8d0 100%)",
    bestFor: "Daylight cinema",
  },
  {
    id: "kodak_vision3_500t", name: "Cinema 500T", category: "Heritage Stocks",
    description: "Tungsten motion-picture stock. Cool blue shadows, warm practical highlights.",
    type: "color", tone: "cool",
    swatch: "linear-gradient(135deg, #1a2848 0%, #3a5080 50%, #c08050 100%)",
    bestFor: "Night cinematography",
  },
  {
    id: "fuji_provia_100f", name: "Slide 100F", category: "Heritage Stocks",
    description: "Neutral slide film. Accurate color reproduction, clean precision.",
    type: "color", tone: "neutral",
    swatch: "linear-gradient(135deg, #4a7a4a 0%, #a0a090 50%, #70a0d0 100%)",
    bestFor: "Product & reference",
  },
  // ── Etch Collection ──────────────────────────────────────────
  {
    id: "intaglio_amber_plate", name: "Amber Plate", category: "Etch Collection",
    description: "Wet-plate collodion from the 1850s. Deep amber, spectral bloom. Like a daguerreotype through whiskey.",
    type: "duotone", tone: "warm",
    swatch: "linear-gradient(135deg, #1a1208 0%, #8a6830 40%, #c8a050 70%, #e0c880 100%)",
    bestFor: "Heritage & antique",
  },
  {
    id: "intaglio_prussian_ink", name: "Prussian Ink", category: "Etch Collection",
    description: "Cyanotype split-tone. Deep indigo shadows bleeding into paper-white highlights. Museum archival.",
    type: "duotone", tone: "cool",
    swatch: "linear-gradient(135deg, #0a1028 0%, #1a2858 40%, #8090a8 70%, #e8e4d8 100%)",
    bestFor: "Fine art prints",
  },
  {
    id: "intaglio_celadon", name: "Celadon", category: "Etch Collection",
    description: "Ancient green-glazed ceramics. Jade midtones, warm cream highlights, earth shadows.",
    type: "color", tone: "cool",
    swatch: "linear-gradient(135deg, #3a3828 0%, #5a7a58 40%, #88a880 70%, #e0d8c0 100%)",
    bestFor: "Botanical & still life",
  },
  {
    id: "intaglio_carta", name: "Carta", category: "Etch Collection",
    description: "Aged photographic paper. Ivory highlights, sepia midtones, charcoal depths. Decades of light.",
    type: "duotone", tone: "warm",
    swatch: "linear-gradient(135deg, #2a2018 0%, #6a5838 40%, #a89870 70%, #e0d8c8 100%)",
    bestFor: "Archival & memoir",
  },
  {
    id: "intaglio_verdigris", name: "Verdigris", category: "Etch Collection",
    description: "Oxidized copper patina. Teal-green shadow cast with warm golden highlight bleed. Aristocratic decay.",
    type: "color", tone: "cool",
    swatch: "linear-gradient(135deg, #1a3838 0%, #3a7868 40%, #68a090 70%, #c8b880 100%)",
    bestFor: "Estate & architecture",
  },
  {
    id: "intaglio_obsidian", name: "Obsidian", category: "Etch Collection",
    description: "Volcanic glass. Extreme contrast B&W with crushed blacks and razor highlights. No midtone mercy.",
    type: "bw", tone: "neutral",
    swatch: "linear-gradient(135deg, #000000 0%, #1a1a1a 45%, #e0e0e0 55%, #ffffff 100%)",
    bestFor: "Night & geometry",
  },
];

export const FILM_EMULATION_INDEX: Record<string, number> = Object.fromEntries(FILM_EMULATIONS.map((f, i) => [f.id, i]));
