import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import MembersListClient from "@/components/MembersListClient";

export const dynamic = "force-dynamic";

type MemberRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  email?: string | null;
  is_banned?: boolean | null;
};

export default async function MembersPage() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_banned")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!me?.full_name) redirect("/onboarding");
  if (me.is_banned) redirect("/");

  const { data: rows } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_banned")
    .eq("is_banned", false)
    .order("full_name", { ascending: true });

  const members = (rows ?? []) as MemberRow[];

  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL ?? "")
    .toLowerCase()
    .trim();

  return (
    <div className="relative min-h-screen overflow-hidden pb-16 pt-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="hero-orb hero-orb-a" />
        <div className="hero-orb hero-orb-b" />
        <div className="hero-orb hero-orb-c" />
        <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,245,251,0.92)_0%,rgba(255,236,246,0.9)_50%,rgba(255,242,249,0.92)_100%)]" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-5 md:px-8">
        <div className="animate-rise-in">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-white/90 px-7 py-3.5 text-base font-semibold text-pink-700 transition hover:-translate-y-0.5 hover:bg-pink-50"
          >
            <span aria-hidden>&larr;</span>
            Back to Home
          </Link>
        </div>

        <section className="animate-rise-in rounded-[2rem] border border-white/80 bg-white/85 p-7 shadow-[0_30px_90px_-45px_rgba(190,24,93,0.45)] backdrop-blur-xl md:p-10 [animation-delay:60ms]">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">Community Directory</p>
              <h1 className="mt-3 text-5xl font-semibold tracking-tight text-pink-800 md:text-6xl">
                Members
              </h1>
            </div>
          </div>

          <div className="mt-7 h-px w-full bg-gradient-to-r from-pink-200/90 via-rose-200/90 to-fuchsia-200/90" />

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-full border border-pink-200 bg-pink-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-pink-700">
              {members.length} active members
            </div>
          </div>
        </section>

        <section className="animate-rise-in [animation-delay:120ms]">
          <MembersListClient
            initialMembers={members.map((m) => ({
              id: m.id,
              full_name: m.full_name,
              role: m.role,
              email: null,
            }))}
            myUserId={me.id}
            myRole={me.role ?? "member"}
            superAdminEmail={superAdminEmail}
          />
        </section>
      </div>
    </div>
  );
}




