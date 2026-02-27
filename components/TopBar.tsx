import Image from "next/image";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function TopBar() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", auth.user.id)
    .maybeSingle();

  const name = profile?.full_name ?? "User";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-pink-200/80 bg-[linear-gradient(120deg,rgba(255,247,252,0.95)_0%,rgba(255,240,248,0.92)_45%,rgba(255,247,252,0.95)_100%)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8 md:py-5">
        <Link href="/" className="group flex items-center gap-4" title="Home">
          <div className="relative h-14 w-14 overflow-hidden rounded-full bg-white ring-2 ring-pink-300 shadow-[0_10px_22px_-12px_rgba(236,72,153,0.6)] md:h-16 md:w-16">
            <Image
              src="/wisg-logo.png"
              alt="IWSG logo"
              fill
              className="object-contain p-2"
              priority
            />
          </div>

          <div className="leading-tight">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-2xl font-semibold tracking-[0.08em] text-pink-900 md:text-3xl">
                IWSG
              </div>

            </div>
            <div className="text-sm font-medium text-pink-700/90 md:text-base">
              Intercultural Women&apos;s Support Group
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-3 md:gap-4">
          <a
            href="/members"
            title="Members"
            className="inline-flex items-center rounded-full border border-pink-300 bg-white px-6 py-3 text-base font-semibold text-pink-800 transition hover:-translate-y-0.5 hover:bg-pink-50"
          >
            Members
          </a>

          <a
            href="/profile"
            title="My Profile"
            className="group relative inline-flex items-center gap-2 rounded-full border border-pink-300 bg-white px-4 py-2.5 text-pink-900 transition hover:-translate-y-0.5 hover:bg-pink-50 md:px-5"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M20 22c0-4.418-3.582-8-8-8s-8 3.582-8 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="max-w-[140px] truncate text-sm font-semibold text-pink-900 md:text-base">{name}</span>
          </a>

          <form action="/api/auth/signout" method="post">
            <button
              className="rounded-full border border-rose-300 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-50 hover:text-rose-800"
              aria-label="Logout"
              title="Logout"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}








