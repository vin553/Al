// Builds the customer-facing WhatsApp / SMS confirmation message and the
// click-to-send deep links. WhatsApp links use wa.me, which opens the chat with
// the message pre-filled — no API credentials required.

import type { BookingDetail } from "./types";
import { COMPANY } from "./seed-data";
import { formatDateLong, formatTime12 } from "./dates";
import { formatSgd } from "./utils";

export interface ComposedMessage {
  phone: string; // normalised, e.g. 6591234567 (empty if none on file)
  text: string;
  waLink: string; // https://wa.me/...
  smsLink: string; // sms:...
}

/** Normalise a Singapore phone number to digits with a 65 country code. */
export function normalisePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("65") && d.length === 10) return d; // already +65 9xxx xxxx
  if (d.length === 8) return "65" + d; // local 8-digit mobile/landline
  return d; // leave anything unusual as-is
}

function fullAddress(b: BookingDetail): string {
  return [b.customer.address, b.customer.postal].filter(Boolean).join(", ");
}

export function composeWhatsApp(b: BookingDetail): ComposedMessage {
  const phone = normalisePhone(b.customer.phone);
  const ref = b.id.toUpperCase();

  const text = [
    `Hi ${b.customer.name}, your cleaning with ${COMPANY.name} is confirmed ✅`,
    ``,
    `📅 ${formatDateLong(b.date)}`,
    `⏰ ${formatTime12(b.startTime)}–${formatTime12(b.endTime)} (${b.hours}h)`,
    `📍 ${fullAddress(b)}`,
    `🧹 Cleaner: ${b.cleaner.name}`,
    `💵 ${formatSgd(b.amount)}`,
    `Ref: ${ref}`,
    ``,
    `Need to reschedule? Just reply here or call ${COMPANY.phone}. Thank you!`,
  ].join("\n");

  const encoded = encodeURIComponent(text);
  return {
    phone,
    text,
    waLink: phone ? `https://wa.me/${phone}?text=${encoded}` : "",
    smsLink: phone ? `sms:+${phone}?body=${encoded}` : `sms:?body=${encoded}`,
  };
}
