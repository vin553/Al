import { NextResponse } from "next/server";
import { createBooking, findConflict, listBookingDetails } from "@/lib/db";
import { addHoursToTime } from "@/lib/dates";
import { listPackages } from "@/lib/db";
import type { NewBookingInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ bookings: listBookingDetails() });
}

export async function POST(req: Request) {
  let body: NewBookingInput;
  try {
    body = (await req.json()) as NewBookingInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { customer, packageId, cleanerId, date, startTime, amount } = body;
  if (!customer?.name || !customer?.email) {
    return NextResponse.json({ error: "Customer name and email are required" }, { status: 400 });
  }
  if (!packageId || !cleanerId || !date || !startTime) {
    return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
  }
  if (typeof amount !== "number" || amount < 0) {
    return NextResponse.json({ error: "A valid amount is required" }, { status: 400 });
  }

  const pkg = listPackages().find((p) => p.id === packageId);
  if (!pkg) return NextResponse.json({ error: "Unknown package" }, { status: 400 });

  const endTime = addHoursToTime(startTime, pkg.durationHours);
  const conflict = findConflict(cleanerId, date, startTime, endTime);
  if (conflict) {
    return NextResponse.json(
      { error: `That cleaner is already booked ${conflict.startTime}–${conflict.endTime} on ${date}.` },
      { status: 409 }
    );
  }

  const booking = createBooking(body);
  return NextResponse.json({ booking }, { status: 201 });
}
