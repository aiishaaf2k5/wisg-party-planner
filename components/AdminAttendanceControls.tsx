"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Row = {
  user_id: string;
  name: string;
  rsvp_status: "yes" | "no" | "unknown";
  attendance_override: "attended" | "no_show" | null;
};

export default function AdminAttendanceControls({
  eventId,
  rows,
}: {
  eventId: string;
  rows: Row[];
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [busyUser, setBusyUser] = useState<string | null>(null);

  const [overrides, setOverrides] = useState<
    Record<string, "attended" | "no_show" | null>
  >(Object.fromEntries(rows.map((r) => [r.user_id, r.attendance_override ?? null])));

  async function setOverride(userId: string, next: "attended" | "no_show" | null) {
    setBusyUser(userId);

    // ✅ If clearing, DELETE the row (safer than writing null)
    if (next === null) {
      const del = await supabase
        .from("attendance")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", userId);

      setBusyUser(null);

      if (del.error) {
        alert(del.error.message);
        return;
      }

      setOverrides((prev) => ({ ...prev, [userId]: null }));
      return;
    }

    // ✅ Otherwise upsert attended / no_show
    const res = await supabase.from("attendance").upsert(
      {
        event_id: eventId,
        user_id: userId,
        status: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,user_id" }
    );

    setBusyUser(null);

    if (res.error) {
      alert(res.error.message);
      return;
    }

    setOverrides((prev) => ({ ...prev, [userId]: next }));
  }

  if (!rows || rows.length === 0) return null;

  // sort: YES first, then NO, then unknown
  const sorted = [...rows].sort((a, b) => {
    const rank = (s: Row["rsvp_status"]) => (s === "yes" ? 0 : s === "no" ? 1 : 2);
    return rank(a.rsvp_status) - rank(b.rsvp_status);
  });
  function getEffectiveStatus(r: Row): "yes" | "no" | "unknown" {
    const ov = overrides[r.user_id];
    if (ov === "attended") return "yes";
    if (ov === "no_show") return "no";
    return r.rsvp_status;
  }

  const yesCount = sorted.filter((r) => getEffectiveStatus(r) === "yes").length;
  const noCount = sorted.filter((r) => getEffectiveStatus(r) === "no").length;
  const unknownCount = sorted.filter((r) => getEffectiveStatus(r) === "unknown").length;

  return (
    <div className="rounded-3xl border border-pink-200 bg-white/92 p-6 shadow-sm ring-1 ring-pink-100 backdrop-blur md:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-600">
            Attendance Marking
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            After-event Attendance
          </div>
        </div>
        <span className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
          {sorted.length} members
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-pink-200 bg-pink-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-700">
            Total
          </div>
          <div className="mt-1 text-2xl font-semibold text-pink-900">{sorted.length}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            Yes
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-900">{yesCount}</div>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">
            No
          </div>
          <div className="mt-1 text-2xl font-semibold text-rose-900">{noCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            Unknown
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-800">{unknownCount}</div>
        </div>
      </div>

      <div className="space-y-5">
        {sorted.map((r, idx) => {
          const current = overrides[r.user_id];
          const attendedActive = current === "attended";
          const noShowActive = current === "no_show";
          const initials = r.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("");

          return (
            <div
              key={r.user_id}
              className="animate-rise-in rounded-2xl border border-pink-100 bg-white p-5 shadow-sm"
              style={{
                animationDelay: `${80 + idx * 40}ms`,
                animationFillMode: "both",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-100 text-xs font-bold text-pink-800">
                    {initials || "M"}
                  </div>
                  <div>
                    <div className="text-[16px] font-semibold text-gray-900">
                      {r.name}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      RSVP:{" "}
                      <span className="font-semibold text-gray-900">
                        {r.rsvp_status === "yes"
                          ? "Yes"
                          : r.rsvp_status === "no"
                          ? "No"
                          : "Unknown"}
                      </span>
                      {" • "}
                      Admin:{" "}
                      <span
                        className={[
                          "font-semibold",
                          attendedActive
                            ? "text-emerald-700"
                            : noShowActive
                            ? "text-rose-700"
                            : "text-gray-500",
                        ].join(" ")}
                      >
                        {attendedActive
                          ? "Attended"
                          : noShowActive
                          ? "No show"
                          : "Not marked"}
                      </span>
                    </div>
                  </div>
                </div>

                {noShowActive ? (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                    No show
                  </span>
                ) : attendedActive ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Attended
                  </span>
                ) : (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                    Unmarked
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  disabled={busyUser === r.user_id}
                  onClick={() => setOverride(r.user_id, "attended")}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition",
                    attendedActive
                      ? "border-emerald-500 bg-emerald-600 text-white"
                      : "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50",
                    busyUser === r.user_id ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Mark Attended
                </button>

                <button
                  disabled={busyUser === r.user_id}
                  onClick={() => setOverride(r.user_id, "no_show")}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition",
                    noShowActive
                      ? "border-rose-500 bg-rose-600 text-white"
                      : "border-rose-300 bg-white text-rose-700 hover:bg-rose-50",
                    busyUser === r.user_id ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Mark No show
                </button>

                {current && (
                  <button
                    disabled={busyUser === r.user_id}
                    onClick={() => setOverride(r.user_id, null)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Clear
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
