"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      // Keep UX resilient; this only assists installability/offline.
      console.warn("Service worker registration failed:", err);
    });
  }, []);

  return null;
}
