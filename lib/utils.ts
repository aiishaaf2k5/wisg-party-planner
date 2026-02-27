export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function getEventFlyerSrc(event: {
  flyer_url?: string | null;
  flyer_png_path?: string | null;
  flyer_path?: string | null;
  flyer_pdf_path?: string | null;
  flyer_template?: string | null;
}): string | null {
  const directUrl = (event.flyer_url ?? "").trim();
  if (directUrl) return directUrl;

  const pathCandidate =
    (event.flyer_png_path ?? "").trim() ||
    (event.flyer_path ?? "").trim() ||
    (event.flyer_pdf_path ?? "").trim();

  if (pathCandidate.startsWith("http://") || pathCandidate.startsWith("https://")) {
    return pathCandidate;
  }

  const path = pathCandidate;
  const isPdf = path.toLowerCase().endsWith(".pdf");
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");

  if (path && !isPdf && base) {
    const safePath = path
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    return `${base}/storage/v1/object/public/flyers/${safePath}`;
  }

  return null;
}
