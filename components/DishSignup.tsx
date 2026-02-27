"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const CATEGORIES = ["Appetizer", "Main", "Dessert", "Drinks", "Other"];

export default function DishSignup({ eventId }: { eventId: string }) {
  const supabase = createSupabaseBrowser();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [dishName, setDishName] = useState("");
  const [all, setAll] = useState<any[]>([]);
  const [mine, setMine] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of CATEGORIES) m[c] = 0;
    for (const r of all) m[r.category] = (m[r.category] ?? 0) + 1;
    return m;
  }, [all]);

  const warning = useMemo(() => {
    const n = counts[category] ?? 0;
    if (n >= 4) return `⚠️ Many people already chose ${category}.`;
    if (n >= 2) return `Heads up: ${n} people already chose ${category}.`;
    return null;
  }, [counts, category]);

  async function load() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const rows = await supabase.from("dish_signups").select("*").eq("event_id", eventId);
    setAll(rows.data ?? []);

    const me = (rows.data ?? []).find((r) => r.user_id === user.user.id) ?? null;
    setMine(me);
    if (me) {
      setCategory(me.category);
      setDishName(me.dish_name);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    await supabase.from("dish_signups").upsert({
      event_id: eventId,
      user_id: user.user.id,
      category,
      dish_name: dishName,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    await load();
  }

  return (
    <div className="rounded border p-4 space-y-3">
      <div className="font-semibold">Dish sign-up</div>

      <div className="grid gap-2 sm:grid-cols-2">
        <select
          className="rounded border p-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c} ({counts[c] ?? 0})
            </option>
          ))}
        </select>

        <input
          className="rounded border p-2"
          placeholder="What will you bring? (e.g., biryani)"
          value={dishName}
          onChange={(e) => setDishName(e.target.value)}
        />
      </div>

      {warning && <div className="text-sm text-amber-600">{warning}</div>}

      <button
        disabled={saving || dishName.trim().length < 2}
        onClick={save}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {mine ? "Update my dish" : "Save my dish"}
      </button>

      <div className="pt-2">
        <div className="text-sm font-medium">Current list</div>
        <div className="mt-2 space-y-2 text-sm">
          {(all ?? []).map((r) => (
            <div key={r.user_id} className="flex justify-between rounded border p-2">
              <span>{r.dish_name}</span>
              <span className="text-muted-foreground">{r.category}</span>
            </div>
          ))}
          {(all ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground">No dishes yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
