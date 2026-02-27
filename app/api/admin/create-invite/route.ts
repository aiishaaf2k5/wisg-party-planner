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
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  // 1) Signed in?
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`create-invite:${auth.user.id}:${ip}`, 8, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  // 2) Super admin email check
  const superEmail = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const myEmail = (auth.user.email ?? "").trim().toLowerCase();

  if (!superEmail) {
    return NextResponse.json(
      { error: "Server misconfigured: SUPER_ADMIN_EMAIL not set" },
      { status: 500 }
    );
  }

  if (!myEmail || myEmail !== superEmail) {
    return NextResponse.json(
      { error: "Only the Super Admin can create admin invites." },
      { status: 403 }
    );
  }

  // 3) Also require role=admin in DB (extra safety)
  const admin = createSupabaseAdmin();

  const me = await admin
    .from("profiles")
    .select("id, role, is_banned")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (me.error) {
    return NextResponse.json({ error: me.error.message }, { status: 500 });
  }

  if (me.data?.role !== "admin" || me.data?.is_banned) {
    return NextResponse.json(
      { error: "You must be an active admin to create invites." },
      { status: 403 }
    );
  }

  // 4) Create token
  const token = crypto.randomBytes(24).toString("hex");
  const token_hash = sha256(token);

  // Expires in 7 days
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const ins = await admin
    .from("admin_invites")
    .insert({
      token_hash,
      created_by: auth.user.id,
      expires_at,
    })
    .select("id")
    .single();

  if (ins.error) {
    return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }

  // 5) Build invite URL
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  )
    .trim()
    .replace(/\/$/, "");

  const inviteUrl = `${base}/admin-invite?token=${token}`;

  // Return both keys for UI compatibility.
  return NextResponse.json({ url: inviteUrl, inviteUrl });
}
