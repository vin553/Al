"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlarmClock,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  Flame,
  Gauge,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ENTITIES,
  PRIORITY_LABEL,
  STALE_AFTER_DAYS,
  TIMEZONE,
  entityMeta,
  type EntityId,
  type Priority,
  type Task,
} from "@/lib/focus-types";
import { addDays, daysBetween, formatDayLabel, pressureWord, toDay, type NudgeReport } from "@/lib/nudge";
import { cn } from "@/lib/utils";

interface Histogram {
  day: string;
  done: number;
}

interface Props {
  initialTasks: Task[];
  initialReport: NudgeReport;
  initialHistogram: Histogram[];
}

const TONE: Record<string, string> = {
  amber: "bg-amber-500/15 text-amber-300",
  emerald: "bg-emerald-500/15 text-emerald-300",
  rose: "bg-rose-500/15 text-rose-300",
  sky: "bg-sky-500/15 text-sky-300",
  orange: "bg-orange-500/15 text-orange-300",
  violet: "bg-violet-500/15 text-violet-300",
  zinc: "bg-zinc-500/15 text-zinc-300",
};

function EntityChip({ id, className }: { id: EntityId; className?: string }) {
  const m = entityMeta(id);
  return (
    <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium", TONE[m.tone], className)}>
      {m.short}
    </span>
  );
}

function PriorityChip({ p }: { p: Priority }) {
  return (
    <Badge variant={p === "p1" ? "warning" : p === "p2" ? "info" : "muted"} className="px-1.5 py-0 text-[11px]">
      {PRIORITY_LABEL[p]}
    </Badge>
  );
}

