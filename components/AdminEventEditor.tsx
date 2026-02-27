"use client";

import { useMemo, useState, type DragEvent } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import LocationAutocompleteInput from "@/components/LocationAutocompleteInput";

type DishOpt = { id: string; name: string; sort_order: number | null };

export default function AdminEventEditor({
  event,
  dishOptions,
}: {
  event: any;
  dishOptions: DishOpt[];
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [theme, setTheme] = useState(event.theme ?? "");
  const [startsAt, setStartsAt] = useState(
    event.starts_at ? new Date(event.starts_at).toISOString().slice(0, 16) : ""
  );
  const [locationText, setLocationText] = useState(event.location_text ?? "");
  const [dressCode, setDressCode] = useState(event.dress_code ?? "");
  const [note, setNote] = useState(event.note ?? "");

  // flyer
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [isFlyerDragOver, setIsFlyerDragOver] = useState(false);

  // keep showing what's already saved (file inputs can't keep value after render)
  const [savedFlyerPath, setSavedFlyerPath] = useState<string | null>(
    event.flyer_png_path ?? event.flyer_path ?? null
  );

  // dish editing
  const [opts, setOpts] = useState<DishOpt[]>(dishOptions ?? []);
  const [newDish, setNewDish] = useState("");

  function isImageFile(f: File) {
    return f.type.startsWith("image/");
  }

  function isPdfFile(f: File) {
    return f.type === "application/pdf";
  }

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

  function publicUrlFromPath(path: string) {
    const pub = supabase.storage.from("flyers").getPublicUrl(path);
    return pub.data?.publicUrl ?? null;
  }

  const savedFlyerUrl = savedFlyerPath ? publicUrlFromPath(savedFlyerPath) : null;

  const selectedPreviewUrl =
    flyerFile && isImageFile(flyerFile) ? URL.createObjectURL(flyerFile) : null;

  async function refreshOpts() {
    const { data } = await supabase
      .from("event_dish_options")
      .select("id, name, sort_order")
      .eq("event_id", event.id)
      .order("sort_order", { ascending: true });

    setOpts((data ?? []) as any);
  }

  async function saveDetails() {
    setMsg(null);
    setBusy(true);

    // 1) save event fields
    const up = await supabase
      .from("events")
      .update({
        theme: theme.trim(),
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        location_text: locationText.trim(),
        dress_code: dressCode.trim() || null,
        note: note.trim() || null,
      })
      .eq("id", event.id);

    if (up.error) {
      setBusy(false);
      setMsg(up.error.message);
      return;
    }

    // 2) optional flyer upload
    if (flyerFile) {
      const form = new FormData();
      form.set("file", flyerFile);

      const upRes = await fetch(`/api/admin/events/${event.id}/flyer`, {
        method: "POST",
        body: form,
      });
      const upJson = (await upRes.json().catch(() => ({}))) as {
        error?: string;
        path?: string;
      };

      if (!upRes.ok) {
        setBusy(false);
        setMsg(upJson.error ?? "Flyer upload failed.");
        return;
      }

      if (!upJson.path) {
        setBusy(false);
        setMsg("Flyer uploaded, but no file path returned.");
        return;
      }

      // ✅ update UI
      setSavedFlyerPath(upJson.path);
      setFlyerFile(null);
    }

    setBusy(false);
    setMsg("Saved ✅");
    setTimeout(() => {
        router.push("/admin/events");
    }, 500);

  }

  async function deleteEventForever() {
    const ok = confirm("Delete this event FOREVER? This removes RSVPs + dishes too.");
    if (!ok) return;

    setMsg(null);
    setBusy(true);

    const del = await fetch(`/api/admin/events/${event.id}`, {
      method: "DELETE",
    });

    const delJson = (await del.json().catch(() => ({}))) as {
      error?: string;
    };

    setBusy(false);

    if (!del.ok) return setMsg(delJson.error ?? "Could not delete event.");

    window.location.href = "/admin/events";
  }

  async function addDish() {
    const name = newDish.trim();
    if (!name) return;

    setMsg(null);
    setBusy(true);

    const nextOrder =
      opts.length > 0 ? Math.max(...opts.map((o) => o.sort_order ?? 0)) + 1 : 1;

    const ins = await supabase.from("event_dish_options").insert({
      event_id: event.id,
      name,
      sort_order: nextOrder,
    });

    setBusy(false);

    if (ins.error) return setMsg(ins.error.message);

    setNewDish("");
    await refreshOpts();
  }

  async function removeDish(id: string) {
    const ok = confirm("Remove this dish option? (picks will be deleted too)");
    if (!ok) return;

    setMsg(null);
    setBusy(true);

    const del = await supabase.from("event_dish_options").delete().eq("id", id);

    setBusy(false);

    if (del.error) return setMsg(del.error.message);

    await refreshOpts();
  }

  async function move(id: string, dir: "up" | "down") {
    const idx = opts.findIndex((o) => o.id === id);
    if (idx < 0) return;

    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= opts.length) return;

    const a = opts[idx];
    const b = opts[swapIdx];

    setMsg(null);
    setBusy(true);

    const u1 = await supabase
      .from("event_dish_options")
      .update({ sort_order: b.sort_order })
      .eq("id", a.id);

    const u2 = await supabase
      .from("event_dish_options")
      .update({ sort_order: a.sort_order })
      .eq("id", b.id);

    setBusy(false);

    if (u1.error || u2.error) {
      return setMsg(u1.error?.message ?? u2.error?.message ?? "Could not reorder.");
    }

    await refreshOpts();
  }

  async function clearAllDishPicks() {
    const ok = confirm("Clear ALL dish picks for this event?");
    if (!ok) return;

    setMsg(null);
    setBusy(true);

    const del = await supabase.from("event_dish_picks").delete().eq("event_id", event.id);

    setBusy(false);

    if (del.error) return setMsg(del.error.message);

    setMsg("Cleared dish picks ✅");
  }

  return (
    <div className="space-y-8">
      {/* Details */}
      <div className="rounded-[2rem] border border-sky-100/80 bg-white/95 p-8 shadow-[0_24px_75px_-44px_rgba(59,130,246,0.42)] transition hover:shadow-[0_30px_90px_-46px_rgba(59,130,246,0.46)]">
        <div className="text-xl font-semibold text-gray-900">Event Details</div>

        <div className="mt-6 grid gap-5">
          <div className="space-y-2">
            <div className="font-semibold text-gray-900">Theme</div>
            <input
              className="w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <div className="font-semibold text-gray-900">Date & Time</div>
              <input
                type="datetime-local"
                className="w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-gray-900">Location</div>
              <LocationAutocompleteInput
                className="w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                value={locationText}
                onChange={setLocationText}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-gray-900">Dress Code</div>
            <input
              className="w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
              value={dressCode}
              onChange={(e) => setDressCode(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-gray-900">Note</div>
            <textarea
              rows={4}
              className="w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Flyer upload */}
          <div className="space-y-2">
            <div className="font-semibold text-gray-900">Flyer (optional)</div>

            <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/35 p-4 ring-1 ring-fuchsia-100 backdrop-blur">
              {/* Current saved flyer */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-gray-700">
                  {savedFlyerPath ? (
                    <>
                      Current flyer:{" "}
                      <span className="font-semibold text-gray-900">
                        {savedFlyerPath.split("/").pop()}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-500">No flyer uploaded yet.</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/admin/flyer?eventId=${encodeURIComponent(event.id)}&returnTo=${encodeURIComponent(`/admin/events/${event.id}/edit`)}`
                      )
                    }
                    className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-300 bg-white px-5 py-3 text-base font-bold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow"
                  >
                    Use AI Flyer Generator
                  </button>

                  {savedFlyerUrl && (
                    <a
                      href={savedFlyerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-300 bg-white px-5 py-3 text-base font-bold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow"
                    >
                      View current
                      <span aria-hidden>{"\u2197"}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Saved preview */}
              {savedFlyerUrl && savedFlyerPath && savedFlyerPath.toLowerCase().endsWith(".pdf") ? (
                <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
                  <span className="font-semibold">PDF flyer saved</span> - click "View current" to open.
                </div>
              ) : savedFlyerUrl ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-rose-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={savedFlyerUrl} alt="Current flyer" className="h-48 w-full object-cover" />
                </div>
              ) : null}

              {/* New selection UI */}
              <div
                className={[
                  "mt-5 rounded-2xl border-2 border-dashed p-3 transition",
                  isFlyerDragOver
                    ? "border-rose-400 bg-rose-50/70"
                    : "border-rose-200 bg-transparent",
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
                <div className="mb-3 text-xs font-semibold text-gray-600">
                  Drag and drop PNG/JPG/PDF here, or choose a file
                </div>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-[#fff8f3] px-4 py-3 hover:bg-rose-50">
                  <span className="font-semibold text-gray-900">Choose file</span>

                  <span className="text-sm text-gray-600 truncate max-w-[60%]">
                    {flyerFile ? flyerFile.name : "No file chosen"}
                  </span>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,application/pdf"
                    className="hidden"
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

                {/* New file preview */}
                {flyerFile && (
                  <div className="mt-4 space-y-3">
                    {isPdfFile(flyerFile) ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <span className="font-semibold">PDF selected:</span> {flyerFile.name}
                      </div>
                    ) : selectedPreviewUrl ? (
                      <div className="overflow-hidden rounded-2xl border border-rose-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedPreviewUrl}
                          alt="Selected flyer preview"
                          className="h-48 w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                        Selected file: <span className="font-semibold">{flyerFile.name}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setFlyerFile(null)}
                      className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-rose-50"
                    >
                      Remove selected file
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {msg && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900">
              {msg}
            </div>
          )}
        </div>
      </div>

      {/* Dishes */}
      <div className="rounded-[2rem] border border-amber-100/90 bg-white/95 p-8 shadow-[0_24px_75px_-44px_rgba(245,158,11,0.4)] transition hover:shadow-[0_30px_90px_-46px_rgba(245,158,11,0.44)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-gray-900">Dish List</div>
            <div className="text-sm text-amber-700/80">Admins can edit this anytime.</div>
          </div>

          <button
            disabled={busy}
            onClick={clearAllDishPicks}
            className="rounded-2xl border border-amber-200 bg-white px-5 py-3 font-semibold text-amber-800 transition hover:bg-amber-50 disabled:opacity-60"
          >
            Clear all picks
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={newDish}
            onChange={(e) => setNewDish(e.target.value)}
            placeholder="e.g., Biryani"
            className="w-full rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
          />
          <button
            disabled={busy || !newDish.trim()}
            onClick={addDish}
            className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-7 py-3 text-base font-semibold text-white shadow-[0_14px_35px_rgba(245,158,11,0.3)] transition hover:opacity-95 disabled:opacity-60"
          >
            Add Dish
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {opts.length === 0 ? (
            <div className="text-sm text-gray-600">No dishes yet.</div>
          ) : (
            opts.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-rose-50/60 p-4 ring-1 ring-rose-100"
              >
                <div className="font-semibold text-gray-900">{o.name}</div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={busy}
                    onClick={() => move(o.id, "up")}
                    className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-rose-50 disabled:opacity-60"
                  >
                    ↑
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => move(o.id, "down")}
                    className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-rose-50 disabled:opacity-60"
                  >
                    ↓
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => removeDish(o.id)}
                    className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom actions only */}
      <div className="flex flex-wrap gap-3 justify-end">
        <button
          disabled={busy}
          onClick={saveDetails}
          className="rounded-2xl bg-gradient-to-r from-rose-700 to-pink-700 px-8 py-3.5 text-base font-semibold text-white shadow-[0_16px_36px_rgba(190,24,93,0.34)] transition hover:opacity-95 disabled:opacity-60"
        >
          Save Changes
        </button>

        <button
          disabled={busy}
          onClick={deleteEventForever}
          className="rounded-2xl border border-red-200 bg-white px-6 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </div>
  );
}





