"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Status = "yes" | "no" | null;

export default function RSVPPanel({
  eventId,
  initialStatus,
  onStatusChange,
  disabled = false,
}: {
  eventId: string;
  initialStatus: Status;
  onStatusChange?: (next: Status) => void;
  disabled?: boolean; // ✅ NEW
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [status, setStatus] = useState<Status>(initialStatus ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // prevent calling onStatusChange twice on first load
  const didInitRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data } = await supabase
        .from("rsvps")
        .select("status, attending")
        .eq("event_id", eventId)
        .eq("user_id", u.user.id)
        .maybeSingle();

      if (!data) return;

      let next: Status = null;

      if (typeof (data as any).status === "string") {
        next = (data as any).status as Status;
      } else if (typeof (data as any).attending === "boolean") {
        next = (data as any).attending ? "yes" : "no";
      }

      if (!next) return;

      setStatus(next);

      if (!didInitRef.current) {
        didInitRef.current = true;
        onStatusChange?.(next);
      }
    })();
  }, [eventId, supabase, onStatusChange]);

  async function save(next: Exclude<Status, null>) {
    if (disabled) return;

    setErr(null);
    setBusy(true);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setErr("Please sign in again.");
      setBusy(false);
      return;
    }

    // If switching to NO: delete dish pick first
    if (next === "no") {
      const del = await supabase
        .from("event_dish_picks")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", u.user.id);

      if (del.error) {
        setErr(del.error.message);
        setBusy(false);
        return;
      }
    }

    const payload: any = {
      event_id: eventId,
      user_id: u.user.id,
      status: next,
      attending: next === "yes",
    };

    const res = await supabase.from("rsvps").upsert(payload, {
      onConflict: "event_id,user_id",
    });

    setBusy(false);

    if (res.error) {
      setErr(res.error.message);
      return;
    }

    setStatus(next);
    onStatusChange?.(next);
    window.dispatchEvent(
      new CustomEvent("event-rsvp-changed", {
        detail: { eventId },
      })
    );
  }

  const yesActive = status === "yes";
  const noActive = status === "no";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* YES */}
        <button
          disabled={busy || disabled}
          onClick={() => save("yes")}
          className={[
            "w-full rounded-2xl px-6 py-5 text-center font-semibold transition",
            "border",
            yesActive
              ? "bg-[#16a34a] text-white border-[#16a34a] shadow-[0_14px_40px_rgba(22,163,74,0.35)]"
              : "bg-white text-gray-900 border-emerald-100 hover:bg-[#16a34a] hover:text-white hover:border-[#16a34a] hover:shadow-[0_14px_40px_rgba(22,163,74,0.25)]",
            busy || disabled ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        >
          <span className="inline-flex items-center gap-2 justify-center">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-current/20">
              ✓
            </span>
            I&apos;m Attending!
          </span>
        </button>

        {/* NO */}
        <button
          disabled={busy || disabled}
          onClick={() => save("no")}
          className={[
            "w-full rounded-2xl px-6 py-5 text-center font-semibold transition",
            "border",
            noActive
              ? "bg-[#e11d48] text-white border-[#e11d48] shadow-[0_14px_40px_rgba(225,29,72,0.35)]"
              : "bg-white text-gray-900 border-rose-100 hover:bg-[#e11d48] hover:text-white hover:border-[#e11d48] hover:shadow-[0_14px_40px_rgba(225,29,72,0.25)]",
            busy || disabled ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        >
          <span className="inline-flex items-center gap-2 justify-center">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-current/20">
              ✕
            </span>
            Can&apos;t Make It
          </span>
        </button>
      </div>

      {disabled && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          RSVP is locked because this event has ended.
        </div>
      )}

      {err && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}
    </div>
  );
}
