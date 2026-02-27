import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isAllowedOrigin } from "@/lib/security/request";

async function removeAllFromPrefix(
  admin: ReturnType<typeof createSupabaseAdmin>,
  bucket: string,
  prefix: string
) {
  let offset = 0;
  const limit = 100;

  for (;;) {
    const list = await admin.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (list.error) return list.error.message;
    const items = list.data ?? [];
    if (items.length === 0) return null;

    const paths = items
      .filter((i: any) => !!i.name)
      .map((i: any) => `${prefix}/${i.name}`);

    if (paths.length > 0) {
      const del = await admin.storage.from(bucket).remove(paths);
      if (del.error) return del.error.message;
    }

    if (items.length < limit) return null;
    offset += limit;
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAllowedOrigin(req)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const { id: eventId } = await params;
    if (!eventId) {
      return NextResponse.json({ error: "Missing event id." }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Only event owners can delete this event." }, { status: 403 });
    }

    const { data: ev, error: evErr } = await admin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();

    if (evErr) {
      return NextResponse.json({ error: evErr.message }, { status: 500 });
    }
    if (!ev?.id) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    // Remove dependent rows first to avoid FK blocks on events delete.
    await admin.from("event_dish_picks").delete().eq("event_id", eventId);
    await admin.from("event_dish_options").delete().eq("event_id", eventId);
    await admin.from("rsvps").delete().eq("event_id", eventId);
    await admin.from("attendance").delete().eq("event_id", eventId);
    await admin.from("attendance_final").delete().eq("event_id", eventId);
    await admin.from("dish_signups").delete().eq("event_id", eventId);
    await admin.from("event_owners").delete().eq("event_id", eventId);

    // Clean gallery storage + rows.
    const galleryRows = await admin
      .from("gallery_photos")
      .select("storage_path")
      .eq("event_id", eventId);

    const galleryPaths = (galleryRows.data ?? [])
      .map((r: any) => String(r.storage_path ?? "").trim())
      .filter(Boolean);

    if (galleryPaths.length > 0) {
      await admin.storage.from("gallery").remove(galleryPaths);
    }
    await admin.from("gallery_photos").delete().eq("event_id", eventId);

    // Remove flyer assets created by both old and new paths.
    await removeAllFromPrefix(admin, "flyers", `events/${eventId}`);
    await removeAllFromPrefix(admin, "flyers", `event-${eventId}`);

    const delEvent = await admin.from("events").delete().eq("id", eventId);
    if (delEvent.error) {
      return NextResponse.json({ error: delEvent.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
