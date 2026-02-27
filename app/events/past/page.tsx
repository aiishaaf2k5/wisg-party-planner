import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import EventCard from "@/components/EventCard";

export default async function PastEventsPage() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_banned")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!profile?.full_name) redirect("/onboarding");
  if (profile.is_banned) redirect("/login");

  const now = new Date().toISOString();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("is_published", true)
    .or(`starts_at.lt.${now},is_archived.eq.true`)
    .order("starts_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-orange-50">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="text-3xl font-semibold text-gray-900">Past Events</div>
          <Link href="/" className="font-semibold text-gray-800 hover:text-black">
            ← Home
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {(events ?? []).map((e: any) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>

        {(events ?? []).length === 0 && (
          <div className="rounded-3xl border border-rose-100 bg-white/85 p-8 text-gray-600 shadow ring-1 ring-rose-100 backdrop-blur">
            No past events yet.
          </div>
        )}
      </div>
    </div>
  );
}
