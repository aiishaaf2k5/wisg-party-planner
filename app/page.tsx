import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import EventCard from "@/components/EventCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const email = (auth.user.email ?? "").toLowerCase().trim();
  const superEmail = (process.env.SUPER_ADMIN_EMAIL ?? "").toLowerCase().trim();
  const canInvite = !!superEmail && email === superEmail;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!profile?.full_name) redirect("/onboarding");

  const nowIso = new Date().toISOString();

  let eventsQuery = supabase
    .from("events")
    .select("*")
    .gte("starts_at", nowIso)
     .or("is_archived.is.null,is_archived.eq.false")
    .order("starts_at", { ascending: true });

  if (profile.role !== "admin") {
    eventsQuery = eventsQuery.eq("is_published", true);
  }

  const { data: events } = await eventsQuery;
  let eventRows = events ?? [];

  // RLS fallback: if member sees no published events, fetch published events via admin client.
  if (profile.role !== "admin" && eventRows.length === 0) {
    const admin = createSupabaseAdmin();
    const { data: fallbackEvents } = await admin
      .from("events")
      .select("*")
      .gte("starts_at", nowIso)
      .eq("is_published", true)
      .or("is_archived.is.null,is_archived.eq.false")
      .order("starts_at", { ascending: true });
    eventRows = (fallbackEvents ?? []) as any[];
  }
  const eventIds = eventRows.map((e: any) => e.id);

  const rsvpCountMap = new Map<string, number>();

  if (eventIds.length > 0) {
    const { data: yesRows, error } = await supabase
      .from("rsvps")
      .select("event_id, status, attending")
      .in("event_id", eventIds)
      .or("status.eq.yes,attending.eq.true");

    if (!error) {
      for (const row of yesRows ?? []) {
        rsvpCountMap.set(row.event_id, (rsvpCountMap.get(row.event_id) ?? 0) + 1);
      }
    }
  }

  const hostingSet = new Set<string>();
  if (profile.role === "admin" && eventIds.length > 0) {
    const { data: owned } = await supabase
      .from("event_owners")
      .select("event_id")
      .eq("admin_id", profile.id)
      .in("event_id", eventIds);

    (owned ?? []).forEach((r: any) => hostingSet.add(r.event_id));
  }

  const firstName = profile.full_name.split(" ")[0];
  const isAdmin = profile.role === "admin";

  return (
    <div className="relative min-h-screen overflow-hidden pb-16 pt-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="hero-orb hero-orb-a" />
        <div className="hero-orb hero-orb-b" />
        <div className="hero-orb hero-orb-c" />
        <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,244,250,0.9)_0%,rgba(255,233,245,0.88)_45%,rgba(255,241,248,0.9)_100%)]" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-5 md:px-8">
        <section className="animate-rise-in rounded-[2rem] border border-white/80 bg-white/80 p-7 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)] backdrop-blur-xl md:p-10">
          <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-center md:justify-start md:gap-4 md:text-left">
            <div className="min-w-0 md:flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-600">
                {isAdmin ? "Admin Hub" : "Member Home"}
              </p>
              <h1 className="mt-3 text-5xl font-semibold tracking-tight text-pink-700 md:text-6xl" style={{ fontFamily: "\"Palatino Linotype\", \"Book Antiqua\", Georgia, serif", fontStyle: "italic" }}>
                Welcome, {firstName} <span aria-hidden>&hearts;</span>
              </h1>
              <p className="mt-3 max-w-2xl text-xl font-semibold text-rose-700 md:text-2xl">
                Ready for our next gathering?
              </p>
            </div>
            <div className="relative h-36 w-36 shrink-0 overflow-hidden bg-transparent md:-ml-28 md:h-40 md:w-40">
              <Image
                src="/wisg-logo.png"
                alt="IWSG logo"
                fill
                className="object-contain mix-blend-multiply"
                priority
              />
            </div>
          </div>

          <div className="mt-7 h-px w-full bg-gradient-to-r from-pink-200/80 via-rose-200/80 to-fuchsia-200/80" />

          <div className="mt-6" />
        </section>

        {isAdmin && (
          <section className="animate-rise-in rounded-[2rem] border border-rose-100 bg-white/88 p-7 shadow-[0_22px_70px_-46px_rgba(225,29,72,0.55)] backdrop-blur-sm md:p-8 [animation-delay:100ms]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">Admin Actions</h2>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                Admin only
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Link
                href="/admin/events/new"
                className="group rounded-2xl border border-pink-300 bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500 p-5 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Launch</p>
                <p className="mt-2 text-xl font-bold">Create New Event</p>
                <p className="mt-1 text-sm text-white/85">Start a fresh event with details, owners, and flyer setup.</p>
              </Link>

              <Link
                href="/admin/events"
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Control</p>
                <p className="mt-2 text-xl font-bold text-slate-900">Manage Events</p>
                <p className="mt-1 text-sm text-slate-600">Edit, publish, archive, and review RSVP progress.</p>
              </Link>

              {canInvite && (
                <Link
                  href="/admin/invite"
                  className="group rounded-2xl border border-pink-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-pink-300 hover:shadow-lg"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pink-600">Access</p>
                  <p className="mt-2 text-xl font-bold text-pink-900">Create Invite Link</p>
                  <p className="mt-1 text-sm text-pink-700">Generate private admin invite links securely.</p>
                </Link>
              )}
            </div>
          </section>
        )}

        <section className="animate-rise-in [animation-delay:180ms]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Calendar</p>
              <h2 className="mt-1 text-3xl font-bold text-gray-900 md:text-4xl">Upcoming Events</h2>
            </div>
            <div className="rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-semibold text-gray-700 backdrop-blur">
              {eventRows.length} scheduled
            </div>
          </div>

          {eventRows.length === 0 ? (
            <div className="rounded-3xl border border-white/80 bg-white/80 px-6 py-12 text-center shadow-sm backdrop-blur">
              <p className="text-2xl font-bold text-gray-900">No upcoming events yet</p>
              <p className="mt-2 text-base text-gray-600">Check back soon for the next community gathering.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
              {eventRows.map((event: any, idx: number) => (
                <div
                  key={event.id}
                  className="animate-rise-in"
                  style={{ animationDelay: `${260 + idx * 90}ms`, animationFillMode: "both" }}
                >
                  <EventCard
                    event={event}
                    rsvpCount={rsvpCountMap.get(event.id) ?? 0}
                    isHosting={hostingSet.has(event.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}













