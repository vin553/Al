import { NextResponse } from "next/server";
import { getBookingDetail, markWhatsappSent } from "@/lib/db";
import { composeWhatsApp } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the composed WhatsApp/SMS message + click-to-send links (preview).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const booking = getBookingDetail(params.id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ message: composeWhatsApp(booking) });
}

// Records that the confirmation was sent via WhatsApp/SMS. The actual send happens
// in the staff member's WhatsApp/SMS app via the returned link.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const booking = getBookingDetail(params.id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  markWhatsappSent(booking.id);
  return NextResponse.json({
    ok: true,
    message: composeWhatsApp(booking),
    booking: getBookingDetail(booking.id),
  });
}
