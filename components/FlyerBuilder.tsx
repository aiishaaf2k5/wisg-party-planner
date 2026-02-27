"use client";

import { useEffect, useMemo, useState } from "react";
import { EventRow } from "@/types/db";
import { formatDateTime } from "@/lib/utils";
import { PRO_FLYER_PRESETS, pickProPreset } from "@/lib/flyer/pro-presets";

const palettePresets = [
  { name: "Winter Ice", colors: ["#0E7490", "#155E75", "#E0F2FE"] },
  { name: "Red Carpet", colors: ["#7F1D1D", "#991B1B", "#FDE68A"] },
  { name: "Eid Moonlight", colors: ["#064E3B", "#065F46", "#A7F3D0"] },
  { name: "Desi Glow", colors: ["#7C2D12", "#EA580C", "#FDBA74"] },
  { name: "Royal Purple", colors: ["#4C1D95", "#6D28D9", "#DDD6FE"] },
];

type FlyerBuilderEvent = Pick<
  EventRow,
  | "id"
  | "theme"
  | "starts_at"
  | "location_text"
  | "dress_code"
  | "note"
  | "flyer_template"
>;

export default function FlyerBuilder({
  event,
  saveToEvent = true,
  returnToSetupHref,
}: {
  event: FlyerBuilderEvent;
  saveToEvent?: boolean;
  returnToSetupHref?: string;
}) {
  const [template, setTemplate] = useState<string>((event.flyer_template as any) ?? "elegant");
  const mode: "classic" = "classic";

  const [description, setDescription] = useState("");
  const [descriptions, setDescriptions] = useState<string[]>([]);
  const [taglines, setTaglines] = useState<string[]>([]);
  const [taglinePick, setTaglinePick] = useState("");
  const [palette, setPalette] = useState<string[]>(palettePresets[0].colors);
  const [generatedPngPath, setGeneratedPngPath] = useState<string | null>(null);
  const [generatedPdfPath, setGeneratedPdfPath] = useState<string | null>(null);
  const [generatedPngUrl, setGeneratedPngUrl] = useState<string | null>(null);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const dateTimeText = useMemo(() => formatDateTime(event.starts_at), [event.starts_at]);

  useEffect(() => {
    const p = pickProPreset(event.theme, event.dress_code ?? undefined, event.note ?? undefined);
    setTemplate(p.template as any);
    setPalette(p.palette);
    setSelectedPresetId(p.id);
  }, [event.theme, event.dress_code, event.note]);

  function applyPreset(presetId: string) {
    const p = PRO_FLYER_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setTemplate(p.template as any);
    setPalette(p.palette);
    setSelectedPresetId(p.id);
  }

  async function aiSuggest() {
    setBusy(true);
    const r = await fetch("/api/ai/flyer-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: event.theme,
        dressCode: event.dress_code ?? undefined,
        note: event.note ?? undefined,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      alert(data.error ?? "AI error");
      setBusy(false);
      return;
    }
    setDescription(data.description ?? "");
    setDescriptions(
      Array.isArray(data.descriptions)
        ? data.descriptions.filter((x: unknown) => typeof x === "string" && x.trim().length > 0)
        : data.description
        ? [data.description]
        : []
    );
    setTaglines(Array.isArray(data.taglines) ? data.taglines : []);
    setTaglinePick((Array.isArray(data.taglines) && data.taglines[0]) || "");
    setPalette(
      Array.isArray(data.palette) && data.palette.length >= 3
        ? data.palette
        : palettePresets[0].colors
    );
    setBusy(false);
  }

  async function generate() {
    setBusy(true);
    const payload: Record<string, unknown> = {
      saveToEvent,
      template,
      presetId: selectedPresetId ?? undefined,
      mode,
      theme: event.theme,
      dateTime: dateTimeText,
      location: event.location_text ?? "",
      dressCode: event.dress_code ?? undefined,
      note: event.note ?? undefined,
      description,
      tagline: taglinePick,
      palette,
    };
    if (saveToEvent && event.id) {
      payload.eventId = event.id;
    }

    const r = await fetch("/api/ai/flyer/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (!r.ok) {
      alert(data.error ?? "Generate failed");
    } else {
      setGeneratedPngPath(typeof data.pngPath === "string" ? data.pngPath : null);
      setGeneratedPdfPath(typeof data.pdfPath === "string" ? data.pdfPath : null);
      setGeneratedPngUrl(typeof data.pngUrl === "string" ? data.pngUrl : null);
      setGeneratedPdfUrl(typeof data.pdfUrl === "string" ? data.pdfUrl : null);
      alert(
        saveToEvent
          ? "Flyer generated! PNG/PDF saved to this event."
          : "Flyer generated in preview mode (event not created yet)."
      );
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50 p-7 shadow-[0_20px_70px_rgba(190,24,93,0.15)]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose-300/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-amber-300/30 blur-2xl" />
        <div className="relative">
          <div className="text-base font-semibold uppercase tracking-[0.18em] text-rose-700">
            Flyer Studio
          </div>
          <div className="mt-2 text-4xl font-semibold tracking-tight text-gray-900">
            Design an elegant event flyer
          </div>
          <div className="mt-2 text-base text-gray-700">
            Pick a premium style, generate polished copy, then export PNG + PDF.
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-rose-100 bg-white/90 p-6 shadow ring-1 ring-rose-100 backdrop-blur">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold text-gray-900">Inspiration Templates</div>
            <div className="text-base text-gray-600">
              Choose a visual direction first. We auto-match one, but you can switch.
            </div>
          </div>
          <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            Step 1
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRO_FLYER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={[
                "group overflow-hidden rounded-2xl border text-left transition-all duration-300",
                selectedPresetId === preset.id
                  ? "border-rose-400 shadow-[0_16px_40px_rgba(190,24,93,0.22)] ring-2 ring-rose-300/40"
                  : "border-rose-100 hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-[0_12px_35px_rgba(0,0,0,0.10)]",
              ].join(" ")}
            >
              <div className="relative">
                <img
                  src={`/flyer-assets/${preset.assetFile}`}
                  alt={preset.label}
                  className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
                />
                {selectedPresetId === preset.id && (
                  <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-rose-700 shadow">
                    Selected
                  </div>
                )}
              </div>

              <div className="space-y-1 bg-white p-3">
                <div className="text-base font-semibold text-gray-900">{preset.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-rose-100 bg-white/90 p-6 shadow ring-1 ring-rose-100 backdrop-blur space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold text-gray-900">Copy + Messaging</div>
            <div className="text-base text-gray-600">
              Generate refined description and tagline options, then pick your favorite.
            </div>
          </div>
          <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            Step 2
          </div>
        </div>

        <button
          onClick={aiSuggest}
          disabled={busy}
          className="rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-6 py-3.5 text-base font-semibold text-white shadow-[0_14px_35px_rgba(236,72,153,0.35)] hover:opacity-95 disabled:opacity-50"
        >
          {busy ? "Generating..." : "AI Generate Description + Taglines"}
        </button>

        <textarea
          className="w-full rounded-2xl border border-rose-200 bg-rose-50/40 p-4 text-base text-gray-900 outline-none ring-0 placeholder:text-gray-500 focus:border-rose-300 focus:bg-white"
          placeholder="Description (AI can fill this)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        {descriptions.length > 0 && (
          <div className="space-y-2">
            <div className="text-lg font-semibold text-gray-900">Pick a description</div>
            <div className="flex flex-wrap gap-2">
              {descriptions.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDescription(d)}
                  className={[
                    "rounded-full border px-4 py-2.5 text-left text-base transition",
                    description === d
                      ? "border-pink-400 bg-pink-500 text-white shadow-[0_8px_25px_rgba(236,72,153,0.32)]"
                      : "border-rose-200 bg-white text-gray-800 hover:bg-rose-50",
                  ].join(" ")}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {taglines.length > 0 && (
          <div className="space-y-2">
            <div className="text-lg font-semibold text-gray-900">Pick a tagline</div>
            <div className="flex flex-wrap gap-2">
              {taglines.map((t) => (
                <button
                  key={t}
                  onClick={() => setTaglinePick(t)}
                  className={[
                    "rounded-full border px-4 py-2.5 text-base transition",
                    taglinePick === t
                      ? "border-pink-400 bg-pink-500 text-white shadow-[0_8px_25px_rgba(236,72,153,0.32)]"
                      : "border-rose-200 bg-white text-gray-800 hover:bg-rose-50",
                  ].join(" ")}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {palette.length > 0 && !selectedPresetId && (
        <div className="rounded-3xl border border-rose-100 bg-white/90 p-6 shadow ring-1 ring-rose-100 backdrop-blur space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold text-gray-900">Custom Palette</div>
              <div className="text-base text-gray-600">
                Fine-tune colors if you are not using a locked preset palette.
              </div>
            </div>
            <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              Optional
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {palettePresets.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setPalette(p.colors)}
                className="rounded-full border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-rose-50"
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((idx) => (
              <label
                key={idx}
                className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2.5 text-sm text-gray-700"
              >
                <span className="font-semibold">Color {idx + 1}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={palette[idx] ?? "#000000"}
                    onChange={(e) => {
                      setPalette((prev) => {
                        const next = [...prev];
                        next[idx] = e.target.value;
                        return next;
                      });
                    }}
                  />
                  <span>{palette[idx] ?? "#000000"}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2 text-base text-gray-700">
            <span className="font-semibold">Preview:</span>
            {palette.slice(0, 3).map((c, i) => (
              <span
                key={`${c}-${i}`}
                title={c}
                className="inline-block h-6 w-6 rounded-full border border-white shadow"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-rose-100 bg-white/90 p-6 shadow ring-1 ring-rose-100 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-semibold text-gray-900">Generate Output</div>
            <div className="text-base text-gray-600">
              Exports a high-quality PNG + PDF and attaches to this event.
            </div>
          </div>

          <button
            onClick={generate}
            disabled={busy}
            className="rounded-2xl bg-gradient-to-r from-gray-900 to-black px-7 py-3.5 text-base font-semibold text-white shadow-[0_14px_35px_rgba(0,0,0,0.35)] hover:opacity-95 disabled:opacity-50"
          >
            {busy ? "Generating..." : "Generate PNG + PDF"}
          </button>
        </div>
      </div>

      {generatedPngUrl && (
        <div className="rounded-3xl border border-rose-200 bg-white/95 p-6 shadow ring-1 ring-rose-100 backdrop-blur space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold text-gray-900">Generated Flyer Preview</div>
              <div className="text-base text-gray-600">Full-size preview on this page.</div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={generatedPngUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600"
              >
                Open PNG
              </a>
              {generatedPdfUrl && (
                <a
                  href={generatedPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-rose-50"
                >
                  Open PDF
                </a>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/40 p-3">
            <img
              src={generatedPngUrl}
              alt="Generated flyer preview"
              className="w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      {returnToSetupHref && generatedPngPath && (
        <button
          type="button"
          onClick={() => {
            if (saveToEvent) {
              window.location.href = returnToSetupHref;
              return;
            }
            const url = new URL(returnToSetupHref, window.location.origin);
            url.searchParams.set("generatedFlyerPngPath", generatedPngPath);
            if (generatedPdfPath) {
              url.searchParams.set("generatedFlyerPdfPath", generatedPdfPath);
            }
            url.searchParams.set("generatedFlyerTemplate", template);
            window.location.href = `${url.pathname}${url.search}${url.hash}`;
          }}
          className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-3.5 text-base font-semibold text-white shadow-[0_14px_35px_rgba(190,24,93,0.35)] hover:opacity-95"
        >
          {saveToEvent ? "Use This Flyer and Return to Edit Event" : "Use This Flyer In Event Setup"}
        </button>
      )}
    </div>
  );
}
