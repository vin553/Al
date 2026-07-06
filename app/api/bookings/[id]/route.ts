import { NextResponse } from "next/server";
import {
  deleteBooking,
  getBookingDetail,
  updateJobStatus,
  updatePaymentStatus,
} from "@/lib/db";
import { deleteCalendarEvent } from "@/lib/google";
import type { JobStatus, PaymentStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JOB: JobStatus[] = ["scheduled", "completed", "cancelled"];
const PAY: PaymentStatus[] = ["unbilled", "pending", "done"];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => ({}))) as {
    jobStatus?: JobStatus;
    paymentStatus?: PaymentStatus;
  };
  if (!getBookingDetail(params.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (body.jobStatus) {
    if (!JOB.includes(body.jobStatus)) {
      return NextResponse.json({ error: "Invalid job status" }, { status: 400 });
    }
    updateJobStatus(params.id, body.jobStatus);
  }
  if (body.paymentStatus) {
    if (!PAY.includes(body.paymentStatus)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }
    updatePaymentStatus(params.id, body.paymentStatus);
  }
  return NextResponse.json({ booking: getBookingDetail(params.id) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const existing = getBookingDetail(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Remove the matching Google Calendar event too, if one was synced.
  if (existing.googleEventId) {
    try {
      await deleteCalendarEvent(existing.googleEventId);
    } catch (e) {
      console.error("Google Calendar sync (delete) failed:", e);
    }
  }
  deleteBooking(params.id);
  return NextResponse.json({ ok: true });
}
