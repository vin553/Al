import { NextResponse } from "next/server";
import { deleteBooking, getBookingDetail, updateBookingStatus } from "@/lib/db";
import type { BookingStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: BookingStatus[] = ["confirmed", "completed", "cancelled"];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => ({}))) as { status?: BookingStatus };
  if (!body.status || !VALID.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (!getBookingDetail(params.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  updateBookingStatus(params.id, body.status);
  return NextResponse.json({ booking: getBookingDetail(params.id) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!getBookingDetail(params.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  deleteBooking(params.id);
  return NextResponse.json({ ok: true });
}
