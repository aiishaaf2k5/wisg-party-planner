function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, "").toLowerCase();
}

export function getClientIp(req: Request): string {
  const xff = (req.headers.get("x-forwarded-for") ?? "").trim();
  if (xff) return xff.split(",")[0]?.trim() || "unknown";

  const xrip = (req.headers.get("x-real-ip") ?? "").trim();
  if (xrip) return xrip;

  return "unknown";
}

export function isAllowedOrigin(req: Request): boolean {
  const origin = (req.headers.get("origin") ?? "").trim();
  if (!origin) return true;

  const allowed = new Set<string>();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (siteUrl) allowed.add(normalizeOrigin(siteUrl));
  if (appUrl) allowed.add(normalizeOrigin(appUrl));

  const host = (req.headers.get("host") ?? "").trim();
  if (host) {
    allowed.add(normalizeOrigin(`https://${host}`));
    if (host.startsWith("localhost:") || host.startsWith("127.0.0.1:")) {
      allowed.add(normalizeOrigin(`http://${host}`));
    }
  }

  return allowed.has(normalizeOrigin(origin));
}
