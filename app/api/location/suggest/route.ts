import { NextResponse } from "next/server";

type NominatimRow = {
  display_name?: string;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    if (q.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const endpoint = new URL("https://nominatim.openstreetmap.org/search");
    endpoint.searchParams.set("q", q);
    endpoint.searchParams.set("format", "jsonv2");
    endpoint.searchParams.set("addressdetails", "0");
    endpoint.searchParams.set("limit", "6");
    endpoint.searchParams.set("countrycodes", "ca");

    const res = await fetch(endpoint.toString(), {
      headers: {
        // Nominatim asks for identifiable app user-agent.
        "User-Agent": "wisg-party-planner/1.0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const rows = (await res.json()) as NominatimRow[];
    const labels = Array.isArray(rows)
      ? rows
          .map((r) => (r.display_name ?? "").trim())
          .filter(Boolean)
      : [];

    return NextResponse.json({
      results: labels.map((label) => ({ label })),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
