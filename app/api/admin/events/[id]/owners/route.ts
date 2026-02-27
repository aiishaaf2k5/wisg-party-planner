import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isAllowedOrigin } from "@/lib/security/request";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAllowedOrigin(req)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const { id: eventId } = await params;

    const supabase = await createSupabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const admin = createSupabaseAdmin();

    const { data: me, error: meErr } = await admin
      .from("profiles")
      .select("role, is_banned")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (meErr) {
      return NextResponse.json({ error: meErr.message }, { status: 500 });
    }
    if (me?.role !== "admin" || me?.is_banned) {
      return NextResponse.json({ error: "Admins only." }, { status: 403 });
    }

    const { data: owner, error: ownerErr } = await admin
      .from("event_owners")
      .select("admin_id")
      .eq("event_id", eventId)
      .eq("admin_id", auth.user.id)
      .maybeSingle();

    if (ownerErr) {
      return NextResponse.json({ error: ownerErr.message }, { status: 500 });
    }
    if (!owner) {
      return NextResponse.json({ error: "Only event owners can change owners." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const rawOwnerIds = Array.isArray(body?.ownerIds) ? body.ownerIds : [];
    const ownerIds = Array.from(
      new Set(rawOwnerIds.map((v: unknown) => String(v ?? "").trim()).filter(Boolean))
    );

    if (ownerIds.length !== 2) {
      return NextResponse.json(
        { error: "Exactly two unique owner IDs are required." },
        { status: 400 }
      );
    }

    const notInOwnerIds = `("${ownerIds
      .map((id) => id.replace(/"/g, '\\"'))
      .join('","')}")`;

    const pruneOwners = await admin
      .from("event_owners")
      .delete()
      .eq("event_id", eventId)
      .not("admin_id", "in", notInOwnerIds);

    if (pruneOwners.error) {
      return NextResponse.json({ error: pruneOwners.error.message }, { status: 500 });
    }

    const upsertOwners = await admin.from("event_owners").upsert(
      ownerIds.map((adminId) => ({ event_id: eventId, admin_id: adminId })),
      { onConflict: "event_id,admin_id" }
    );

    if (upsertOwners.error) {
      return NextResponse.json({ error: upsertOwners.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
