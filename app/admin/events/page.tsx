import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getEventFlyerSrc } from "@/lib/utils";
import AdminDeleteEventButton from "@/components/AdminDeleteEventButton";

export default async function AdminEventsPage() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role, full_name, is_banned")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!me?.full_name) redirect("/onboarding");
  if (me.role !== "admin" || me.is_banned) redirect("/");

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: false });

  const rows = events ?? [];
  const nowMs = Date.now();
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
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-white/90 px-7 py-3.5 text-base font-semibold text-pink-700 transition hover:-translate-y-0.5 hover:bg-pink-50"
          >
            <span aria-hidden>&larr;</span>
            Back to Home
          </Link>

          <Link
            href="/admin/events/new"
            className="inline-flex items-center gap-2 rounded-full bg-[#ff4fa3] px-7 py-3.5 text-base font-semibold text-white shadow-[0_14px_34px_-18px_rgba(255,79,163,0.78)] transition hover:-translate-y-0.5 hover:opacity-95"
          >
            <span aria-hidden>+</span>
            New Event
          </Link>
        </div>

        <section className="animate-rise-in rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_30px_80px_-45px_rgba(190,24,93,0.45)] backdrop-blur-xl md:p-10 [animation-delay:60ms]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">Admin Console</p>
          <h1 className="mt-2 inline-flex items-center gap-3 text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-pink-200 bg-pink-50 text-pink-700 md:h-11 md:w-11">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            Manage Events
          </h1>
          <p className="mt-3 max-w-2xl text-base text-gray-600 md:text-lg">
            Review, edit, publish, and organize every event from one professional control center.
          </p>


        </section>

        {rows.length === 0 ? (
          <div className="animate-rise-in rounded-3xl border border-pink-100 bg-white/88 p-10 text-center text-gray-600 shadow-sm backdrop-blur [animation-delay:110ms]">
            No events yet.
          </div>
        ) : (
          <div className="grid gap-5">
            {rows.map((e: any, idx: number) => {
              const flyerSrc = getEventFlyerSrc(e as any);
              const eventMs = new Date(e.starts_at).getTime();
              const isUpcoming = !Number.isNaN(eventMs) && eventMs >= nowMs;
              return (
                <article
                  key={e.id}
                  className="animate-rise-in rounded-3xl border border-pink-100 bg-white/90 p-5 shadow-sm backdrop-blur md:p-6"
                  style={{ animationDelay: `${120 + idx * 55}ms`, animationFillMode: "both" }}
                >
                  <div className="flex flex-wrap items-start gap-5">
                    <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-pink-100 bg-pink-50 md:h-28 md:w-44">
                      {flyerSrc ? (
                        <Image
                          src={flyerSrc}
                          alt={`${e.theme ?? "Event"} flyer`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs font-semibold uppercase tracking-[0.12em] text-pink-600">
                          No Flyer
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="truncate text-2xl font-semibold text-gray-900">{e.theme ?? "Untitled Event"}</h2>
                          <p className="mt-1 text-sm text-gray-600">{new Date(e.starts_at).toLocaleString()}</p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.08em]">
                            <span
                              className={[
                                "rounded-full border px-3 py-1",
                                isUpcoming
                                  ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                                  : "border-slate-200 bg-slate-50 text-slate-700",
                              ].join(" ")}
                            >
                              {isUpcoming ? "Upcoming" : "Past"}
                            </span>

                            {e.is_archived && (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                                Archived
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2.5">
                        <Link
                          href={`/events/${e.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-pink-50"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" stroke="currentColor" strokeWidth="2" />
                            <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          View
                        </Link>

                        <Link
                          href={`/admin/events/${e.id}/edit`}
                          className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-pink-50"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 6l4 4" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          Edit
                        </Link>

                        <Link
                          href={`/admin/events/${e.id}/rsvps`}
                          className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-pink-50"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11Z" stroke="currentColor" strokeWidth="2" />
                            <path d="M8 11c1.657 0 3-1.567 3-3.5S9.657 4 8 4 5 5.567 5 7.5 6.343 11 8 11Z" stroke="currentColor" strokeWidth="2" />
                            <path d="M4 20c1.2-3.4 14.8-3.4 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          RSVPs
                        </Link>

                        <AdminDeleteEventButton
                          eventId={e.id}
                          eventTitle={e.theme}
                          className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

