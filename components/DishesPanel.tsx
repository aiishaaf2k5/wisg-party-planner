"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type DishOpt = {
  id: string;
  name: string;
  sort_order: number | null;
};

type PickRow = {
  option_id: string | null;
  user_id: string;
  profiles?: { full_name: string | null } | null;
};

export default function DishesPanel({ eventId }: { eventId: string }) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [opts, setOpts] = useState<DishOpt[]>([]);
  const [myOptionId, setMyOptionId] = useState<string | null>(null);

  // option_id -> list of names
  const [namesByOption, setNamesByOption] = useState<Map<string, string[]>>(
    () => new Map()
  );

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    setErr(null);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    // 1) options
    const { data: options, error: optErr } = await supabase
      .from("event_dish_options")
      .select("id, name, sort_order")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true });

    if (optErr) {
      setErr(optErr.message);
      return;
    }
    setOpts((options ?? []) as DishOpt[]);

    // 2) my pick (IMPORTANT: option_id)
    const { data: myPick, error: myPickErr } = await supabase
      .from("event_dish_picks")
      .select("option_id")
      .eq("event_id", eventId)
      .eq("user_id", u.user.id)
      .maybeSingle();

    if (myPickErr) {
      setErr(myPickErr.message);
      return;
    }
    setMyOptionId((myPick as any)?.option_id ?? null);

    // 3) all picks + names
    // NOTE: requires FK from event_dish_picks.user_id -> profiles.id (you already use profiles joins elsewhere)
    const { data: pickRows, error: picksErr } = await supabase
      .from("event_dish_picks")
      .select("option_id, user_id, profiles:profiles(full_name)")
      .eq("event_id", eventId);

    if (picksErr) {
      setErr(picksErr.message);
      return;
    }

    const map = new Map<string, string[]>();
    (pickRows ?? []).forEach((r: PickRow) => {
      if (!r.option_id) return; // safety
      const name = r.profiles?.full_name ?? "Member";
      map.set(r.option_id, [...(map.get(r.option_id) ?? []), name]);
    });

    // sort names for nicer display
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.localeCompare(b));
      map.set(k, arr);
    }

    setNamesByOption(map);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await loadAll();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function choose(optionId: string) {
    setErr(null);
    setMsg(null);
    setBusy(true);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      setErr("Please sign in again.");
      return;
    }

    // âœ… MUST be option_id (your DB column)
    const payload: any = {
      event_id: eventId,
      user_id: u.user.id,
      option_id: optionId,
    };

    const res = await supabase.from("event_dish_picks").upsert(payload, {
      onConflict: "event_id,user_id",
    });

    setBusy(false);

    if (res.error) {
      setErr(res.error.message);
      return;
    }

    setMyOptionId(optionId);
    setMsg("Saved âœ…");

    // refresh counts + list so UI updates immediately
    await loadAll();
  }

  if (opts.length === 0) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-white/85 p-6 shadow ring-1 ring-rose-100 backdrop-blur">
        <div className="text-sm text-gray-600">No dish options yet.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Pick UI */}
        <div className="rounded-3xl border border-pink-200 bg-white/90 p-5 shadow-sm ring-1 ring-pink-100 backdrop-blur md:p-6">
          <div className="text-lg font-semibold text-gray-900">Choose Your Dish</div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            {opts.map((o) => {
              const selected = myOptionId === o.id;
              const pickedNames = namesByOption.get(o.id) ?? [];
              const count = pickedNames.length;

              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={busy}
                  onClick={() => choose(o.id)}
                  className={[
                    "w-full rounded-2xl border px-5 py-4 text-left font-semibold transition",
                    selected
                      ? "border-[#ee9fc3] bg-[#f4b3cf] text-[#6f2147] shadow-[0_10px_22px_-16px_rgba(244,114,182,0.52)] ring-2 ring-white"
                      : "border-pink-200 bg-white text-gray-900 hover:border-fuchsia-300 hover:bg-fuchsia-50/40",
                    busy ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-[16px]">{o.name}</div>
                      <div
                        className={
                          selected ? "text-xs text-[#7f2a53]/80" : "text-xs text-gray-600"
                        }
                      >
                        {count} picked
                      </div>
                    </div>

                    {selected ? (
                      <span className="rounded-full border border-[#eaa6c7] bg-white/90 px-3 py-1 text-xs font-bold text-[#6f2147]">
                        SELECTED
                      </span>
                    ) : (
                      <span className="rounded-full border border-current/20 px-3 py-1 text-xs">
                        Pick
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Who picked what */}
        <div className="rounded-3xl border border-fuchsia-200 bg-white/90 p-5 shadow-sm ring-1 ring-fuchsia-100 backdrop-blur md:p-6">
          <div className="text-lg font-semibold text-gray-900">Who Picked What</div>

          <div className="mt-5 space-y-4">
            {opts.map((o) => {
              const pickedNames = namesByOption.get(o.id) ?? [];
              const count = pickedNames.length;
              const highlight = myOptionId === o.id;

              return (
                <div
                  key={o.id}
                  className={[
                    "rounded-2xl border p-4 transition",
                    highlight
                      ? "border-fuchsia-300 bg-fuchsia-50/70 shadow-[0_12px_34px_-22px_rgba(217,70,239,0.65)]"
                      : "border-fuchsia-100 bg-white",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-semibold text-gray-900">{o.name}</div>
                    <div
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        count > 0
                          ? "border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                          : "border border-gray-200 bg-gray-50 text-gray-600",
                      ].join(" ")}
                    >
                      {count} picked
                    </div>
                  </div>

                  {count === 0 ? (
                    <div className="mt-3 text-sm text-gray-600">No one yet.</div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pickedNames.map((name, idx) => (
                        <span
                          key={`${o.id}-${idx}`}
                          className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-800"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {msg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {msg}
        </div>
      )}

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}
    </div>
  );
}





