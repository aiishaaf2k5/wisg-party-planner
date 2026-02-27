import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ ok: true, can: false });
  }

  const superEmail = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const myEmail = (auth.user.email ?? "").trim().toLowerCase();

  // If SUPER_ADMIN_EMAIL not set, safest is: nobody can create
  if (!superEmail) {
    return NextResponse.json({ ok: true, can: false });
  }

  // Must match super admin email
  if (myEmail !== superEmail) {
    return NextResponse.json({ ok: true, can: false });
  }

  // Extra: must also be role=admin in DB
  const admin = createSupabaseAdmin();
  const me = await admin
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (me.error) return NextResponse.json({ ok: true, can: false });

  const can = me.data?.role === "admin";
  return NextResponse.json({ ok: true, can });
}
