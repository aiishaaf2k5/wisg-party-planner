"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type RsvpRow = {
  user_id: string;
  attending: boolean | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type AttendanceFinalRow = {
  user_id: string;
  showed_up: boolean | null;
};

type UiRow = {
  user_id: string;
  full_name: string;
  showed_up: boolean;
};

export default function AttendanceFinalize({ eventId }: { eventId: string }) {
  const supabase = createSupabaseBrowser();
  const [rows, setRows] = useState<UiRow[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    // RSVP yes list
    const rsvps = await supabase
      .from("rsvps")
      .select("user_id, attending")
      .eq("event_id", eventId);

    const yesIds = ((rsvps.data ?? []) as RsvpRow[])
      .filter((r: RsvpRow) => Boolean(r.attending))
      .map((r: RsvpRow) => r.user_id);

    // profiles names
    const prof = await supabase.from("profiles").select("id, full_name").in("id", yesIds);
    const nameMap = new Map(
      ((prof.data ?? []) as ProfileRow[]).map((p: ProfileRow) => [p.id, p.full_name])
    );

    // existing finalized
    const fin = await supabase.from("attendance_final").select("*").eq("event_id", eventId);

    const finMap = new Map(
      ((fin.data ?? []) as AttendanceFinalRow[]).map((f: AttendanceFinalRow) => [f.user_id, f.showed_up])
    );

    const list: UiRow[] = yesIds.map((id: string) => ({
      user_id: id,
      full_name: nameMap.get(id) ?? "Unknown",
      showed_up: finMap.has(id) ? Boolean(finMap.get(id)) : true,
    }));

    setRows(list);
  }

  useEffect(() => { load(); }, []);

  function setAll(v: boolean) {
    setRows((prev) => prev.map((x) => ({ ...x, showed_up: v })));
  }

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const payload = rows.map((r) => ({
      event_id: eventId,
      user_id: r.user_id,
      showed_up: !!r.showed_up,
      marked_by_admin: u.user.id,
      marked_at: new Date().toISOString(),
    }));

    // Upsert: we can insert then update; simplest do delete+insert (admin-only view anyway)
    await supabase.from("attendance_final").delete().eq("event_id", eventId);
    const ins = await supabase.from("attendance_final").insert(payload);
    if (ins.error) alert(ins.error.message);
    else alert("Attendance saved!");
    setSaving(false);
    await load();
  }

  return (
    <div className="space-y-3">
      <div className="font-medium">Finalize attendance (after event)</div>

      <div className="flex flex-wrap gap-2">
        <button className="rounded border px-3 py-1 text-sm" onClick={() => setAll(true)}>
          Mark all as showed up
        </button>
        <button className="rounded border px-3 py-1 text-sm" onClick={() => setAll(false)}>
          Mark all as no-show
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.user_id} className="flex items-center justify-between rounded border p-2">
            <div className="text-sm">{r.full_name}</div>
            <div className="flex gap-2">
              <button
                className={`rounded border px-2 py-1 text-xs ${r.showed_up ? "bg-black text-white" : ""}`}
                onClick={() =>
                  setRows((prev) =>
                    prev.map((x) =>
                      x.user_id === r.user_id ? { ...x, showed_up: true } : x
                    )
                  )
                }
              >
                Showed up
              </button>
              <button
                className={`rounded border px-2 py-1 text-xs ${!r.showed_up ? "bg-black text-white" : ""}`}
                onClick={() =>
                  setRows((prev) =>
                    prev.map((x) =>
                      x.user_id === r.user_id ? { ...x, showed_up: false } : x
                    )
                  )
                }
              >
                No-show
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        disabled={saving}
        onClick={save}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save attendance"}
      </button>

      <div className="text-xs text-muted-foreground">
        This is admin-only. It fixes “RSVP yes but didn’t show”.
      </div>
    </div>
  );
}
