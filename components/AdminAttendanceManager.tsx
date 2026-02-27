"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Attendance = "unknown" | "attended" | "no_show" | "excused";

type Row = {
  user_id: string;
  status: string | null;
  attending: boolean | null;
  attendance: Attendance;
  profiles: { full_name: string | null } | null;
};

export default function AdminAttendanceManager({
  eventId,
  rows,
  locked,
}: {
  eventId: string;
  rows: Row[];
  locked: boolean;
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [local, setLocal] = useState<Row[]>(rows);

  async function setAttendance(userId: string, next: Attendance) {
    if (!locked) {
      alert("Lock attendance first (so members can’t change RSVP/dishes).");
      return;
    }

    setBusyId(userId);

    // update UI instantly
    setLocal((prev) =>
      prev.map((r) => (r.user_id === userId ? { ...r, attendance: next } : r))
    );

    const { error } = await supabase
      .from("rsvps")
      .update({ attendance: next })
      .eq("event_id", eventId)
      .eq("user_id", userId);

    setBusyId(null);

    if (error) {
      alert(error.message);
      setLocal(rows); // rollback
    }
  }

  return (
    <div className="space-y-3">
      {local.map((r) => {
        const name = r.profiles?.full_name ?? "Member";
        const rsvpYes = r.status === "yes" || r.attending === true;

        return (
          <div
            key={r.user_id}
            className="flex flex-col gap-2 rounded-2xl border border-rose-100 bg-white/85 p-4 shadow ring-1 ring-rose-100 backdrop-blur md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="font-semibold text-gray-900">{name}</div>
              <div className="text-sm text-gray-600">
                RSVP:{" "}
                <span className="font-semibold">
                  {rsvpYes ? "I'm Attending" : "Can't Make It"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm font-semibold text-gray-800">
                Attendance:
              </div>

              <select
                className="rounded-xl bg-[#fff8f3] px-4 py-2 outline-none ring-1 ring-rose-200 focus:ring-2 focus:ring-rose-300 disabled:opacity-60"
                value={r.attendance ?? "unknown"}
                disabled={busyId === r.user_id}
                onChange={(e) =>
                  setAttendance(r.user_id, e.target.value as Attendance)
                }
              >
                <option value="unknown">Unknown</option>
                <option value="attended">Attended ✅</option>
                <option value="no_show">No-show ❌</option>
                <option value="excused">Excused</option>
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}
