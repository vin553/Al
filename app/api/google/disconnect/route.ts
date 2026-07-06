import { NextResponse } from "next/server";
import { disconnect } from "@/lib/google";
import { originOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  disconnect();
  return NextResponse.redirect(`${originOf(req)}/settings`, { status: 303 });
}
