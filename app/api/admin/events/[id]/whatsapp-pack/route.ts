import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const { data: me } = await supabase
      .from("profiles")
      .select("id, role, is_banned")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (!me || me.role !== "admin" || me.is_banned) {
      return NextResponse.json({ error: "Admins only." }, { status: 403 });
    }

    const { data: event, error } = await supabase
      .from("events")
      .select("id, theme, starts_at, location_text, dress_code, note")
      .eq("id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    const when = formatWhen(event.starts_at);
    const location = (event.location_text ?? "TBA").trim();
    const dressCode = (event.dress_code ?? "").trim();
    const note = (event.note ?? "").trim();

    const invite = [
      `Assalamualaikum everyone!`,
      `You're invited to *${event.theme}*`,
      `Date/Time: ${when}`,
      `Location: ${location}`,
      dressCode ? `Dress code: ${dressCode}` : null,
      note ? `Note: ${note}` : null,
      `Please RSVP in the app when you can.`,
    ]
      .filter(Boolean)
      .join("\n");

    const reminder = [
      `Friendly reminder for *${event.theme}* tomorrow!`,
      `Time: ${when}`,
      `Location: ${location}`,
      dressCode ? `Dress code: ${dressCode}` : null,
      `If you haven't RSVP'd yet, please do it in the app.`,
    ]
      .filter(Boolean)
      .join("\n");

    return NextResponse.json({
      ok: true,
      event: {
        id: event.id,
        theme: event.theme,
      },
      messages: {
        invite,
        reminder,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
