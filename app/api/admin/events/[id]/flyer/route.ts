import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isAllowedOrigin } from "@/lib/security/request";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

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
      return NextResponse.json({ error: "Only event owners can update flyers." }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      return NextResponse.json(
        { error: "Only PNG/JPG/PDF files are allowed." },
        { status: 400 }
      );
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "File too large. Max 10MB." },
        { status: 400 }
      );
    }

    const ext = isPdf ? "pdf" : (file.name.split(".").pop() ?? "png");
    const cleanName = sanitizeFileName(file.name);
    const path = `events/${eventId}/${Date.now()}-${cleanName || `flyer.${ext}`}`;

    const bytes = Buffer.from(await file.arrayBuffer());

    const up = await admin.storage.from("flyers").upload(path, bytes, {
      contentType: file.type || (isPdf ? "application/pdf" : "image/png"),
      cacheControl: "3600",
      upsert: true,
    });

    if (up.error) {
      return NextResponse.json({ error: up.error.message }, { status: 500 });
    }

    const upd = await admin
      .from("events")
      .update({
        flyer_png_path: path,
        ...(isPdf ? {} : { flyer_pdf_path: null }),
      })
      .eq("id", eventId);

    if (upd.error) {
      return NextResponse.json({ error: upd.error.message }, { status: 500 });
    }

    const { data: pub } = admin.storage.from("flyers").getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      path,
      url: pub.publicUrl,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
