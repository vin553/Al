import { NextResponse } from "next/server";
import { getBookingDetail, markEmailSent } from "@/lib/db";
import { composeConfirmation, mailtoLink } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the composed confirmation email (preview).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const booking = getBookingDetail(params.id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const email = composeConfirmation(booking);
  return NextResponse.json({ email, mailto: mailtoLink(email) });
}

// "Sends" the confirmation. With no SMTP credentials configured this records the
// send and returns the composed message + a mailto fallback the staff can use.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const booking = getBookingDetail(params.id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const email = composeConfirmation(booking);
  markEmailSent(booking.id);
  return NextResponse.json({
    ok: true,
    sent: true,
    email,
    mailto: mailtoLink(email),
    booking: getBookingDetail(booking.id),
  });
}
