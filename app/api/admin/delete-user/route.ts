import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, isAllowedOrigin } from "@/lib/security/request";

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  // 1) must be signed in
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`delete-user:${auth.user.id}:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  // 2) parse body
  const body = await req.json().catch(() => null);
  const targetUserId = String(body?.userId ?? "").trim();
  if (!targetUserId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // 3) nobody can delete themselves
  if (targetUserId === auth.user.id) {
    return NextResponse.json({ error: "You cannot delete yourself." }, { status: 400 });
  }

  // 4) load my profile to ensure I'm admin
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
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  // 5) find target profile role
  const target = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", targetUserId)
    .maybeSingle();

  if (target.error) {
    return NextResponse.json({ error: target.error.message }, { status: 500 });
  }
  if (!target.data) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const targetRole = String(target.data.role ?? "").toLowerCase().trim();

  // 6) super admin check (ONLY this email can delete admins)
  const superEmail = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const myEmail = (auth.user.email ?? "").trim().toLowerCase();
  const isSuperAdmin = !!superEmail && myEmail === superEmail;

  if (targetRole === "admin" && !isSuperAdmin) {
    return NextResponse.json(
      { error: "Only the Super Admin can delete other admins." },
      { status: 403 }
    );
  }

  // 7) IMPORTANT: delete dependent rows first (so no FK errors)
  // Adjust table names if yours differ.
  // These are safe deletes even if row doesn't exist.

  // remove their dish picks
  await admin.from("event_dish_picks").delete().eq("user_id", targetUserId);

  // remove their RSVPs
  await admin.from("rsvps").delete().eq("user_id", targetUserId);

  // remove attendance overrides
  await admin.from("attendance").delete().eq("user_id", targetUserId);

  // remove ownership rows (if deleting an admin)
  await admin.from("event_owners").delete().eq("admin_id", targetUserId);

  // remove their profile
  const delProfile = await admin.from("profiles").delete().eq("id", targetUserId);
  if (delProfile.error) {
    return NextResponse.json({ error: delProfile.error.message }, { status: 500 });
  }

  // 8) delete their auth account (THIS is what lets them re-signup cleanly)
  const delAuth = await admin.auth.admin.deleteUser(targetUserId);
  if (delAuth.error) {
    // profile is already deleted; return a clear message
    return NextResponse.json(
      { error: `Profile removed, but auth delete failed: ${delAuth.error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
