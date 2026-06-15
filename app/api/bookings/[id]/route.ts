import { NextResponse } from "next/server";
import {
  deleteBooking,
  getBookingDetail,
  updateJobStatus,
  updatePaymentStatus,
} from "@/lib/db";
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
  if (!getBookingDetail(params.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  deleteBooking(params.id);
  return NextResponse.json({ ok: true });
}
