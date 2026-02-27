export type FlyerTemplateKey = "elegant" | "fun" | "minimal" | "desi" | "ramadan";

export type FlyerInput = {
  template: FlyerTemplateKey;
  presetId?: string;
  theme: string;
  dateTime: string;
  location: string;
  dressCode?: string;
  note?: string;
  description?: string;
  tagline?: string;
  palette?: string[];
};

export function templateDefaults(t: FlyerTemplateKey) {
  switch (t) {
    case "fun":
      return { bg: "#0B1020", accent: "#FF4D8D", text: "#F8FAFC" };
    case "minimal":
      return { bg: "#FFFFFF", accent: "#111827", text: "#111827" };
    case "desi":
      return { bg: "#0F172A", accent: "#F59E0B", text: "#F8FAFC" };
    case "ramadan":
      return { bg: "#031B16", accent: "#34D399", text: "#ECFDF5" };
    case "elegant":
    default:
      return { bg: "#111827", accent: "#A78BFA", text: "#F9FAFB" };
  }
}
