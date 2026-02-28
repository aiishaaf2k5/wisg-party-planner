import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import FlyerBuilder from "@/components/FlyerBuilder";

export const dynamic = "force-dynamic";

export default async function AdminFlyerPage({
  searchParams,
}: {
  searchParams: Promise<{
    eventId?: string;
    draft?: string;
    theme?: string;
    startsAt?: string;
    locationText?: string;
    dressCode?: string;
    note?: string;
    owner1?: string;
    owner2?: string;
    returnTo?: string;
    dishes?: string;
    generatedFlyerPngPath?: string;
    generatedFlyerPdfPath?: string;
    generatedFlyerTemplate?: string;
  }>;
}) {
  const {
    eventId,
    draft,
    theme,
    startsAt,
    locationText,
    dressCode,
    note,
    owner1,
    owner2,
    returnTo,
    dishes,
    generatedFlyerPngPath,
    generatedFlyerPdfPath,
    generatedFlyerTemplate,
  } = await searchParams;
  const isDraftPreview = draft === "1" && !eventId;

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

  if (isDraftPreview) {
    const parsedStartsAt = startsAt ? new Date(startsAt) : null;
    const startsAtIso =
      parsedStartsAt && !Number.isNaN(parsedStartsAt.getTime())
        ? parsedStartsAt.toISOString()
        : new Date().toISOString();
    const eventDraft = {
      id: "",
      theme: theme?.trim() || "Untitled Event",
      starts_at: startsAtIso,
      location_text: locationText?.trim() || "",
      location_url: null,
      dress_code: dressCode?.trim() || null,
      note: note?.trim() || null,
      flyer_template: generatedFlyerTemplate?.trim() || "elegant",
      flyer_png_path: null,
      flyer_pdf_path: null,
      created_by: auth.user.id,
      created_at: new Date().toISOString(),
    };

    const backParams = new URLSearchParams();
    if (theme) backParams.set("theme", theme);
    if (startsAt) backParams.set("startsAt", startsAt);
    if (locationText) backParams.set("locationText", locationText);
    if (dressCode) backParams.set("dressCode", dressCode);
    if (note) backParams.set("note", note);
    if (owner1) backParams.set("owner1", owner1);
    if (owner2) backParams.set("owner2", owner2);
    if (dishes) backParams.set("dishes", dishes);
    if (generatedFlyerPngPath) backParams.set("generatedFlyerPngPath", generatedFlyerPngPath);
    if (generatedFlyerPdfPath) backParams.set("generatedFlyerPdfPath", generatedFlyerPdfPath);
    if (generatedFlyerTemplate) backParams.set("generatedFlyerTemplate", generatedFlyerTemplate);
    const backHref = `/admin/events/new${backParams.toString() ? `?${backParams.toString()}` : ""}`;

    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-orange-50">
        <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
          <div className="relative flex items-center justify-center gap-4">
            <Link
              href={backHref}
              className="group absolute left-0 inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-6 py-3 text-base font-semibold text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow"
            >
              <span className="transition group-hover:-translate-x-0.5">&larr;</span>
              <span>Back to Event Setup</span>
            </Link>

            <div className="text-3xl font-semibold text-gray-900">AI Flyer Generator</div>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-white/85 p-6 shadow ring-1 ring-rose-100 backdrop-blur">
            <div className="mb-4 text-sm font-semibold text-rose-800">Event Draft: {eventDraft.theme}</div>
            <FlyerBuilder event={eventDraft as any} saveToEvent={false} returnToSetupHref={backHref} />
          </div>
        </div>
      </div>
    );
  }

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: false });

  const list = events ?? [];
  const selectedById = eventId ? list.find((e: any) => e.id === eventId) : null;
  const selected =
    selectedById ??
    list.find((e: any) => new Date(e.starts_at).getTime() >= Date.now()) ??
    list[0] ??
    null;
  const badEventId = !!eventId && !selectedById;
  const safeReturnTo =
    typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : null;
  const isEditReturnFlow =
    !!safeReturnTo && /^\/admin\/events\/[^/]+\/edit(?:\?.*)?$/.test(safeReturnTo);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-orange-50">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div className="relative flex items-center justify-center gap-4">
          {isEditReturnFlow ? (
            <Link
              href={safeReturnTo!}
              className="group absolute left-0 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow"
            >
              <span className="transition group-hover:-translate-x-0.5">&larr;</span>
              <span>Back to Edit Event</span>
            </Link>
          ) : (
            <Link
              href="/"
              className="group absolute left-0 flex items-center gap-2 text-[15px] font-medium text-gray-800 transition"
            >
              <span className="transition group-hover:-translate-x-0.5">&larr;</span>
              <span className="group-hover:underline">Back to Home</span>
            </Link>
          )}

          <div className="text-3xl font-semibold text-gray-900">AI Flyer Generator</div>
        </div>

        {list.length === 0 ? (
          <div className="rounded-3xl border border-rose-100 bg-white/85 p-8 text-gray-600 shadow ring-1 ring-rose-100 backdrop-blur">
            No events available yet. Create an event first.
          </div>
        ) : badEventId ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800 shadow">
            Could not find the selected event. Go back and open AI Flyer from that event&apos;s create/edit flow.
          </div>
        ) : (
          <>
            {selected && (
              <div className="rounded-3xl border border-rose-100 bg-white/85 p-6 shadow ring-1 ring-rose-100 backdrop-blur">
                <div className="mb-4 text-sm font-semibold text-rose-800">Event: {selected.theme}</div>
                <FlyerBuilder
                  event={selected as any}
                  saveToEvent={true}
                  returnToSetupHref={safeReturnTo ?? undefined}
                />

                {!isEditReturnFlow && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={safeReturnTo ?? `/admin/events/new?eventId=${selected.id}`}
                      className="rounded-2xl border border-rose-200 bg-white px-6 py-3 text-base font-semibold text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow"
                    >
                      Back to Event Setup
                    </Link>
                    <Link
                      href={`/events/${selected.id}`}
                      className="rounded-2xl bg-[#e8745e] px-4 py-2 font-semibold text-white hover:opacity-95"
                    >
                      Finish Setup
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}



