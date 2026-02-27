"use client";

import { useEffect, useMemo, useState } from "react";

type Pack = {
  invite: string;
  reminder: string;
};

export default function AdminWhatsAppPack({ eventId }: { eventId: string }) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true);
      setErr(null);
      const res = await fetch(`/api/admin/events/${eventId}/whatsapp-pack`);
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        messages?: Pack;
      };
      if (!alive) return;
      if (!res.ok || !json.messages) {
        setErr(json.error ?? "Failed to load message pack.");
        setBusy(false);
        return;
      }
      setPack(json.messages);
      setBusy(false);
    })();
    return () => {
      alive = false;
    };
  }, [eventId]);

  const entries = useMemo(
    () =>
      pack
        ? [
            { key: "invite", label: "Invite Message", text: pack.invite },
            { key: "reminder", label: "Reminder Message", text: pack.reminder },
          ]
        : [],
    [pack]
  );

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied.");
    } catch {
      alert("Could not copy automatically. Please copy manually.");
    }
  }

  if (busy) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-white/85 p-6 text-sm text-gray-600 shadow ring-1 ring-rose-100 backdrop-blur">
        Building WhatsApp message pack...
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {err}
      </div>
    );
  }

  if (!pack) return null;

  return (
    <div className="rounded-3xl border border-rose-100 bg-white/85 p-6 shadow ring-1 ring-rose-100 backdrop-blur space-y-4">
      <div className="text-lg font-semibold text-gray-900">Auto WhatsApp Message Pack</div>
      <div className="text-sm text-gray-600">
        Admin-only quick messages for invite and reminder.
      </div>

      <div className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.key} className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 space-y-3">
            <div className="font-semibold text-gray-900">{entry.label}</div>
            <textarea
              value={entry.text}
              readOnly
              rows={5}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-gray-900 ring-1 ring-rose-100 outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyText(entry.text)}
                className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-rose-50"
              >
                Copy
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(entry.text)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
              >
                Open in WhatsApp
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
