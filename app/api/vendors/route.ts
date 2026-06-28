import { NextResponse } from "next/server";
import { getDataset } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const dataset = getDataset();
  return NextResponse.json(dataset, {
    headers: { "cache-control": "no-store" },
  });
}
