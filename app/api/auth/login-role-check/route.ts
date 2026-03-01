import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, isAllowedOrigin } from "@/lib/security/request";

type ReqBody = {
  email?: string;
  mode?: "member" | "admin";
  inviteToken?: string;
};

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    if (!isAllowedOrigin(req)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const ip = getClientIp(req);
    const rl = checkRateLimit(`login-role-check:${ip}`, 30, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const email = String(body.email ?? "").trim().toLowerCase();
    const mode = body.mode;
    const inviteToken = String(body.inviteToken ?? "").trim();

    if (!email || (mode !== "member" && mode !== "admin")) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("role")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Unknown users cannot use generic admin login.
    // Exception: valid, unexpired admin invite flow.
    if (!profile?.role) {
      if (mode === "admin") {
        if (!inviteToken) {
          return NextResponse.json(
            { error: "Admin access requires a valid invite link." },
            { status: 400 }
          );
        }

        const tokenHash = sha256(inviteToken);
        const { data: invite, error: inviteErr } = await admin
          .from("admin_invites")
          .select("id")
          .eq("token_hash", tokenHash)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (inviteErr) {
          return NextResponse.json({ error: inviteErr.message }, { status: 500 });
        }

        if (!invite) {
          return NextResponse.json(
            { error: "Admin invite link is invalid or expired." },
            { status: 400 }
          );
        }
      }

      return NextResponse.json({ ok: true });
    }

    const role = String(profile.role).toLowerCase().trim();
    if (mode === "admin" && role !== "admin") {
      return NextResponse.json(
        { error: "Please use the correct login type for this account." },
        { status: 400 }
      );
    }

    if (mode === "member" && role === "admin") {
      return NextResponse.json(
        { error: "Please use the correct login type for this account." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error." },
      { status: 500 }
    );
  }
}
