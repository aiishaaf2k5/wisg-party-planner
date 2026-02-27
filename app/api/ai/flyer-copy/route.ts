import { NextResponse } from "next/server";
import { z } from "zod";
import { generateFlyerCopy } from "@/lib/openai";
import { generateLocalFlyerCopy } from "@/lib/flyer/local-copy";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, isAllowedOrigin } from "@/lib/security/request";

const Schema = z.object({
  theme: z.string().min(2),
  dressCode: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    if (!isAllowedOrigin(req)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const supabase = await createSupabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    const { data: me } = await admin
      .from("profiles")
      .select("role, is_banned")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (!me || me.role !== "admin" || me.is_banned) {
      return NextResponse.json({ error: "Admins only." }, { status: 403 });
    }

    const ip = getClientIp(req);
    const rl = checkRateLimit(`ai-copy:${auth.user.id}:${ip}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = Schema.parse(await req.json());
    try {
      const result = await generateFlyerCopy(body);
      return NextResponse.json(result);
    } catch {
      // No billing / quota issues should still return usable copy.
      const local = generateLocalFlyerCopy(body);
      return NextResponse.json(local);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error" }, { status: 400 });
  }
}
