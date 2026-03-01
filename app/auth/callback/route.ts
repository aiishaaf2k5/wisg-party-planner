import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = (url.searchParams.get("next") ?? "").trim();
  const mode = (url.searchParams.get("mode") ?? "").trim().toLowerCase();
  const safeNext = rawNext.startsWith("/") ? rawNext : "/";
  const origin = url.origin;

  const supabase = await createSupabaseServer();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const { data: auth } = await supabase.auth.getUser();
  if (auth.user && (mode === "admin" || mode === "member")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();

    const role = String(profile?.role ?? "").toLowerCase().trim();
    const isInviteFlow = safeNext.startsWith("/admin-invite");

    if (mode === "admin" && !isInviteFlow && role !== "admin") {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent("Please use Member Login for this account.")}`
      );
    }

    if (mode === "member" && role === "admin") {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent("Please use Admin Login for this account.")}`
      );
    }
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
