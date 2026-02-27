"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function AdminAttendanceLock({
  eventId,
  initialLocked,
  canLock,
}: {
  eventId: string;
  initialLocked: boolean;
  canLock: boolean;
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [locked, setLocked] = useState(initialLocked);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    if (next && !canLock) {
      alert("You can lock after the event time.");
      return;
    }

    setBusy(true);

    const { error } = await supabase
      .from("events")
      .update({
        attendance_locked: next,
        attendance_locked_at: next ? new Date().toISOString() : null,
      })
      .eq("id", eventId);

    setBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    setLocked(next);
    // simple refresh so the rest of the page matches instantly
    window.location.reload();
  }

  return (
    <div className="rounded-3xl border border-rose-100 bg-white/85 p-6 shadow ring-1 ring-rose-100 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-gray-900">Attendance Lock</div>
          <div className="mt-1 text-sm text-gray-600">
            When locked, members can’t change RSVP or dishes.
          </div>
        </div>

        <button
          disabled={busy}
          onClick={() => toggle(!locked)}
          className={[
            "rounded-2xl px-5 py-3 font-semibold transition disabled:opacity-60",
            locked
              ? "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
              : "bg-[#e8745e] text-white hover:opacity-95",
          ].join(" ")}
        >
          {locked ? "Unlock" : "Lock Attendance"}
        </button>
      </div>

      <div className="mt-3 text-sm">
        Status:{" "}
        <span className="font-semibold text-gray-900">
          {locked ? "Locked ✅" : "Not locked"}
        </span>
      </div>
    </div>
  );
}
