import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isAllowedOrigin } from "@/lib/security/request";

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const supabase = await createSupabaseServer();

  await supabase.auth.signOut();

  // back to login (or "/" if you prefer)
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"), {
    status: 303,
  });
}
