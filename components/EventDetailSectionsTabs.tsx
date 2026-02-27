"use client";

import { useEffect, useMemo, useState } from "react";
import RSVPPanel from "@/components/RSVPPanel";
import DishesPanel from "@/components/DishesPanel";
import EventWhatsAppShare from "@/components/EventWhatsAppShare";
import { EventComingSection } from "@/components/EventLiveComing";

type Status = "yes" | "no" | null;
type TabKey = "rsvp" | "dishes" | "coming" | "whatsapp";

export default function EventDetailSectionsTabs({
  eventId,
  initialStatus,
  initialIsAttending,
  lockInteractions,
  isPastEvent,
  theme,
  startsAt,
  locationText,
  dressCode,
  note,
  flyerUrl,
}: {
  eventId: string;
  initialStatus: Status;
  initialIsAttending: boolean;
  lockInteractions: boolean;
  isPastEvent: boolean;
  theme: string;
  startsAt: string;
  locationText?: string | null;
  dressCode?: string | null;
  note?: string | null;
  flyerUrl?: string | null;
}) {
  const [tab, setTab] = useState<TabKey>("rsvp");
  const [status, setStatus] = useState<Status>(initialStatus ?? null);
  const [isAttending, setIsAttending] = useState<boolean>(initialIsAttending);

  const showWhatsApp = !isPastEvent;
  const dishesEnabled = useMemo(() => {
    if (lockInteractions) return false;
    return status === "yes" || isAttending === true;
  }, [status, isAttending, lockInteractions]);

  useEffect(() => {
    if (!showWhatsApp && tab === "whatsapp") {
      setTab("rsvp");
      return;
    }
    if (!dishesEnabled && tab === "dishes") {
      setTab("rsvp");
    }
  }, [showWhatsApp, dishesEnabled, tab]);

  return (
    <div className="space-y-6">
      {lockInteractions && (
        <div className="rounded-2xl border border-gray-200 bg-white/90 p-5 text-gray-800 shadow-sm backdrop-blur">
          <div className="font-semibold">View only</div>
          <div className="mt-1 text-sm text-gray-600">
            This event already happened, so RSVP and dish selection are locked.
          </div>
        </div>
      )}

      <div className="rounded-3xl border-2 border-pink-300 bg-pink-50 p-3.5 shadow-[0_22px_56px_-34px_rgba(217,70,239,0.42)] backdrop-blur">
        <div className={["grid gap-2", showWhatsApp ? "grid-cols-4" : "grid-cols-3"].join(" ")}>
          <button
            type="button"
            onClick={() => setTab("rsvp")}
            className={[
              "rounded-2xl px-4 py-3.5 text-sm font-bold tracking-[0.03em] transition",
              tab === "rsvp"
                ? "bg-[#ff4fa3] text-white shadow-[0_12px_26px_-14px_rgba(255,79,163,0.8)]"
                : "text-gray-800 hover:bg-pink-50",
            ].join(" ")}
          >
            RSVP
          </button>

          <button
            type="button"
            onClick={() => {
              if (!dishesEnabled) return;
              setTab("dishes");
            }}
            disabled={!dishesEnabled}
            title={!dishesEnabled ? "RSVP 'I'm Attending' to unlock dishes" : ""}
            className={[
              "rounded-2xl px-4 py-3.5 text-sm font-bold tracking-[0.03em] transition",
              !dishesEnabled
                ? "cursor-not-allowed text-gray-400"
                : tab === "dishes"
                ? "bg-[#ff4fa3] text-white shadow-[0_12px_26px_-14px_rgba(255,79,163,0.8)]"
                : "text-gray-800 hover:bg-pink-50",
            ].join(" ")}
          >
            Dishes
          </button>

          <button
            type="button"
            onClick={() => setTab("coming")}
            className={[
              "rounded-2xl px-4 py-3.5 text-sm font-bold tracking-[0.03em] transition",
              tab === "coming"
                ? "bg-[#ff4fa3] text-white shadow-[0_12px_26px_-14px_rgba(255,79,163,0.8)]"
                : "text-gray-800 hover:bg-pink-50",
            ].join(" ")}
          >
            Who&apos;s Coming
          </button>

          {showWhatsApp && (
            <button
              type="button"
              onClick={() => setTab("whatsapp")}
              className={[
                "rounded-2xl px-4 py-3.5 text-sm font-bold tracking-[0.03em] transition",
                tab === "whatsapp"
                  ? "bg-[#ff4fa3] text-white shadow-[0_12px_26px_-14px_rgba(255,79,163,0.8)]"
                  : "text-gray-800 hover:bg-pink-50",
              ].join(" ")}
            >
              WhatsApp
            </button>
          )}
        </div>
      </div>

      {tab === "rsvp" && (
        <div className="animate-rise-in rounded-3xl border border-pink-200 bg-white/95 p-6 md:p-8 shadow-sm backdrop-blur">
          <div className="rounded-2xl border border-pink-100 bg-[linear-gradient(125deg,rgba(253,242,248,0.95)_0%,rgba(250,245,255,0.95)_100%)] px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-pink-200 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-pink-700">
                RSVP
              </span>
              <span className="text-xs font-medium text-pink-700">Let hosts know if you are attending</span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">Your RSVP</div>
          </div>

          <div className="mt-6 rounded-2xl border border-pink-100 bg-white p-4 md:p-5">
            <RSVPPanel
              eventId={eventId}
              initialStatus={status}
              disabled={lockInteractions}
              onStatusChange={(next) => {
                if (lockInteractions) return;
                setStatus(next);
                setIsAttending(next === "yes");
              }}
            />
          </div>

          {!lockInteractions && !dishesEnabled && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              RSVP <span className="font-semibold">I&apos;m Attending</span> to unlock dishes.
            </div>
          )}
        </div>
      )}

      {tab === "dishes" && (
        <div className="animate-rise-in rounded-[2rem] border-2 border-fuchsia-300 bg-pink-50 p-6 shadow-[0_30px_70px_-38px_rgba(192,38,211,0.6)] backdrop-blur md:p-8">
          <div className="rounded-3xl border border-fuchsia-200 bg-pink-100 px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-fuchsia-300 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-fuchsia-700">
                Dishes
              </span>
            </div>
            <div className="mt-2 text-[2rem] font-bold tracking-tight text-fuchsia-950">Dish Selection</div>
          </div>

          {lockInteractions ? (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              Dish signup is locked because this event has ended.
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-fuchsia-200 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-fuchsia-100 md:p-5">
              <DishesPanel eventId={eventId} />
            </div>
          )}
        </div>
      )}

      {tab === "coming" &&
        (isPastEvent ? (
          <div className="rounded-3xl border border-gray-200 bg-white/88 p-6 text-gray-700 shadow-sm backdrop-blur">
            Who&apos;s Coming is unavailable because this event has ended.
          </div>
        ) : (
          <EventComingSection isPastEvent={isPastEvent} />
        ))}

      {tab === "whatsapp" && showWhatsApp && (
        <EventWhatsAppShare
          eventId={eventId}
          theme={theme}
          startsAt={startsAt}
          locationText={locationText}
          dressCode={dressCode}
          note={note}
          flyerUrl={flyerUrl}
        />
      )}
    </div>
  );
}













