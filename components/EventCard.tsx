import Image from "next/image";
import Link from "next/link";
import { EventRow } from "@/types/db";
import { formatDateTime, getEventFlyerSrc } from "@/lib/utils";

type Props = {
  event: EventRow & {
    location_text?: string | null;
    flyer_png_path?: string | null;
    flyer_url?: string | null;
    flyer_template?: string | null;
  };
  rsvpCount?: number;
  isHosting?: boolean;
};

export default function EventCard({
  event,
  rsvpCount = 0,
  isHosting = false,
}: Props) {
  const flyerSrc = getEventFlyerSrc(event);

  return (
    <div className="group overflow-hidden rounded-3xl border-2 border-rose-200 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(244,63,94,0.18)] hover:border-rose-300">
      <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 shadow-[0_0_60px_rgba(244,63,94,0.15)]" />

      {flyerSrc ? (
        <div className="relative h-[220px] w-full">
          <Image
            src={flyerSrc}
            alt={event.theme ?? "Event"}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={false}
          />
        </div>
      ) : null}

      <div className="p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="text-2xl font-semibold text-gray-900">{event.theme}</div>

          {isHosting && (
            <div className="mt-1 rounded-full border border-rose-200 bg-rose-50 px-4 py-1 text-sm font-semibold text-rose-700">
              You&apos;re hosting!
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center gap-3 text-[15px] text-gray-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>{formatDateTime(event.starts_at)}</span>
        </div>

        <div className="mt-3 flex items-center gap-3 text-[15px] text-gray-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>{event.location_text || "-"}</span>
        </div>

        <div className="mt-3 flex items-center gap-3 text-[15px] text-gray-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 11c1.657 0 3-1.567 3-3.5S9.657 4 8 4 5 5.567 5 7.5 6.343 11 8 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 20c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M22 20c0-3.314-2.686-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>
            <span className="font-medium text-gray-700">{rsvpCount}</span> RSVPs
          </span>
        </div>

        <div className="mt-6">
          <Link
            href={`/events/${event.id}`}
            className="block w-full rounded-2xl border-2 border-rose-200 bg-white py-3 text-center text-sm font-semibold text-gray-900 transition hover:bg-rose-50"
          >
            View Details &amp; RSVP
          </Link>
        </div>
      </div>
    </div>
  );
}
