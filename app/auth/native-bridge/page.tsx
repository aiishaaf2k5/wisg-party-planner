"use client";

import { useEffect } from "react";

export default function NativeAuthBridgePage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = `com.iwsg.app://auth/callback${window.location.search || ""}`;
    window.location.replace(target);
  }, []);

  return (
    <div className="min-h-screen bg-pink-50 text-gray-900">
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-pink-800">Returning to app...</h1>
        <p className="mt-3 text-sm text-gray-600">
          If the app does not open automatically, tap the button below.
        </p>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            const target = `com.iwsg.app://auth/callback${window.location.search || ""}`;
            window.location.href = target;
          }}
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-pink-600 px-5 py-3 font-semibold text-white"
        >
          Open App
        </a>
      </div>
    </div>
  );
}

