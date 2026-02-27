import { NextResponse } from "next/server";
import { z } from "zod";

const Schema = z.object({
  url: z.string().url(),
});

export async function POST(req: Request) {
  const body = Schema.parse(await req.json());
  return NextResponse.json({ ok: true, url: body.url });
}
