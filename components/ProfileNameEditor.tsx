"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function ProfileNameEditor({
  userId,
  initialName,
}: {
  userId: string;
  initialName: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [name, setName] = useState(initialName ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const next = name.trim();

    setMsg(null);
    setErr(null);

    if (next.length < 2) {
      setErr("Name is too short.");
      return;
    }

    setBusy(true);

    const res = await supabase
      .from("profiles")
      .update({ full_name: next })
      .eq("id", userId);

    setBusy(false);

    if (res.error) {
      setErr(res.error.message);
      return;
    }

    setMsg("Saved ✅");

    // refresh to update header + other server components
    window.location.reload();
  }

  return (
    <div className="rounded-3xl border-2 border-pink-200 bg-white p-8">
      <div className="text-lg font-semibold text-gray-900">Profile Settings</div>
      <div className="mt-1 text-sm text-gray-600">Update your name any time.</div>

      <div className="mt-5 space-y-2">
        <div className="font-semibold text-gray-900">Full Name</div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Aisha Farooq"
          className="w-full rounded-2xl bg-[#fff8f3] px-4 py-3 text-[16px] outline-none ring-1 ring-rose-200 focus:ring-2 focus:ring-rose-300"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || name.trim() === initialName.trim()}
          onClick={save}
          className={[
            "rounded-2xl px-6 py-3 font-semibold transition border",
            "bg-[#e11d48] text-white border-[#e11d48]",
            "shadow-[0_16px_55px_rgba(225,29,72,0.55)]",
            "hover:opacity-95 disabled:opacity-60 disabled:shadow-none",
          ].join(" ")}
        >
          Save Name
        </button>

        
      </div>

      {msg && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {msg}
        </div>
      )}

      {err && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}
    </div>
  );
}
