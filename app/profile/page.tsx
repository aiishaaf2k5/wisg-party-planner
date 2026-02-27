import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import ProfileNameEditor from "@/components/ProfileNameEditor";
import { getEventFlyerSrc } from "@/lib/utils";

export const dynamic = "force-dynamic";

function fmtShort(d: string) {
  try {
    const dt = new Date(d);
    return dt.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

type EventMini = {
  id: string;
  theme: string | null;
  starts_at: string;
  flyer_url?: string | null;
  flyer_png_path?: string | null;
  flyer_pdf_path?: string | null;
  flyer_path?: string | null;
};

function isAttendingRsvp(status: unknown, attending: unknown) {
  const att = String(attending ?? "").toLowerCase().trim();
  if (
    attending === true ||
    attending === 1 ||
    att === "true" ||
    att === "1" ||
    att === "yes" ||
    att === "t"
  ) {
    return true;
  }

  const raw = String(status ?? "").toLowerCase().trim();
  if (!raw) return false;
  const compact = raw.replace(/[^a-z]/g, "");
  return (
    compact.includes("yes") ||
    compact.includes("attend") ||
    compact.includes("going") ||
    compact.includes("coming") ||
    compact.includes("present")
  );
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!profile?.full_name) redirect("/onboarding");

  const nowMs = Date.now();

  const { data: profileRsvpRows } = await supabase
    .from("rsvps")
    .select("*")
    .eq("user_id", profile.id);

  let mergedRsvpRows = (profileRsvpRows ?? []) as any[];
  if (auth.user.id !== profile.id) {
    const { data: authRsvpRows } = await supabase
      .from("rsvps")
      .select("*")
      .eq("user_id", auth.user.id);
    mergedRsvpRows = [...mergedRsvpRows, ...((authRsvpRows ?? []) as any[])];
  }

  const byEvent = new Map<string, any[]>();
  for (const row of mergedRsvpRows) {
    const id = String(row?.event_id ?? "");
    if (!id) continue;
    byEvent.set(id, [...(byEvent.get(id) ?? []), row]);
  }

  const yesEventIds = Array.from(
    new Set(
      Array.from(byEvent.entries())
        .filter(([, rows]) =>
          rows.some((r: any) => isAttendingRsvp(r?.status, r?.attending))
        )
        .map(([eventId]) => eventId)
        .filter(Boolean)
    )
  );

  let upcomingEvents: EventMini[] = [];
  let pastEvents: EventMini[] = [];

  if (yesEventIds.length > 0) {
    const { data: all } = await supabase
      .from("events")
      .select("*")
      .in("id", yesEventIds)
      .order("starts_at", { ascending: true });

    let rows = (all ?? []) as EventMini[];

    // RLS fallback for members: load published events by ID via admin client when needed.
    if (rows.length === 0 && yesEventIds.length > 0) {
      const admin = createSupabaseAdmin();
      const { data: fallbackRows } = await admin
        .from("events")
        .select("*")
        .in("id", yesEventIds)
        .eq("is_published", true)
        .order("starts_at", { ascending: true });
      rows = (fallbackRows ?? []) as EventMini[];
    }
    upcomingEvents = rows.filter((ev) => {
      const ts = new Date(ev.starts_at).getTime();
      return !Number.isNaN(ts) && ts >= nowMs;
    });
    pastEvents = rows
      .filter((ev) => {
        const ts = new Date(ev.starts_at).getTime();
        return !Number.isNaN(ts) && ts < nowMs;
      })
      .sort(
        (a, b) =>
          new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
      );
  }

  const pastIds = pastEvents.map((e) => e.id);
  const noShowSet = new Set<string>();
  const attendedSet = new Set<string>();

  if (pastIds.length > 0) {
    const { data: overrides } = await supabase
      .from("attendance")
      .select("event_id, status")
      .eq("user_id", profile.id)
      .in("event_id", pastIds);

    (overrides ?? []).forEach((r: any) => {
      const s = String(r.status ?? "").toLowerCase().trim();
      const isNoShow =
        s === "no_show" ||
        s === "no-show" ||
        s === "no show" ||
        s === "noshow" ||
        s === "absent";

      const isAttended = s === "attended" || s === "present" || s === "yes";

      if (isNoShow) noShowSet.add(r.event_id);
      if (isAttended) attendedSet.add(r.event_id);
    });
  }

  const pastVisible = pastEvents.filter((e) => {
    if (attendedSet.has(e.id)) return true;
    if (noShowSet.has(e.id)) return false;
    return true;
  });

  const upcomingCount = upcomingEvents.length;
  const pastCount = pastVisible.length;

  const totalPastYes = pastEvents.length;
  const noShowCount = Array.from(noShowSet).length;

  const attendedByRule = Math.max(0, totalPastYes - noShowCount);
  const attendanceRate =
    totalPastYes > 0 ? Math.round((attendedByRule / totalPastYes) * 100) : 0;

  const initial = (profile.full_name?.trim()?.[0] ?? "U").toUpperCase();
  const email = profile.email ?? auth.user.email ?? "";
  const phone = profile.phone ?? "";
  const roleLabel = profile.role === "admin" ? "Admin" : "Member";

  return (
    <div className="relative min-h-screen overflow-hidden pb-16 pt-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="hero-orb hero-orb-a" />
        <div className="hero-orb hero-orb-b" />
        <div className="hero-orb hero-orb-c" />
        <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,246,252,0.92)_0%,rgba(255,238,248,0.9)_48%,rgba(255,244,251,0.92)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-8 px-5 md:px-8">
        <div className="animate-rise-in flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-white/90 px-5 py-2.5 text-sm font-semibold text-pink-700 transition hover:-translate-y-0.5 hover:bg-pink-50"
          >
            <span aria-hidden>&larr;</span>
            Back to Home
          </Link>

          <h1 className="text-3xl font-semibold text-pink-900 md:text-4xl">My Profile</h1>

          <div className="w-[120px]" />
        </div>

        <section className="animate-rise-in rounded-[2rem] border border-white/80 bg-white/88 p-7 shadow-[0_30px_90px_-45px_rgba(190,24,93,0.45)] backdrop-blur-xl md:p-10 [animation-delay:80ms]">
          <div className="flex flex-wrap items-start gap-7">
            <div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-4xl font-semibold text-white shadow-sm ring-2 ring-white md:h-28 md:w-28 md:text-5xl">
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="truncate text-3xl font-semibold text-gray-900 md:text-4xl">{profile.full_name}</h2>
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
                    profile.role === "admin"
                      ? "border-pink-200 bg-pink-50 text-pink-700"
                      : "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
                  ].join(" ")}
                >
                  {roleLabel}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-pink-100 bg-pink-50/60 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-600">Email</div>
                  <div className="mt-1 text-sm font-medium text-gray-800">{email || "-"}</div>
                </div>

                <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/60 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-fuchsia-600">Phone</div>
                  <div className="mt-1 text-sm font-medium text-gray-800">{phone || "-"}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="animate-rise-in [animation-delay:120ms]">
          <ProfileNameEditor userId={profile.id} initialName={profile.full_name} />
        </section>

        <section className="animate-rise-in grid gap-4 md:grid-cols-3 [animation-delay:160ms]">
          <div className="rounded-3xl border border-pink-200 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-pink-600">Upcoming Events</div>
            <div className="mt-2 text-4xl font-semibold text-pink-900">{upcomingCount}</div>
          </div>

          <div className="rounded-3xl border border-fuchsia-200 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-fuchsia-600">Past Events</div>
            <div className="mt-2 text-4xl font-semibold text-fuchsia-900">{pastCount}</div>
          </div>

          <div className="rounded-3xl border border-rose-200 bg-white/88 p-6 shadow-sm backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-600">Attendance Rate</div>
            <div className="mt-2 text-4xl font-semibold text-rose-900">{attendanceRate}%</div>
          </div>
        </section>

        <section className="animate-rise-in rounded-[2rem] border border-pink-200 bg-white/90 p-7 shadow-sm backdrop-blur [animation-delay:200ms]">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-gray-900">My Upcoming Events</h3>
            <span className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-pink-700">
              {upcomingEvents.length} events
            </span>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="rounded-2xl border border-pink-100 bg-pink-50/70 p-10 text-center text-gray-600">
              No upcoming events yet
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {upcomingEvents.map((ev, idx) => {
                const flyerSrc = getEventFlyerSrc(ev);
                return (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="animate-rise-in overflow-hidden rounded-2xl border border-pink-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    style={{ animationDelay: `${220 + idx * 55}ms`, animationFillMode: "both" }}
                  >
                    <div className="relative h-48 w-full bg-pink-50">
                      {flyerSrc ? (
                        <Image
                          src={flyerSrc}
                          alt={`${ev.theme ?? "Event"} flyer`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-sm font-semibold uppercase tracking-[0.1em] text-pink-500">
                          Flyer Preview
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="text-xl font-semibold text-gray-900">{ev.theme ?? "Event"}</div>
                      <div className="mt-1 text-base text-gray-600">{ev.starts_at ? fmtShort(ev.starts_at) : ""}</div>
                      <div className="mt-3 text-base font-semibold text-pink-700">View Event</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="animate-rise-in rounded-[2rem] border border-fuchsia-200 bg-white/90 p-7 shadow-sm backdrop-blur [animation-delay:240ms]">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-gray-900">My Past Events</h3>
            <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-fuchsia-700">
              {pastVisible.length} events
            </span>
          </div>

          {pastVisible.length === 0 ? (
            <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/70 p-10 text-center text-gray-600">
              No past events yet
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {pastVisible.map((ev, idx) => {
                const flyerSrc = getEventFlyerSrc(ev);
                return (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="animate-rise-in overflow-hidden rounded-2xl border border-fuchsia-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    style={{ animationDelay: `${260 + idx * 55}ms`, animationFillMode: "both" }}
                  >
                    <div className="relative h-48 w-full bg-fuchsia-50">
                      {flyerSrc ? (
                        <Image
                          src={flyerSrc}
                          alt={`${ev.theme ?? "Event"} flyer`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-sm font-semibold uppercase tracking-[0.1em] text-fuchsia-500">
                          Flyer Preview
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="text-xl font-semibold text-gray-900">{ev.theme ?? "Event"}</div>
                      <div className="mt-1 text-base text-gray-600">{ev.starts_at ? fmtShort(ev.starts_at) : ""}</div>
                      <div className="mt-3 text-base font-semibold text-fuchsia-700">View Event</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


