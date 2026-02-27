type FlyerCopyArgs = {
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
    `${cleanTheme}: join us for a beautiful evening.`,
    `Celebrate ${cleanTheme} with us.`,
    `See you at ${cleanTheme}!`,
  ];
  return (
    candidates.find((c) => withinWordLimit(c, 11)) ??
    "Join us for a beautiful evening."
  );
}

export async function generateFlyerCopy(args: FlyerCopyArgs) {
  const { theme, dressCode, note } = args;

  const prompt = `
You are writing short, WhatsApp-friendly flyer text for a women's community event.
Return JSON ONLY with keys:
description (single phrase, max 11 words),
descriptions (array of 4 alternative phrases, each max 11 words),
taglines (array of 3 short taglines, each <= 8 words),
palette (array of 3 hex colors).
Theme: ${theme}
Dress code: ${dressCode ?? "none"}
Note: ${note ?? "none"}
Keep it warm, respectful, and not cheesy.
`;

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
      text: { format: { type: "json_object" } },
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`OpenAI error: ${t}`);
  }

  const data = await r.json();
  // Responses API: text is inside output_text in SDKs; in raw JSON, parse output content.
  // We'll safely find the first output_text-like field.
  const out =
    data.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text ??
    data.output_text ??
    "";

  const parsed = JSON.parse(out);
  const rawDescriptions: string[] = Array.isArray(parsed.descriptions)
    ? parsed.descriptions
        .filter((x: unknown) => typeof x === "string" && x.trim().length > 0)
        .map((x: string) => normalizeText(x))
    : [];

  const descriptions = Array.from(
    new Set(rawDescriptions.filter((x) => withinWordLimit(x, 11)))
  );
  const taglines: string[] = Array.isArray(parsed.taglines)
    ? parsed.taglines.filter((x: unknown) => typeof x === "string" && x.trim().length > 0)
    : [];
  const palette: string[] = Array.isArray(parsed.palette)
    ? parsed.palette.filter((x: unknown) => typeof x === "string" && x.trim().length > 0)
    : [];
  const parsedDescription =
    typeof parsed.description === "string" ? normalizeText(parsed.description) : "";

  const descriptionCandidates = [
    parsedDescription,
    ...rawDescriptions,
    shortFallbackDescription(theme),
  ].filter((x) => withinWordLimit(x, 11));

  const description = descriptionCandidates[0] ?? shortFallbackDescription(theme);
  const finalDescriptions = descriptions.length ? descriptions : [description];

  return {
    description,
    descriptions: finalDescriptions,
    taglines,
    palette,
  };
}

type FlyerArtworkArgs = {
  theme: string;
  dateTime: string;
  location?: string;
  dressCode?: string;
  note?: string;
  tagline?: string;
  description?: string;
};

export async function generateFlyerArtwork(args: FlyerArtworkArgs) {
  const prompt = [
    "Design a single, polished, high-end party flyer poster.",
    "Make it visually rich and extravagant, not minimal.",
    "Use cinematic lighting, layered decorations, elegant typography hierarchy, and balanced spacing.",
    "Keep text fully readable and professionally laid out.",
    "Do not add random gibberish text.",
    "Poster details:",
    `Theme: ${args.theme}`,
    `Date/Time: ${args.dateTime}`,
    `Location: ${args.location ?? "TBD"}`,
    `Dress code: ${args.dressCode ?? "Not specified"}`,
    `Tagline: ${args.tagline ?? ""}`,
    `Description: ${args.description ?? ""}`,
    `Extra note: ${args.note ?? ""}`,
    "Include all event details in the design as clean readable text.",
    "Output should be a vertical event flyer poster.",
  ].join("\n");

  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1536",
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`OpenAI image error: ${t}`);
  }

  const data = (await r.json()) as {
    data?: Array<{ b64_json?: string }>;
  };

  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI image response missing image bytes.");
  }

  return Buffer.from(b64, "base64");
}
