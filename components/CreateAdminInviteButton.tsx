"use client";

import { useEffect, useState } from "react";

export default function CreateAdminInviteButton() {
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadingPerm, setLoadingPerm] = useState(true);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/can-create-invite", {
          method: "GET",
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        setCanCreate(Boolean(json?.can));
      } catch {
        setCanCreate(false);
      } finally {
        setLoadingPerm(false);
      }
    })();
  }, []);

  async function createInvite() {
    setBusy(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch("/api/admin/create-invite", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create invite");
      }

      const url =
        (typeof data?.inviteUrl === "string" && data.inviteUrl) ||
        (typeof data?.url === "string" && data.url) ||
        null;

      if (!url) {
        throw new Error("Invite created, but no URL was returned.");
      }

      setInviteUrl(url);

      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      } catch {
        // clipboard can fail on some browsers/settings — ignore
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    }

    setBusy(false);
  }

  // Hide the whole card for non-super-admins (your request)
  if (!loadingPerm && !canCreate) return null;

  return (
    <div className="rounded-2xl border border-purple-300 bg-purple-50 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-purple-900">Admin Access</div>
          <div className="text-sm text-purple-700">
            Invite another admin to manage events
          </div>
        </div>

        <button
          onClick={createInvite}
          disabled={busy || loadingPerm || !canCreate}
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-purple-700 disabled:opacity-50"
        >
          {loadingPerm ? "Checking..." : busy ? "Creating..." : "Create Invite Link"}
        </button>
      </div>

      {inviteUrl && (
        <div className="mt-4 rounded-xl bg-white p-3 text-sm">
          <div className="mb-1 font-medium text-gray-700">Invite link:</div>

          <div className="break-all text-purple-700">{inviteUrl}</div>

          {copied && (
            <div className="mt-1 text-xs font-medium text-emerald-600">
              ✓ Copied to clipboard
            </div>
          )}
        </div>
      )}

      {error && <div className="mt-3 text-sm font-medium text-red-600">{error}</div>}
    </div>
  );
}
