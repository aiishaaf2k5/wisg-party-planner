import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import InviteLinkButton from "@/components/InviteLinkButton";

export const dynamic = "force-dynamic";

export default async function AdminInvitePage() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role, full_name, is_banned")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!me?.full_name) redirect("/onboarding");
  if (me.is_banned) redirect("/");
  if (me.role !== "admin") redirect("/");

  const superEmail = (process.env.SUPER_ADMIN_EMAIL ?? "").toLowerCase().trim();
  const myEmail = (auth.user.email ?? "").toLowerCase().trim();
  const isSuperAdmin = !!superEmail && myEmail === superEmail;

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ffe7f2_0%,_#ffdcef_35%,_#ffeedd_70%,_#fff8fc_100%)]">
        <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
          <div className="rounded-[2rem] border border-rose-100/80 bg-white/90 p-8 shadow-[0_30px_90px_-42px_rgba(225,29,72,0.35)] backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-6 py-3 text-base font-semibold text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow"
              >
                <span aria-hidden>&larr;</span>
                <span>Back to Home</span>
              </Link>

              <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">Admin Access</p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">Create Admin Invite</h1>
                <p className="mt-2 text-base text-rose-800/80">Secure invite controls for super admin only.</p>
              </div>

              <div className="w-[148px]" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-rose-200 bg-white/90 p-8 shadow-[0_24px_70px_-44px_rgba(225,29,72,0.3)] ring-1 ring-rose-100 backdrop-blur">
            <div className="text-2xl font-semibold text-gray-900">Admin Invite Access</div>
            <div className="mt-3 text-base text-gray-700">
              Only the Super Admin can create admin invite links.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ffe7f2_0%,_#ffdcef_35%,_#ffeedd_70%,_#fff8fc_100%)]">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        <div className="rounded-[2rem] border border-rose-100/80 bg-white/90 p-8 shadow-[0_30px_90px_-42px_rgba(225,29,72,0.35)] backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-6 py-3 text-base font-semibold text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow"
            >
              <span aria-hidden>&larr;</span>
              <span>Back to Home</span>
            </Link>

            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">Super Admin</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">Create Admin Invite</h1>
              <p className="mt-2 text-base text-rose-800/80">Generate secure, one-time invite links for new admins.</p>
            </div>

            <div className="w-[148px]" />
          </div>
        </div>

        <div className="rounded-[2rem] border border-rose-200 bg-white/90 p-8 shadow-[0_24px_70px_-44px_rgba(225,29,72,0.3)] ring-1 ring-rose-100 backdrop-blur">
          <div className="text-2xl font-semibold text-gray-900">Invite a New Admin</div>
          <div className="mt-3 text-base text-gray-700">
            Generate a one-time invite link. The invited person signs in and is promoted to admin when they open the link.
          </div>

          <div className="mt-7">
            <InviteLinkButton />
          </div>
        </div>
      </div>
    </div>
  );
}
