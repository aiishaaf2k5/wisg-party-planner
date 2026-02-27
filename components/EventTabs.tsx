"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";

type TabKey = "rsvp" | "dishes";

export default function EventTabs({
  rsvp,
  dishes,
  defaultTab = "rsvp",
  dishesEnabled = true,
}: {
  rsvp: ReactNode;
  dishes: ReactNode;
  defaultTab?: TabKey;
  dishesEnabled?: boolean;
}) {
  const [tab, setTab] = useState<TabKey>(defaultTab);

  const isRsvp = tab === "rsvp";
  const isDishes = tab === "dishes";

  useEffect(() => {
    if (!dishesEnabled && tab === "dishes") {
      setTab("rsvp");
    }
  }, [dishesEnabled, tab]);

  const content = useMemo(() => {
    if (tab === "dishes" && !dishesEnabled) return rsvp;
    return tab === "rsvp" ? rsvp : dishes;
  }, [tab, rsvp, dishes, dishesEnabled]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-pink-200 bg-white/90 p-3 shadow-sm backdrop-blur">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab("rsvp")}
            className={[
              "rounded-xl px-5 py-3 text-center text-sm font-semibold transition",
              isRsvp
                ? "bg-pink-600 text-white"
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
              "rounded-xl px-5 py-3 text-center text-sm font-semibold transition",
              !dishesEnabled
                ? "cursor-not-allowed text-gray-400"
                : isDishes
                ? "bg-pink-600 text-white"
                : "text-gray-800 hover:bg-pink-50",
            ].join(" ")}
          >
            Dishes
          </button>
        </div>
      </div>

      <div>{content}</div>
    </div>
  );
}
