"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };

    const onAppInstalled = () => {
      setDeferred(null);
      setHidden(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!deferred || hidden) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await deferred.prompt();
        await deferred.userChoice.catch(() => null);
        setDeferred(null);
      }}
      className="fixed bottom-4 right-4 z-[90] rounded-full bg-pink-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(236,72,153,0.35)] hover:bg-pink-700"
    >
      Install App
    </button>
  );
}
