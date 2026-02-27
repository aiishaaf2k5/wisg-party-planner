import { FlyerTemplateKey } from "./templates";

export type ProFlyerPreset = {
  id: string;
  label: string;
  subtitle: string;
  assetFile: string;
  template: FlyerTemplateKey;
  mode: "classic";
  palette: [string, string, string];
  keywords: string[];
};

function p(
  id: string,
  label: string,
  subtitle: string,
  assetFile: string,
  template: FlyerTemplateKey,
  palette: [string, string, string],
  keywords: string[]
): ProFlyerPreset {
  return { id, label, subtitle, assetFile, template, mode: "classic", palette, keywords };
}

export const PRO_FLYER_PRESETS: ProFlyerPreset[] = [
  p(
    "eid-lantern-gold",
    "Eid Lantern Gold",
    "Crescent + lantern + beige floor pattern",
    "eid-lantern-gold (2).png",
    "ramadan",
    ["#F1E1C9", "#D5BC98", "#0A3A8A"],
    ["eid", "ramadan", "iftar", "moon", "lantern"]
  ),
  p(
    "pink-brunch-bouquet",
    "Pink Brunch Bouquet",
    "Torn pink panel + bouquet side composition",
    "pink-brunch-bouquet.png",
    "fun",
    ["#F9C3D6", "#E989AF", "#FFFFFF"],
    ["mothers day", "brunch", "pink", "bouquet", "flowers"]
  ),
  p(
    "blue-floral-side-card",
    "Blue Floral Side Card",
    "White card with large blue floral side",
    "blue-floral.png",
    "minimal",
    ["#F6F8FB", "#DCE8F7", "#1C3D6E"],
    ["bridal", "shower", "blue", "floral", "card"]
  ),
  p(
    "red-gold-luxe",
    "Red Gold Luxe",
    "Red velvet style with gold floral corners",
    "red-gold-flower.png",
    "elegant",
    ["#7E0E1E", "#5A0814", "#E4BD67"],
    ["save the date", "red", "gold", "luxury", "wedding"]
  ),
  p(
    "marble-geo-leaf",
    "Marble Geo Leaf",
    "Marble background + gold geo frame + leaf cluster",
    "marble-green-white-floral.png",
    "minimal",
    ["#F1EFEB", "#D9D4CD", "#CDA64E"],
    ["marble", "geometric", "leaf", "minimal"]
  ),
  p(
    "golden-floral-save-date",
    "Golden Floral",
    "Soft cream base with yellow floral corners",
    "light-yellow-floral.png",
    "minimal",
    ["#F3EBC7", "#E2CF8E", "#A58A3A"],
    ["save the date", "gold", "yellow", "floral"]
  ),
  p(
    "teal-mandala-invite",
    "Teal Mandala Invite",
    "Dark teal invitation with ornate mandala top",
    "nacy-blue-golden-floral.png",
    "desi",
    ["#063E3F", "#032D2E", "#E2C673"],
    ["mandala", "teal", "indian", "desi", "wedding", "invite"]
  ),
  p(
    "mint-vintage-floral",
    "Mint Vintage Floral",
    "Vintage mint floral all-over pattern",
    "pastel-green-floral.png",
    "fun",
    ["#CAE1C8", "#9DBA98", "#2D5C35"],
    ["mint", "vintage", "floral", "wedding", "spring"]
  ),
  p(
    "blue-arch-floral",
    "Blue Arch Floral",
    "Sky blue floral with central white arch",
    "cyan-white-floral.png",
    "minimal",
    ["#D6EEFF", "#B5DDF6", "#2C5E97"],
    ["blue", "arch", "floral", "save the date"]
  ),
  p(
    "ruby-ornate-invitation",
    "Ruby Ornate Invitation",
    "Dark ruby patterned columns + center panel",
    "red-floral-gold.png",
    "elegant",
    ["#8E001A", "#680013", "#E0BE5F"],
    ["ruby", "ornate", "invitation", "classic", "wedding"]
  ),
  p(
    "aqua-watercolor-gold",
    "Aqua Watercolor Gold",
    "Aqua watercolor wash with delicate gold lines",
    "blue-green.png",
    "minimal",
    ["#D2F7FA", "#9DEAF0", "#D9BA63"],
    ["aqua", "watercolor", "gold", "menu", "coastal"]
  ),
  p(
    "lilac-hex-floral",
    "Lilac Hex Floral",
    "Soft lilac card with geometric gold hex frame",
    "purple-floral.png",
    "minimal",
    ["#EADCF3", "#D3BFE6", "#B89445"],
    ["lilac", "purple", "hex", "floral"]
  ),
];

export function pickProPreset(theme: string, dressCode?: string, note?: string) {
  const hay = `${theme} ${dressCode ?? ""} ${note ?? ""}`.toLowerCase();
  let best = PRO_FLYER_PRESETS[0];
  let bestScore = -1;

  for (const preset of PRO_FLYER_PRESETS) {
    const score = preset.keywords.reduce((acc, kw) => (hay.includes(kw) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      best = preset;
      bestScore = score;
    }
  }

  return best;
}
