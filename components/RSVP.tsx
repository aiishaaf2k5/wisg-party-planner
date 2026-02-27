"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function RSVP({ eventId }: { eventId: string }) {
  const supabase = createSupabaseBrowser();
  const [attending, setAttending] = useState<boolean | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [counts, setCounts] = useState({ yes: 0, no: 0 });
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const me = await supabase
      .from("rsvps")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", user.user.id)
      .maybeSingle();

    if (me.data) {
      setAttending(me.data.attending);
      setGuestCount(me.data.guest_count ?? 0);
    }

    const all = await supabase.from("rsvps").select("attending").eq("event_id", eventId);
    const yes = (all.data ?? []).filter((r) => r.attending).length;
    const no = (all.data ?? []).filter((r) => !r.attending).length;
    setCounts({ yes, no });
  }

  useEffect(() => { load(); }, []);

  async function save(next: boolean) {
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    await supabase.from("rsvps").upsert({
      event_id: eventId,
      user_id: user.user.id,
      attending: next,
      guest_count: guestCount,
      updated_at: new Date().toISOString(),
    });

    setAttending(next);
    setSaving(false);
    await load();
  }

  return (
    <div className="rounded border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">RSVP</div>
        <div className="text-sm text-muted-foreground">
          Yes: {counts.yes} • No: {counts.no}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          disabled={saving}
          onClick={() => save(true)}
          className={`rounded px-3 py-2 border ${attending === true ? "bg-black text-white" : ""}`}
        >
          Attending
        </button>
        <button
          disabled={saving}
          onClick={() => save(false)}
          className={`rounded px-3 py-2 border ${attending === false ? "bg-black text-white" : ""}`}
        >
          Not attending
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span>Guests:</span>
        <input
          type="number"
          min={0}
          max={5}
          value={guestCount}
          onChange={(e) => setGuestCount(Number(e.target.value))}
          className="w-20 rounded border p-1"
        />
        <span className="text-muted-foreground">(optional)</span>
      </div>

      <div className="text-xs text-muted-foreground">
        Tip: Set RSVP first, then choose your dish below.
      </div>
    </div>
  );
}
