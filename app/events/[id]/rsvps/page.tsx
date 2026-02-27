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
    .select("theme, starts_at")
    .eq("id", id)
    .maybeSingle();

  // All RSVPs
  const { data: rows } = await supabase
    .from("rsvps")
    .select("user_id, status, attending, profiles:profiles(full_name)")
    .eq("event_id", id);

  const normalized = (rows ?? []).map((r: any) => {
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
      rsvpStatus: s as "yes" | "no" | "unknown",
    };
  });

  const yes = normalized.filter((r) => r.rsvpStatus === "yes");
  const no = normalized.filter((r) => r.rsvpStatus === "no");

  // Attendance overrides (what makes buttons stay pressed)
  const { data: overrides } = await supabase
    .from("attendance")
    .select("user_id, status")
    .eq("event_id", id);

  const initialOverrides: Record<string, "attended" | "no_show" | null> = {};
  (overrides ?? []).forEach((r: any) => {
    const s = String(r.status ?? "").toLowerCase().trim();
    if (s === "attended") initialOverrides[r.user_id] = "attended";
    if (s === "no_show") initialOverrides[r.user_id] = "no_show";
  });

  const isPastEvent = ev?.starts_at ? new Date(ev.starts_at) < new Date() : false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-orange-50">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/admin/events"
            className="font-semibold text-gray-800 hover:text-black"
          >
            ← Back
          </Link>

          <div className="text-2xl font-semibold text-gray-900">
            RSVPs — {ev?.theme ?? "Event"}
          </div>
          <div />
        </div>

        <div className="rounded-3xl border border-rose-100 bg-white/85 p-6 shadow ring-1 ring-rose-100 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-semibold text-gray-900">
              YES: {yes.length} • NO: {no.length}
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-rose-700">
                Export CSV
              </summary>
              <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-rose-50 p-4 text-xs text-gray-800">
name,status
{normalized.map((r) => `${JSON.stringify(r.name)},${r.rsvpStatus}`).join("\n")}
              </pre>
            </details>
          </div>
        </div>

        {/* Buttons that STAY pressed */}
        {isPastEvent ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-rose-100 bg-white/85 p-6 shadow ring-1 ring-rose-100 backdrop-blur">
              <div className="text-lg font-semibold text-gray-900">
                Mark attendance (after event)
              </div>
              <div className="mt-1 text-sm text-gray-600">
                These buttons will stay selected because they’re saved in the{" "}
                <span className="font-semibold">attendance</span> table.
              </div>
            </div>

            <AdminAttendanceControls
              eventId={id}
              rows={normalized}
              initialOverrides={initialOverrides}
            />
          </div>
        ) : (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            You can mark attendance after the event date has passed.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-rose-100 bg-white/85 p-6 shadow ring-1 ring-rose-100 backdrop-blur">
            <div className="text-lg font-semibold text-gray-900">Attending</div>
            <div className="mt-4 space-y-3">
              {yes.length === 0 ? (
                <div className="text-sm text-gray-600">None yet.</div>
              ) : (
                yes.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-rose-50/70 p-4 font-semibold text-gray-900"
                  >
                    {r.name}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-white/85 p-6 shadow ring-1 ring-rose-100 backdrop-blur">
            <div className="text-lg font-semibold text-gray-900">Not coming</div>
            <div className="mt-4 space-y-3">
              {no.length === 0 ? (
                <div className="text-sm text-gray-600">None yet.</div>
              ) : (
                no.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-gray-50 p-4 font-semibold text-gray-900"
                  >
                    {r.name}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
