/**
 * Nudge engine — pure functions, no I/O.
 *
 * Takes the task list and "now", and works out what is overdue, what is due,
 * what has gone stale, how each entity is doing, and how hard to push.
 * The digest builders turn that into the text that gets sent by the notifier.
 */

import {
  ENTITIES,
  PRIORITY_LABEL,
  STALE_AFTER_DAYS,
  TIMEZONE,
  entityMeta,
  type CalendarEvent,
  type EntityId,
  type NudgeKind,
  type Task,
} from "./focus-types";

/* ---------- date helpers (Asia/Singapore, day granularity) ---------- */

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD for `d` in Singapore time. */
export function toDay(d: Date | string): string {
  return dayFmt.format(typeof d === "string" ? new Date(d) : d);
}

/** Add whole days to a YYYY-MM-DD string. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d + n);
  return new Date(t).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (b - a). Both YYYY-MM-DD. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function isValidDay(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export function formatDayLabel(day: string, today: string): string {
  const diff = daysBetween(today, day);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${-diff}d overdue`;
  if (diff <= 6) return `In ${diff}d`;
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/* ---------- classification ---------- */

export interface EntityScore {
  entity: EntityId;
  name: string;
  open: number;
  overdue: number;
  doneThisWeek: number;
  /** 0–100. Higher is healthier. */
  health: number;
}

export interface NudgeReport {
  today: string;
  overdue: Task[];
  dueToday: Task[];
  dueSoon: Task[]; // next 3 days, excluding today
  stale: Task[]; // open, untouched for STALE_AFTER_DAYS+
  inProgress: Task[];
  chronicSnoozers: Task[]; // snoozed 2+ times, still open
  doneToday: Task[];
  openCount: number;
  /** Consecutive days (ending today or yesterday) with at least one completion. */
  streak: number;
  /** 0–100. How hard the day is pushing back. */
  pressure: number;
  /** The three things to do next, in order. */
  focusNow: Task[];
  entities: EntityScore[];
  events: CalendarEvent[]; // today's calendar
}

const PRIORITY_WEIGHT = { p1: 3, p2: 2, p3: 1 } as const;

function isOpen(t: Task): boolean {
  return t.status !== "done";
}

/** Sort key: overdue-most first, then priority, then due soonest, then oldest. */
export function rankTasks(tasks: Task[], today: string): Task[] {
  return [...tasks].sort((a, b) => {
    const ao = a.dueOn ? daysBetween(a.dueOn, today) : -999; // positive = overdue days
    const bo = b.dueOn ? daysBetween(b.dueOn, today) : -999;
    const aOver = ao > 0 ? 1 : 0;
    const bOver = bo > 0 ? 1 : 0;
    if (aOver !== bOver) return bOver - aOver;
    if (PRIORITY_WEIGHT[a.priority] !== PRIORITY_WEIGHT[b.priority]) {
      return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    }
    if (a.dueOn && b.dueOn && a.dueOn !== b.dueOn) return a.dueOn < b.dueOn ? -1 : 1;
    if (a.dueOn && !b.dueOn) return -1;
    if (!a.dueOn && b.dueOn) return 1;
    return a.createdAt < b.createdAt ? -1 : 1;
  });
}

