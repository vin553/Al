import { NextResponse } from "next/server";
import { providerStatuses } from "@/lib/ai/providers";
import { pickProvider } from "@/lib/ai/router";
import { AI_MODES } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which providers are live, and which one each mode would route to right now. */
export async function GET() {
  const routes = Object.fromEntries(AI_MODES.map((m) => [m.id, pickProvider(m.id)]));
  return NextResponse.json({ providers: providerStatuses(), routes });
}
