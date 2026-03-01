"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Mode = "member" | "admin";

function isNativeRuntime() {
  if (typeof window === "undefined") return false;
  const capNative = !!(window as any).Capacitor?.isNativePlatform?.();
  const capObj = !!(window as any).Capacitor;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent ?? "" : "";
  const uaNative = /\bCapacitor\b/i.test(ua) || /;\s*wv\)/i.test(ua);
  return capNative || capObj || uaNative;
}

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [safeNext, setSafeNext] = useState("/");
  const [isAdminInviteFlow, setIsAdminInviteFlow] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [mode, setMode] = useState<Mode>("member");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sentCode, setSentCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setIsNativeApp(isNativeRuntime());

    const rawNext =
      typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("next") ?? "").trim()
        : "";
    const rawError =
      typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("error") ?? "").trim()
        : "";
    const next = rawNext.startsWith("/") ? rawNext : "/";
    setSafeNext(next);
    setIsAdminInviteFlow(next.startsWith("/admin-invite"));
    if (rawError) setErr(decodeURIComponent(rawError));
  }, []);

  useEffect(() => {
    if (isAdminInviteFlow) setMode("admin");
  }, [isAdminInviteFlow]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function checkRoleForEmail(targetEmail: string) {
    const selectedMode: Mode = isAdminInviteFlow ? "admin" : mode;
    const inviteToken =
      typeof window !== "undefined" && isAdminInviteFlow
        ? new URL(safeNext, window.location.origin).searchParams.get("token") ?? ""
        : "";

    const roleCheckRes = await fetch("/api/auth/login-role-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, mode: selectedMode, inviteToken }),
    });
    const roleCheckJson = await roleCheckRes.json().catch(() => ({}));
    if (!roleCheckRes.ok) {
      throw new Error(roleCheckJson?.error ?? "Please use the correct login type for this account.");
    }
  }

  async function sendCode() {
    setErr(null);
    setMsg(null);

    const clean = email.trim().toLowerCase();
    if (!clean) {
      setErr("Please enter your email.");
      return;
    }
    if (busy || cooldown > 0) return;

    try {
      await checkRoleForEmail(clean);
    } catch (e: any) {
      setErr(e?.message ?? "Could not validate account.");
      return;
    }

    setBusy(true);
    setCooldown(30);

    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: isNativeApp
        ? {}
        : {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
          },
    });

    setBusy(false);

    if (error) {
      setErr(error.message);
      setCooldown(0);
      return;
    }

    setSentCode(true);
    setMsg("Code sent. Enter the 6-digit code from your email.");
  }

  async function verifyCode() {
    setErr(null);
    setMsg(null);

    const clean = email.trim().toLowerCase();
    const code = otpCode.trim();
    if (!clean) return setErr("Enter your email first.");
    if (code.length < 6) return setErr("Enter the code from your email.");
    if (busy) return;

    try {
      await checkRoleForEmail(clean);
    } catch (e: any) {
      setErr(e?.message ?? "Could not validate account.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: clean,
      token: code,
      type: "email",
    });
    setBusy(false);

    if (error) {
      setErr(error.message);
      return;
    }

    window.location.href = safeNext;
  }

  async function continueWithGoogleWeb() {
    setErr(null);
    setMsg(null);
    if (busy) return;
    setBusy(true);

    const selectedMode: Mode = isAdminInviteFlow ? "admin" : mode;
    const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      safeNext
    )}&mode=${encodeURIComponent(selectedMode)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback },
    });

    setBusy(false);
    if (error) setErr(error.message);
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
              <p
                className="text-6xl leading-none text-pink-700 md:text-7xl"
                style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', fontStyle: "italic" }}
              >
                Welcome
              </p>
              <div className="mt-4 flex items-center justify-center gap-4">
                <Image
                  src="/wisg-logo.png"
                  alt="IWSG logo"
                  width={104}
                  height={104}
                  className="h-24 w-24 object-contain md:h-28 md:w-28"
                  priority
                />
                <div className="text-left">
                  <h1 className="text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">
                    Intercultural Women&apos;s Support Group
                  </h1>
                  <p className="mt-1 text-lg font-semibold text-pink-700/90">IWSG Event Management</p>
                </div>
              </div>
            </div>

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
                  Member
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
                  Admin
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-pink-200 bg-white/90 p-6 shadow-[0_14px_36px_rgba(236,72,153,0.14)]">
              {isNativeApp ? (
                <div className="space-y-4">
                  <div className="text-center text-xl font-semibold text-gray-900">Sign In With Email Code</div>
                  <div className="text-center text-sm text-gray-600">
                    Easy app login: enter email, then enter the code from email.
                  </div>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full rounded-2xl border border-pink-300 bg-pink-50/70 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
                    autoComplete="email"
                    inputMode="email"
                  />
                  <button
                    type="button"
                    onClick={sendCode}
                    disabled={busy || cooldown > 0}
                    className="w-full rounded-2xl bg-pink-600 px-6 py-4 text-base font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
                  >
                    {busy ? "Sending..." : cooldown > 0 ? `Wait ${cooldown}s` : "Send Code"}
                  </button>
                  {sentCode && (
                    <>
                      <input
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="6-digit code"
                        className="w-full rounded-2xl border border-pink-300 bg-white px-4 py-3 text-lg text-gray-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                      />
                      <button
                        type="button"
                        onClick={verifyCode}
                        disabled={busy}
                        className="w-full rounded-2xl bg-fuchsia-600 px-6 py-4 text-base font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
                      >
                        {busy ? "Verifying..." : "Verify & Sign In"}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center text-xl font-semibold text-gray-900">Continue with Google</div>
                  <div className="text-center text-sm text-gray-600">
                    {isAdminInviteFlow
                      ? "Use the same Google account that received the admin invite."
                      : "Use your Google account to sign in quickly."}
                  </div>
                  <button
                    type="button"
                    onClick={continueWithGoogleWeb}
                    disabled={busy}
                    className="w-full rounded-2xl border border-pink-300 bg-white px-6 py-3.5 text-center text-base font-semibold text-gray-900 transition hover:bg-pink-50/60 disabled:opacity-60"
                  >
                    Continue with Google
                  </button>
                </div>
              )}

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
        </div>
      </div>
    </div>
  );
}

