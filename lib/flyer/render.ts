import satori from "satori";
import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import { join } from "path";
import { FlyerInput, templateDefaults } from "./templates";

const FONT_URL = "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTcviYwY.woff";
const FONT_URL_FALLBACK = "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTcviYwY.woff2";

type FlyerFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 800;
  style: "normal" | "italic";
};

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  const out = new Uint8Array(buf.length);
  out.set(buf);
  return out.buffer;
}

async function loadLocalFont(paths: string[]) {
  for (const p of paths) {
    try {
      return toArrayBuffer(await readFile(p));
    } catch {
      // try next
    }
  }
  return null;
}

async function loadInterFallback() {
  for (const url of [FONT_URL, FONT_URL_FALLBACK]) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.arrayBuffer();
    } catch {
      // try next URL
    }
  }
  return null;
}

async function loadFonts(): Promise<FlyerFont[]> {
  const body =
    (await loadLocalFont([
      "C:\\Windows\\Fonts\\segoeui.ttf",
      "C:\\Windows\\Fonts\\arial.ttf",
    ])) ?? (await loadInterFallback());
  if (!body) throw new Error("Failed to load base flyer font.");

  const display =
    (await loadLocalFont([
      "C:\\Windows\\Fonts\\arialbd.ttf",
      "C:\\Windows\\Fonts\\georgiab.ttf",
      "C:\\Windows\\Fonts\\timesbd.ttf",
    ])) ?? body;

  const script =
    (await loadLocalFont([
      "C:\\Windows\\Fonts\\segoesc.ttf",
      "C:\\Windows\\Fonts\\gabriola.ttf",
      "C:\\Windows\\Fonts\\georgiai.ttf",
    ])) ?? body;

  return [
    { name: "Body", data: body, weight: 400, style: "normal" },
    { name: "Display", data: display, weight: 800, style: "normal" },
    { name: "Script", data: script, weight: 400, style: "italic" },
  ];
}

