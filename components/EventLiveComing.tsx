"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type LiveState = {
  comingCount: number;
  comingMembers: string[];
};

const Ctx = createContext<LiveState | null>(null);

function normalizeName(value: unknown) {
  const s = String(value ?? "").trim();
  return s;
}

function extractName(profileField: unknown): string {
  if (Array.isArray(profileField)) {
    return normalizeName(profileField[0]?.full_name);
  }
  if (profileField && typeof profileField === "object") {
    return normalizeName((profileField as { full_name?: string }).full_name);
  }
  return "";
}

export function EventLiveComingProvider({
  eventId,
  isPastEvent,
  initialCount,
  initialMembers,
  children,
}: {
  eventId: string;
  isPastEvent: boolean;
  initialCount: number;
  initialMembers: string[];
  children: ReactNode;
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [comingCount, setComingCount] = useState(initialCount);
  const [comingMembers, setComingMembers] = useState(initialMembers);

  const refresh = useCallback(async () => {
    if (isPastEvent) return;

    const { data: yesRows } = await supabase
      .from("rsvps")
      .select("user_id, status, attending, profiles:profiles(full_name)")
      .eq("event_id", eventId)
      .or("status.eq.yes,attending.eq.true");

    const rows = yesRows ?? [];
    const names = rows
      .map((r) => extractName((r as { profiles?: unknown }).profiles))
      .filter(Boolean);

    const uniqueSorted = Array.from(new Set(names)).sort((a, b) =>
      a.localeCompare(b)
    );

    setComingCount(rows.length);
    setComingMembers(uniqueSorted);
  }, [eventId, isPastEvent, supabase]);

  useEffect(() => {
    if (isPastEvent) return;

    const channel = supabase
      .channel(`event-rsvps-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rsvps",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, isPastEvent, refresh, supabase]);

  useEffect(() => {
    if (isPastEvent) return;

    function onRsvpChanged(e: Event) {
      const ce = e as CustomEvent<{ eventId?: string }>;
      if (ce.detail?.eventId === eventId) {
        void refresh();
      }
    }

    window.addEventListener("event-rsvp-changed", onRsvpChanged as EventListener);
    return () => {
      window.removeEventListener(
        "event-rsvp-changed",
        onRsvpChanged as EventListener
      );
    };
  }, [eventId, isPastEvent, refresh]);

  return (
    <Ctx.Provider value={{ comingCount, comingMembers }}>{children}</Ctx.Provider>
  );
}

function useLive() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("Event live context missing");
  }
  return ctx;
}

export function EventComingCountText({ isPastEvent }: { isPastEvent: boolean }) {
  const { comingCount } = useLive();
  if (isPastEvent) return <>Event ended</>;
  return (
    <>
      {comingCount} RSVP{comingCount === 1 ? "" : "s"}
    </>
  );
}

export function EventComingSection({ isPastEvent }: { isPastEvent: boolean }) {
  const { comingCount, comingMembers } = useLive();
  if (isPastEvent) return null;

  return (
    <div className="rounded-3xl border border-pink-200 bg-white/92 p-7 shadow-sm ring-1 ring-pink-100 backdrop-blur md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.12em] text-pink-600">
            Live Attendance
          </div>
          <div className="mt-1 text-3xl font-semibold text-gray-900">
            Who&apos;s Coming
          </div>
        </div>
        <span className="rounded-full border border-pink-200 bg-pink-50 px-4 py-1.5 text-sm font-semibold text-pink-700">
          {comingCount} {comingCount === 1 ? "member" : "members"}
        </span>
      </div>

      {comingMembers.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-pink-100 bg-pink-50/70 p-6 text-base text-gray-600">
          No one has RSVP&apos;d yes yet.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comingMembers.map((name, idx) => {
            const initials = name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("");
            return (
              <div
              key={name}
              className="animate-rise-in flex items-center gap-4 rounded-2xl border border-pink-200 bg-white p-4 shadow-sm"
              style={{ animationDelay: `${90 + idx * 45}ms`, animationFillMode: "both" }}
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-pink-100 text-sm font-bold text-pink-800">
                {initials || "M"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-gray-900">{name}</div>
                <div className="text-sm text-pink-600">Attending</div>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
}
