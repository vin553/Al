import { NextResponse } from "next/server";
import { getAuthUrl, isGoogleConfigured } from "@/lib/google";
import { originOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = originOf(req);
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${origin}/settings?error=notconfigured`);
  }
  return NextResponse.redirect(getAuthUrl(origin));
}
