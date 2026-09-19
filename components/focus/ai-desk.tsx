"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Loader2, Sparkles, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { AI_MODES, PROVIDER_LABEL, type AiMode, type AiRunResult, type ProviderStatus, type TextProviderId } from "@/lib/ai/types";
import type { Task } from "@/lib/focus-types";
import { cn } from "@/lib/utils";

interface Props {
  providers: ProviderStatus[];
  routes: Record<string, { provider: TextProviderId | null; reason: string }>;
  initialRuns: AiRunResult[];
  task: Task | null;
  initialMode: AiMode;
  initialPrompt: string;
}

const STARTERS: Record<AiMode, string> = {
  plan: "Plan my day. Tell me what to drop.",
  breakdown: "Break this down so I can start in the next 10 minutes.",
  draft: "Draft a warm reply to a couple asking for a destination wedding quote in Phuket for 150 guests in March.",
  summarize: "Paste the email, contract or notes to summarize here.",
  "second-opinion": "Paste the plan or draft you want torn apart.",
  council: "Should Alangkaar Weddings open a Bali office next year or keep running destination weddings from Singapore?",
  creative: "Editorial hero image for an Indian destination wedding at a Phuket clifftop villa at golden hour.",
};

export function AiDesk({ providers, routes, initialRuns, task, initialMode, initialPrompt }: Props) {
  const [mode, setMode] = useState<AiMode>(initialMode);
  const [prompt, setPrompt] = useState(initialPrompt || (task ? STARTERS.breakdown : STARTERS[initialMode]));
  const [provider, setProvider] = useState<TextProviderId | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<AiRunResult[]>(initialRuns);
  const [current, setCurrent] = useState<AiRunResult | null>(initialRuns[0] ?? null);

  const anyText = providers.some((p) => p.id !== "higgsfield" && p.configured);

  useEffect(() => {
    // Swap in a starter prompt when switching modes, but never overwrite what the user typed.
    setPrompt((p) => (Object.values(STARTERS).includes(p) ? STARTERS[mode] : p));
  }, [mode]);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, prompt, provider: provider || null, taskId: task?.id ?? null }),
      });
      const j = (await res.json()) as { run?: AiRunResult; error?: string };
      if (!res.ok || !j.run) throw new Error(j.error || `Request failed (${res.status})`);
      setCurrent(j.run);
      setRuns((r) => [j.run as AiRunResult, ...r].slice(0, 20));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const route = routes[mode];

  return (
    <div className="container max-w-7xl py-10">
      <PageHeader
        eyebrow="Focus · AI desk"
        title="One prompt. The right model."
        description="Each mode routes to the model that fits it, falls back when a key is missing, and logs every run. Council asks every configured model and merges the answers."
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
          {task ? (
            <div className="rounded-lg border bg-amber-500/5 px-3 py-2 text-xs">
              <span className="text-muted-foreground">About task:</span> <span className="font-medium">{task.title}</span>
              <Link href="/focus/ai" className="ml-2 text-muted-foreground underline-offset-2 hover:underline">
                clear
              </Link>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Mode">
            {AI_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mode === m.id}
                onClick={() => setMode(m.id)}
                title={m.hint}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs transition-colors",
                  mode === m.id ? "border-foreground/30 bg-secondary text-foreground" : "border-transparent text-muted-foreground hover:bg-secondary/60"
                )}
              >
                {m.id === "council" ? <Users className="mr-1 inline h-3 w-3" /> : m.id === "creative" ? <Sparkles className="mr-1 inline h-3 w-3" /> : null}
                {m.label}
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="space-y-3 p-4">
              <textarea
                aria-label="Prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                maxLength={20_000}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={run} disabled={busy || !prompt.trim()}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} {busy ? "Running…" : "Run"}
                </Button>
                {mode !== "council" ? (
                  <Select aria-label="Provider override" value={provider} onChange={(e) => setProvider(e.target.value as TextProviderId | "")} className="w-44">
                    <option value="">Auto: {route?.provider ? PROVIDER_LABEL[route.provider] : "none configured"}</option>
                    {providers
                      .filter((p) => p.id !== "higgsfield")
                      .map((p) => (
                        <option key={p.id} value={p.id} disabled={!p.configured}>
                          {p.label}
                          {p.configured ? "" : " (off)"}
                        </option>
                      ))}
                  </Select>
                ) : null}
                <span className="text-xs text-muted-foreground">{AI_MODES.find((m) => m.id === mode)?.hint}</span>
              </div>
              {!anyText ? (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  No text model configured. Runs will be logged with an error until at least one of ANTHROPIC_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY is set.
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {error}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {current ? <RunView run={current} /> : null}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Providers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {providers.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{p.label}</div>
                    <div className="text-muted-foreground">{p.configured ? p.model : p.env}</div>
                  </div>
                  <Badge variant={p.configured ? "success" : "muted"}>{p.configured ? "on" : "off"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Routing right now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs">
              {AI_MODES.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2">
                  <span>{m.label}</span>
                  <span className="text-right text-muted-foreground">
                    {m.id === "council" ? "all configured" : m.id === "creative" ? `${routes[m.id]?.provider ? PROVIDER_LABEL[routes[m.id].provider as TextProviderId] : "none"} → Higgsfield` : routes[m.id]?.provider ? PROVIDER_LABEL[routes[m.id].provider as TextProviderId] : "none"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Recent runs</CardTitle>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing yet.</p>
              ) : (
                <ul className="divide-y text-xs">
                  {runs.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => setCurrent(r)} className={cn("w-full py-2 text-left hover:text-foreground", current?.id === r.id ? "text-foreground" : "text-muted-foreground")}>
                        <div className="truncate font-medium">{r.prompt}</div>
                        <div>
                          {r.mode} · {r.answer?.error ? "failed" : r.answer ? PROVIDER_LABEL[r.answer.provider] : "—"} · {new Date(r.createdAt).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore" })}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function RunView({ run }: { run: AiRunResult }) {
  const a = run.answer;
  return (
    <div className="space-y-4" data-testid="run-view">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{run.mode === "council" ? "Merged answer" : "Answer"}</CardTitle>
          <div className="flex items-center gap-1.5">
            {a ? <Badge variant={a.error ? "warning" : "success"}>{a.error ? "failed" : `${PROVIDER_LABEL[a.provider]} · ${a.model}`}</Badge> : null}
            {a && !a.error ? <span className="text-[11px] tabular-nums text-muted-foreground">{(a.latencyMs / 1000).toFixed(1)}s</span> : null}
          </div>
        </CardHeader>
        <CardContent>
          {a?.error ? (
            <p className="text-sm text-rose-300" data-testid="run-error">
              {a.error}
            </p>
          ) : (
            <pre className="whitespace-pre-wrap rounded-lg border bg-background/60 p-4 font-sans text-sm leading-relaxed" data-testid="run-answer">
              {a?.text}
            </pre>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground" data-testid="run-routing">
            Routing: {run.routing}
          </p>
        </CardContent>
      </Card>

      {run.mode === "council" && run.responses.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {run.responses.map((r) => (
            <Card key={r.provider}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span>{PROVIDER_LABEL[r.provider]}</span>
                  <Badge variant={r.error ? "warning" : "muted"}>{r.error ? "failed" : r.model}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">{r.error ?? r.text}</pre>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {run.media ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Higgsfield render</CardTitle>
            <Badge variant={run.media.status === "completed" ? "success" : run.media.status === "skipped" ? "muted" : "warning"}>{run.media.status}</Badge>
          </CardHeader>
          <CardContent>
            {run.media.urls.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {run.media.urls.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="Higgsfield render" className="h-auto w-full" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{run.media.error ?? "No output."} Links expire after 7 days on Higgsfield, so save what you want to keep.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
