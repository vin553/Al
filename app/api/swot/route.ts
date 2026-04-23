import { NextResponse } from "next/server";
import { getVendor, listVendors } from "@/lib/db";
import { generateSwot, marketMedians } from "@/lib/swot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const force = searchParams.get("force") === "1";
  if (!slug) {
    return NextResponse.json({ error: "missing slug" }, { status: 400 });
  }
  const vendor = getVendor(slug);
  if (!vendor) {
    return NextResponse.json({ error: "vendor not found" }, { status: 404 });
  }
  const market = marketMedians(listVendors());
  const swot = await generateSwot(vendor, market, { force });
  return NextResponse.json(swot);
}
