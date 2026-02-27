import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import EventDetailSectionsTabs from "@/components/EventDetailSectionsTabs";
import {
  EventComingCountText,
  EventLiveComingProvider,
} from "@/components/EventLiveComing";

export const dynamic = "force-dynamic";

function fmtLong(d: string) {
  try {
    const dt = new Date(d);
    return dt.toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

export default async function EventPage({
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
    .select("id, full_name, role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!me?.full_name) redirect("/onboarding");

  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (evErr || !event) {
    return (
      <div className="relative min-h-screen overflow-hidden pb-16 pt-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="hero-orb hero-orb-a" />
          <div className="hero-orb hero-orb-b" />
          <div className="hero-orb hero-orb-c" />
          <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,247,252,0.92)_0%,rgba(255,237,247,0.9)_45%,rgba(255,244,250,0.92)_100%)]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 md:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-white/90 px-5 py-2.5 text-sm font-semibold text-pink-700 transition hover:-translate-y-0.5 hover:bg-pink-50"
          >
            <span aria-hidden>&larr;</span>
            Back to Home
          </Link>

          <div className="mt-6 rounded-3xl border border-pink-100 bg-white/88 p-8 shadow-sm backdrop-blur">
            <div className="text-2xl font-semibold text-gray-900">Event not found</div>
            <div className="mt-2 text-gray-600">
              This event might have been deleted or you do not have access.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const startsAtDate = new Date((event as any).starts_at);
  const isPastEvent =
    !isNaN(startsAtDate.getTime()) && startsAtDate.getTime() < now.getTime();

  const { data: ownersRows } = await supabase
    .from("event_owners")
    .select("admin_id, profiles:profiles(full_name)")
    .eq("event_id", id);

  const ownerNames =
    (ownersRows ?? [])
      .map((r: any) => r?.profiles?.full_name)
      .filter(Boolean) ?? [];

  const hostedBy =
    ownerNames.length > 0 ? `Hosted by ${ownerNames.join(" & ")}` : null;

  let flyerUrl: string | null = null;
  const flyerPath =
    (event as any).flyer_png_path ||
    (event as any).flyer_path ||
    (event as any).flyer_url ||
    null;

  if (flyerPath) {
    const pub = supabase.storage.from("flyers").getPublicUrl(flyerPath);
    flyerUrl = pub.data?.publicUrl ?? null;
  }

  const { data: myRsvp } = await supabase
    .from("rsvps")
    .select("status, attending")
    .eq("event_id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const initialStatus = (myRsvp as any)?.status ?? null;
  const initialIsAttending =
    (myRsvp as any)?.status === "yes" || (myRsvp as any)?.attending === true;

  const isHosting =
    me.role === "admin" &&
    (ownersRows ?? []).some((r: any) => r.admin_id === auth.user.id);

  let comingCount = 0;
  let comingMembers: string[] = [];

  if (!isPastEvent) {
    const { data: yesRows } = await supabase
      .from("rsvps")
      .select("user_id, status, attending, profiles:profiles(full_name)")
      .eq("event_id", id)
      .or("status.eq.yes,attending.eq.true");

    comingCount = (yesRows ?? []).length;
    const names = (yesRows ?? [])
      .map((r: any) => String(r?.profiles?.full_name ?? "").trim())
      .filter(Boolean);
    comingMembers = Array.from(new Set(names)).sort((a, b) =>
      a.localeCompare(b)
    );
  } else {
    comingCount = 0;
    comingMembers = [];
  }

  return (
    <div className="relative min-h-screen overflow-hidden pb-16 pt-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="hero-orb hero-orb-a" />
        <div className="hero-orb hero-orb-b" />
        <div className="hero-orb hero-orb-c" />
        <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,247,252,0.92)_0%,rgba(255,237,247,0.9)_45%,rgba(255,244,250,0.92)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-8 px-5 md:px-8">
        <div className="animate-rise-in">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-white/90 px-5 py-2.5 text-sm font-semibold text-pink-700 transition hover:-translate-y-0.5 hover:bg-pink-50"
          >
            <span aria-hidden>&larr;</span>
            Back to Home
          </Link>
        </div>

        <EventLiveComingProvider
          eventId={id}
          isPastEvent={isPastEvent}
          initialCount={comingCount}
          initialMembers={comingMembers}
        >
          <section className="animate-rise-in overflow-hidden rounded-[2rem] border border-pink-100 bg-white/90 shadow-sm backdrop-blur [animation-delay:70ms]">
            <div className="relative h-[280px] w-full bg-pink-50 md:h-[360px]">
              {flyerUrl ? (
                <Image
                  src={flyerUrl}
                  alt={`${(event as any).theme ?? "Event"} flyer`}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(120deg,#ffe8f3_0%,#ffd9ea_55%,#ffeef7_100%)]" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-white/95" />
            </div>

            <div className="p-7 md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">
                    {(event as any).theme}
                  </h1>

                  {hostedBy && (
                    <div className="mt-3 inline-flex items-center rounded-full border border-pink-200 bg-pink-50 px-4 py-1.5 text-sm font-medium text-pink-800">
                      {hostedBy}
                    </div>
                  )}

                  {isPastEvent && (
                    <div className="mt-3 inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 text-sm font-semibold text-gray-700">
                      This event has ended
                    </div>
                  )}
                </div>

                {isHosting && (
                  <div className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 text-sm font-semibold text-fuchsia-700">
                    You are hosting
                  </div>
                )}
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-600">Date and Time</div>
                  <div className="mt-2 text-lg font-medium text-gray-800">{fmtLong((event as any).starts_at)}</div>
                </div>

                <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-600">Location</div>
                  <div className="mt-2 text-lg font-medium text-gray-800">{(event as any).location_text ?? "-"}</div>
                </div>

                <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/60 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-fuchsia-600">Dress Code</div>
                  <div className="mt-2 text-lg font-medium text-gray-800">{(event as any).dress_code ?? "-"}</div>
                </div>

                <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/60 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-fuchsia-600">Attendance</div>
                  <div className="mt-2 text-lg font-medium text-gray-800">
                    <EventComingCountText isPastEvent={isPastEvent} />
                  </div>
                </div>
              </div>

              {(event as any).note && (
                <div className="mt-7 rounded-2xl border border-rose-100 bg-rose-50/60 p-5 text-base text-rose-900">
                  {(event as any).note}
                </div>
              )}
            </div>
          </section>

          <section className="animate-rise-in [animation-delay:120ms]">
            <EventDetailSectionsTabs
              eventId={id}
              initialStatus={initialStatus}
              initialIsAttending={initialIsAttending}
              lockInteractions={isPastEvent}
              isPastEvent={isPastEvent}
              theme={String((event as any).theme ?? "Event")}
              startsAt={String((event as any).starts_at ?? "")}
              locationText={(event as any).location_text ?? null}
              dressCode={(event as any).dress_code ?? null}
              note={(event as any).note ?? null}
              flyerUrl={flyerUrl}
            />
          </section>
        </EventLiveComingProvider>
      </div>
    </div>
  );
}


