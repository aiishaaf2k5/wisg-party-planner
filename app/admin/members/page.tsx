import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function AdminMembersPage() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role, is_banned")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!me || me.role !== "admin" || me.is_banned) redirect("/");

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_banned")
    .order("full_name", { ascending: true });

  // This page is server-rendered; role/ban toggles are usually client.
  // Minimal approach: show list now; if you want, I’ll give you the client toggles next.
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-orange-50">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="text-3xl font-semibold text-gray-900">Members</div>

        <div className="rounded-3xl border border-rose-100 bg-white/85 p-6 shadow ring-1 ring-rose-100 backdrop-blur">
          <div className="text-sm text-gray-600">
            (Next step: I can add buttons to promote/demote and ban/unban here.)
          </div>

          <div className="mt-5 space-y-3">
            {(users ?? []).map((u: any) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-4 rounded-2xl bg-rose-50/60 p-4"
              >
                <div>
                  <div className="font-semibold text-gray-900">{u.full_name ?? "User"}</div>
                  <div className="text-sm text-gray-600">{u.role}</div>
                </div>
                {u.is_banned && (
                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                    BANNED
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
