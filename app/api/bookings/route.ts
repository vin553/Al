import { NextResponse } from "next/server";
import { createBooking, findConflict, listBookingDetails, setGoogleEventId } from "@/lib/db";
import { addHoursToTime } from "@/lib/dates";
import { createCalendarEvent, getConnection } from "@/lib/google";
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

  const { customer, cleanerId, date, startTime, hours, amount } = body;
  if (!customer?.name) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }
  if (!cleanerId || !date || !startTime) {
    return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
  }
  if (typeof hours !== "number" || hours <= 0) {
    return NextResponse.json({ error: "A valid number of hours is required" }, { status: 400 });
  }
  if (typeof amount !== "number" || amount < 0) {
    return NextResponse.json({ error: "A valid amount is required" }, { status: 400 });
  }

  const endTime = addHoursToTime(startTime, hours);
  const conflict = findConflict(cleanerId, date, startTime, endTime);
  if (conflict) {
    return NextResponse.json(
      { error: `That cleaner is already booked ${conflict.startTime}–${conflict.endTime} on ${date}.` },
      { status: 409 }
    );
  }

  const booking = createBooking(body);

  // Best-effort push to Google Calendar (only if an account is connected).
  // Never block or fail the booking on a calendar hiccup.
  try {
    if (getConnection().connected) {
      const eventId = await createCalendarEvent(booking);
      if (eventId) {
        setGoogleEventId(booking.id, eventId);
        booking.googleEventId = eventId;
      }
    }
  } catch (e) {
    console.error("Google Calendar sync (create) failed:", e);
  }

  return NextResponse.json({ booking }, { status: 201 });
}
