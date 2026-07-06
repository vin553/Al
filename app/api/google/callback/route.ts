import { NextResponse } from "next/server";
import { handleCallback } from "@/lib/google";
import { originOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = originOf(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/settings?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/settings?error=missing_code`);
  }

  try {
    await handleCallback(code, origin);
    return NextResponse.redirect(`${origin}/settings?connected=1`);
  } catch (e) {
    console.error("Google callback failed:", e);
    return NextResponse.redirect(`${origin}/settings?error=exchange_failed`);
  }
}
