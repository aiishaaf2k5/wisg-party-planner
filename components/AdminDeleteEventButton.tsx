"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDeleteEventButton({
  eventId,
  eventTitle,
  className,
}: {
  eventId: string;
  eventTitle?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    const title = (eventTitle ?? "this event").trim();
    const ok = window.confirm(
      `Delete "${title}" forever?\n\nThis will remove RSVPs, owners, dishes, attendance, gallery photos, and flyer files.`
    );
    if (!ok) return;

    setBusy(true);

    const res = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    setBusy(false);

    if (!res.ok) {
      alert(json.error ?? "Delete failed.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onDelete}
      className={
        className ??
        "rounded-2xl border border-red-200 bg-white px-4 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
      }
    >
      {busy ? "Deleting..." : "Delete"}
    </button>
  );
}
