import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import AdminAttendanceControls from "@/components/AdminAttendanceControls";

export const dynamic = "force-dynamic";

export default async function AdminEventRSVPsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role, is_banned")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!me || me.role !== "admin" || me.is_banned) redirect("/");

  // must be owner for this event
  const { data: owner } = await supabase
    .from("event_owners")
    .select("admin_id")
    .eq("event_id", id)
    .eq("admin_id", auth.user.id)
    .maybeSingle();

  if (!owner) redirect("/admin/events");

  const { data: ev } = await supabase
    .from("events")
    .select("id, theme, starts_at")
    .eq("id", id)
    .maybeSingle();

  if (!ev) redirect("/admin/events");

  // RSVPs
  const { data: rsvpRows } = await supabase
    .from("rsvps")
    .select("user_id, status, attending, profiles:profiles(full_name)")
    .eq("event_id", id);

  // Attendance overrides
  const { data: attRows } = await supabase
    .from("attendance")
    .select("user_id, status")
    .eq("event_id", id);

  const overrideMap = new Map<string, "attended" | "no_show">();
  (attRows ?? []).forEach((r: any) => {
    if (r?.status === "attended" || r?.status === "no_show") {
      overrideMap.set(r.user_id, r.status);
    }
  });

  const rows = (rsvpRows ?? []).map((r: any) => {
    const s =
      typeof r.status === "string"
        ? r.status
        : typeof r.attending === "boolean"
        ? r.attending
          ? "yes"
          : "no"
        : "unknown";

    return {
      user_id: r.user_id,
      name: r?.profiles?.full_name ?? "Member",
      rsvp_status: s as "yes" | "no" | "unknown",
      attendance_override: overrideMap.get(r.user_id) ?? null,
    };
  });

  const isPast = new Date(ev.starts_at).getTime() < Date.now();

  return (
    <div className="relative min-h-screen overflow-hidden pb-16 pt-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="hero-orb hero-orb-a" />
        <div className="hero-orb hero-orb-b" />
        <div className="hero-orb hero-orb-c" />
        <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,247,252,0.92)_0%,rgba(255,237,247,0.9)_48%,rgba(255,244,250,0.92)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-7 px-5 md:px-8">
        <div className="animate-rise-in flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-white/90 px-7 py-3.5 text-base font-semibold text-pink-700 transition hover:-translate-y-0.5 hover:bg-pink-50"
          >
            <span aria-hidden>&larr;</span>
            Back to Manage Events
          </Link>

          <div className="rounded-full border border-pink-200 bg-white/90 px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] text-pink-700">
            {isPast ? "Past Event" : "Upcoming Event"}
          </div>
        </div>

        <section className="animate-rise-in rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_30px_80px_-45px_rgba(190,24,93,0.45)] backdrop-blur-xl md:p-10 [animation-delay:60ms]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">RSVP Operations</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">
            RSVPs for {ev.theme ?? "Event"}
          </h1>
        </section>

        {rows.length === 0 ? (
          <div className="animate-rise-in rounded-3xl border border-pink-100 bg-white/88 p-10 text-center text-gray-600 shadow-sm backdrop-blur [animation-delay:120ms]">
            No RSVP responses yet.
          </div>
        ) : (
          <section className="animate-rise-in [animation-delay:120ms]">
            <AdminAttendanceControls eventId={id} rows={rows as any} />
          </section>
        )}
      </div>
    </div>
  );
}
