"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function Nav() {
  const supabase = createSupabaseBrowser();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setEmail(s?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="border-b">
      <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
        <Link href="/" className="font-semibold">
          IWSG Party Planner
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/">Home</Link>
          <Link href="/admin/events">Admin</Link>
          {email ? (
            <>
              <span className="text-muted-foreground">{email}</span>
              <button onClick={signOut} className="underline">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="underline">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

