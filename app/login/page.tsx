"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Mode = "member" | "admin";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const searchParams = useSearchParams();

  const rawNext = (searchParams.get("next") ?? "").trim();
  const safeNext = rawNext.startsWith("/") ? rawNext : "/";
  const isAdminInviteFlow = safeNext.startsWith("/admin-invite");

  const [mode, setMode] = useState<Mode>(isAdminInviteFlow ? "admin" : "member");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (isAdminInviteFlow) setMode("admin");
  }, [isAdminInviteFlow]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function sendMagicLink() {
    setErr(null);
    setMsg(null);

    const clean = email.trim().toLowerCase();
    if (!clean) {
      setErr("Please enter your email.");
      return;
    }

    if (busy || cooldown > 0) return;

    const selectedMode: Mode = isAdminInviteFlow ? "admin" : mode;
    const roleCheckRes = await fetch("/api/auth/login-role-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: clean, mode: selectedMode }),
    });
    const roleCheckJson = await roleCheckRes.json().catch(() => ({}));
    if (!roleCheckRes.ok) {
      setErr(roleCheckJson?.error ?? "Please use the correct login type for this account.");
      return;
    }

    setBusy(true);
    setCooldown(30);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
        : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setBusy(false);

    if (error) {
      setErr(error.message);
      setCooldown(0);
      return;
    }

    setMsg(
      isAdminInviteFlow
        ? "Check your email and open the sign-in link to continue admin invite setup."
        : "Check your email and open the sign-in link. If missing, check Spam or Junk."
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ffe4f1_0%,_#ffd2ea_34%,_#ffeaf6_70%,_#fff9fd_100%)]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="relative overflow-hidden rounded-[2rem] border border-pink-200/80 bg-white/90 shadow-[0_35px_100px_-44px_rgba(236,72,153,0.32)] backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-pink-300/50 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-pink-300/45 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-pink-500" />

          <div className="relative p-8 md:p-10">
            <div className="mt-6 text-center">
              <div className="inline-flex items-center justify-center gap-3">
                <p
                  className="text-6xl leading-none text-pink-700 md:text-7xl"
                  style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', fontStyle: "italic" }}
                >
                  Welcome
                </p>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-600 shadow-sm md:h-11 md:w-11">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
                    <path d="M12 21s-6.716-4.332-9.193-8.12C.716 9.67 2.08 5.5 6.01 4.738c2.064-.4 4.02.34 5.19 1.972 1.17-1.633 3.126-2.372 5.19-1.972 3.93.762 5.294 4.931 3.203 8.142C18.716 16.668 12 21 12 21z" />
                  </svg>
                </span>
              </div>
              <div className="mt-4 flex items-center justify-center gap-4">
                <div className="rounded-2xl bg-transparent p-0">
                  <Image
                    src="/wisg-logo.png"
                    alt="IWSG logo"
                    width={104}
                    height={104}
                    className="h-24 w-24 object-contain md:h-28 md:w-28"
                    priority
                  />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">
                    Intercultural Women&apos;s Support Group
                  </h1>
                  <p className="mt-1 text-lg font-semibold text-pink-700/90">IWSG Event Management</p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-base text-pink-800/80">
              {isAdminInviteFlow
                ? "Sign in with your admin email to continue accepting the invite."
                : "Sign in with your email link to access your events."}
            </p>

            <div className="mt-7 rounded-full border border-pink-200 bg-white/85 px-3 py-3 shadow-[0_10px_30px_rgba(236,72,153,0.14)] ring-1 ring-pink-100">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("member")}
                  disabled={isAdminInviteFlow}
                  className={[
                    "rounded-full px-5 py-3 text-center font-semibold transition",
                    mode === "member"
                      ? "bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-[0_12px_30px_rgba(236,72,153,0.35)]"
                      : "text-gray-800 hover:bg-pink-50/70",
                    isAdminInviteFlow ? "cursor-not-allowed opacity-50" : "",
                  ].join(" ")}
                >
                  Member Login
                </button>

                <button
                  type="button"
                  onClick={() => setMode("admin")}
                  className={[
                    "rounded-full px-5 py-3 text-center font-semibold transition",
                    mode === "admin"
                      ? "bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-[0_12px_30px_rgba(236,72,153,0.35)]"
                      : "text-gray-800 hover:bg-pink-50/70",
                  ].join(" ")}
                >
                  Admin Login
                </button>
              </div>
              {isAdminInviteFlow && (
                <p className="mt-2 text-center text-xs font-medium text-pink-700">
                  Admin invite flow: sign in as admin to continue.
                </p>
              )}
            </div>

            <div className="mt-8 rounded-3xl border border-pink-200 bg-white/90 p-6 shadow-[0_14px_36px_rgba(236,72,153,0.14)]">
              <div className="text-center text-xl font-semibold text-gray-900">
                {isAdminInviteFlow ? "Admin Sign-In" : mode === "member" ? "Member Sign-In" : "Admin Sign-In"}
              </div>
              <div className="mt-1 text-center text-sm text-gray-600">
                {isAdminInviteFlow
                  ? "Use the same email that received the admin invite."
                  : mode === "member"
                  ? "Enter your email and we will send a secure sign-in link."
                  : "Admins: enter your admin email to sign in."}
              </div>

              <div className="mt-5 space-y-2">
                <label className="text-sm font-semibold text-gray-900">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-pink-300 bg-pink-50/70 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>

              <button
                type="button"
                onClick={sendMagicLink}
                disabled={busy || cooldown > 0}
                className={[
                  "mt-5 w-full rounded-2xl px-6 py-4 text-center text-base font-semibold text-white transition",
                  "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-600 shadow-[0_16px_42px_rgba(236,72,153,0.34)] hover:scale-[1.01] hover:opacity-95",
                  busy || cooldown > 0 ? "cursor-not-allowed opacity-60" : "",
                ].join(" ")}
              >
                {busy
                  ? "Sending..."
                  : cooldown > 0
                  ? `Wait ${cooldown}s`
                  : isAdminInviteFlow
                  ? "Send Admin Sign-In Link"
                  : "Send Sign-In Link"}
              </button>

              {msg && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  {msg}
                </div>
              )}

              {err && (
                <div className="mt-4 rounded-2xl border border-pink-300 bg-pink-50 p-4 text-sm text-pink-800">
                  {err}
                </div>
              )}

            </div>
          </div>

          <div className="border-t border-pink-100 bg-white/70 px-8 py-6 text-sm text-gray-600">
            By signing in, you agree to use this for IWSG community events only.
          </div>
        </div>
      </div>
    </div>
  );
}

