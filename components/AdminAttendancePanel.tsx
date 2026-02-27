"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Row = {
  user_id: string;
  name: string;
  rsvpStatus: "yes" | "no" | "unknown";
  attendanceStatus: "attended" | "no_show" | null;
};

export default function AdminAttendancePanel({
  eventId,
  rows,
  eventIsOver,
}: {
  eventId: string;
  rows: Row[];
  eventIsOver: boolean;
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [local, setLocal] = useState<Row[]>(rows);

  async function setAttendance(userId: string, status: "attended" | "no_show") {
    setBusyId(userId);

    const res = await supabase.from("attendance").upsert(
      {
        event_id: eventId,
        user_id: userId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,user_id" }
    );

    setBusyId(null);

    if (res.error) {
      alert(res.error.message);
      return;
    }

    setLocal((prev) =>
      prev.map((r) =>
        r.user_id === userId ? { ...r, attendanceStatus: status } : r
      )
    );
  }

  return (
    <div className="rounded-3xl border border-rose-100 bg-white/85 p-6 shadow ring-1 ring-rose-100 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-semibold text-gray-900">
          After-event Attendance
        </div>
        {!eventIsOver && (
          <div className="text-sm text-gray-600">
            (Event not over yet — you can still set it, but usually do it after)
          </div>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {local.map((r) => (
          <div
            key={r.user_id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-rose-50/60 p-4 ring-1 ring-rose-100"
          >
            <div>
              <div className="font-semibold text-gray-900">{r.name}</div>
              <div className="text-xs text-gray-600">
                RSVP: <span className="font-semibold">{r.rsvpStatus}</span>{" "}
                {r.attendanceStatus ? (
                  <>
                    • Admin:{" "}
                    <span className="font-semibold">{r.attendanceStatus}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={busyId === r.user_id}
                onClick={() => setAttendance(r.user_id, "attended")}
                className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-rose-50 disabled:opacity-60"
              >
                Mark Attended
              </button>

              <button
                disabled={busyId === r.user_id}
                onClick={() => setAttendance(r.user_id, "no_show")}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
              >
                Mark No-show
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