export function computeStreak(tasks: Task[], today: string): number {
  const doneDays = new Set(tasks.filter((t) => t.completedAt).map((t) => toDay(t.completedAt as string)));
  let streak = 0;
  // A streak may still be alive if nothing is done yet today; start counting from yesterday.
  let cursor = doneDays.has(today) ? today : addDays(today, -1);
  while (doneDays.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computePressure(r: Pick<NudgeReport, "overdue" | "dueToday" | "stale" | "chronicSnoozers">): number {
  const raw =
    r.overdue.reduce((s, t) => s + PRIORITY_WEIGHT[t.priority] * 8, 0) +
    r.dueToday.reduce((s, t) => s + PRIORITY_WEIGHT[t.priority] * 4, 0) +
    r.stale.length * 5 +
    r.chronicSnoozers.length * 6;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function scoreEntities(tasks: Task[], today: string): EntityScore[] {
  const weekStart = addDays(today, -6);
  return ENTITIES.map((e) => {
    const mine = tasks.filter((t) => t.entity === e.id);
    const open = mine.filter(isOpen);
    const overdue = open.filter((t) => t.dueOn && t.dueOn < today);
    const doneThisWeek = mine.filter((t) => t.completedAt && toDay(t.completedAt) >= weekStart);
    const stale = open.filter((t) => daysBetween(toDay(t.touchedAt), today) >= STALE_AFTER_DAYS);
    let health = 100;
    health -= overdue.length * 25;
    health -= stale.length * 10;
    health += Math.min(doneThisWeek.length * 4, 20);
    if (open.length === 0 && doneThisWeek.length === 0) health = 60; // idle, not healthy
    health = Math.max(0, Math.min(100, health));
    return {
      entity: e.id,
      name: e.name,
      open: open.length,
      overdue: overdue.length,
      doneThisWeek: doneThisWeek.length,
      health,
    };
  });
}

export function buildReport(tasks: Task[], now: Date, events: CalendarEvent[] = []): NudgeReport {
  const today = toDay(now);
  const open = tasks.filter(isOpen);
  const overdue = rankTasks(
    open.filter((t) => t.dueOn && t.dueOn < today),
    today
  );
  const dueToday = rankTasks(
    open.filter((t) => t.dueOn === today),
    today
  );
  const soonEnd = addDays(today, 3);
  const dueSoon = rankTasks(
    open.filter((t) => t.dueOn && t.dueOn > today && t.dueOn <= soonEnd),
    today
  );
  const stale = rankTasks(
    open.filter((t) => daysBetween(toDay(t.touchedAt), today) >= STALE_AFTER_DAYS),
    today
  );
  const inProgress = rankTasks(
    open.filter((t) => t.status === "doing"),
    today
  );
  const chronicSnoozers = rankTasks(
    open.filter((t) => t.snoozeCount >= 2),
    today
  );
  const doneToday = tasks.filter((t) => t.completedAt && toDay(t.completedAt) === today);

  const focusNow = rankTasks(open, today).slice(0, 3);
  const pressure = computePressure({ overdue, dueToday, stale, chronicSnoozers });
  const todayEvents = events
    .filter((e) => toDay(e.startsAt) === today)
    .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));

  return {
    today,
    overdue,
    dueToday,
    dueSoon,
    stale,
    inProgress,
    chronicSnoozers,
    doneToday,
    openCount: open.length,
    streak: computeStreak(tasks, today),
    pressure,
    focusNow,
    entities: scoreEntities(tasks, today),
    events: todayEvents,
  };
}

/* ---------- digest text ---------- */

export interface Digest {
  kind: NudgeKind;
  subject: string;
  /** Plain text, safe for email, Telegram and WhatsApp. */
  body: string;
}

function line(t: Task, today: string): string {
  const due = t.dueOn ? ` · ${formatDayLabel(t.dueOn, today)}` : "";
  const snooze = t.snoozeCount >= 2 ? ` · snoozed ${t.snoozeCount}×` : "";
  return `• [${PRIORITY_LABEL[t.priority]}] ${t.title} (${entityMeta(t.entity).short})${due}${snooze}`;
}

function timeLabel(e: CalendarEvent): string {
  if (e.allDay) return "All day";
  return new Date(e.startsAt).toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  });
}

export function pressureWord(p: number): string {
  if (p >= 70) return "red";
  if (p >= 40) return "amber";
  if (p >= 15) return "steady";
  return "clear";
}

/**
 * Heuristic digest. Direct, short, and pushy on purpose — the point is to make
 * Vin act, not to read. The optional AI polish in lib/focus-ai.ts can rewrite it.
 */
