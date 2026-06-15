// Builds the customer-facing booking confirmation email.

import type { BookingDetail } from "./types";
import { COMPANY } from "./seed-data";
import { formatDateLong, formatTime12 } from "./dates";
import { formatSgd } from "./utils";

export interface ComposedEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function composeConfirmation(b: BookingDetail): ComposedEmail {
  const subject = `Booking confirmed — ${b.package.name} on ${formatDateLong(b.date)}`;
  const ref = b.id.toUpperCase();

  const lines = [
    `Dear ${b.customer.name},`,
    ``,
    `Thank you for booking with ${COMPANY.name}. Your cleaning service is confirmed.`,
    ``,
    `Booking reference: ${ref}`,
    `Service: ${b.package.name}`,
    `Date: ${formatDateLong(b.date)}`,
    `Time: ${formatTime12(b.startTime)} – ${formatTime12(b.endTime)}`,
    `Address: ${b.customer.address}`,
    `Assigned cleaner: ${b.cleaner.name} (${b.cleaner.code})`,
    `Amount payable: ${formatSgd(b.amount)}`,
    b.notes ? `Notes: ${b.notes}` : ``,
    ``,
    `If you need to reschedule, please contact us at ${COMPANY.phone} or reply to this email.`,
    ``,
    `Warm regards,`,
    `${COMPANY.name}`,
    `${COMPANY.phone} · ${COMPANY.email}`,
  ].filter((l) => l !== null);

  const text = lines.join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#64748b;font-size:14px;white-space:nowrap">${label}</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600">${value}</td></tr>`;

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
    <div style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
      <div style="background:#0f172a;color:#fff;padding:20px 24px">
        <div style="font-size:18px;font-weight:700">${COMPANY.name}</div>
        <div style="font-size:13px;opacity:.8">Booking Confirmation</div>
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 12px">Dear ${b.customer.name},</p>
        <p style="margin:0 0 16px;color:#334155">Thank you for booking with us. Your cleaning service is <strong>confirmed</strong>.</p>
        <table style="border-collapse:collapse;width:100%;margin:8px 0 16px">
          ${row("Reference", ref)}
          ${row("Service", b.package.name)}
          ${row("Date", formatDateLong(b.date))}
          ${row("Time", `${formatTime12(b.startTime)} – ${formatTime12(b.endTime)}`)}
          ${row("Address", b.customer.address)}
          ${row("Cleaner", `${b.cleaner.name} (${b.cleaner.code})`)}
          ${row("Amount", formatSgd(b.amount))}
          ${b.notes ? row("Notes", b.notes) : ""}
        </table>
        <p style="margin:0 0 4px;color:#334155;font-size:14px">Need to reschedule? Call ${COMPANY.phone} or reply to this email.</p>
        <p style="margin:16px 0 0;color:#64748b;font-size:13px">Warm regards,<br/>${COMPANY.name}<br/>${COMPANY.phone} · ${COMPANY.email}</p>
      </div>
    </div>
  </div>`;

  return { to: b.customer.email, subject, text, html };
}

/** A mailto: link the staff member can click to send from their own mail client. */
export function mailtoLink(email: ComposedEmail): string {
  const params = new URLSearchParams({ subject: email.subject, body: email.text });
  return `mailto:${encodeURIComponent(email.to)}?${params.toString()}`;
}
