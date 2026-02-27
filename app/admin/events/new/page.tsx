"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import LocationAutocompleteInput from "@/components/LocationAutocompleteInput";

export const dynamic = "force-dynamic";

type AdminRow = { id: string; full_name: string };

type PrefillState = {
  eventId: string;
  theme: string;
  startsAt: string;
  locationText: string;
  dressCode: string;
  note: string;
  owner1: string;
  owner2: string;
  dishesRaw: string;
  generatedFlyerPngPath: string;
  generatedFlyerPdfPath: string;
  generatedFlyerTemplate: string;
};

function normalizeDishName(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

export default function NewEventPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [prefill, setPrefill] = useState<PrefillState>({
    eventId: "",
    theme: "",
    startsAt: "",
    locationText: "",
    dressCode: "",
    note: "",
    owner1: "",
    owner2: "",
    dishesRaw: "",
    generatedFlyerPngPath: "",
    generatedFlyerPdfPath: "",
    generatedFlyerTemplate: "",
  });
  const [prefillApplied, setPrefillApplied] = useState(false);

  function parsePrefillDishes(raw: string) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      const cleaned = parsed
        .map((v) => normalizeDishName(String(v ?? "")))
        .filter(Boolean);
      return cleaned.length > 0 ? cleaned : null;
    } catch {
      return null;
    }
  }

  const draftEventId = prefill.eventId;
  const isDraftMode = !!draftEventId;
  const prefillOwner1 = prefill.owner1;
  const prefillOwner2 = prefill.owner2;
  const prefillGeneratedFlyerPngPath = prefill.generatedFlyerPngPath;
  const prefillGeneratedFlyerPdfPath = prefill.generatedFlyerPdfPath;
  const prefillGeneratedFlyerTemplate = prefill.generatedFlyerTemplate;

  const [theme, setTheme] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [locationText, setLocationText] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [note, setNote] = useState("");

  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [owner1, setOwner1] = useState("");
  const [owner2, setOwner2] = useState("");

  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [isFlyerDragOver, setIsFlyerDragOver] = useState(false);

  // âœ… Dish list
  const [dishInput, setDishInput] = useState("");
  const [dishes, setDishes] = useState<string[]>(["Biryani", "Kebab", "Samosa", "Drinks", "Dessert"]);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sp =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    if (!sp) return;

    setPrefill({
      eventId: (sp.get("eventId") ?? "").trim(),
      theme: (sp.get("theme") ?? "").trim(),
      startsAt: (sp.get("startsAt") ?? "").trim(),
      locationText: (sp.get("locationText") ?? "").trim(),
      dressCode: (sp.get("dressCode") ?? "").trim(),
      note: (sp.get("note") ?? "").trim(),
      owner1: (sp.get("owner1") ?? "").trim(),
      owner2: (sp.get("owner2") ?? "").trim(),
      dishesRaw: (sp.get("dishes") ?? "").trim(),
      generatedFlyerPngPath: (sp.get("generatedFlyerPngPath") ?? "").trim(),
      generatedFlyerPdfPath: (sp.get("generatedFlyerPdfPath") ?? "").trim(),
      generatedFlyerTemplate: (sp.get("generatedFlyerTemplate") ?? "").trim(),
    });
  }, []);

  useEffect(() => {
    if (prefillApplied) return;

    const prefillDishes = parsePrefillDishes(prefill.dishesRaw);
    if (prefill.theme) setTheme(prefill.theme);
    if (prefill.startsAt) setStartsAt(prefill.startsAt);
    if (prefill.locationText) setLocationText(prefill.locationText);
    if (prefill.dressCode) setDressCode(prefill.dressCode);
    if (prefill.note) setNote(prefill.note);
    if (prefill.owner1) setOwner1(prefill.owner1);
    if (prefill.owner2) setOwner2(prefill.owner2);
    if (prefillDishes) setDishes(prefillDishes);

    setPrefillApplied(true);
  }, [prefill, prefillApplied]);

  function isAllowedFlyerFile(file: File) {
    return file.type.startsWith("image/") || file.type === "application/pdf";
  }

  function onFlyerDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsFlyerDragOver(false);

    const file = e.dataTransfer.files?.[0] ?? null;
    if (!file) return;

    if (!isAllowedFlyerFile(file)) {
      alert("Please drop a PNG, JPG, or PDF file.");
      return;
    }

    setFlyerFile(file);
  }

  const ownerError = useMemo(() => {
    if (!owner1 || !owner2) return "Select two admins.";
    if (owner1 === owner2) return "Owner 1 and Owner 2 must be different.";
    return null;
  }, [owner1, owner2]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        window.location.href = "/login";
        return;
      }

      const meRes = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", u.user.id)
        .maybeSingle();

      const me = meRes.data;

      if (!me?.full_name) {
        alert("Please set your name first (onboarding).");
        window.location.href = "/onboarding";
        return;
      }

      if (me.role !== "admin") {
        alert("Admins only.");
        window.location.href = "/";
        return;
      }

      const list = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "admin")
        .order("full_name", { ascending: true });

      const rows = (list.data ?? []) as AdminRow[];
      setAdmins(rows);
      if (isDraftMode) {
        const evRes = await supabase
          .from("events")
          .select("id, theme, starts_at, location_text, dress_code, note")
          .eq("id", draftEventId)
          .maybeSingle();

        const ev = evRes.data as any;
        if (ev?.id) {
          setTheme(ev.theme ?? "");
          setStartsAt(
            ev.starts_at ? new Date(ev.starts_at).toISOString().slice(0, 16) : ""
          );
          setLocationText(ev.location_text ?? "");
          setDressCode(ev.dress_code ?? "");
          setNote(ev.note ?? "");

          const ownersRes = await supabase
            .from("event_owners")
            .select("admin_id")
            .eq("event_id", draftEventId);
          const ownerIds = (ownersRes.data ?? []).map((r: any) => r.admin_id);
          if (ownerIds[0]) setOwner1(ownerIds[0]);
          if (ownerIds[1]) setOwner2(ownerIds[1]);

          const dishRes = await supabase
            .from("event_dish_options")
            .select("name, sort_order")
            .eq("event_id", draftEventId)
            .order("sort_order", { ascending: true });
          const draftDishes = (dishRes.data ?? [])
            .map((d: any) => String(d.name ?? "").trim())
            .filter(Boolean);
          if (draftDishes.length > 0) setDishes(draftDishes);
        }
      } else {
        if (!prefillOwner1) setOwner1(me.id);
        if (!prefillOwner2) {
          const second = rows.find((a) => a.id !== me.id);
          if (second) setOwner2(second.id);
        }
      }
    })();
  }, [supabase, draftEventId, isDraftMode, prefillOwner1, prefillOwner2]);

  function addDish() {
    const cleaned = normalizeDishName(dishInput);
    if (!cleaned) return;

    // prevent duplicates (case-insensitive)
    const exists = dishes.some((d) => d.toLowerCase() === cleaned.toLowerCase());
    if (exists) {
      setDishInput("");
      return;
    }

    setDishes((prev) => [...prev, cleaned]);
    setDishInput("");
  }

  function removeDish(name: string) {
    setDishes((prev) => prev.filter((d) => d !== name));
  }

  function openFlyerPreviewFromDraftForm() {
    if (isDraftMode) {
      void createEvent(true);
      return;
    }

    const params = new URLSearchParams();
    params.set("draft", "1");
    if (theme.trim()) params.set("theme", theme.trim());
    if (startsAt) params.set("startsAt", startsAt);
    if (locationText.trim()) params.set("locationText", locationText.trim());
    if (dressCode.trim()) params.set("dressCode", dressCode.trim());
    if (note.trim()) params.set("note", note.trim());
    if (owner1) params.set("owner1", owner1);
    if (owner2) params.set("owner2", owner2);
    params.set("dishes", JSON.stringify(dishes));
    if (prefillGeneratedFlyerPngPath) {
      params.set("generatedFlyerPngPath", prefillGeneratedFlyerPngPath);
    }
    if (prefillGeneratedFlyerPdfPath) {
      params.set("generatedFlyerPdfPath", prefillGeneratedFlyerPdfPath);
    }
    if (prefillGeneratedFlyerTemplate) {
      params.set("generatedFlyerTemplate", prefillGeneratedFlyerTemplate);
    }
    window.location.href = `/admin/flyer?${params.toString()}`;
  }

  async function createEvent(redirectToFlyer = false) {
    if (ownerError) return alert(ownerError);
    if (!theme.trim() || !startsAt || !locationText.trim()) {
      return alert("Theme, Date/Time, and Location are required.");
    }

    setBusy(true);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      return;
    }

    let eventId = draftEventId;

    if (isDraftMode) {
      const upd = await supabase
        .from("events")
        .update({
          theme: theme.trim(),
          starts_at: new Date(startsAt).toISOString(),
          location_text: locationText.trim(),
          dress_code: dressCode.trim() || null,
          note: note.trim() || null,
        })
        .eq("id", draftEventId);

      if (upd.error) {
        alert(upd.error.message);
        setBusy(false);
        return;
      }
    } else {
      // 1) Create event
      const ins = await supabase
        .from("events")
        .insert({
          theme: theme.trim(),
          starts_at: new Date(startsAt).toISOString(),
          location_text: locationText.trim(),
          dress_code: dressCode.trim() || null,
          note: note.trim() || null,
          flyer_template: "elegant",
          created_by: u.user.id,
        })
        .select("*")
        .single();

      if (ins.error) {
        alert(ins.error.message);
        setBusy(false);
        return;
      }

      eventId = ins.data.id;
    }

    if (!eventId) {
      setBusy(false);
      alert("Could not determine event ID.");
      return;
    }

    // 2) Owners (server-side sync to avoid browser RLS issues)
    const ownerRes = await fetch(`/api/admin/events/${eventId}/owners`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerIds: [owner1, owner2] }),
    });

    const ownerJson = (await ownerRes.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!ownerRes.ok) {
      alert(ownerJson.error ?? "Failed to save event owners.");
      setBusy(false);
      return;
    }

    // 3) Dish options (create list here âœ…)
    const cleanedDishList = dishes
      .map(normalizeDishName)
      .filter(Boolean);

    await supabase.from("event_dish_options").delete().eq("event_id", eventId);
    if (cleanedDishList.length > 0) {
      const dishInsert = await supabase.from("event_dish_options").insert(
        cleanedDishList.map((name) => ({
          event_id: eventId,
          name,
        }))
      );

      if (dishInsert.error) {
        alert("Event created, but dish list failed: " + dishInsert.error.message);
        // we still continue
      }
    }

    // 4) Optional flyer upload
    if (!redirectToFlyer && flyerFile) {
      const form = new FormData();
      form.set("file", flyerFile);

      const upRes = await fetch(`/api/admin/events/${eventId}/flyer`, {
        method: "POST",
        body: form,
      });

      const upJson = (await upRes.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!upRes.ok) {
        alert(`Event created, but flyer upload failed: ${upJson.error ?? "Unknown error"}`);
      }
    } else if (
      !redirectToFlyer &&
      (prefillGeneratedFlyerPngPath || prefillGeneratedFlyerPdfPath)
    ) {
      const attachRes = await fetch(
        `/api/admin/events/${eventId}/flyer/attach-generated`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pngPath: prefillGeneratedFlyerPngPath || undefined,
            pdfPath: prefillGeneratedFlyerPdfPath || undefined,
            template: prefillGeneratedFlyerTemplate || undefined,
          }),
        }
      );

      const attachJson = (await attachRes.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!attachRes.ok) {
        alert(
          `Event created, but attaching generated flyer failed: ${attachJson.error ?? "Unknown error"}`
        );
      }
    }

    if (redirectToFlyer) {
      window.location.href = `/admin/flyer?eventId=${encodeURIComponent(eventId)}`;
      return;
    }

    window.location.href = `/events/${eventId}`;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff8ed_0%,_#fff4fa_45%,_#f7f5ff_100%)]">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_30px_90px_-40px_rgba(139,92,246,0.35)] backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-base font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Back
            </Link>

            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">Event Studio</p>
              <h1 className="mt-2 text-5xl font-bold tracking-tight text-gray-900">Create New Event</h1>
              <p className="mt-3 text-lg text-gray-600">Design a polished event setup in one guided flow.</p>
            </div>

            <div className="w-[92px]" />
          </div>
        </div>

        <div className="mt-8 grid gap-7">
          <section className="rounded-[2rem] border border-rose-100/80 bg-white/90 p-8 shadow-[0_20px_70px_-45px_rgba(225,29,72,0.45)]">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-rose-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11Z" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 11c1.657 0 3-1.567 3-3.5S9.657 4 8 4 5 5.567 5 7.5 6.343 11 8 11Z" stroke="currentColor" strokeWidth="2" />
                  <path d="M3 20c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M21 20c0-3.314-2.686-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M9 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900">Event Owners</h2>
                <p className="mt-2 text-lg text-gray-600">Assign two admins responsible for planning and coordination.</p>

                <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-base font-semibold text-gray-900">Owner 1 *</span>
                    <select
                      className="w-full rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
                      value={owner1}
                      onChange={(e) => setOwner1(e.target.value)}
                    >
                      <option value="">Select admin...</option>
                      {admins.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.full_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-base font-semibold text-gray-900">Owner 2 *</span>
                    <select
                      className="w-full rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
                      value={owner2}
                      onChange={(e) => setOwner2(e.target.value)}
                    >
                      <option value="">Select admin...</option>
                      {admins.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.full_name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {ownerError && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base font-semibold text-red-700">{ownerError}</div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-rose-100/80 bg-white/90 p-8 shadow-[0_20px_70px_-45px_rgba(59,130,246,0.45)]">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-sky-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900">Event Details</h2>
                <p className="mt-2 text-lg text-gray-600">Set the core info members will see in cards, reminders, and RSVPs.</p>

                <div className="mt-7 space-y-5">
                  <label className="space-y-2 block">
                    <span className="text-base font-semibold text-gray-900">Theme / Event Name *</span>
                    <input
                      className="w-full rounded-2xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                      placeholder="e.g., Bollywood Glam Night"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <label className="space-y-2 block">
                      <span className="text-base font-semibold text-gray-900">Date and Time *</span>
                      <input
                        type="datetime-local"
                        className="w-full rounded-2xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                      />
                    </label>

                    <label className="space-y-2 block">
                      <span className="text-base font-semibold text-gray-900">Location *</span>
                      <LocationAutocompleteInput
                        className="w-full rounded-2xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                        placeholder="e.g., Community Center"
                        value={locationText}
                        onChange={setLocationText}
                      />
                    </label>
                  </div>

                  <label className="space-y-2 block">
                    <span className="text-base font-semibold text-gray-900">Dress Code</span>
                    <input
                      className="w-full rounded-2xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                      placeholder="e.g., Sparkly Indian/Pakistani attire"
                      value={dressCode}
                      onChange={(e) => setDressCode(e.target.value)}
                    />
                  </label>

                  <label className="space-y-2 block">
                    <span className="text-base font-semibold text-gray-900">Note / Additional Info</span>
                    <textarea
                      className="w-full rounded-2xl border border-sky-200 bg-sky-50/60 px-4 py-4 text-base text-gray-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                      placeholder="e.g., Remember to bring your favorite dish to share!"
                      rows={5}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-amber-100/90 bg-white/90 p-8 shadow-[0_20px_70px_-45px_rgba(245,158,11,0.5)]">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-amber-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12c0 4.418 3.582 8 8 8s8-3.582 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 7c1 0 1 2 2 2s1-2 2-2 1 2 2 2 1-2 2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900">Dish List</h2>
                <p className="mt-2 text-lg text-gray-600">Add dish options members can choose from during RSVP.</p>

                <div className="mt-7 flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    className="w-full rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
                    placeholder="Type a dish (e.g., Chicken Biryani)"
                    value={dishInput}
                    onChange={(e) => setDishInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addDish();
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={addDish}
                    className="rounded-2xl bg-amber-500 px-7 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-amber-600"
                  >
                    Add Dish
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {dishes.length === 0 ? (
                    <div className="text-base text-gray-500">No dish options yet (optional).</div>
                  ) : (
                    dishes.map((d) => (
                      <div
                        key={d}
                        className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900"
                      >
                        {d}
                        <button
                          type="button"
                          onClick={() => removeDish(d)}
                          className="grid h-6 w-6 place-items-center rounded-full bg-white text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                          aria-label={`Remove ${d}`}
                          title="Remove"
                        >
                          x
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <p className="mt-4 text-sm text-gray-500">Tip: Drinks and Dessert are useful generic defaults.</p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-emerald-100/90 bg-white/90 p-8 shadow-[0_20px_70px_-45px_rgba(16,185,129,0.5)]">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-emerald-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900">Event Flyer</h2>
                <p className="mt-2 text-lg text-gray-600">Upload a flyer or generate one with AI for this exact event.</p>

                <div
                  className={[
                    "mt-7 rounded-[1.5rem] border-2 border-dashed px-8 py-14 text-center transition",
                    isFlyerDragOver
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-emerald-200 bg-emerald-50/30",
                  ].join(" ")}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsFlyerDragOver(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = "copy";
                    if (!isFlyerDragOver) setIsFlyerDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsFlyerDragOver(false);
                  }}
                  onDrop={onFlyerDrop}
                >
                  <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-white ring-1 ring-emerald-200">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
                      <path d="M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>

                  <p className="text-lg font-semibold text-gray-800">Click to upload or drag and drop</p>
                  <p className="mt-2 text-base text-gray-500">PNG, JPG, PDF up to 10MB</p>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <label className="cursor-pointer rounded-2xl border border-emerald-200 bg-white px-6 py-3 text-base font-semibold text-gray-900 transition hover:bg-emerald-50">
                      Choose File
                      <input
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          if (!file) return;
                          if (!isAllowedFlyerFile(file)) {
                            alert("Please choose a PNG, JPG, or PDF file.");
                            return;
                          }
                          setFlyerFile(file);
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={openFlyerPreviewFromDraftForm}
                      disabled={busy}
                      className="rounded-2xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {busy ? "Preparing..." : isDraftMode ? "Use AI Generator For This Event" : "Preview AI Generator"}
                    </button>
                  </div>

                  {flyerFile && (
                    <div className="mt-6 text-base text-gray-700">
                      Selected: <span className="font-semibold">{flyerFile.name}</span>
                    </div>
                  )}

                  {!flyerFile && prefillGeneratedFlyerPngPath && (
                    <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-900">
                      AI flyer ready for this event:
                      <span className="ml-1 font-semibold">{prefillGeneratedFlyerPngPath.split("/").pop()}</span>
                    </div>
                  )}
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Link
                    href="/admin"
                    className="rounded-2xl border border-gray-200 bg-white py-4 text-center text-base font-semibold text-gray-900 transition hover:bg-gray-50"
                  >
                    Cancel
                  </Link>

                  <button
                    onClick={() => void createEvent(false)}
                    disabled={busy}
                    className="rounded-2xl bg-gray-900 py-4 text-center text-base font-semibold text-white shadow-sm transition hover:bg-black disabled:opacity-60"
                  >
                    {busy ? "Saving..." : isDraftMode ? "Save Event" : "Create Event"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
