"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NudgeKind, NudgeRecord } from "@/lib/focus-types";
import { cn } from "@/lib/utils";

interface DigestPayload {
  kind: NudgeKind;
  subject: string;
  body: string;
  provider: "anthropic" | "offline-heuristic";
  model?: string;
}

interface Props {
  initialKind: NudgeKind;
  initialDigest: DigestPayload;
  channels: string[];
  history: NudgeRecord[];
  aiConfigured: boolean;
  cronSecretSet: boolean;
}

const KINDS: { id: NudgeKind; label: string; when: string }[] = [
  { id: "morning", label: "Morning brief", when: "07:30 SGT" },
  { id: "midday", label: "Midday push", when: "13:00 SGT" },
  { id: "evening", label: "Evening review", when: "18:30 SGT" },
];

export function ReviewPanel({ initialKind, initialDigest, channels, history: initialHistory, aiConfigured, cronSecretSet }: Props) {
  const [kind, setKind] = useState<NudgeKind>(initialKind);
  const [digest, setDigest] = useState<DigestPayload>(initialDigest);
  const [history, setHistory] = useState<NudgeRecord[]>(initialHistory);
  const [busy, setBusy] = useState<"preview" | "ai" | "send" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function load(k: NudgeKind, ai = false) {
    setBusy(ai ? "ai" : "preview");
    setNote(null);
    try {
      const res = await fetch(`/api/focus/nudge?kind=${k}${ai ? "&ai=1" : ""}`, { cache: "no-store" });
      const j = await res.json();
      setKind(k);
      setDigest(j.digest);
      setHistory(j.history);
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("send");
    setNote(null);
    try {
      const res = await fetch(`/api/focus/nudge?kind=${kind}`, { method: "POST" });
      const j = (await res.json()) as { digest: DigestPayload; results: { channel: string; delivered: boolean; detail?: string }[]; error?: string };
      if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
      setDigest(j.digest);
      const summary = j.results.map((r) => `${r.channel}: ${r.delivered ? "sent" : `not sent${r.detail ? ` (${r.detail})` : ""}`}`).join(" · ");
      setNote(summary);
      const h = await fetch(`/api/focus/nudge?kind=${kind}`, { cache: "no-store" }).then((x) => x.json());
      setHistory(h.history);
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="container max-w-6xl py-10">
      <PageHeader
        eyebrow="Focus · Review"
        title="Briefs and nudges."
        description="What the push engine will say to you, when it will say it, and where it goes. Preview any digest, polish it with AI, or send it now."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/focus">
              <ArrowLeft className="h-3.5 w-3.5" /> Board
            </Link>
          </Button>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => load(k.id)}
                aria-pressed={kind === k.id}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs transition-colors",
                  kind === k.id ? "border-foreground/30 bg-secondary text-foreground" : "border-transparent text-muted-foreground hover:bg-secondary/60"
                )}
              >
                {k.label} <span className="ml-1 opacity-60">{k.when}</span>
              </button>
            ))}
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>{digest.subject}</CardTitle>
              <Badge variant={digest.provider === "anthropic" ? "success" : "muted"}>{digest.provider === "anthropic" ? `AI · ${digest.model}` : "heuristic"}</Badge>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-lg border bg-background/60 p-4 font-sans text-sm leading-relaxed" data-testid="digest-body">
                {digest.body}
              </pre>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={send} disabled={busy !== null}>
                  <Send className="h-3.5 w-3.5" /> {busy === "send" ? "Sending…" : "Send now"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => load(kind, true)} disabled={busy !== null || !aiConfigured} title={aiConfigured ? "Rewrite with Claude" : "Set ANTHROPIC_API_KEY to enable"}>
                  <Sparkles className="h-3.5 w-3.5" /> {busy === "ai" ? "Polishing…" : "Polish with AI"}
                </Button>
                {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Sent log</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing sent yet.</p>
              ) : (
                <ul className="divide-y text-xs">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{h.subject}</div>
                        <div className="text-muted-foreground">
                          {new Date(h.sentAt).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} · {h.kind} · {h.channel}
                        </div>
                      </div>
                      <Badge variant={h.delivered ? "success" : "muted"}>{h.delivered ? "delivered" : "recorded"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="Telegram" on={channels.includes("telegram")} hint="TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID" />
              <Row label="Email" on={channels.includes("email")} hint="RESEND_API_KEY + NOTIFY_EMAIL_TO" />
              <Row label="Webhook" on={channels.includes("webhook")} hint="NOTIFY_WEBHOOK_URL (WhatsApp via Zapier/Make)" />
              <Row label="AI polish" on={aiConfigured} hint="ANTHROPIC_API_KEY" />
              <Row label="Cron secret" on={cronSecretSet} hint="CRON_SECRET protects POST /api/focus/nudge" />
              {channels.length === 0 ? (
                <p className="pt-1 text-muted-foreground">No channel configured. Digests are still generated and logged here, just not delivered.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>On Vercel the schedule in vercel.json runs automatically. Anywhere else, three curl lines in crontab do the same job:</p>
              <pre className="overflow-x-auto rounded-md border bg-background/60 p-2 font-mono text-[11px] leading-relaxed">
                {`30 23 * * * curl -s -X POST "$APP/api/focus/nudge?kind=morning&sync=1&secret=$CRON_SECRET"
0  5  * * * curl -s -X POST "$APP/api/focus/nudge?kind=midday&secret=$CRON_SECRET"
30 10 * * * curl -s -X POST "$APP/api/focus/nudge?kind=evening&secret=$CRON_SECRET"`}
              </pre>
              <p>Times are UTC. That is 07:30, 13:00 and 18:30 in Singapore.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, on, hint }: { label: string; on: boolean; hint: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-muted-foreground">{hint}</div>
      </div>
      <Badge variant={on ? "success" : "muted"}>{on ? "on" : "off"}</Badge>
    </div>
  );
}