export function buildDigest(kind: NudgeKind, r: NudgeReport): Digest {
  const t = r.today;
  const out: string[] = [];

  if (kind === "morning") {
    out.push(`Morning, Vin. Board is ${pressureWord(r.pressure)} (${r.pressure}/100). Streak: ${r.streak} day${r.streak === 1 ? "" : "s"}.`);
    if (r.overdue.length) {
      out.push("", `OVERDUE (${r.overdue.length}) — clear these before anything new:`);
      out.push(...r.overdue.slice(0, 6).map((x) => line(x, t)));
    }
    if (r.dueToday.length) {
      out.push("", `DUE TODAY (${r.dueToday.length}):`);
      out.push(...r.dueToday.slice(0, 8).map((x) => line(x, t)));
    }
    if (r.events.length) {
      out.push("", "CALENDAR:");
      out.push(...r.events.slice(0, 8).map((e) => `• ${timeLabel(e)} ${e.title}`));
    }
    out.push("", "DO THESE THREE FIRST:");
    out.push(...(r.focusNow.length ? r.focusNow.map((x, i) => `${i + 1}. ${x.title} (${entityMeta(x.entity).short})`) : ["1. Nothing scheduled. Add tomorrow's tasks now so the board is not empty."]));
    if (r.dueSoon.length) {
      out.push("", `Coming up in 3 days: ${r.dueSoon.length} task${r.dueSoon.length === 1 ? "" : "s"}.`);
    }
  }

  if (kind === "midday") {
    const done = r.doneToday.length;
    out.push(`Midday check, Vin. ${done} done so far today. ${r.dueToday.length + r.overdue.length} still due.`);
    if (r.overdue.length) {
      out.push("", "Still overdue:");
      out.push(...r.overdue.slice(0, 5).map((x) => line(x, t)));
    }
    if (r.stale.length) {
      out.push("", `${r.stale.length} task${r.stale.length === 1 ? " has" : "s have"} not been touched in ${STALE_AFTER_DAYS}+ days. Do, delegate or delete:`);
      out.push(...r.stale.slice(0, 5).map((x) => line(x, t)));
    }
    if (r.chronicSnoozers.length) {
      out.push("", "You keep pushing these back. Decide today:");
      out.push(...r.chronicSnoozers.slice(0, 4).map((x) => line(x, t)));
    }
    if (r.focusNow.length) {
      out.push("", `Next up: ${r.focusNow[0].title}`);
    }
  }

  if (kind === "evening") {
    const done = r.doneToday.length;
    out.push(`Evening review, Vin. ${done} completed today. Streak: ${r.streak}.`);
    if (done) {
      out.push("", "DONE:");
      out.push(...r.doneToday.slice(0, 10).map((x) => `✓ ${x.title} (${entityMeta(x.entity).short})`));
    }
    const slipped = [...r.overdue, ...r.dueToday];
    if (slipped.length) {
      out.push("", `SLIPPED (${slipped.length}) — reschedule or finish tonight:`);
      out.push(...slipped.slice(0, 8).map((x) => line(x, t)));
    }
    const weak = r.entities.filter((e) => e.health < 50);
    if (weak.length) {
      out.push("", `Entities needing attention: ${weak.map((e) => `${e.name} (${e.health})`).join(", ")}.`);
    }
    out.push("", `Tomorrow's top three:`);
    const tomorrow = r.focusNow.filter((x) => x.status !== "done");
    out.push(...(tomorrow.length ? tomorrow.map((x, i) => `${i + 1}. ${x.title}`) : ["Plan tomorrow now. Empty boards drift."]));
  }

  const subjectMap: Record<NudgeKind, string> = {
    morning: `Focus · ${r.overdue.length} overdue · ${r.dueToday.length} due today · board ${pressureWord(r.pressure)}`,
    midday: `Focus · midday · ${r.doneToday.length} done · ${r.overdue.length + r.dueToday.length} left`,
    evening: `Focus · evening · ${r.doneToday.length} done · streak ${r.streak}`,
  };

  return { kind, subject: subjectMap[kind], body: out.join("\n") };
}
