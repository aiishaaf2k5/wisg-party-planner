"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const supabase = createSupabaseBrowser();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/login";
        return;
      }

      const prof = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", data.user.id)
        .maybeSingle();

      if (prof.data?.full_name) {
        window.location.href = "/";
        return;
      }
    })();
  }, []);

  async function save() {
    setErr(null);
    setBusy(true);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      window.location.href = "/login";
      return;
    }

    const fullName = name.trim();
    if (fullName.length < 2) {
      setBusy(false);
      setErr("Please enter your full name.");
      return;
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", u.user.id)
      .maybeSingle();

    const nextRole = existingProfile?.role ?? "member";

    const { error } = await supabase.from("profiles").upsert({
      id: u.user.id,
      email: u.user.email,
      full_name: fullName,
      phone: phone.trim() || null,
      role: nextRole,
    });

    setBusy(false);

    if (error) {
      setErr(error.message);
      return;
    }

    window.location.href = "/";
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-44 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-pink-300/55 blur-3xl animate-pulse" />
        <div className="absolute -bottom-44 left-8 h-[560px] w-[560px] rounded-full bg-rose-300/55 blur-3xl animate-pulse" />
        <div className="absolute -bottom-28 right-10 h-[520px] w-[520px] rounded-full bg-orange-200/70 blur-3xl animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_#ffd8ec_0%,_#ffc9e5_35%,_#ffe7f3_70%,_#fff8fc_100%)]" />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative h-28 w-28 overflow-hidden rounded-[2rem] bg-white shadow-[0_16px_45px_rgba(225,29,72,0.22)] ring-1 ring-rose-200">
            <Image
              src="/wisg-logo.png"
              alt="IWSG logo"
              fill
              className="object-contain p-2.5"
              priority
            />
          </div>

          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-rose-900">
              Intercultural Women&apos;s
            </h1>
            <p className="text-lg text-rose-800/80">Support Group</p>
          </div>
        </div>

        <div className="mt-10 w-full max-w-2xl rounded-[2rem] border border-rose-200/80 bg-white/90 p-8 shadow-[0_30px_90px_-40px_rgba(225,29,72,0.34)] ring-1 ring-rose-100 backdrop-blur">
          <div className="mb-4 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
            Profile Setup
          </div>

          <div className="space-y-1">
            <div className="text-3xl font-bold tracking-tight text-rose-900">
              Welcome! Let&apos;s set up your profile
            </div>
            <div className="text-base text-rose-800/80">
              Add your details so your community can recognize you easily.
            </div>
          </div>

          <div className="mt-7 space-y-5">
            <div className="space-y-2">
              <label className="text-base font-semibold text-rose-900">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                className="w-full rounded-2xl border border-rose-300 bg-rose-50/60 px-4 py-3.5 text-base text-rose-900 outline-none placeholder:text-rose-300 transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-rose-900">
                Phone Number <span className="text-rose-700/60">(optional)</span>
              </label>
              <input
                className="w-full rounded-2xl border border-rose-200 bg-rose-50/50 px-4 py-3.5 text-base text-rose-900 outline-none placeholder:text-rose-300 transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
              />
              <div className="text-sm text-rose-700/75">
                This helps admins reach you if needed.
              </div>
            </div>

            <button
              onClick={save}
              disabled={busy}
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 px-5 py-4 text-base font-semibold text-white shadow-[0_16px_40px_rgba(225,29,72,0.33)] transition hover:scale-[1.01] hover:opacity-95 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Complete Setup ->"}
            </button>

            {err && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {err}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