export function FocusBoard({ initialTasks, initialReport, initialHistogram }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [report, setReport] = useState<NudgeReport>(initialReport);
  const [histogram, setHistogram] = useState<Histogram[]>(initialHistogram);
  const [entityFilter, setEntityFilter] = useState<EntityId | "all">("all");
  const [showDone, setShowDone] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const today = report.today;

  const refresh = useCallback(async () => {
    const [t, r] = await Promise.all([
      fetch("/api/focus/tasks?done=1", { cache: "no-store" }).then((x) => x.json()),
      fetch("/api/focus/report", { cache: "no-store" }).then((x) => x.json()),
    ]);
    setTasks(t.tasks);
    setReport(r.report);
    setHistogram(r.histogram);
  }, []);

  // Keep "today" honest if the tab is left open past midnight.
  useEffect(() => {
    const id = setInterval(() => {
      if (toDay(new Date()) !== report.today) void refresh();
    }, 60_000);
    return () => clearInterval(id);
  }, [report.today, refresh]);

  async function mutate(label: string, fn: () => Promise<Response>) {
    setBusy(label);
    setError(null);
    try {
      const res = await fn();
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${res.status})`);
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const patch = (id: string, body: Record<string, unknown>) =>
    mutate(id, () =>
      fetch(`/api/focus/tasks/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
    );

  const remove = (id: string) => mutate(id, () => fetch(`/api/focus/tasks/${id}`, { method: "DELETE" }));

  const seed = () => mutate("seed", () => fetch("/api/focus/seed", { method: "POST" }));

  async function sync() {
    setBusy("sync");
    setSyncNote(null);
    try {
      const res = await fetch("/api/focus/sync", { method: "POST" });
      const j = (await res.json()) as { results: { source: string; configured: boolean; count: number; detail?: string }[] };
      setSyncNote(
        j.results
          .map((r) => (r.configured ? `${r.source}: ${r.count} synced${r.detail ? ` (${r.detail})` : ""}` : `${r.source}: not configured`))
          .join(" · ")
      );
      await refresh();
    } catch (e) {
      setSyncNote((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const visible = useMemo(
    () => tasks.filter((t) => (entityFilter === "all" || t.entity === entityFilter) && (showDone || t.status !== "done")),
    [tasks, entityFilter, showDone]
  );

  const groups = useMemo(() => {
    const open = visible.filter((t) => t.status !== "done");
    const soonEnd = addDays(today, 3);
    const byPriority = (a: Task, b: Task) => a.priority.localeCompare(b.priority) || (a.dueOn ?? "9").localeCompare(b.dueOn ?? "9");
    return [
      { key: "doing", label: "In progress", items: open.filter((t) => t.status === "doing").sort(byPriority) },
      { key: "overdue", label: "Overdue", items: open.filter((t) => t.status !== "doing" && t.dueOn && t.dueOn < today).sort(byPriority), tone: "text-rose-400" },
      { key: "today", label: "Due today", items: open.filter((t) => t.status !== "doing" && t.dueOn === today).sort(byPriority), tone: "text-amber-300" },
      { key: "soon", label: "Next 3 days", items: open.filter((t) => t.status !== "doing" && t.dueOn && t.dueOn > today && t.dueOn <= soonEnd).sort(byPriority) },
      { key: "later", label: "Later / no date", items: open.filter((t) => t.status !== "doing" && (!t.dueOn || t.dueOn > soonEnd)).sort(byPriority) },
      { key: "done", label: "Done", items: visible.filter((t) => t.status === "done").sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")) },
    ].filter((g) => g.items.length > 0);
  }, [visible, today]);

  const word = pressureWord(report.pressure);
  const headline =
    report.overdue.length > 0
      ? `Board is ${word}. ${report.overdue.length} overdue.`
      : report.dueToday.length > 0
        ? `${report.dueToday.length} due today. Board is ${word}.`
        : report.openCount === 0
          ? "Board is empty. Plan the week."
          : "Nothing overdue. Keep it that way.";

  return (
    <div className="container max-w-7xl py-10">
      <PageHeader
        eyebrow="Focus · Alangkaar Group · Singapore"
        title={headline}
        description={`${report.openCount} open across ${ENTITIES.length - 1} entities. Streak ${report.streak} day${report.streak === 1 ? "" : "s"}. ${report.doneToday.length} done today.`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={sync} disabled={busy === "sync"}>
              <RefreshCw className={cn("h-3.5 w-3.5", busy === "sync" && "animate-spin")} /> Sync
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/focus/ai">
                <Bot className="h-3.5 w-3.5" /> AI desk
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/focus/review">
                Review <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        }
      />

      {syncNote ? <p className="mt-3 text-xs text-muted-foreground">{syncNote}</p> : null}
      {error ? (
        <p role="alert" className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}

      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Pressure" value={`${report.pressure}`} hint={`${word} · overdue and stale work push it up`} icon={<Gauge />} index={0} />
        <KpiCard label="Overdue" value={report.overdue.length} hint={report.overdue.length ? "Clear before anything new" : "Nothing slipped"} icon={<AlarmClock />} index={1} />
        <KpiCard label="Due today" value={report.dueToday.length} hint={`${report.dueSoon.length} more in the next 3 days`} icon={<Zap />} index={2} />
        <KpiCard label="Streak" value={report.streak} hint={`${report.doneToday.length} done today`} icon={<Flame />} index={3} />
      </section>

      {report.focusNow.length > 0 ? (
        <Card className="mt-6 border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-300">Do these three first</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            {report.focusNow.map((t, i) => (
              <div key={t.id} className="flex items-start justify-between gap-2 rounded-lg border bg-background/60 p-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">#{i + 1}</div>
                  <div className="truncate text-sm font-medium" title={t.title}>
                    {t.title}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <EntityChip id={t.entity} />
                    {t.dueOn ? <span className="text-[11px] text-muted-foreground">{formatDayLabel(t.dueOn, today)}</span> : null}
                  </div>
                </div>
                <Button size="sm" variant="secondary" aria-label={`Mark ${t.title} done`} onClick={() => patch(t.id, { status: "done" })} disabled={busy === t.id}>
                  <Check className="h-3.5 w-3.5" /> Done
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuickAdd today={today} onAdd={(body) => mutate("add", () => fetch("/api/focus/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }))} busy={busy === "add"} />

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <FilterChip active={entityFilter === "all"} onClick={() => setEntityFilter("all")}>
              All
            </FilterChip>
            {ENTITIES.map((e) => (
              <FilterChip key={e.id} active={entityFilter === e.id} onClick={() => setEntityFilter(e.id)}>
                {e.short}
              </FilterChip>
            ))}
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="h-3.5 w-3.5 accent-foreground" />
              Show done
            </label>
          </div>

          {tasks.length === 0 ? (
            <Card className="mt-4">
              <CardContent className="flex flex-col items-start gap-3 p-6">
                <p className="text-sm font-medium">Nothing here yet.</p>
                <p className="text-sm text-muted-foreground">Add your first task above, sync ClickUp, or load a set of starter tasks to see how the board behaves.</p>
                <Button size="sm" variant="outline" onClick={seed} disabled={busy === "seed"}>
                  Load starter tasks
                </Button>
              </CardContent>
            </Card>
          ) : groups.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No tasks match this filter.</p>
          ) : (
            <div className="mt-4 space-y-6" data-testid="task-groups">
              {groups.map((g) => (
                <section key={g.key} aria-label={g.label}>
                  <h2 className={cn("mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground", g.tone)}>
                    {g.label} · {g.items.length}
                  </h2>
                  <ul className="divide-y rounded-lg border bg-card/40">
                    {g.items.map((t) => (
                      <TaskRow key={t.id} task={t} today={today} busy={busy === t.id} onPatch={(b) => patch(t.id, b)} onDelete={() => remove(t.id)} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Entity health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {report.entities.map((e) => (
                <div key={e.entity} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{e.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {e.open} open{e.overdue ? ` · ${e.overdue} late` : ""}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-secondary/50">
                    <div
                      className={cn("h-full rounded", e.health >= 70 ? "bg-emerald-400/80" : e.health >= 45 ? "bg-amber-400/80" : "bg-rose-400/80")}
                      style={{ width: `${e.health}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5" /> Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.events.length === 0 ? (
                <p className="text-xs text-muted-foreground">No calendar events synced for today. Set CALENDAR_ICS_URLS and press Sync.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {report.events.map((e) => (
                    <li key={e.uid} className="flex gap-2">
                      <span className="w-12 shrink-0 tabular-nums text-muted-foreground">
                        {e.allDay ? "All day" : new Date(e.startsAt).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TIMEZONE })}
                      </span>
                      <span className="truncate">{e.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Last 14 days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-12 items-end gap-1" aria-label="Completions per day">
                {histogram.map((h) => {
                  const max = Math.max(1, ...histogram.map((x) => x.done));
                  return (
                    <div key={h.day} className="flex-1" title={`${h.day}: ${h.done}`}>
                      <div className={cn("w-full rounded-sm", h.done ? "bg-emerald-400/80" : "bg-secondary/60")} style={{ height: `${Math.max(8, (h.done / max) * 100)}%` }} />
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {histogram.reduce((s, h) => s + h.done, 0)} completed · stale after {STALE_AFTER_DAYS} untouched days
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs transition-colors",
        active ? "border-foreground/30 bg-secondary text-foreground" : "border-transparent text-muted-foreground hover:bg-secondary/60"
      )}
    >
      {children}
    </button>
  );
}

function QuickAdd({ today, onAdd, busy }: { today: string; onAdd: (body: Record<string, unknown>) => Promise<void>; busy: boolean }) {
  const [title, setTitle] = useState("");
  const [entity, setEntity] = useState<EntityId>("alangkaar");
  const [priority, setPriority] = useState<Priority>("p2");
  const [dueOn, setDueOn] = useState<string>(today);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await onAdd({ title: title.trim(), entity, priority, dueOn: dueOn || null });
    setTitle("");
  }

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-lg border bg-card/40 p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
      <Input aria-label="New task" placeholder="What needs doing? Press Enter to add." value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      <Select aria-label="Entity" value={entity} onChange={(e) => setEntity(e.target.value as EntityId)} className="sm:w-36">
        {ENTITIES.map((en) => (
          <option key={en.id} value={en.id}>
            {en.short}
          </option>
        ))}
      </Select>
      <Select aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="sm:w-28">
        <option value="p1">Must</option>
        <option value="p2">Should</option>
        <option value="p3">Could</option>
      </Select>
      <Input aria-label="Due date" type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} className="sm:w-40" />
      <Button type="submit" disabled={busy || !title.trim()}>
        <Plus className="h-4 w-4" /> Add
      </Button>
    </form>
  );
}

function TaskRow({
  task: t,
  today,
  busy,
  onPatch,
  onDelete,
}: {
  task: Task;
  today: string;
  busy: boolean;
  onPatch: (body: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const done = t.status === "done";
  const untouched = daysBetween(toDay(t.touchedAt), today);
  const stale = !done && untouched >= STALE_AFTER_DAYS;
  const overdue = !done && !!t.dueOn && t.dueOn < today;

  return (
    <li className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", busy && "opacity-60")} data-testid="task-row">
      <button
        type="button"
        aria-label={done ? `Reopen ${t.title}` : `Complete ${t.title}`}
        onClick={() => onPatch({ status: done ? "todo" : "done" })}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
          done ? "border-emerald-400 bg-emerald-400 text-background" : "border-input hover:border-foreground"
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate font-medium", done && "text-muted-foreground line-through")} title={t.title}>
          {t.externalUrl ? (
            <a href={t.externalUrl} target="_blank" rel="noreferrer" className="hover:underline">
              {t.title}
            </a>
          ) : (
            t.title
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <EntityChip id={t.entity} />
          <PriorityChip p={t.priority} />
          {t.dueOn ? <span className={cn(overdue && "font-medium text-rose-400")}>{formatDayLabel(t.dueOn, today)}</span> : null}
          {stale ? <span className="text-amber-300">untouched {untouched}d</span> : null}
          {t.snoozeCount >= 2 ? <span className="text-rose-300">snoozed {t.snoozeCount}×</span> : null}
          {t.source !== "manual" ? <span className="uppercase">{t.source}</span> : null}
        </div>
      </div>
      {!done ? (
        <div className="flex shrink-0 items-center gap-0.5">
          {t.status !== "doing" ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Start ${t.title}`} title="Start" onClick={() => onPatch({ status: "doing" })}>
              <Play className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Ask AI to break this down">
            <Link href={`/focus/ai?task=${t.id}`} aria-label={`Ask AI about ${t.title}`}>
              <Bot className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Snooze ${t.title}`} title="Push to tomorrow (counts against you)" onClick={() => onPatch({ action: "snooze", days: 1 })}>
            <AlarmClock className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-400" aria-label={`Delete ${t.title}`} title="Delete" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
    </li>
  );
}