async function loadLogoDataUrl() {
  try {
    const p = join(process.cwd(), "public", "wisg-logo.png");
    const buf = await readFile(p);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function loadPublicAssetDataUrl(relativePath: string) {
  try {
    const p = join(process.cwd(), "public", relativePath);
    const buf = await readFile(p);
    const ext = /\.(jpe?g)$/i.test(relativePath) ? "jpeg" : "png";
    return `data:image/${ext};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function getResvgCtor() {
  // Lazy-load native module at runtime so route compilation doesn't fail
  // when optional platform binaries are resolved by package manager quirks.
  try {
    const m = await import("@resvg/resvg-js");
    if (m?.Resvg) return m.Resvg;
  } catch {
    // fallback below
  }

  try {
    const req = Function("return require")() as (id: string) => any;
    const m = req("@resvg/resvg-js");
    if (m?.Resvg) return m.Resvg;
  } catch {
    // fallback below
  }

  throw new Error(
    "Resvg native module could not be loaded. Try reinstalling dependencies and restarting the dev server."
  );
}

type VisualStyle = {
  from: string;
  to: string;
  text: string;
  softPanel: string;
  accent: string;
  accent2: string;
  motif: string;
  sparkle: string;
  inviteLine: string;
  decorKind:
    | "winter"
    | "carpet"
    | "eid"
    | "desi"
    | "garden"
    | "tropical"
    | "celestial"
    | "neon"
    | "royal"
    | "autumn"
    | "spooky"
    | "floral_lilac"
    | "marble_geo"
    | "black_gold"
    | "blue_arch"
    | "mint_vintage"
    | "generic";
};

function pickVisualStyle(input: FlyerInput): VisualStyle {
  const preset = (input.presetId ?? "").toLowerCase();
  const t = `${input.theme} ${input.dressCode ?? ""}`.toLowerCase();

  if (preset.includes("eid-lantern-gold")) {
    return {
      from: "#F1E1C9",
      to: "#D5BC98",
      text: "#F9F5E8",
      softPanel: "rgba(255,255,255,0.14)",
      accent: "#0A3A8A",
      accent2: "#E0B75C",
      motif: "*",
      sparkle: ".",
      inviteLine: "you are warmly invited",
      decorKind: "eid",
    };
  }

  if (preset.includes("pink-brunch-bouquet")) {
    return {
      from: "#F9C3D6",
      to: "#E989AF",
      text: "#FFF7FA",
      softPanel: "rgba(255,255,255,0.18)",
      accent: "#FFFFFF",
      accent2: "#FCE7F3",
      motif: "o",
      sparkle: ".",
      inviteLine: "join us for a special brunch",
      decorKind: "floral_lilac",
    };
  }

  if (preset.includes("blue-floral-side-card")) {
    return {
      from: "#F6F8FB",
      to: "#DCE8F7",
      text: "#1B2940",
      softPanel: "rgba(255,255,255,0.72)",
      accent: "#1C3D6E",
      accent2: "#CDAA6A",
      motif: "o",
      sparkle: ".",
      inviteLine: "kindly join us",
      decorKind: "blue_arch",
    };
  }

  if (preset.includes("red-gold-luxe")) {
    return {
      from: "#7E0E1E",
      to: "#5A0814",
      text: "#FFF5E6",
      softPanel: "rgba(255,210,130,0.08)",
      accent: "#E4BD67",
      accent2: "#BA8E37",
      motif: "*",
      sparkle: ".",
      inviteLine: "",
      decorKind: "carpet",
    };
  }

  if (preset.includes("marble-geo-leaf")) {
    return {
      from: "#F1EFEB",
      to: "#D9D4CD",
      text: "#2F2A25",
      softPanel: "rgba(255,255,255,0.65)",
      accent: "#CDA64E",
      accent2: "#A68135",
      motif: ".",
      sparkle: ".",
      inviteLine: "cordially invites you",
      decorKind: "marble_geo",
    };
  }

  if (preset.includes("golden-floral-save-date")) {
    return {
      from: "#F3EBC7",
      to: "#E2CF8E",
      text: "#3E3728",
      softPanel: "rgba(255,255,255,0.44)",
      accent: "#A58A3A",
      accent2: "#C0A251",
      motif: "o",
      sparkle: ".",
      inviteLine: "save the date",
      decorKind: "floral_lilac",
    };
  }

  if (preset.includes("teal-mandala-invite")) {
    return {
      from: "#063E3F",
      to: "#032D2E",
      text: "#F8F2DD",
      softPanel: "rgba(255,255,255,0.10)",
      accent: "#E2C673",
      accent2: "#BC9D4D",
      motif: "*",
      sparkle: ".",
      inviteLine: "invitation design",
      decorKind: "royal",
    };
  }

  if (preset.includes("mint-vintage-floral")) {
    return {
      from: "#CAE1C8",
      to: "#9DBA98",
      text: "#24462A",
      softPanel: "rgba(255,255,255,0.24)",
      accent: "#2D5C35",
      accent2: "#6A8F65",
      motif: "o",
      sparkle: ".",
      inviteLine: "you are invited",
      decorKind: "mint_vintage",
    };
  }

  if (preset.includes("blue-arch-floral")) {
    return {
      from: "#D6EEFF",
      to: "#B5DDF6",
      text: "#1E2E40",
      softPanel: "rgba(255,255,255,0.62)",
      accent: "#2C5E97",
      accent2: "#7BA9CC",
      motif: "o",
      sparkle: ".",
      inviteLine: "save the date",
      decorKind: "blue_arch",
    };
  }

  if (preset.includes("ruby-ornate-invitation")) {
    return {
      from: "#8E001A",
      to: "#680013",
      text: "#FCEFC7",
      softPanel: "rgba(255,220,160,0.08)",
      accent: "#E0BE5F",
      accent2: "#B99233",
      motif: "*",
      sparkle: ".",
      inviteLine: "invitation",
      decorKind: "carpet",
    };
  }

  if (preset.includes("aqua-watercolor-gold")) {
    return {
      from: "#D2F7FA",
      to: "#9DEAF0",
      text: "#1E5C65",
      softPanel: "rgba(255,255,255,0.60)",
      accent: "#D9BA63",
      accent2: "#B08D35",
      motif: ".",
      sparkle: ".",
      inviteLine: "wedding invitation",
      decorKind: "marble_geo",
    };
  }

  if (preset.includes("lilac-hex-floral")) {
    return {
      from: "#EADCF3",
      to: "#D3BFE6",
      text: "#3E2E58",
      softPanel: "rgba(255,255,255,0.56)",
      accent: "#B89445",
      accent2: "#9B7A2F",
      motif: "o",
      sparkle: ".",
      inviteLine: "the wedding of",
      decorKind: "floral_lilac",
    };
  }

  if (preset.includes("black-gold")) {
    return {
      from: "#05070F",
      to: "#000000",
      text: "#FAFAF9",
      softPanel: "rgba(255,255,255,0.08)",
      accent: "#E6C36A",
      accent2: "#B38F3A",
      motif: ".",
      sparkle: ".",
      inviteLine: "exclusive invitation",
      decorKind: "black_gold",
    };
  }

  if (preset.includes("red-gold") || preset.includes("ruby")) {
    return {
      from: "#7F0F1F",
      to: "#520915",
      text: "#FFF7ED",
      softPanel: "rgba(255,240,200,0.10)",
      accent: "#E8C86A",
      accent2: "#C89B3C",
      motif: "*",
      sparkle: ".",
      inviteLine: "roll out the red carpet",
      decorKind: "carpet",
    };
  }

  if (preset.includes("lilac") || preset.includes("floral") || preset.includes("blush")) {
    return {
      from: "#7B5EA7",
      to: "#5A3E83",
      text: "#F8F5FF",
      softPanel: "rgba(255,255,255,0.15)",
      accent: "#E6D7FF",
      accent2: "#D7C26B",
      motif: "o",
      sparkle: ".",
      inviteLine: "please join us to celebrate",
      decorKind: "floral_lilac",
    };
  }

  if (preset.includes("blue-floral-arch")) {
    return {
      from: "#8CBFE1",
      to: "#5D90B5",
      text: "#F7FBFF",
      softPanel: "rgba(255,255,255,0.18)",
      accent: "#E8C87A",
      accent2: "#D3A953",
      motif: "o",
      sparkle: ".",
      inviteLine: "save the date",
      decorKind: "blue_arch",
    };
  }

  if (preset.includes("mint-floral-vintage")) {
    return {
      from: "#9FBF9E",
      to: "#6C8F73",
      text: "#F6FFF6",
      softPanel: "rgba(255,255,255,0.16)",
      accent: "#F5D69A",
      accent2: "#D2B173",
      motif: "o",
      sparkle: ".",
      inviteLine: "you are invited to the celebration",
      decorKind: "mint_vintage",
    };
  }

  if (preset.includes("marble")) {
    return {
      from: "#EDEBE8",
      to: "#C9C6C1",
      text: "#1F2937",
      softPanel: "rgba(255,255,255,0.60)",
      accent: "#D8B05F",
      accent2: "#B68C3D",
      motif: ".",
      sparkle: ".",
      inviteLine: "cordially invites you",
      decorKind: "marble_geo",
    };
  }

  if (/(summer|sun|sunset|beach|tropical|pool|hawaii|island|vacation)/.test(t)) {
    return {
      from: "#0EA5E9",
      to: "#0369A1",
      text: "#F0F9FF",
      softPanel: "rgba(255,255,255,0.14)",
      accent: "#FDE68A",
      accent2: "#FB7185",
      motif: "✦",
      sparkle: ".",
      inviteLine: "join us for a summer celebration",
      decorKind: "tropical",
    };
  }

  if (/(galaxy|space|cosmic|moonlight|starlight|nebula|constellation)/.test(t)) {
    return {
      from: "#1E1B4B",
      to: "#312E81",
      text: "#EDE9FE",
      softPanel: "rgba(255,255,255,0.12)",
      accent: "#C4B5FD",
      accent2: "#A78BFA",
      motif: "✶",
      sparkle: "✦",
      inviteLine: "step into a night among the stars",
      decorKind: "celestial",
    };
  }

  if (/(neon|retro|80s|dance|club|electric|glow|dj|disco)/.test(t)) {
    return {
      from: "#3B0764",
      to: "#0F172A",
      text: "#F5F3FF",
      softPanel: "rgba(255,255,255,0.12)",
      accent: "#22D3EE",
      accent2: "#F472B6",
      motif: "✹",
      sparkle: "•",
      inviteLine: "turn up the vibe and celebrate",
      decorKind: "neon",
    };
  }

  if (/(royal|elegant|black tie|gala|formal|classic|luxury)/.test(t)) {
    return {
      from: "#1F2937",
      to: "#111827",
      text: "#F9FAFB",
      softPanel: "rgba(255,255,255,0.10)",
      accent: "#FCD34D",
      accent2: "#F59E0B",
      motif: "✶",
      sparkle: "✦",
      inviteLine: "you are cordially invited",
      decorKind: "royal",
    };
  }

  if (/(halloween|spooky|haunted|pumpkin night|boo)/.test(t)) {
    return {
      from: "#111827",
      to: "#3F3F46",
      text: "#FAFAF9",
      softPanel: "rgba(255,255,255,0.10)",
      accent: "#FB923C",
      accent2: "#F97316",
      motif: "✶",
      sparkle: "•",
      inviteLine: "join us for a spooky night",
      decorKind: "spooky",
    };
  }

  if (/(winter|snow|frost|ice)/.test(t)) {
    return {
      from: "#0E7490",
      to: "#155E75",
      text: "#ECFEFF",
      softPanel: "rgba(255,255,255,0.14)",
      accent: "#E0F2FE",
      accent2: "#7DD3FC",
      motif: "*",
      sparkle: ".",
      inviteLine: "you are invited to our",
      decorKind: "winter",
    };
  }

  if (/(red carpet|hollywood|glam|awards|star)/.test(t)) {
    return {
      from: "#7F1D1D",
      to: "#3F0000",
      text: "#FFF7ED",
      softPanel: "rgba(255,215,140,0.14)",
      accent: "#FDE68A",
      accent2: "#FB923C",
      motif: "*",
      sparkle: "+",
      inviteLine: "join us for the",
      decorKind: "carpet",
    };
  }

  if (/(ramadan|eid|iftar|moon)/.test(t)) {
    return {
      from: "#064E3B",
      to: "#022C22",
      text: "#ECFDF5",
      softPanel: "rgba(167,243,208,0.16)",
      accent: "#A7F3D0",
      accent2: "#34D399",
      motif: "o",
      sparkle: "+",
      inviteLine: "you are warmly invited",
      decorKind: "eid",
    };
  }

  if (/(desi|mehndi|bollywood|sangeet|wedding)/.test(t)) {
    return {
      from: "#7C2D12",
      to: "#4A1A00",
      text: "#FFF7ED",
      softPanel: "rgba(255,186,120,0.15)",
      accent: "#FDBA74",
      accent2: "#EA580C",
      motif: "*",
      sparkle: ".",
      inviteLine: "come celebrate with us",
      decorKind: "desi",
    };
  }

  if (/(spring|garden|floral|bloom|picnic|botanical|blossom)/.test(t)) {
    return {
      from: "#166534",
      to: "#14532D",
      text: "#F0FDF4",
      softPanel: "rgba(134,239,172,0.14)",
      accent: "#BBF7D0",
      accent2: "#84CC16",
      motif: "o",
      sparkle: ".",
      inviteLine: "come celebrate with us",
      decorKind: "garden",
    };
  }

  if (/(autumn|fall|harvest|maple|pumpkin)/.test(t)) {
    return {
      from: "#9A3412",
      to: "#78350F",
      text: "#FFF7ED",
      softPanel: "rgba(255,237,213,0.14)",
      accent: "#F59E0B",
      accent2: "#FDBA74",
      motif: "*",
      sparkle: ".",
      inviteLine: "you're invited to our autumn gathering",
      decorKind: "autumn",
    };
  }

  const d = templateDefaults(input.template);
  return {
    from: d.bg,
    to: "#1F2937",
    text: d.text,
    softPanel: "rgba(255,255,255,0.12)",
    accent: d.accent,
    accent2: "#F59E0B",
    motif: "*",
    sparkle: ".",
    inviteLine: "you are invited",
    decorKind: "generic",
  };
}

function isLight(hex: string) {
  const v = hex.replace("#", "");
  if (v.length !== 6) return false;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma > 165;
}

function normalizeTheme(theme: string) {
  return theme
    .replace(/\s+/g, " ")
    .trim();
}

function splitTitle(theme: string) {
  const words = normalizeTheme(theme).split(" ");
  if (words.length <= 2) {
    return {
      top: words[0] ?? "EVENT",
      bottom: words.slice(1).join(" "),
    };
  }
  return {
    top: words.slice(0, 2).join(" "),
    bottom: words.slice(2).join(" "),
  };
}

function detailsRow(
  label: string,
  value: string,
  color: string,
  labelFamily: "Body" | "Display" | "Script",
  valueFamily: "Body" | "Display" | "Script"
) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: "12px",
        flexWrap: "wrap",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              fontSize: "30px",
              lineHeight: 1,
              color,
            },
            children: "*",
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              gap: "10px",
              alignItems: "baseline",
              flexWrap: "wrap",
            },
            children: [
              {
                type: "span",
                props: {
                  style: {
                    fontFamily: labelFamily,
                    fontWeight: 700,
                    fontSize: "30px",
                    letterSpacing: "0.02em",
                    opacity: 0.96,
                  },
                  children: `${label}`,
                },
              },
              {
                type: "span",
                props: {
                  style: {
                    fontFamily: valueFamily,
                    fontSize: valueFamily === "Script" ? "34px" : "30px",
                    opacity: 0.98,
                    lineHeight: 1.1,
                  },
                  children: value || "TBD",
                },
              },
            ],
          },
        },
      ],
    },
  };
}

function themedBackdrop(style: VisualStyle, width: number, height: number) {
  if (style.decorKind === "winter") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: "-40px",
            left: "-20px",
            width: `${width + 40}px`,
            height: "220px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.22)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: "90px",
            left: "120px",
            width: "320px",
            height: "120px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.16)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: "70px",
            right: "90px",
            width: "280px",
            height: "110px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.14)",
          },
        },
      },
    ];
  }

  if (style.decorKind === "carpet") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: "-10px",
            left: "120px",
            width: "840px",
            height: "340px",
            background: "linear-gradient(180deg, rgba(190,18,60,0.18), rgba(127,29,29,0.72))",
            borderTopLeftRadius: "120px",
            borderTopRightRadius: "120px",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "-40px",
            left: "140px",
            width: "280px",
            height: "560px",
            transform: "rotate(-16deg)",
            background: "rgba(255,255,255,0.14)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "-40px",
            right: "140px",
            width: "280px",
            height: "560px",
            transform: "rotate(16deg)",
            background: "rgba(255,255,255,0.14)",
          },
        },
      },
    ];
  }

  if (style.decorKind === "eid") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "140px",
            right: "130px",
            width: "150px",
            height: "150px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.16)",
            display: "flex",
          },
          children: [
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  top: "18px",
                  left: "40px",
                  width: "120px",
                  height: "120px",
                  borderRadius: "999px",
                  background: style.to,
                },
              },
            },
          ],
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: "40px",
            left: "130px",
            width: "820px",
            height: "210px",
            border: "2px solid rgba(255,255,255,0.20)",
            borderTopLeftRadius: "420px",
            borderTopRightRadius: "420px",
            borderBottomLeftRadius: "0px",
            borderBottomRightRadius: "0px",
            background: "rgba(255,255,255,0.05)",
          },
        },
      },
    ];
  }

  if (style.decorKind === "desi") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: "-30px",
            left: "290px",
            width: "500px",
            height: "500px",
            borderRadius: "999px",
            border: "2px dashed rgba(255,255,255,0.28)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: "70px",
            left: "390px",
            width: "300px",
            height: "300px",
            borderRadius: "999px",
            border: `2px solid ${style.accent}`,
            opacity: 0.55,
          },
        },
      },
    ];
  }

  if (style.decorKind === "garden") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "-30px",
            left: "-20px",
            width: "320px",
            height: "500px",
            borderRadius: "180px",
            background: "rgba(255,255,255,0.10)",
            transform: "rotate(-18deg)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "-30px",
            right: "-20px",
            width: "320px",
            height: "500px",
            borderRadius: "180px",
            background: "rgba(255,255,255,0.10)",
            transform: "rotate(18deg)",
          },
        },
      },
    ];
  }

  if (style.decorKind === "tropical") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            left: "-40px",
            top: "250px",
            width: "240px",
            height: "520px",
            borderRadius: "180px",
            background: "rgba(16,185,129,0.22)",
            transform: "rotate(-14deg)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            right: "-30px",
            top: "220px",
            width: "250px",
            height: "560px",
            borderRadius: "180px",
            background: "rgba(251,191,36,0.22)",
            transform: "rotate(12deg)",
          },
        },
      },
    ];
  }

  if (style.decorKind === "celestial") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "-80px",
            left: "250px",
            width: "620px",
            height: "260px",
            borderBottomLeftRadius: "320px",
            borderBottomRightRadius: "320px",
            background: "rgba(255,255,255,0.08)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: "30px",
            right: "80px",
            width: "190px",
            height: "190px",
            borderRadius: "999px",
            border: "2px solid rgba(196,181,253,0.40)",
          },
        },
      },
    ];
  }

  if (style.decorKind === "neon") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            inset: "140px 90px 120px 90px",
            border: "3px solid rgba(34,211,238,0.45)",
            borderRadius: "36px",
            boxShadow: "0 0 40px rgba(34,211,238,0.35)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            inset: "190px 140px 170px 140px",
            border: "3px solid rgba(244,114,182,0.40)",
            borderRadius: "28px",
          },
        },
      },
    ];
  }

  if (style.decorKind === "royal") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "110px",
            left: "120px",
            right: "120px",
            height: "2px",
            background: "rgba(252,211,77,0.45)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "124px",
            left: "180px",
            right: "180px",
            height: "1px",
            background: "rgba(252,211,77,0.35)",
          },
        },
      },
    ];
  }

  if (style.decorKind === "autumn") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: "-20px",
            left: "0px",
            width: `${width}px`,
            height: "170px",
            background: "rgba(120,53,15,0.45)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: "120px",
            left: "80px",
            width: "220px",
            height: "80px",
            borderRadius: "999px",
            background: "rgba(251,146,60,0.22)",
          },
        },
      },
    ];
  }

  if (style.decorKind === "spooky") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: "0px",
            left: "80px",
            width: "920px",
            height: "260px",
            borderTopLeftRadius: "460px",
            borderTopRightRadius: "460px",
            background: "rgba(0,0,0,0.40)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "130px",
            right: "120px",
            width: "140px",
            height: "140px",
            borderRadius: "999px",
            background: "rgba(251,146,60,0.24)",
          },
        },
      },
    ];
  }

  if (style.decorKind === "floral_lilac") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            inset: "40px",
            border: "2px solid rgba(255,255,255,0.35)",
            borderRadius: "30px",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "70px",
            left: "70px",
            width: "260px",
            height: "260px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.15)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: "70px",
            right: "70px",
            width: "280px",
            height: "280px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.12)",
          },
        },
      },
    ];
  }

  if (style.decorKind === "marble_geo") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            inset: "80px 120px",
            border: `4px solid ${style.accent}`,
            borderRadius: "36px",
            background: "rgba(255,255,255,0.35)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "140px",
            right: "120px",
            width: "260px",
            height: "260px",
            border: `3px solid ${style.accent2}`,
            transform: "rotate(20deg)",
          },
        },
      },
    ];
  }

  if (style.decorKind === "black_gold") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 12%, rgba(230,195,106,0.16), transparent 36%), radial-gradient(circle at 85% 90%, rgba(230,195,106,0.16), transparent 34%)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "38px",
            left: "38px",
            right: "38px",
            bottom: "38px",
            border: `2px solid ${style.accent}`,
            borderRadius: "30px",
          },
        },
      },
    ];
  }

  if (style.decorKind === "blue_arch") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "86px",
            left: "170px",
            width: "740px",
            height: "1060px",
            borderRadius: "420px 420px 24px 24px",
            background: "rgba(255,255,255,0.74)",
            border: `3px solid ${style.accent}`,
          },
        },
      },
    ];
  }

  if (style.decorKind === "mint_vintage") {
    return [
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 18% 22%, rgba(255,255,255,0.18), transparent 30%), radial-gradient(circle at 90% 75%, rgba(255,255,255,0.16), transparent 28%)",
          },
        },
      },
      {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: "74px",
            left: "90px",
            right: "90px",
            bottom: "74px",
            border: "2px solid rgba(255,255,255,0.4)",
            borderRadius: "28px",
          },
        },
      },
    ];
  }

  return [];
}

type LayoutProfile = {
  titleAlign: "left" | "center";
  titleTopSize: number;
  titleBottomSize: number;
  titleTopTransform: "uppercase" | "none";
  inviteSize: number;
  taglineSize: number;
  taglineColorMode: "accent" | "text";
  dateRibbonStyle: "capsule" | "banner";
  detailAlign: "left" | "center";
  closingSize: number;
  inviteFont: "Body" | "Display" | "Script";
  titleTopFont: "Body" | "Display" | "Script";
  titleBottomFont: "Body" | "Display" | "Script";
  taglineFont: "Body" | "Display" | "Script";
  detailLabelFont: "Body" | "Display" | "Script";
  detailValueFont: "Body" | "Display" | "Script";
  closingFont: "Body" | "Display" | "Script";
  logoSize: number;
};

function pickLayoutProfile(kind: VisualStyle["decorKind"]): LayoutProfile {
  const base: LayoutProfile = {
    titleAlign: "center",
    titleTopSize: 132,
    titleBottomSize: 88,
    titleTopTransform: "uppercase",
    inviteSize: 40,
    taglineSize: 44,
    taglineColorMode: "accent",
    dateRibbonStyle: "capsule",
    detailAlign: "center",
    closingSize: 48,
    inviteFont: "Body",
    titleTopFont: "Display",
    titleBottomFont: "Script",
    taglineFont: "Script",
    detailLabelFont: "Display",
    detailValueFont: "Body",
    closingFont: "Script",
    logoSize: 64,
  };

  switch (kind) {
    case "winter":
      return {
        ...base,
        titleTopSize: 140,
        titleBottomSize: 94,
        inviteSize: 46,
        taglineSize: 46,
        taglineColorMode: "text",
        closingSize: 52,
        inviteFont: "Body",
        titleTopFont: "Display",
        titleBottomFont: "Script",
        taglineFont: "Script",
        detailValueFont: "Body",
        logoSize: 66,
      };
    case "carpet":
      return {
        ...base,
        titleTopSize: 148,
        titleBottomSize: 86,
        inviteSize: 38,
        taglineSize: 42,
        dateRibbonStyle: "banner",
        closingSize: 50,
        inviteFont: "Display",
        titleTopFont: "Display",
        titleBottomFont: "Script",
        taglineFont: "Display",
        detailLabelFont: "Display",
        detailValueFont: "Body",
        closingFont: "Script",
        logoSize: 74,
      };
    case "eid":
      return {
        ...base,
        titleTopSize: 124,
        titleBottomSize: 94,
        titleTopTransform: "none",
        inviteSize: 44,
        taglineSize: 44,
        taglineColorMode: "text",
        closingSize: 50,
        inviteFont: "Body",
        titleTopFont: "Display",
        titleBottomFont: "Script",
        taglineFont: "Script",
        detailLabelFont: "Display",
        detailValueFont: "Script",
        closingFont: "Script",
        logoSize: 70,
      };
    case "desi":
      return {
        ...base,
        titleAlign: "left",
        titleTopSize: 126,
        titleBottomSize: 84,
        inviteSize: 38,
        taglineSize: 40,
        dateRibbonStyle: "banner",
        detailAlign: "left",
        closingSize: 46,
        inviteFont: "Display",
        titleTopFont: "Display",
        titleBottomFont: "Script",
        taglineFont: "Script",
        detailValueFont: "Script",
        logoSize: 68,
      };
    case "garden":
      return {
        ...base,
        titleAlign: "left",
        titleTopSize: 116,
        titleBottomSize: 80,
        titleTopTransform: "none",
        inviteSize: 36,
        taglineSize: 40,
        taglineColorMode: "text",
        detailAlign: "left",
        closingSize: 44,
        inviteFont: "Body",
        titleTopFont: "Script",
        titleBottomFont: "Display",
        taglineFont: "Script",
        detailLabelFont: "Body",
        detailValueFont: "Body",
        closingFont: "Script",
        logoSize: 62,
      };
    case "tropical":
      return {
        ...base,
        titleAlign: "center",
        titleTopSize: 138,
        titleBottomSize: 84,
        inviteSize: 36,
        taglineSize: 42,
        taglineColorMode: "text",
        detailAlign: "center",
        dateRibbonStyle: "banner",
        inviteFont: "Display",
        titleTopFont: "Display",
        titleBottomFont: "Script",
        taglineFont: "Script",
        detailValueFont: "Body",
        logoSize: 70,
      };
    case "celestial":
      return {
        ...base,
        titleAlign: "center",
        titleTopSize: 126,
        titleBottomSize: 82,
        titleTopTransform: "none",
        inviteSize: 34,
        taglineSize: 38,
        taglineColorMode: "text",
        detailAlign: "center",
        inviteFont: "Body",
        titleTopFont: "Display",
        titleBottomFont: "Script",
        taglineFont: "Script",
        detailLabelFont: "Body",
        detailValueFont: "Body",
        closingFont: "Script",
        logoSize: 60,
      };
    case "neon":
      return {
        ...base,
        titleAlign: "left",
        titleTopSize: 142,
        titleBottomSize: 78,
        inviteSize: 34,
        taglineSize: 36,
        dateRibbonStyle: "banner",
        detailAlign: "left",
        inviteFont: "Display",
        titleTopFont: "Display",
        titleBottomFont: "Display",
        taglineFont: "Display",
        detailLabelFont: "Display",
        detailValueFont: "Body",
        closingFont: "Display",
        logoSize: 68,
      };
    case "royal":
      return {
        ...base,
        titleAlign: "center",
        titleTopSize: 120,
        titleBottomSize: 86,
        titleTopTransform: "none",
        inviteSize: 34,
        taglineSize: 38,
        taglineColorMode: "text",
        detailAlign: "center",
        inviteFont: "Body",
        titleTopFont: "Display",
        titleBottomFont: "Script",
        taglineFont: "Body",
        detailLabelFont: "Display",
        detailValueFont: "Body",
        closingFont: "Script",
        logoSize: 76,
      };
    case "autumn":
      return {
        ...base,
        titleAlign: "left",
        titleTopSize: 122,
        titleBottomSize: 80,
        inviteSize: 34,
        taglineSize: 36,
        detailAlign: "left",
        dateRibbonStyle: "banner",
        inviteFont: "Body",
        titleTopFont: "Display",
        titleBottomFont: "Script",
        taglineFont: "Body",
        detailLabelFont: "Display",
        detailValueFont: "Body",
        logoSize: 64,
      };
    case "spooky":
      return {
        ...base,
        titleAlign: "center",
        titleTopSize: 134,
        titleBottomSize: 74,
        inviteSize: 34,
        taglineSize: 36,
        detailAlign: "center",
        dateRibbonStyle: "banner",
        inviteFont: "Display",
        titleTopFont: "Display",
        titleBottomFont: "Display",
        taglineFont: "Body",
        detailLabelFont: "Display",
        detailValueFont: "Body",
        closingFont: "Display",
        logoSize: 72,
      };
    case "floral_lilac":
      return {
        ...base,
        titleAlign: "center",
        titleTopSize: 116,
        titleBottomSize: 84,
        titleTopTransform: "none",
        inviteSize: 34,
        taglineSize: 40,
        detailAlign: "center",
        inviteFont: "Body",
        titleTopFont: "Script",
        titleBottomFont: "Display",
        taglineFont: "Script",
        detailLabelFont: "Body",
        detailValueFont: "Body",
        closingFont: "Script",
        logoSize: 66,
      };
    case "marble_geo":
      return {
        ...base,
        titleAlign: "center",
        titleTopSize: 112,
        titleBottomSize: 80,
        titleTopTransform: "none",
        inviteSize: 32,
        taglineSize: 36,
        taglineColorMode: "text",
        detailAlign: "center",
        inviteFont: "Body",
        titleTopFont: "Display",
        titleBottomFont: "Script",
        taglineFont: "Body",
        detailLabelFont: "Display",
        detailValueFont: "Body",
        closingFont: "Script",
        logoSize: 60,
      };
    case "black_gold":
      return {
        ...base,
        titleAlign: "center",
        titleTopSize: 130,
        titleBottomSize: 80,
        inviteSize: 34,
        taglineSize: 36,
        taglineColorMode: "text",
        detailAlign: "center",
        dateRibbonStyle: "banner",
        inviteFont: "Display",
        titleTopFont: "Display",
        titleBottomFont: "Script",
        taglineFont: "Display",
        detailLabelFont: "Display",
        detailValueFont: "Body",
        closingFont: "Script",
        logoSize: 70,
      };
    case "blue_arch":
      return {
        ...base,
        titleAlign: "center",
        titleTopSize: 108,
        titleBottomSize: 76,
        titleTopTransform: "none",
        inviteSize: 30,
        taglineSize: 34,
        taglineColorMode: "text",
        detailAlign: "center",
        inviteFont: "Body",
        titleTopFont: "Display",
        titleBottomFont: "Script",
        taglineFont: "Body",
        detailLabelFont: "Display",
        detailValueFont: "Body",
        closingFont: "Script",
        logoSize: 60,
      };
    case "mint_vintage":
      return {
        ...base,
        titleAlign: "center",
        titleTopSize: 110,
        titleBottomSize: 76,
        titleTopTransform: "none",
        inviteSize: 32,
        taglineSize: 34,
        detailAlign: "center",
        inviteFont: "Body",
        titleTopFont: "Script",
        titleBottomFont: "Display",
        taglineFont: "Body",
        detailLabelFont: "Display",
        detailValueFont: "Body",
        closingFont: "Script",
        logoSize: 62,
      };
    default:
      return base;
  }
}

type RefTemplateCfg = {
  bg: string;
  panel: string;
  ink: string;
  accent: string;
  titleSize: number;
  scriptSize: number;
  titleFont?: "Body" | "Display" | "Script";
  taglineFont?: "Body" | "Display" | "Script";
  infoFont?: "Body" | "Display" | "Script";
  cardTint?: string;
};

type RefTypeCfg = {
  titleFont: "Body" | "Display" | "Script";
  taglineFont: "Body" | "Display" | "Script";
  infoFont: "Body" | "Display" | "Script";
  titleWeight: number;
  taglineWeight: number;
  infoWeight: number;
  titleUpper?: boolean;
  taglineUpper?: boolean;
  titleLetterSpacing?: string;
  taglineLetterSpacing?: string;
};

const REF_TEMPLATE_CFG: Record<string, RefTemplateCfg> = {
  "eid-lantern-gold": {
    bg: "flyer-assets/eid-lantern-gold (2).png",
    panel: "390px 80px 140px 80px",
    ink: "#1f3557",
    accent: "#0a3a8a",
    titleSize: 84,
    scriptSize: 52,
    titleFont: "Display",
    taglineFont: "Script",
    infoFont: "Display",
    cardTint: "rgba(255,255,255,0.18)",
  },
  "pink-brunch-bouquet": {
    bg: "flyer-assets/pink-brunch-bouquet.png",
    panel: "160px 120px 160px 120px",
    ink: "#fff8fc",
    accent: "#ffffff",
    titleSize: 74,
    scriptSize: 50,
    titleFont: "Display",
    taglineFont: "Script",
    infoFont: "Body",
    cardTint: "rgba(255,255,255,0.08)",
  },
  "blue-floral-side-card": {
    bg: "flyer-assets/blue-floral.png",
    panel: "150px 120px 140px 120px",
    ink: "#1f2f47",
    accent: "#1c3d6e",
    titleSize: 68,
    scriptSize: 48,
    titleFont: "Script",
    taglineFont: "Body",
    infoFont: "Display",
    cardTint: "rgba(255,255,255,0.76)",
  },
  "red-gold-luxe": {
    bg: "flyer-assets/red-gold-flower.png",
    panel: "170px 140px 180px 140px",
    ink: "#f8e8c3",
    accent: "#e2bf68",
    titleSize: 88,
    scriptSize: 58,
    titleFont: "Script",
    taglineFont: "Script",
    infoFont: "Display",
    cardTint: "rgba(90,8,20,0.35)",
  },
  "marble-geo-leaf": {
    bg: "flyer-assets/marble-green-white-floral.png",
    panel: "220px 170px 190px 170px",
    ink: "#3a3125",
    accent: "#c79e48",
    titleSize: 74,
    scriptSize: 46,
    titleFont: "Display",
    taglineFont: "Script",
    infoFont: "Body",
    cardTint: "rgba(255,255,255,0.5)",
  },
  "golden-floral-save-date": {
    bg: "flyer-assets/light-yellow-floral.png",
    panel: "190px 140px 190px 140px",
    ink: "#564727",
    accent: "#a6883f",
    titleSize: 74,
    scriptSize: 52,
    titleFont: "Script",
    taglineFont: "Script",
    infoFont: "Body",
    cardTint: "rgba(255,255,255,0.46)",
  },
  "teal-mandala-invite": {
    bg: "flyer-assets/nacy-blue-golden-floral.png",
    panel: "210px 180px 180px 180px",
    ink: "#f7efcf",
    accent: "#e2c673",
    titleSize: 76,
    scriptSize: 48,
    titleFont: "Display",
    taglineFont: "Script",
    infoFont: "Display",
    cardTint: "rgba(3,45,46,0.35)",
  },
  "mint-vintage-floral": {
    bg: "flyer-assets/pastel-green-floral.png",
    panel: "180px 145px 185px 145px",
    ink: "#28512f",
    accent: "#2f6338",
    titleSize: 72,
    scriptSize: 54,
    titleFont: "Script",
    taglineFont: "Script",
    infoFont: "Body",
    cardTint: "rgba(255,255,255,0.22)",
  },
  "blue-arch-floral": {
    bg: "flyer-assets/cyan-white-floral.png",
    panel: "170px 170px 185px 170px",
    ink: "#192d44",
    accent: "#2c5e97",
    titleSize: 78,
    scriptSize: 54,
    titleFont: "Script",
    taglineFont: "Display",
    infoFont: "Display",
    cardTint: "rgba(255,255,255,0.6)",
  },
  "ruby-ornate-invitation": {
    bg: "flyer-assets/red-floral-gold.png",
    panel: "150px 270px 180px 270px",
    ink: "#f8e8c3",
    accent: "#e0be5f",
    titleSize: 76,
    scriptSize: 56,
    titleFont: "Script",
    taglineFont: "Display",
    infoFont: "Display",
    cardTint: "rgba(104,0,19,0.38)",
  },
  "aqua-watercolor-gold": {
    bg: "flyer-assets/blue-green.png",
    panel: "180px 150px 180px 150px",
    ink: "#fff6dc",
    accent: "#f4cd76",
    titleSize: 76,
    scriptSize: 50,
    titleFont: "Display",
    taglineFont: "Script",
    infoFont: "Body",
    cardTint: "rgba(15,87,95,0.46)",
  },
  "lilac-hex-floral": {
    bg: "flyer-assets/purple-floral.png",
    panel: "210px 180px 200px 180px",
    ink: "#4a3b63",
    accent: "#b89445",
    titleSize: 70,
    scriptSize: 48,
    titleFont: "Script",
    taglineFont: "Display",
    infoFont: "Body",
    cardTint: "rgba(255,255,255,0.56)",
  },
};

function refTypeCfg(presetId: string): RefTypeCfg {
  switch (presetId) {
    case "eid-lantern-gold":
      return {
        titleFont: "Display",
        taglineFont: "Script",
        infoFont: "Display",
        titleWeight: 900,
        taglineWeight: 700,
        infoWeight: 700,
        titleUpper: true,
        taglineUpper: false,
        titleLetterSpacing: "0.03em",
      };
    case "pink-brunch-bouquet":
      return {
        titleFont: "Display",
        taglineFont: "Script",
        infoFont: "Body",
        titleWeight: 950,
        taglineWeight: 800,
        infoWeight: 800,
        titleUpper: true,
        taglineUpper: false,
        titleLetterSpacing: "0.01em",
      };
    case "blue-floral-side-card":
      return {
        titleFont: "Script",
        taglineFont: "Body",
        infoFont: "Display",
        titleWeight: 700,
        taglineWeight: 700,
        infoWeight: 700,
        titleUpper: false,
        titleLetterSpacing: "0",
      };
    case "red-gold-luxe":
      return {
        titleFont: "Script",
        taglineFont: "Script",
        infoFont: "Display",
        titleWeight: 800,
        taglineWeight: 700,
        infoWeight: 700,
        titleUpper: false,
        taglineUpper: false,
      };
    case "marble-geo-leaf":
      return {
        titleFont: "Display",
        taglineFont: "Script",
        infoFont: "Body",
        titleWeight: 900,
        taglineWeight: 600,
        infoWeight: 700,
        titleUpper: false,
        titleLetterSpacing: "0.04em",
      };
    case "teal-mandala-invite":
      return {
        titleFont: "Display",
        taglineFont: "Script",
        infoFont: "Display",
        titleWeight: 900,
        taglineWeight: 700,
        infoWeight: 700,
        titleUpper: true,
        taglineUpper: false,
        titleLetterSpacing: "0.05em",
      };
    case "ruby-ornate-invitation":
      return {
        titleFont: "Script",
        taglineFont: "Display",
        infoFont: "Display",
        titleWeight: 800,
        taglineWeight: 700,
        infoWeight: 700,
        titleUpper: false,
        taglineUpper: true,
        taglineLetterSpacing: "0.08em",
      };
    default:
      return {
        titleFont: "Display",
        taglineFont: "Script",
        infoFont: "Body",
        titleWeight: 900,
        taglineWeight: 700,
        infoWeight: 700,
        titleUpper: false,
      };
  }
}

async function renderReferenceTemplatePNG(
  input: FlyerInput,
  fonts: FlyerFont[]
): Promise<Uint8Array | null> {
  const presetIdRaw = (input.presetId ?? "").toLowerCase();
  const presetId = presetIdRaw.endsWith("-2")
    ? presetIdRaw.slice(0, -2)
    : presetIdRaw;
  const cfg = REF_TEMPLATE_CFG[presetId];
  if (!cfg) return null;
  const type = refTypeCfg(presetId);

  const width = 1080;
  const height = 1350;
  const bg = await loadPublicAssetDataUrl(cfg.bg);
  const title = normalizeTheme(input.theme || "Special Event");
  const tagline = (input.tagline ?? "").trim() || "You are invited";
  const dress = (input.dressCode ?? "").trim();
  const note = (input.note ?? "").trim();
  const description = (input.description ?? "").trim();
  const scriptSize = Math.round(cfg.scriptSize * 1.22);
  const titleSize = Math.round(cfg.titleSize * 1.2);
  const dateSize = 50;
  const locationSize = 36;
  const metaSize = 30;
  const isPinkBouquet = presetId === "pink-brunch-bouquet";
  const isEid = presetId === "eid-lantern-gold";
  const isMarbleGeo = presetId === "marble-geo-leaf";
  const isTealMandala = presetId === "teal-mandala-invite";
  const accentColor = isPinkBouquet ? "#8D1F4C" : cfg.accent;
  const inkColor = isPinkBouquet
    ? "#7A1D43"
    : isTealMandala
    ? "#E4CC92"
    : cfg.ink;
  const tealAccent = isTealMandala ? "#C8AA5A" : accentColor;
  const panelPositionStyle =
    isPinkBouquet
      ? {
          top: "50%",
          right: "6%",
          transform: "translateY(-50%)",
          width: "42%",
          minHeight: "62%",
        }
      : isEid
      ? {
          left: "50%",
          bottom: "0%",
          transform: "translateX(-50%)",
          width: "92%",
          minHeight: "36%",
        }
      : isMarbleGeo
      ? {
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "74%",
          minHeight: "58%",
        }
      : isTealMandala
      ? {
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "74%",
          minHeight: "58%",
        }
      : {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "74%",
          minHeight: "58%",
        };

  const tree = {
    type: "div",
    props: {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        position: "relative",
        display: "flex",
        overflow: "hidden",
        fontFamily: "Body",
        color: cfg.ink,
        background: `linear-gradient(150deg, #f8f4ee, #e9e0d3)`,
      },
      children: [
        bg
          ? {
              type: "img",
              props: {
                src: bg,
                alt: "Template",
                width,
                height,
                style: {
                  position: "absolute",
                  inset: "0px",
                  width: `${width}px`,
                  height: `${height}px`,
                  objectFit: "cover",
                  objectPosition: isEid ? "left top" : "center center",
                },
              },
            }
          : null,
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              ...panelPositionStyle,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              borderRadius: "18px",
              border: "0px solid transparent",
              background: "transparent",
              boxShadow: "none",
              padding: "40px 46px",
              gap: "14px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: type.taglineFont,
                    fontSize: `${isEid ? 44 : scriptSize}px`,
                    color: tealAccent,
                    fontWeight:
                      isPinkBouquet ? 800 : isEid ? 800 : type.taglineWeight,
                    lineHeight: 1,
                    width: isEid ? "100%" : "auto",
                    letterSpacing:
                      type.taglineLetterSpacing ?? (isEid ? "0.07em" : "0"),
                    textTransform:
                      type.taglineUpper || isEid ? "uppercase" : "none",
                  },
                  children: tagline,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: type.titleFont,
                    fontSize: `${titleSize}px`,
                    lineHeight: 0.95,
                    fontWeight: isPinkBouquet ? 950 : type.titleWeight,
                    letterSpacing: type.titleLetterSpacing ?? "-0.02em",
                    textShadow: isPinkBouquet ? "0 1px 2px rgba(0,0,0,0.35)" : "none",
                    maxWidth: "92%",
                    color: inkColor,
                    textTransform: type.titleUpper ? "uppercase" : "none",
                  },
                  children: title,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    marginTop: "6px",
                    fontFamily: type.infoFont,
                    fontSize: `${dateSize}px`,
                    color: tealAccent,
                    fontWeight: isPinkBouquet ? 900 : type.infoWeight,
                    textShadow: isPinkBouquet ? "0 1px 2px rgba(0,0,0,0.28)" : "none",
                  },
                  children: input.dateTime,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: type.infoFont,
                    fontSize: `${locationSize}px`,
                    fontWeight: isPinkBouquet ? 800 : 600,
                    textShadow: isPinkBouquet ? "0 1px 2px rgba(0,0,0,0.22)" : "none",
                    maxWidth: "95%",
                    color: inkColor,
                  },
                  children: input.location || "Location TBD",
                },
              },
              description
                ? {
                    type: "div",
                    props: {
                      style: {
                        marginTop: "4px",
                        fontFamily: type.taglineFont,
                        fontSize: "30px",
                        lineHeight: 1.24,
                        opacity: 0.96,
                        maxWidth: "95%",
                        color: inkColor,
                      },
                      children: description,
                    },
                  }
                : null,
              dress
                ? {
                    type: "div",
                    props: {
                      style: {
                        fontFamily: type.infoFont,
                        fontSize: `${metaSize}px`,
                        opacity: 0.95,
                        fontWeight: isPinkBouquet ? 800 : 500,
                        color: inkColor,
                      },
                      children: `Dress Code: ${dress}`,
                    },
                  }
                : null,
              note
                ? {
                    type: "div",
                    props: {
                      style: {
                        fontFamily: type.infoFont,
                        fontSize: "26px",
                        opacity: 0.92,
                        fontWeight: isPinkBouquet ? 800 : 500,
                        color: inkColor,
                      },
                      children: note,
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },
      ].filter(Boolean),
    },
  } as any;

  const svg = await satori(tree, { width, height, fonts });
  const Resvg = await getResvgCtor();
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
  return resvg.render().asPng();
}

