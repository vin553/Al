/**
 * Notifier — pushes a digest out through whichever channel is configured.
 *
 * Channels are picked from environment variables, in this order:
 *   1. Telegram   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
 *   2. Email      RESEND_API_KEY + NOTIFY_EMAIL_TO (+ optional NOTIFY_EMAIL_FROM)
 *   3. Webhook    NOTIFY_WEBHOOK_URL (POSTs JSON — Zapier, Make, n8n, WhatsApp bridges)
 *
 * Every configured channel is used. With nothing configured the digest is
 * still recorded in the nudge log and shown on /focus/review, just not sent.
 */

import type { Digest } from "./nudge";

export interface DeliveryResult {
  channel: string;
  delivered: boolean;
  detail?: string;
}

export function configuredChannels(): string[] {
  const out: string[] = [];
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) out.push("telegram");
  if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL_TO) out.push("email");
  if (process.env.NOTIFY_WEBHOOK_URL) out.push("webhook");
  return out;
}

async function sendTelegram(d: Digest): Promise<DeliveryResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN as string;
  const chatId = process.env.TELEGRAM_CHAT_ID as string;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `${d.subject}\n\n${d.body}`,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) return { channel: "telegram", delivered: false, detail: `${res.status} ${await res.text()}` };
  return { channel: "telegram", delivered: true };
}

async function sendEmail(d: Digest): Promise<DeliveryResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.NOTIFY_EMAIL_FROM || "Focus <onboarding@resend.dev>",
      to: [process.env.NOTIFY_EMAIL_TO],
      subject: d.subject,
      text: d.body,
    }),
  });
  if (!res.ok) return { channel: "email", delivered: false, detail: `${res.status} ${await res.text()}` };
  return { channel: "email", delivered: true };
}

async function sendWebhook(d: Digest): Promise<DeliveryResult> {
  const res = await fetch(process.env.NOTIFY_WEBHOOK_URL as string, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: d.kind, subject: d.subject, body: d.body, sentAt: new Date().toISOString() }),
  });
  if (!res.ok) return { channel: "webhook", delivered: false, detail: `${res.status}` };
  return { channel: "webhook", delivered: true };
}

export async function deliver(d: Digest): Promise<DeliveryResult[]> {
  const channels = configuredChannels();
  if (channels.length === 0) return [{ channel: "none", delivered: false, detail: "no channel configured" }];
  const jobs: Promise<DeliveryResult>[] = [];
  if (channels.includes("telegram")) jobs.push(sendTelegram(d));
  if (channels.includes("email")) jobs.push(sendEmail(d));
  if (channels.includes("webhook")) jobs.push(sendWebhook(d));
  const results = await Promise.allSettled(jobs);
  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { channel: channels[i], delivered: false, detail: (r.reason as Error)?.message ?? "failed" }
  );
}
