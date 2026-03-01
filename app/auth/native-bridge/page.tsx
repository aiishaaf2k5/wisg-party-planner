"use client";

import { useEffect, useMemo } from "react";

export default function NativeAuthBridgePage() {
  const search = typeof window !== "undefined" ? window.location.search || "" : "";
  const customUrl = useMemo(() => `com.iwsg.app://auth/callback${search}`, [search]);
  const intentUrl = useMemo(() => {
    const qs = search ? search.slice(1) : "";
    return `intent://auth/callback${qs ? `?${qs}` : ""}#Intent;scheme=com.iwsg.app;package=com.iwsg.app;end`;
  }, [search]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    // First attempt: normal custom scheme deep-link.
    window.location.replace(customUrl);

    // If browser blocks/ignores custom scheme, force Android intent fallback.
    const t = window.setTimeout(() => {
      if (cancelled) return;
      window.location.replace(intentUrl);
    }, 700);

    const stop = () => {
      cancelled = true;
      window.clearTimeout(t);
    };

    document.addEventListener("visibilitychange", stop, { once: true });
    window.addEventListener("pagehide", stop, { once: true });

    return () => {
      stop();
      document.removeEventListener("visibilitychange", stop);
      window.removeEventListener("pagehide", stop);
    };
  }, []);

  return (
    <div className="min-h-screen bg-pink-50 text-gray-900">
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-pink-800">Returning to app...</h1>
        <p className="mt-3 text-sm text-gray-600">
          If the app does not open automatically, tap the button below.
        </p>
        <a
          href={customUrl}
          onClick={(e) => {
            e.preventDefault();
            window.location.href = customUrl;
          }}
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-pink-600 px-5 py-3 font-semibold text-white"
        >
          Open App
        </a>
        <a
          href={intentUrl}
          className="mt-3 inline-flex items-center justify-center rounded-2xl border border-pink-300 bg-white px-5 py-3 font-semibold text-pink-700"
        >
          Open App (Android Fallback)
        </a>
      </div>
    </div>
  );
}
