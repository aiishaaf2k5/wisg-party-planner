"use client";

import { useState } from "react";

export default function InviteLinkButton() {
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function createInvite() {
    setMsg(null);
    setBusy(true);

    try {
      const res = await fetch("/api/admin/create-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(json?.error ?? "Could not create invite link.");
        setBusy(false);
        return;
      }

      const url = json?.url ?? json?.invite_url ?? json?.link ?? null;

      if (!url || typeof url !== "string") {
        setMsg("Invite created, but no URL returned from API.");
        setBusy(false);
        return;
      }

      setInviteUrl(url);
      const ok = await copy(url);
      setMsg(ok ? "Invite link copied." : "Invite created (copy it below).");
    } catch (e: any) {
      setMsg(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        disabled={busy}
        onClick={createInvite}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-2xl",
          "border-2 border-rose-300 bg-white px-6 py-3 font-semibold text-rose-800",
          "shadow-[0_14px_35px_rgba(225,29,72,0.18)] transition",
          "hover:-translate-y-0.5 hover:bg-rose-50",
          busy ? "cursor-not-allowed opacity-60" : "",
        ].join(" ")}
      >
        <span
          aria-hidden
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-rose-300 text-xs font-bold text-rose-700"
        >
          +
        </span>
        {busy ? "Creating..." : "Create Invite Link"}
      </button>

      {msg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
          {msg}
        </div>
      )}

      {inviteUrl && (
        <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold text-gray-600">Invite link</div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              readOnly
              value={inviteUrl}
              className="w-full rounded-xl border border-rose-200 bg-rose-50/40 px-3 py-2 text-sm text-gray-900"
            />

            <button
              type="button"
              onClick={async () => {
                const ok = await copy(inviteUrl);
                setMsg(ok ? "Copied." : "Could not copy (copy manually).");
              }}
              className="rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(225,29,72,0.35)] hover:opacity-95"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
