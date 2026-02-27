"use client";

import { useMemo } from "react";

function fmtWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventWhatsAppShare({
  eventId,
  theme,
  startsAt,
  locationText,
  dressCode,
  note,
  flyerUrl,
}: {
  eventId: string;
  theme: string;
  startsAt: string;
  locationText?: string | null;
  dressCode?: string | null;
  note?: string | null;
  flyerUrl?: string | null;
}) {
  const eventLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/events/${eventId}`
      : `/events/${eventId}`;

  const invite = useMemo(() => {
    const lines = [
      `Assalamualaikum everyone!`,
      `You're invited to *${theme}*`,
      `Date/Time: ${fmtWhen(startsAt)}`,
      `Location: ${(locationText ?? "TBA").trim() || "TBA"}`,
      dressCode?.trim() ? `Dress code: ${dressCode.trim()}` : null,
      note?.trim() ? `Note: ${note.trim()}` : null,
      `Event details + RSVP: ${eventLink}`,
    ];
    return lines.filter(Boolean).join("\n");
  }, [dressCode, eventLink, locationText, note, startsAt, theme]);

  const reminder = useMemo(() => {
    const lines = [
      `Friendly reminder for *${theme}*`,
      `Time: ${fmtWhen(startsAt)}`,
      `Location: ${(locationText ?? "TBA").trim() || "TBA"}`,
      dressCode?.trim() ? `Dress code: ${dressCode.trim()}` : null,
      `Please RSVP in the app: ${eventLink}`,
    ];
    return lines.filter(Boolean).join("\n");
  }, [dressCode, eventLink, locationText, startsAt, theme]);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied.");
    } catch {
      alert("Could not copy automatically. Please copy manually.");
    }
  }

  async function shareImageAndText(text: string) {
    if (!flyerUrl) {
      alert("This event has no flyer image yet.");
      return;
    }

    try {
      const res = await fetch(flyerUrl);
      if (!res.ok) throw new Error("Could not fetch flyer image.");
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) {
        alert("Flyer is not an image. Please share text only.");
        return;
      }

      const ext = blob.type.includes("png") ? "png" : "jpg";
      const file = new File([blob], `event-flyer.${ext}`, { type: blob.type });
      const nav = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean;
      };

      if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
        await nav.share({
          title: theme,
          text,
          files: [file],
        });
        return;
      }

      await copyText(text);
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      window.open(flyerUrl, "_blank", "noopener,noreferrer");
      alert("Opened WhatsApp + flyer image. Attach the image manually in WhatsApp.");
    } catch {
      alert("Could not share flyer image on this device/browser.");
    }
  }

  const entries = [
    { key: "invite", label: "Invite Message", text: invite },
    { key: "reminder", label: "Reminder Message", text: reminder },
  ];

  return (
    <div className="rounded-3xl border border-pink-200 bg-white/94 p-7 shadow-sm backdrop-blur md:p-9">
      <div className="rounded-2xl border border-pink-100 bg-pink-50/70 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-pink-700">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-pink-200 bg-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">WhatsApp Share</span>
            </div>
            <div className="mt-2 text-[1.9rem] font-semibold tracking-tight text-gray-900">Share to WhatsApp</div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {entries.map((entry) => (
          <div
            key={entry.key}
            className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm md:p-6"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-pink-200 bg-pink-50 text-pink-700">
                {entry.key === "invite" ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 8l8 5 8-5" stroke="currentColor" strokeWidth="2" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}
              </span>
              <div className="text-lg font-semibold text-gray-900">{entry.label}</div>
            </div>
            <textarea
              value={entry.text}
              readOnly
              rows={6}
              className="mt-3 w-full rounded-xl border border-pink-100 bg-pink-50/40 px-4 py-3 text-[15px] text-gray-900 outline-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyText(entry.text)}
                className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-pink-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                  <rect x="4" y="4" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                </svg>
                Copy
              </button>
              <button
                type="button"
                onClick={() => void shareImageAndText(entry.text)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Share Flyer and Message to WhatsApp
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
