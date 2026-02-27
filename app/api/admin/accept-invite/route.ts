import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, isAllowedOrigin } from "@/lib/security/request";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    if (!isAllowedOrigin(req)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as { token?: string };
    const token = (body.token ?? "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing token." }, { status: 400 });
    }

    // Must be signed in: invite upgrades the current logged-in user.
    const supabase = await createSupabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rl = checkRateLimit(`accept-invite:${auth.user.id}:${ip}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const admin = createSupabaseAdmin();
    const token_hash = sha256(token);

    // Atomic one-time consume. If two requests race, only one can delete.
    const { data: consumedInvite, error: consumeErr } = await admin
      .from("admin_invites")
      .delete()
      .eq("token_hash", token_hash)
      .gt("expires_at", new Date().toISOString())
      .select("id")
      .maybeSingle();

    if (consumeErr) {
      return NextResponse.json({ error: consumeErr.message }, { status: 500 });
    }

    if (!consumedInvite) {
      return NextResponse.json({ error: "Invalid or expired invite link." }, { status: 400 });
    }

    const { error: upErr } = await admin
      .from("profiles")
      .upsert(
        {
          id: auth.user.id,
          email: auth.user.email ?? null,
          role: "admin",
          is_banned: false,
        },
        { onConflict: "id" }
      );

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
