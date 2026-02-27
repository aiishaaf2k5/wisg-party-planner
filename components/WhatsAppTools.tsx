"use client";

import { EventRow } from "@/types/db";
import { formatDateTime } from "@/lib/utils";

export default function WhatsAppTools({ event }: { event: EventRow }) {
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.id}`;
  const msg =
`Salaam ladies 💕
This month’s theme is: *${event.theme}* ✨
🗓 ${formatDateTime(event.starts_at)}
📍 ${event.location_text ?? ""}
Please RSVP + sign up for a dish here:
${link}`;

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Copied!");
  }

  return (
    <div className="space-y-2">
      <div className="font-medium">WhatsApp share</div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => copy(msg)} className="rounded border px-3 py-2 text-sm">
          Copy WhatsApp message
        </button>
        <button onClick={() => copy(link)} className="rounded border px-3 py-2 text-sm">
          Copy event link
        </button>
      </div>

      <pre className="whitespace-pre-wrap rounded border bg-gray-50 p-3 text-xs">
        {msg}
      </pre>
    </div>
  );
}
