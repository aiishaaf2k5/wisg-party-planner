import { NextResponse } from "next/server";
import { z } from "zod";
import { renderFlyerPNG, renderFlyerPDF } from "@/lib/flyer/render";
import { FlyerTemplateKey } from "@/lib/flyer/templates";
import { generateFlyerArtwork, generateFlyerCopy } from "@/lib/openai";
import { generateLocalFlyerCopy } from "@/lib/flyer/local-copy";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, isAllowedOrigin } from "@/lib/security/request";

const Schema = z.object({
  eventId: z.string().uuid().optional(),
  saveToEvent: z.boolean().optional().default(true),
  template: z.enum(["elegant", "fun", "minimal", "desi", "ramadan"]),
  presetId: z.string().optional(),
  mode: z.enum(["classic", "ai_poster"]).optional().default("classic"),
  theme: z.string().min(2),
  dateTime: z.string().min(2),
  location: z.string().optional().default(""),
  dressCode: z.string().optional(),
  note: z.string().optional(),
  description: z.string().optional(),
  tagline: z.string().optional(),
  palette: z.array(z.string()).optional(),
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

    const sb = createSupabaseAdmin();
    const { data: me } = await sb
      .from("profiles")
      .select("id, role, is_banned")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (!me || me.role !== "admin" || me.is_banned) {
      return NextResponse.json({ error: "Admins only." }, { status: 403 });
    }

    const ip = getClientIp(req);
    const rl = checkRateLimit(`ai-generate:${auth.user.id}:${ip}`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = Schema.parse(await req.json());
    if (body.saveToEvent && !body.eventId) {
      return NextResponse.json(
        { error: "eventId is required when saveToEvent is true." },
        { status: 400 }
      );
    }

    if (body.saveToEvent && body.eventId) {
      const { data: owner, error: ownerErr } = await sb
        .from("event_owners")
        .select("admin_id")
        .eq("event_id", body.eventId)
        .eq("admin_id", auth.user.id)
        .maybeSingle();

      if (ownerErr) {
        return NextResponse.json({ error: ownerErr.message }, { status: 500 });
      }
      if (!owner) {
        return NextResponse.json({ error: "Only event owners can save flyers." }, { status: 403 });
      }
    }

    let description = body.description;
    let tagline = body.tagline;
    let palette = body.palette;

    if (!description || !tagline || !palette?.length) {
      try {
        const copy = await generateFlyerCopy({
          theme: body.theme,
          dressCode: body.dressCode,
          note: body.note,
        });
        description = description || copy.description;
        tagline = tagline || copy.taglines?.[0];
        palette = palette?.length ? palette : copy.palette;
      } catch {
        const local = generateLocalFlyerCopy({
          theme: body.theme,
          dressCode: body.dressCode,
          note: body.note,
        });
        description = description || local.description;
        tagline = tagline || local.taglines?.[0];
        palette = palette?.length ? palette : local.palette;
      }
    }

    let png: Uint8Array;

    if (body.mode === "ai_poster") {
      try {
        png = await generateFlyerArtwork({
          theme: body.theme,
          dateTime: body.dateTime,
          location: body.location,
          dressCode: body.dressCode,
          note: body.note,
          description,
          tagline,
        });
      } catch {
        // Fallback to classic renderer if image generation fails.
        png = await renderFlyerPNG({
          template: body.template as FlyerTemplateKey,
          presetId: body.presetId,
          theme: body.theme,
          dateTime: body.dateTime,
          location: body.location ?? "",
          dressCode: body.dressCode,
          note: body.note,
          description,
          tagline,
          palette,
        });
      }
    } else {
      png = await renderFlyerPNG({
        template: body.template as FlyerTemplateKey,
        presetId: body.presetId,
        theme: body.theme,
        dateTime: body.dateTime,
        location: body.location ?? "",
        dressCode: body.dressCode,
        note: body.note,
        description,
        tagline,
        palette,
      });
    }

    const pdf = await renderFlyerPDF(png);

    const folder = body.saveToEvent
      ? `event-${body.eventId}`
      : `preview-${Date.now()}-${crypto.randomUUID()}`;
    const stamp = Date.now();

    // Use unique file names to avoid stale CDN/browser cache showing old flyers.
    const pngPath = `${folder}/${stamp}-flyer.png`;
    const pdfPath = `${folder}/${stamp}-flyer.pdf`;

    const up1 = await sb.storage.from("flyers").upload(pngPath, png, {
      contentType: "image/png",
      upsert: true,
    });
    if (up1.error) throw new Error(up1.error.message);

    const up2 = await sb.storage.from("flyers").upload(pdfPath, pdf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (up2.error) throw new Error(up2.error.message);

    const { data: pub1 } = sb.storage.from("flyers").getPublicUrl(pngPath);
    const { data: pub2 } = sb.storage.from("flyers").getPublicUrl(pdfPath);

    if (body.saveToEvent && body.eventId) {
      const upd = await sb
        .from("events")
        .update({
          flyer_template: body.template,
          flyer_png_path: pngPath,
          flyer_pdf_path: pdfPath,
        })
        .eq("id", body.eventId);

      if (upd.error) throw new Error(upd.error.message);
    }

    return NextResponse.json({
      preview: !body.saveToEvent,
      pngUrl: pub1.publicUrl,
      pdfUrl: pub2.publicUrl,
      pngPath,
      pdfPath,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error" }, { status: 400 });
  }
}
