import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: rows } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ffe7f2_0%,_#ffdcef_35%,_#ffeedd_72%,_#fff8fc_100%)]">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <div className="rounded-[2rem] border border-rose-100/80 bg-white/90 p-7 shadow-[0_30px_90px_-42px_rgba(225,29,72,0.35)] backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500">Inbox</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">Notifications</h1>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow"
            >
              <span aria-hidden>&larr;</span>
              <span>Home</span>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {(rows ?? []).length === 0 ? (
            <div className="rounded-[2rem] border border-rose-100 bg-white/88 p-10 text-center text-gray-600 shadow ring-1 ring-rose-100 backdrop-blur">
              No notifications yet.
            </div>
          ) : (
            (rows ?? []).map((n: any, idx: number) => (
              <a
                key={n.id}
                href={n.url || "#"}
                className="block animate-rise-in rounded-[1.5rem] border border-rose-100 bg-white/90 p-6 shadow ring-1 ring-rose-100 backdrop-blur transition hover:-translate-y-0.5 hover:bg-rose-50/50 hover:shadow-md"
                style={{ animationDelay: `${60 + idx * 40}ms`, animationFillMode: "both" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{n.title}</div>
                    {n.body && <div className="mt-1 text-sm text-gray-600">{n.body}</div>}
                  </div>
                  <div className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-rose-700">
                    New
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
