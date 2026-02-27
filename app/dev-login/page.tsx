"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function DevLoginPage() {
  const supabase = createSupabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function login() {
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
    else window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ffe7f2_0%,_#ffdcef_35%,_#ffeedd_72%,_#fff8fc_100%)] px-5 py-14">
      <div className="mx-auto max-w-md">
        <div className="rounded-[2rem] border border-rose-200/80 bg-white/90 p-7 shadow-[0_30px_90px_-42px_rgba(225,29,72,0.35)] backdrop-blur-sm">
          <div className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
            Internal
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">Dev Login</h1>
          <p className="mt-1 text-sm text-gray-600">Use email + password for testing only.</p>

          <div className="mt-6 space-y-3">
            <input
              className="w-full rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
              placeholder="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              onClick={login}
              disabled={busy}
              className="mt-1 w-full rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-5 py-3.5 text-base font-semibold text-white shadow-[0_14px_35px_rgba(225,29,72,0.33)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Signing in..." : "Login"}
            </button>

            {err && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {err}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
