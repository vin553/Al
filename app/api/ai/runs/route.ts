import { NextResponse } from "next/server";
import { listAiRuns } from "@/lib/ai/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("task") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? 20);
  return NextResponse.json({ runs: listAiRuns({ taskId, limit: Number.isFinite(limit) ? limit : 20 }) });
}
