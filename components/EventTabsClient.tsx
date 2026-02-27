"use client";

import { useMemo, useState } from "react";
import EventTabs from "@/components/EventTabs";
import RSVPPanel from "@/components/RSVPPanel";
import DishesPanel from "@/components/DishesPanel";

type Status = "yes" | "no" | null;

export default function EventTabsClient({
  eventId,
  initialStatus,
  initialIsAttending,
  lockInteractions = false,
}: {
  eventId: string;
  initialStatus: Status;
  initialIsAttending: boolean;
  lockInteractions?: boolean;
}) {
  const [status, setStatus] = useState<Status>(initialStatus ?? null);
  const [isAttending, setIsAttending] = useState<boolean>(initialIsAttending);

  const dishesEnabled = useMemo(() => {
    if (lockInteractions) return false;
    return status === "yes" || isAttending === true;
  }, [status, isAttending, lockInteractions]);

  return (
    <div className="space-y-5">
      {lockInteractions && (
        <div className="rounded-2xl border border-gray-200 bg-white/90 p-5 text-gray-800 shadow-sm backdrop-blur">
          <div className="font-semibold">View only</div>
          <div className="mt-1 text-sm text-gray-600">
            This event already happened, so RSVP and dish selection are locked.
          </div>
        </div>
      )}

      <EventTabs
        dishesEnabled={dishesEnabled}
        rsvp={
          <div className="rounded-3xl border border-pink-200 bg-white/92 p-6 md:p-8 shadow-sm backdrop-blur">
            <div className="text-xl font-semibold text-gray-900">Your RSVP</div>

            <div className="mt-6">
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
        }
        dishes={
          <div className="rounded-3xl border border-fuchsia-200 bg-white/92 p-6 md:p-8 shadow-sm backdrop-blur">
            <div className="text-xl font-semibold text-gray-900">Dish Selection</div>

            {lockInteractions ? (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                Dish signup is locked because this event has ended.
              </div>
            ) : (
              <div className="mt-6">
                <DishesPanel eventId={eventId} />
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}
