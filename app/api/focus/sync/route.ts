import { NextResponse } from "next/server";
import { syncAll } from "@/lib/focus-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const results = await syncAll();
  return NextResponse.json({ results, syncedAt: new Date().toISOString() });
}
