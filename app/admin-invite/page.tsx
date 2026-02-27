"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Status = "idle" | "needsLogin" | "accepting" | "done" | "error";

export default function AdminInvitePage() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("Checking your invite...");

  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus("error");
        setMsg("Missing invite token.");
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setStatus("needsLogin");
        setMsg("Please sign in to accept this admin invite.");
        return;
      }

      setStatus("accepting");
      setMsg("Accepting invite...");

      const res = await fetch("/api/admin/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMsg(json?.error ?? "Could not accept invite.");
        return;
      }

      await supabase.auth.refreshSession();
      setStatus("done");
      setMsg("You are now an admin. You can go to Home or Manage Events.");
    })();
  }, [token, supabase]);

  const loginNext = `/admin-invite?token=${encodeURIComponent(token)}`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ffe7f2_0%,_#ffdcef_35%,_#ffeedd_70%,_#fff8fc_100%)]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="relative overflow-hidden rounded-[2rem] border border-rose-100/80 bg-white/90 p-8 shadow-[0_30px_90px_-42px_rgba(225,29,72,0.35)] backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-rose-200/50 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-12 h-36 w-36 rounded-full bg-pink-200/50 blur-2xl" />

          <div className="relative">
            <div className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
              Admin Access
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">Admin Invite</h1>
            <p className="mt-2 text-base text-rose-800/80">{msg}</p>
          </div>

          {status === "needsLogin" && (
            <div className="relative mt-7 space-y-4 rounded-3xl border border-rose-200 bg-white/80 p-5">
              <Link
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-5 py-3 text-base font-semibold text-white shadow-[0_14px_30px_rgba(225,29,72,0.32)] transition hover:opacity-95"
                href={`/login?next=${encodeURIComponent(loginNext)}`}
              >
                Sign In to Accept Invite
              </Link>
              <div className="text-sm text-rose-700/80">
                After sign-in, you will return here automatically.
              </div>
            </div>
          )}

          {status === "accepting" && (
            <div className="relative mt-7 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-base font-medium text-rose-900">
              <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500 align-middle" />{" "}
              Please wait while we confirm your invite...
            </div>
          )}

          {status === "error" && (
            <div className="relative mt-7 rounded-3xl border border-red-200 bg-red-50 p-5 text-base font-medium text-red-800">
              {msg || "Something went wrong."}
            </div>
          )}

          {status === "done" && (
            <div className="relative mt-7 space-y-4">
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-base font-medium text-emerald-900">
                {msg}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(225,29,72,0.3)] hover:opacity-95"
                >
                  Go to Home
                </Link>

                <Link
                  href="/admin/events"
                  className="rounded-2xl border border-rose-200 bg-white px-6 py-3 font-semibold text-rose-800 hover:bg-rose-50"
                >
                  Manage Events
                </Link>

                <Link
                  href="/members"
                  className="rounded-2xl border border-fuchsia-200 bg-white px-6 py-3 font-semibold text-fuchsia-800 hover:bg-fuchsia-50"
                >
                  Members
                </Link>
              </div>

              <div className="text-sm text-gray-600">
                If admin pages do not appear yet, refresh once.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
