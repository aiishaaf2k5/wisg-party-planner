import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import AdminEventEditor from "@/components/AdminEventEditor";

export default async function AdminEditEventPage({
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
    .select("id, role, is_banned, full_name")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!me?.full_name) redirect("/onboarding");
  if (me.role !== "admin" || me.is_banned) redirect("/");

  const { data: owner } = await supabase
    .from("event_owners")
    .select("admin_id")
    .eq("event_id", id)
    .eq("admin_id", auth.user.id)
    .maybeSingle();

  if (!owner) redirect("/admin/events");

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!event) redirect("/admin/events");

  const { data: options } = await supabase
    .from("event_dish_options")
    .select("id, name, sort_order")
    .eq("event_id", id)
    .order("sort_order", { ascending: true });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ffe6f1_0%,_#ffd8eb_38%,_#ffeede_72%,_#fff7fb_100%)]">
      <div className="mx-auto max-w-6xl space-y-8 px-6 pb-16 pt-10">
        <div className="rounded-[2rem] border border-rose-100/80 bg-white/90 p-8 shadow-[0_34px_95px_-42px_rgba(225,29,72,0.38)] backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/admin/events"
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-7 py-3.5 text-lg font-semibold text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow"
            >
              Back
            </Link>

            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">Event Studio</p>
              <h1 className="mt-2 text-5xl font-bold tracking-tight text-gray-900">Edit Event</h1>
              <p className="mt-3 text-lg text-rose-800/80">Refine details, flyer, and dishes.</p>
            </div>

            <div className="w-[92px]" />
          </div>
        </div>

        <AdminEventEditor event={event as any} dishOptions={(options ?? []) as any} />
      </div>
    </div>
  );
}
