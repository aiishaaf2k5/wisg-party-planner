type LocalCopyArgs = {
  theme: string;
  dressCode?: string;
  note?: string;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function wordCount(value: string) {
  return normalizeText(value).split(" ").filter(Boolean).length;
}

function withinWordLimit(value: string, maxWords: number) {
  const clean = normalizeText(value);
  return clean.length > 0 && wordCount(clean) <= maxWords;
}

function shortFallbackDescription(theme: string) {
  const cleanTheme = normalizeText(theme) || "our event";
  const candidates = [
    `Join us for ${cleanTheme}.`,
    `Celebrate ${cleanTheme} with us.`,
    `${cleanTheme}: a beautiful evening together.`,
    `See you at ${cleanTheme}!`,
  ];
  return (
    candidates.find((c) => withinWordLimit(c, 11)) ??
    "Join us for a beautiful evening."
  );
}

type CopyPack = {
  keywords: string[];
  leadWords: string[];
  moodWords: string[];
  actionWords: string[];
  palettes: string[][];
  description: string;
};

const packs: CopyPack[] = [
  {
    keywords: ["galaxy", "space", "cosmic", "moonlight", "starlight", "nebula"],
    leadWords: ["Starlight Soiree", "Cosmic Night", "Moonlight Celebration"],
    moodWords: ["Dreamy", "Mystical", "Luminous", "Elegant"],
    actionWords: ["Gather", "Shine", "Celebrate", "Connect"],
    palettes: [
      ["#1E1B4B", "#312E81", "#C4B5FD"],
      ["#0F172A", "#1E293B", "#A78BFA"],
      ["#312E81", "#4C1D95", "#DDD6FE"],
    ],
    description:
      "Step into a celestial evening with glowing details, dreamy ambiance, and unforgettable moments.",
  },
  {
    keywords: ["neon", "retro", "80s", "dance", "club", "electric", "dj", "disco"],
    leadWords: ["Neon Nights", "Retro Glow Party", "Electric Celebration"],
    moodWords: ["Bold", "Electric", "High-Energy", "Vibrant"],
    actionWords: ["Dance", "Glow", "Celebrate", "Turn Up"],
    palettes: [
      ["#3B0764", "#0F172A", "#22D3EE"],
      ["#581C87", "#1D4ED8", "#F472B6"],
      ["#0C4A6E", "#312E81", "#F0ABFC"],
    ],
    description:
      "Bring the energy with a vibrant night of music, glowing style, and fun memories.",
  },
  {
    keywords: ["royal", "gala", "black tie", "formal", "elegant", "luxury", "classic"],
    leadWords: ["Royal Gala", "Elegant Evening", "Black Tie Celebration"],
    moodWords: ["Refined", "Luxurious", "Timeless", "Sophisticated"],
    actionWords: ["Join", "Celebrate", "Toast", "Gather"],
    palettes: [
      ["#111827", "#1F2937", "#FCD34D"],
      ["#1E293B", "#334155", "#EAB308"],
      ["#0F172A", "#1E1B4B", "#FDE68A"],
    ],
    description:
      "An elegant, upscale gathering with timeless style and graceful celebration.",
  },
  {
    keywords: ["halloween", "spooky", "haunted", "boo", "costume"],
    leadWords: ["Spooky Soiree", "Haunted Night", "Costume Celebration"],
    moodWords: ["Moody", "Playful", "Mysterious", "Thrilling"],
    actionWords: ["Gather", "Celebrate", "Enjoy", "Glow"],
    palettes: [
      ["#111827", "#3F3F46", "#FB923C"],
      ["#1F2937", "#374151", "#F97316"],
      ["#0F172A", "#27272A", "#FDBA74"],
    ],
    description:
      "A moody, festive night with bold decor, playful energy, and unforgettable vibes.",
  },
  {
    keywords: ["summer", "sun", "sunset", "beach", "tropical", "pool", "hawaii"],
    leadWords: ["Summer Soiree", "Sunset Celebration", "Tropical Night"],
    moodWords: ["Bright", "Vibrant", "Sunny", "Energetic"],
    actionWords: ["Celebrate", "Glow", "Gather", "Dance"],
    palettes: [
      ["#0EA5E9", "#0369A1", "#FDE68A"],
      ["#F97316", "#FB7185", "#FDE047"],
      ["#06B6D4", "#22C55E", "#FACC15"],
    ],
    description:
      "Bring summer energy with bright vibes, cheerful colors, and a fun celebration everyone will enjoy.",
  },
  {
    keywords: ["winter", "snow", "ice", "frost", "holiday"],
    leadWords: ["Winter Wonderland", "Frosty Night", "Snowfall Soiree"],
    moodWords: ["Cozy", "Sparkling", "Magical", "Glittering"],
    actionWords: ["Celebrate", "Gather", "Shine", "Toast"],
    palettes: [
      ["#0E7490", "#155E75", "#E0F2FE"],
      ["#1D4ED8", "#2563EB", "#DBEAFE"],
      ["#0F766E", "#0D9488", "#CCFBF1"],
    ],
    description:
      "Step into a winter-inspired evening full of warmth, elegance, and joyful company.",
  },
  {
    keywords: ["red carpet", "hollywood", "glam", "awards", "star"],
    leadWords: ["Red Carpet Night", "Hollywood Glam", "Starry Celebration"],
    moodWords: ["Luxurious", "Dazzling", "Grand", "Glamorous"],
    actionWords: ["Arrive", "Pose", "Celebrate", "Sparkle"],
    palettes: [
      ["#7F1D1D", "#991B1B", "#FDE68A"],
      ["#881337", "#BE123C", "#FBCFE8"],
      ["#7C2D12", "#B45309", "#FDE68A"],
    ],
    description:
      "Roll out the red carpet for a glamorous evening of style, laughter, and unforgettable moments.",
  },
  {
    keywords: ["ramadan", "eid", "iftar", "moon", "crescent"],
    leadWords: ["Moonlit Gathering", "Eid Celebration", "Blessed Evening"],
    moodWords: ["Warm", "Graceful", "Joyful", "Meaningful"],
    actionWords: ["Gather", "Celebrate", "Connect", "Rejoice"],
    palettes: [
      ["#064E3B", "#065F46", "#A7F3D0"],
      ["#0F766E", "#115E59", "#99F6E4"],
      ["#14532D", "#166534", "#BBF7D0"],
    ],
    description:
      "Join us for a beautiful gathering of community, gratitude, and festive joy.",
  },
  {
    keywords: ["desi", "mehndi", "bollywood", "sangeet", "henna"],
    leadWords: ["Desi Glam Night", "Mehndi Celebration", "Bollywood Bash"],
    moodWords: ["Vibrant", "Lively", "Colorful", "Radiant"],
    actionWords: ["Dance", "Celebrate", "Gather", "Shine"],
    palettes: [
      ["#7C2D12", "#EA580C", "#FDBA74"],
      ["#6B21A8", "#9333EA", "#E9D5FF"],
      ["#9A3412", "#D97706", "#FCD34D"],
    ],
    description:
      "Celebrate with color, rhythm, and joyful desi vibes in a night to remember.",
  },
  {
    keywords: ["spring", "garden", "floral", "bloom", "picnic"],
    leadWords: ["Garden Party", "Spring Bloom", "Floral Evening"],
    moodWords: ["Fresh", "Charming", "Bright", "Elegant"],
    actionWords: ["Gather", "Bloom", "Celebrate", "Enjoy"],
    palettes: [
      ["#166534", "#22C55E", "#DCFCE7"],
      ["#9D174D", "#EC4899", "#FBCFE8"],
      ["#365314", "#84CC16", "#ECFCCB"],
    ],
    description:
      "A fresh and cheerful gathering inspired by blooms, color, and community spirit.",
  },
  {
    keywords: ["autumn", "fall", "harvest", "pumpkin", "maple"],
    leadWords: ["Autumn Gathering", "Harvest Evening", "Golden Fall Night"],
    moodWords: ["Warm", "Cozy", "Rich", "Elegant"],
    actionWords: ["Gather", "Celebrate", "Toast", "Enjoy"],
    palettes: [
      ["#9A3412", "#C2410C", "#FED7AA"],
      ["#7C2D12", "#B45309", "#FDE68A"],
      ["#78350F", "#D97706", "#F59E0B"],
    ],
    description:
      "Celebrate the season with cozy tones, warm moments, and a welcoming community vibe.",
  },
];

function pickPack(theme: string, dressCode?: string, note?: string): CopyPack | null {
  const t = `${theme} ${dressCode ?? ""} ${note ?? ""}`.toLowerCase();
  return packs.find((p) => p.keywords.some((k) => t.includes(k))) ?? null;
}

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 33 + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

function shuffle<T>(arr: T[], seed: number) {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function generateLocalFlyerCopy(args: LocalCopyArgs) {
  const theme = args.theme.trim() || "Community Event";
  const pack = pickPack(theme, args.dressCode, args.note);
  const nowSeed = Date.now() >>> 0;
  const seed = hash(theme) ^ nowSeed;

  const leadWords =
    pack?.leadWords ?? [theme, `${theme} Night`, "Community Celebration"];
  const moodWords = pack?.moodWords ?? ["Beautiful", "Warm", "Festive", "Joyful"];
  const actionWords = pack?.actionWords ?? ["Celebrate", "Gather", "Connect", "Enjoy"];

  const combinations: string[] = [];
  for (const a of leadWords) {
    for (const b of moodWords) {
      combinations.push(`${a}: ${b} Vibes`);
    }
  }
  for (const b of moodWords) {
    for (const c of actionWords) {
      combinations.push(`${b} Night to ${c}`);
    }
  }

  const shuffled = shuffle(combinations, seed);
  const taglines = Array.from(new Set(shuffled)).slice(0, 9);

  const palettes = pack?.palettes ?? [
    ["#0EA5E9", "#0284C7", "#FDE68A"],
    ["#16A34A", "#0D9488", "#A7F3D0"],
    ["#7C3AED", "#EC4899", "#FBCFE8"],
  ];
  const pickedPalette = palettes[seed % palettes.length];

  const fallbackDescription =
    "Join us for a beautiful community evening with great company, delicious food, and memorable moments.";

  const descriptionCandidates = [
    pack?.description ?? "",
    `Join us for ${theme}.`,
    `Celebrate ${theme} with us.`,
    fallbackDescription,
    shortFallbackDescription(theme),
  ]
    .map(normalizeText)
    .filter((x) => withinWordLimit(x, 11));

  const descriptions = [
    pack?.description ?? "",
    `Join us for ${theme}.`,
    `Celebrate ${theme} with us.`,
    `${theme}: beautiful evening together.`,
    shortFallbackDescription(theme),
  ]
    .map(normalizeText)
    .filter((x) => withinWordLimit(x, 11));

  return {
    description: descriptionCandidates[0] ?? shortFallbackDescription(theme),
    descriptions: Array.from(new Set(descriptions)).slice(0, 6),
    taglines,
    palette: pickedPalette,
  };
}