export async function renderFlyerPNG(input: FlyerInput): Promise<Uint8Array> {
  const fonts = await loadFonts();
  const logoDataUrl = await loadLogoDataUrl();
  const reference = await renderReferenceTemplatePNG(input, fonts);
  if (reference) return reference;
  const style = pickVisualStyle(input);
  const p = input.palette ?? [];
  if (!input.presetId && p.length >= 3) {
    style.from = p[0];
    style.to = p[1];
    style.accent = p[2];
    style.accent2 = p[1];
    style.text = isLight(p[0]) && isLight(p[1]) ? "#111827" : "#F9FAFB";
    style.softPanel = isLight(p[0])
      ? "rgba(17,24,39,0.08)"
      : "rgba(255,255,255,0.14)";
  }
  const title = splitTitle(input.theme);
  const tagline = (input.tagline ?? "").trim();
  const description = (input.description ?? "").trim();

  const width = 1080;
  const height = 1350;

  const motifSpots = [
    { top: 84, left: 68, size: 52, rotate: -16 },
    { top: 110, left: 930, size: 58, rotate: 18 },
    { top: 328, left: 88, size: 50, rotate: -10 },
    { top: 382, left: 936, size: 50, rotate: 9 },
    { top: 1030, left: 92, size: 46, rotate: -18 },
    { top: 1080, left: 942, size: 56, rotate: 10 },
  ];

  const bannerText = input.presetId
    ? ""
    : style.decorKind === "winter"
      ? "WINTER WONDERLAND"
      : style.decorKind === "carpet"
      ? "RED CARPET CELEBRATION"
      : style.decorKind === "eid"
      ? "EID NIGHT"
      : style.decorKind === "desi"
      ? "DESI GLAM"
      : style.decorKind === "garden"
      ? "GARDEN PARTY"
      : style.decorKind === "tropical"
      ? "SUMMER VIBES"
      : style.decorKind === "celestial"
      ? "STARLIGHT NIGHT"
      : style.decorKind === "neon"
      ? "NEON PARTY"
      : style.decorKind === "royal"
      ? "ROYAL GALA"
      : style.decorKind === "autumn"
      ? "AUTUMN SOCIAL"
      : style.decorKind === "spooky"
      ? "SPOOKY NIGHT"
      : style.decorKind === "floral_lilac"
      ? "FLORAL ELEGANCE"
      : style.decorKind === "marble_geo"
      ? "MARBLE CLASSIC"
      : style.decorKind === "black_gold"
      ? "GOLDEN SOIREE"
      : style.decorKind === "blue_arch"
      ? "SAVE THE DATE"
      : style.decorKind === "mint_vintage"
      ? "VINTAGE BLOOM"
      : "SPECIAL EVENT";
  const layout = pickLayoutProfile(style.decorKind);

  const sparkles = Array.from({ length: 80 }).map((_, i) => {
    const x = (i * 131 + 47) % (width - 40) + 20;
    const y = (i * 89 + 29) % (height - 40) + 20;
    const size = i % 5 === 0 ? 8 : i % 3 === 0 ? 6 : 4;
    return { x, y, size };
  });

  const accentTone =
    layout.taglineColorMode === "text" ? "rgba(255,255,255,0.95)" : style.accent;

  const detailLineGap = layout.detailAlign === "left" ? "10px" : "12px";

  // NOTE: Satori accepts this object tree; cast for TS.
  const tree = {
    type: "div",
    props: {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        position: "relative",
        overflow: "hidden",
        borderRadius: "36px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 62px",
        background: `linear-gradient(160deg, ${style.from}, ${style.to})`,
        color: style.text,
        fontFamily: "Body",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              inset: 0,
              display: "flex",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    top: "-120px",
                    left: "-120px",
                    width: "420px",
                    height: "420px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.10)",
                  },
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    bottom: "-180px",
                    right: "-80px",
                    width: "520px",
                    height: "520px",
                    borderRadius: "999px",
                    background: "rgba(0,0,0,0.18)",
                  },
                },
              },
              ...themedBackdrop(style, width, height),
              ...sparkles.map((s) => ({
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    left: `${s.x}px`,
                    top: `${s.y}px`,
                    width: `${s.size}px`,
                    height: `${s.size}px`,
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.50)",
                  },
                },
              })),
              ...motifSpots.map((m) => ({
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    left: `${m.left}px`,
                    top: `${m.top}px`,
                    fontSize: `${m.size}px`,
                    opacity: 0.92,
                    transform: `rotate(${m.rotate}deg)`,
                    color: style.accent,
                  },
                  children: style.motif,
                },
              })),
              ...(style.decorKind === "carpet"
                ? Array.from({ length: 6 }).map((_, i) => ({
                    type: "div",
                    props: {
                      style: {
                        position: "absolute",
                        bottom: `${110 + i * 18}px`,
                        left: `${140 + i * 72}px`,
                        width: "22px",
                        height: "22px",
                        borderRadius: "999px",
                        background: "rgba(255,215,140,0.9)",
                      },
                    },
                  }))
                : []),
              ...(style.decorKind === "eid"
                ? Array.from({ length: 4 }).map((_, i) => ({
                    type: "div",
                    props: {
                      style: {
                        position: "absolute",
                        top: "0px",
                        left: `${180 + i * 190}px`,
                        width: "2px",
                        height: "120px",
                        background: "rgba(255,255,255,0.45)",
                        display: "flex",
                      },
                      children: [
                        {
                          type: "div",
                          props: {
                            style: {
                              position: "absolute",
                              top: "110px",
                              left: "-18px",
                              width: "36px",
                              height: "44px",
                              borderRadius: "10px",
                              border: `2px solid ${style.accent}`,
                              background: "rgba(255,255,255,0.10)",
                            },
                          },
                        },
                      ],
                    },
                  }))
                : []),
              ...(style.decorKind === "winter"
                ? [
                    { left: 120, top: 210, size: 56 },
                    { left: 860, top: 270, size: 62 },
                    { left: 150, top: 980, size: 58 },
                    { left: 910, top: 1020, size: 52 },
                  ].map((s) => ({
                    type: "div",
                    props: {
                      style: {
                        position: "absolute",
                        left: `${s.left}px`,
                        top: `${s.top}px`,
                        fontSize: `${s.size}px`,
                        fontFamily: "Display",
                        color: "rgba(255,255,255,0.75)",
                        transform: "rotate(8deg)",
                      },
                      children: "*",
                    },
                  }))
                : []),
              ...(style.decorKind === "desi"
                ? Array.from({ length: 14 }).map((_, i) => ({
                    type: "div",
                    props: {
                      style: {
                        position: "absolute",
                        left: `${58 + i * 68}px`,
                        bottom: `${90 + (i % 2) * 8}px`,
                        width: "16px",
                        height: "16px",
                        borderRadius: "999px",
                        background: i % 3 === 0 ? style.accent : style.accent2,
                        opacity: 0.85,
                      },
                    },
                  }))
                : []),
              ...(style.decorKind === "garden"
                ? [
                    { left: 70, top: 210, size: 34 },
                    { left: 980, top: 230, size: 30 },
                    { left: 90, top: 1120, size: 32 },
                    { left: 960, top: 1110, size: 34 },
                  ].map((f) => ({
                    type: "div",
                    props: {
                      style: {
                        position: "absolute",
                        left: `${f.left}px`,
                        top: `${f.top}px`,
                        fontSize: `${f.size}px`,
                        fontFamily: "Script",
                        color: "rgba(255,255,255,0.86)",
                      },
                      children: "o",
                    },
                  }))
                : []),
              ...(style.decorKind === "tropical"
                ? [
                    { left: 80, top: 220, txt: "❀", size: 34 },
                    { left: 940, top: 250, txt: "❀", size: 32 },
                    { left: 120, top: 1040, txt: "❀", size: 30 },
                    { left: 920, top: 1080, txt: "❀", size: 34 },
                    { left: 220, top: 140, txt: "☼", size: 30 },
                  ].map((x) => ({
                    type: "div",
                    props: {
                      style: {
                        position: "absolute",
                        left: `${x.left}px`,
                        top: `${x.top}px`,
                        fontSize: `${x.size}px`,
                        color: "rgba(255,255,255,0.82)",
                        fontFamily: "Display",
                      },
                      children: x.txt,
                    },
                  }))
                : []),
              ...(style.decorKind === "celestial"
                ? [
                    { left: 90, top: 170, txt: "✦", size: 28 },
                    { left: 980, top: 180, txt: "✦", size: 26 },
                    { left: 180, top: 1040, txt: "✶", size: 30 },
                    { left: 900, top: 1090, txt: "✶", size: 28 },
                    { left: 860, top: 120, txt: "☾", size: 34 },
                  ].map((x) => ({
                    type: "div",
                    props: {
                      style: {
                        position: "absolute",
                        left: `${x.left}px`,
                        top: `${x.top}px`,
                        fontSize: `${x.size}px`,
                        color: "rgba(224,231,255,0.88)",
                        fontFamily: "Display",
                      },
                      children: x.txt,
                    },
                  }))
                : []),
              ...(style.decorKind === "neon"
                ? [
                    { left: 120, top: 170, txt: "◇", size: 30, c: "rgba(34,211,238,0.9)" },
                    { left: 930, top: 180, txt: "◇", size: 30, c: "rgba(244,114,182,0.9)" },
                    { left: 150, top: 1050, txt: "◆", size: 28, c: "rgba(244,114,182,0.9)" },
                    { left: 900, top: 1030, txt: "◆", size: 28, c: "rgba(34,211,238,0.9)" },
                  ].map((x) => ({
                    type: "div",
                    props: {
                      style: {
                        position: "absolute",
                        left: `${x.left}px`,
                        top: `${x.top}px`,
                        fontSize: `${x.size}px`,
                        color: x.c,
                        fontFamily: "Display",
                      },
                      children: x.txt,
                    },
                  }))
                : []),
              ...(style.decorKind === "royal"
                ? [
                    { left: 150, top: 140, txt: "✶", size: 24 },
                    { left: 930, top: 140, txt: "✶", size: 24 },
                    { left: 120, top: 1060, txt: "✦", size: 24 },
                    { left: 960, top: 1060, txt: "✦", size: 24 },
                  ].map((x) => ({
                    type: "div",
                    props: {
                      style: {
                        position: "absolute",
                        left: `${x.left}px`,
                        top: `${x.top}px`,
                        fontSize: `${x.size}px`,
                        color: "rgba(252,211,77,0.84)",
                        fontFamily: "Display",
                      },
                      children: x.txt,
                    },
                  }))
                : []),
              ...(style.decorKind === "autumn"
                ? [
                    { left: 90, top: 240, txt: "❧", size: 30 },
                    { left: 970, top: 260, txt: "❧", size: 28 },
                    { left: 150, top: 1070, txt: "❧", size: 28 },
                    { left: 900, top: 1100, txt: "❧", size: 30 },
                  ].map((x) => ({
                    type: "div",
                    props: {
                      style: {
                        position: "absolute",
                        left: `${x.left}px`,
                        top: `${x.top}px`,
                        fontSize: `${x.size}px`,
                        color: "rgba(251,146,60,0.9)",
                        fontFamily: "Display",
                      },
                      children: x.txt,
                    },
                  }))
                : []),
              ...(style.decorKind === "spooky"
                ? [
                    { left: 130, top: 210, txt: "✶", size: 24 },
                    { left: 960, top: 210, txt: "✶", size: 24 },
                    { left: 190, top: 1050, txt: "✦", size: 24 },
                    { left: 860, top: 1040, txt: "✦", size: 24 },
                  ].map((x) => ({
                    type: "div",
                    props: {
                      style: {
                        position: "absolute",
                        left: `${x.left}px`,
                        top: `${x.top}px`,
                        fontSize: `${x.size}px`,
                        color: "rgba(251,146,60,0.88)",
                        fontFamily: "Display",
                      },
                      children: x.txt,
                    },
                  }))
                : []),
            ],
          },
        },

        {
          type: "div",
          props: {
            style: {
              position: "relative",
              zIndex: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  },
                  children: [
                    logoDataUrl
                      ? {
                          type: "img",
                          props: {
                            src: logoDataUrl,
                            width: layout.logoSize,
                            height: layout.logoSize,
                            alt: "IWSG",
                            style: {
                              borderRadius: "999px",
                              border: "3px solid rgba(255,255,255,0.72)",
                              background: "rgba(255,255,255,0.92)",
                              objectFit: "contain",
                              padding: "6px",
                              boxShadow: "0 8px 26px rgba(0,0,0,0.22)",
                            },
                          },
                        }
                      : null,
                    {
                      type: "div",
                      props: {
                        style: {
                          fontFamily: "Display",
                          fontSize: "28px",
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          opacity: 0.96,
                        },
                        children: "IWSG Community Event",
                      },
                    },
                  ].filter(Boolean),
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: "Display",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "26px",
                    fontWeight: 700,
                  },
                  children: [style.sparkle, style.sparkle, style.sparkle],
                },
              },
            ],
          },
        },

        bannerText
          ? {
              type: "div",
              props: {
                style: {
                  position: "relative",
                  zIndex: 1,
                  alignSelf: layout.titleAlign === "left" ? "flex-start" : "center",
                  marginTop: "6px",
                  borderRadius: "999px",
                  padding: "8px 22px",
                  border: `2px solid ${style.accent}`,
                  background: "rgba(255,255,255,0.10)",
                  fontFamily: "Display",
                  fontSize: "21px",
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                },
                children: bannerText,
              },
            }
          : {
              type: "div",
              props: {
                style: {
                  display: "none",
                },
                children: "",
              },
            },

        {
          type: "div",
          props: {
            style: {
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: layout.titleAlign === "left" ? "flex-start" : "center",
              gap: "10px",
              marginTop: layout.titleAlign === "left" ? "30px" : "24px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: layout.inviteFont,
                    fontSize: `${Math.max(layout.inviteSize - 6, 28)}px`,
                    opacity: 0.95,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    textAlign: layout.titleAlign,
                    alignSelf: layout.titleAlign === "left" ? "flex-start" : "center",
                  },
                  children: style.inviteLine,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: layout.titleTopFont,
                    marginTop: "6px",
                    textAlign: layout.titleAlign,
                    fontSize: `${layout.titleTopSize}px`,
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    lineHeight: 0.95,
                    textTransform: layout.titleTopTransform,
                    alignSelf: layout.titleAlign === "left" ? "flex-start" : "center",
                  },
                  children: title.top || "EVENT",
                },
              },
              title.bottom
                ? {
                    type: "div",
                    props: {
                      style: {
                        fontFamily: layout.titleBottomFont,
                        marginTop: "-6px",
                        textAlign: layout.titleAlign,
                        fontSize: `${layout.titleBottomSize}px`,
                        fontWeight: 600,
                        lineHeight: 0.98,
                        letterSpacing: "0.01em",
                        alignSelf: layout.titleAlign === "left" ? "flex-start" : "center",
                      },
                      children: title.bottom,
                    },
                  }
                : null,
              tagline
                ? {
                    type: "div",
                    props: {
                      style: {
                        marginTop: "16px",
                        textAlign: layout.titleAlign,
                        fontFamily: layout.taglineFont,
                        fontSize: `${layout.taglineSize}px`,
                        fontWeight: 500,
                        letterSpacing: "0.01em",
                        color: accentTone,
                        maxWidth: "890px",
                        alignSelf: layout.titleAlign === "left" ? "flex-start" : "center",
                      },
                      children: tagline,
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },

        {
          type: "div",
          props: {
            style: {
              position: "relative",
              zIndex: 1,
              alignSelf: layout.detailAlign === "left" ? "flex-start" : "center",
              marginTop: "10px",
              borderRadius: layout.dateRibbonStyle === "banner" ? "14px" : "999px",
              background:
                layout.dateRibbonStyle === "banner"
                  ? "rgba(255,255,255,0.88)"
                  : "rgba(255,255,255,0.92)",
              color: "#1F2937",
              padding: layout.dateRibbonStyle === "banner" ? "12px 26px" : "14px 34px",
              border: `4px solid ${style.accent2}`,
              fontFamily: "Display",
              fontSize: layout.dateRibbonStyle === "banner" ? "36px" : "40px",
              fontWeight: 800,
              letterSpacing: "0.01em",
              textTransform: layout.dateRibbonStyle === "banner" ? "uppercase" : "none",
            },
            children: input.dateTime,
          },
        },

        {
          type: "div",
          props: {
            style: {
              position: "relative",
              zIndex: 1,
              marginTop: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: layout.detailAlign === "left" ? "flex-start" : "center",
              textAlign: layout.detailAlign,
              gap: detailLineGap,
              padding: "0 20px",
            },
            children: [
              detailsRow(
                "Location",
                input.location || "TBD",
                style.accent2,
                layout.detailLabelFont,
                layout.detailValueFont
              ),
              input.dressCode
                ? detailsRow(
                    "Dress Code",
                    input.dressCode,
                    style.accent,
                    layout.detailLabelFont,
                    layout.detailValueFont
                  )
                : null,
              input.note
                ? detailsRow(
                    "Note",
                    input.note,
                    style.accent,
                    layout.detailLabelFont,
                    layout.detailValueFont
                  )
                : null,
              description
                ? {
                    type: "div",
                    props: {
                      style: {
                        marginTop: "8px",
                        fontFamily: "Script",
                        fontSize: "34px",
                        lineHeight: 1.22,
                        maxWidth: "940px",
                        opacity: 0.96,
                      },
                      children: description,
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },

        {
          type: "div",
          props: {
            style: {
              position: "relative",
              zIndex: 1,
              marginTop: "18px",
              textAlign: layout.detailAlign,
              fontFamily: layout.closingFont,
              fontSize: `${layout.closingSize}px`,
              fontStyle: "italic",
              fontWeight: 400,
              color: style.accent,
            },
            children: "Let's celebrate together!",
          },
        },
      ],
    },
  } as any;

  const svg = await satori(tree, {
    width,
    height,
    fonts,
  });

  const Resvg = await getResvgCtor();
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
  return resvg.render().asPng();
}

export async function renderFlyerPDF(png: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([1080, 1350]);
  const img = await pdf.embedPng(png);
  page.drawImage(img, { x: 0, y: 0, width: 1080, height: 1350 });
  return await pdf.save();
}

