/**
 * GET  /api/focus/nudge?kind=morning|midday|evening            → preview (nothing sent)
 * POST /api/focus/nudge?kind=…                                  → build, send, record
 * GET  /api/focus/nudge?kind=…&send=1                           → same as POST (Vercel Cron uses GET)
 *
 * Cron callers hit POST with either `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends
 * this automatically) or `?secret=$CRON_SECRET`. With CRON_SECRET unset, POST is open — fine
 * for a private deployment, set it for anything on the public internet.
 * Pass `sync=1` to pull ClickUp and calendar first.
 */

import { NextResponse } from "next/server";
import { polishDigest } from "@/lib/focus-ai";
import { listNudges, recordNudge } from "@/lib/focus-db";
import { currentReport } from "@/lib/focus-report";
import { syncAll } from "@/lib/focus-sync";
import type { NudgeKind } from "@/lib/focus-types";
import { buildDigest } from "@/lib/nudge";
import { configuredChannels, deliver } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: NudgeKind[] = ["morning", "midday", "evening"];

function kindFrom(url: URL): NudgeKind {
  const k = url.searchParams.get("kind");
  return KINDS.includes(k as NudgeKind) ? (k as NudgeKind) : "morning";
}

function authorised(request: Request, url: URL): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return url.searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Vercel Cron calls with GET; `send=1` plus a valid secret turns a preview into a real send.
  if (url.searchParams.get("send") === "1") return POST(request);
  const kind = kindFrom(url);
  const report = currentReport();
  const digest = buildDigest(kind, report);
  const polished = url.searchParams.get("ai") === "1" ? await polishDigest(digest, report) : { ...digest, provider: "offline-heuristic" as const };
  return NextResponse.json({
    digest: polished,
    channels: configuredChannels(),
    history: listNudges(10),
    report: {
      today: report.today,
      pressure: report.pressure,
      streak: report.streak,
      overdue: report.overdue.length,
      dueToday: report.dueToday.length,
      stale: report.stale.length,
      doneToday: report.doneToday.length,
    },
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!authorised(request, url)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const kind = kindFrom(url);
  const sync = url.searchParams.get("sync") === "1" ? await syncAll() : undefined;
  const report = currentReport();
  const digest = await polishDigest(buildDigest(kind, report), report);
  const results = await deliver(digest);
  const records = results.map((r) =>
    recordNudge({
      kind,
      channel: r.channel,
      delivered: r.delivered,
      subject: digest.subject,
      body: r.detail && !r.delivered ? `${digest.body}\n\n[delivery failed: ${r.detail}]` : digest.body,
    })
  );
  return NextResponse.json({ digest, results, records, sync });
}
