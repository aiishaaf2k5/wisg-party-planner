import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isAllowedOrigin } from "@/lib/security/request";

function cleanPath(v: unknown) {
  return String(v ?? "").trim().replace(/^\/+/, "");
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
      return NextResponse.json({ error: "Only event owners can attach generated flyers." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const sourcePngPath = cleanPath(body?.pngPath);
    const sourcePdfPath = cleanPath(body?.pdfPath);
    const template = String(body?.template ?? "").trim();

    if (!sourcePngPath && !sourcePdfPath) {
      return NextResponse.json(
        { error: "Missing pngPath or pdfPath." },
        { status: 400 }
      );
    }

    const stamp = Date.now();
    let finalPngPath: string | null = null;
    let finalPdfPath: string | null = null;

    if (sourcePngPath) {
      finalPngPath = `events/${eventId}/${stamp}-ai-flyer.png`;
      const cp = await admin.storage
        .from("flyers")
        .copy(sourcePngPath, finalPngPath);
      if (cp.error) {
        return NextResponse.json({ error: cp.error.message }, { status: 500 });
      }
    }

    if (sourcePdfPath) {
      finalPdfPath = `events/${eventId}/${stamp}-ai-flyer.pdf`;
      const cp = await admin.storage
        .from("flyers")
        .copy(sourcePdfPath, finalPdfPath);
      if (cp.error) {
        return NextResponse.json({ error: cp.error.message }, { status: 500 });
      }
    }

    const upd = await admin
      .from("events")
      .update({
        ...(template ? { flyer_template: template } : {}),
        ...(finalPngPath ? { flyer_png_path: finalPngPath } : {}),
        ...(finalPdfPath ? { flyer_pdf_path: finalPdfPath } : {}),
      })
      .eq("id", eventId);

    if (upd.error) {
      return NextResponse.json({ error: upd.error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      flyer_png_path: finalPngPath,
      flyer_pdf_path: finalPdfPath,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
