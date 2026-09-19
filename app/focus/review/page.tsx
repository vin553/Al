import type { Metadata } from "next";
import { ReviewPanel } from "@/components/focus/review-panel";
import { listNudges } from "@/lib/focus-db";
import { currentReport } from "@/lib/focus-report";
import type { NudgeKind } from "@/lib/focus-types";
import { buildDigest } from "@/lib/nudge";
import { configuredChannels } from "@/lib/notify";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Focus review — Alangkaar Group",
  description: "Preview and send the morning brief, midday push and evening review.",
};

/** Pick the digest that matches the time of day in Singapore. */
function defaultKind(now = new Date()): NudgeKind {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Singapore" }).format(now)
  );
  if (hour < 12) return "morning";
  if (hour < 17) return "midday";
  return "evening";
}

export default function ReviewPage() {
  const kind = defaultKind();
  const report = currentReport();
  const digest = { ...buildDigest(kind, report), provider: "offline-heuristic" as const };
  return (
    <ReviewPanel
      initialKind={kind}
      initialDigest={digest}
      channels={configuredChannels()}
      history={listNudges(10)}
      aiConfigured={!!process.env.ANTHROPIC_API_KEY}
      cronSecretSet={!!process.env.CRON_SECRET}
    />
  );
}
