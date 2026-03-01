"use client";

import { useEffect } from "react";

export default function CapacitorAuthBridge() {
  useEffect(() => {
    const cap = (window as any).Capacitor;
    const appPlugin = cap?.Plugins?.App;
    const isNative = !!cap?.isNativePlatform?.();

    if (isNative) {
      try {
        window.localStorage.setItem("iwsg_native_runtime", "1");
      } catch {}
    }

    if (!isNative || !appPlugin?.addListener) return;

    let sub: { remove: () => void } | null = null;

    (async () => {
      sub = await appPlugin.addListener("appUrlOpen", (data: { url?: string }) => {
        const raw = String(data?.url ?? "").trim();
        if (!raw) return;

        let parsed: URL;
        try {
          parsed = new URL(raw);
        } catch {
          return;
        }

        const isAuthCallback =
          parsed.protocol === "com.iwsg.app:" &&
          parsed.hostname === "auth" &&
          parsed.pathname === "/callback";

        if (!isAuthCallback) return;

        const incoming = new URLSearchParams(parsed.search);
        const outgoing = new URLSearchParams();

        const code = incoming.get("code");
        const next = incoming.get("next");
        const mode = incoming.get("mode");
        const error = incoming.get("error_description") ?? incoming.get("error");

        if (code) outgoing.set("code", code);
        if (next && next.startsWith("/")) outgoing.set("next", next);
        if (mode) outgoing.set("mode", mode);
        if (error) outgoing.set("error", error);

        if (!outgoing.get("next")) outgoing.set("next", "/");

        window.location.href = `${window.location.origin}/auth/callback?${outgoing.toString()}`;
      });
    })();

    return () => {
      sub?.remove?.();
    };
  }, []);

  return null;
}
