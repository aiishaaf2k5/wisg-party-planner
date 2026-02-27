import crypto from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function GET() {
  // Safety: only allow in development.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  // Safety: only signed-in admins can call this.
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

  if (me?.role !== "admin" || me?.is_banned) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const key = (process.env.OPENAI_API_KEY ?? "").trim();
  const hasKey = key.length > 0;
  const prefix = hasKey ? `${key.slice(0, 7)}...` : null;
  const fingerprint = hasKey ? sha256(key).slice(0, 12) : null;

  return NextResponse.json({
    ok: true,
    nodeEnv: process.env.NODE_ENV,
    hasKey,
    keyPrefix: prefix,
    keyLength: key.length,
    keyFingerprint: fingerprint,
  });
}
