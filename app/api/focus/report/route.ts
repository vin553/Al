import { NextResponse } from "next/server";
import { completionHistogram } from "@/lib/focus-db";
import { currentReport } from "@/lib/focus-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ report: currentReport(), histogram: completionHistogram(14) });
}
