/**
 * Focus store — SQLite via better-sqlite3, same pattern as lib/db.ts.
 * Separate database file so the tracker can be wiped without touching vendor data.
 */

import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  ENTITY_IDS,
  PRIORITIES,
  STATUSES,
  type CalendarEvent,
  type EntityId,
  type NewTask,
  type NudgeKind,
  type NudgeRecord,
  type Priority,
  type Status,
  type Task,
  type TaskPatch,
  type TaskSource,
} from "./focus-types";
import { addDays, isValidDay, toDay } from "./nudge";

const DB_PATH = process.env.FOCUS_DB_PATH || path.join(process.cwd(), "data", "focus.db");

let _db: Database.Database | null = null;

export function getFocusDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      entity TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      due_on TEXT,
      estimate_min INTEGER,
      source TEXT NOT NULL DEFAULT 'manual',
      external_id TEXT,
      external_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      touched_at TEXT NOT NULL,
      completed_at TEXT,
      snooze_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX IF NOT EXISTS tasks_external ON tasks(source, external_id) WHERE external_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS tasks_status_due ON tasks(status, due_on);

    CREATE TABLE IF NOT EXISTS task_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      uid TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT,
      all_day INTEGER NOT NULL DEFAULT 0,
      url TEXT,
      calendar TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nudges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      channel TEXT NOT NULL,
      delivered INTEGER NOT NULL,
      sent_at TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL
    );
  `);
  return _db;
}

/* ---------- row mapping ---------- */

interface TaskRow {
  id: string;
  title: string;
  notes: string;
  entity: string;
  priority: string;
  status: string;
  due_on: string | null;
  estimate_min: number | null;
  source: string;
  external_id: string | null;
  external_url: string | null;
  created_at: string;
  updated_at: string;
  touched_at: string;
  completed_at: string | null;
  snooze_count: number;
}

function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    entity: r.entity as EntityId,
    priority: r.priority as Priority,
    status: r.status as Status,
    dueOn: r.due_on,
    estimateMin: r.estimate_min,
    source: r.source as TaskSource,
    externalId: r.external_id,
    externalUrl: r.external_url,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    touchedAt: r.touched_at,
    completedAt: r.completed_at,
    snoozeCount: r.snooze_count,
  };
}

/* ---------- validation ---------- */

export class ValidationError extends Error {}

function cleanTitle(v: unknown): string {
  if (typeof v !== "string") throw new ValidationError("title must be a string");
  const t = v.trim().slice(0, 200);
  if (!t) throw new ValidationError("title is required");
  return t;
}

function cleanEntity(v: unknown): EntityId {
  if (v == null) return "alangkaar";
  if (typeof v !== "string" || !ENTITY_IDS.includes(v as EntityId)) {
    throw new ValidationError(`entity must be one of ${ENTITY_IDS.join(", ")}`);
  }
  return v as EntityId;
}

function cleanPriority(v: unknown): Priority {
  if (v == null) return "p2";
  if (typeof v !== "string" || !PRIORITIES.includes(v as Priority)) {
    throw new ValidationError("priority must be p1, p2 or p3");
  }
  return v as Priority;
}

function cleanStatus(v: unknown): Status {
  if (v == null) return "todo";
  if (typeof v !== "string" || !STATUSES.includes(v as Status)) {
    throw new ValidationError("status must be todo, doing or done");
  }
  return v as Status;
}

function cleanDue(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (!isValidDay(v)) throw new ValidationError("dueOn must be YYYY-MM-DD");
  return v;
}

function cleanEstimate(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100_000) throw new ValidationError("estimateMin must be a positive number");
  return Math.round(n);
}

function cleanNotes(v: unknown): string {
  if (v == null) return "";
  if (typeof v !== "string") throw new ValidationError("notes must be a string");
  return v.slice(0, 4000);
}

/* ---------- tasks ---------- */

export function listTasks(opts: { includeDone?: boolean; entity?: EntityId } = {}): Task[] {
  const db = getFocusDb();
  const where: string[] = [];
  const params: Record<string, string> = {};
  if (!opts.includeDone) where.push("status != 'done'");
  if (opts.entity) {
    where.push("entity = @entity");
    params.entity = opts.entity;
  }
  const sql = `SELECT * FROM tasks ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at`;
  return (db.prepare(sql).all(params) as TaskRow[]).map(rowToTask);
}

/** Everything open plus anything completed in the last `days` days — what the board and digests need. */
export function listRecentTasks(days = 14): Task[] {
  const db = getFocusDb();
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = db
    .prepare("SELECT * FROM tasks WHERE status != 'done' OR completed_at >= ? ORDER BY created_at")
    .all(cutoff) as TaskRow[];
  return rows.map(rowToTask);
}

export function getTask(id: string): Task | null {
  const row = getFocusDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
  return row ? rowToTask(row) : null;
}

function logEvent(taskId: string, kind: string, detail = "", at = new Date().toISOString()) {
  getFocusDb()
    .prepare("INSERT INTO task_events (task_id, kind, detail, at) VALUES (?, ?, ?, ?)")
    .run(taskId, kind, detail, at);
}

export function createTask(input: NewTask): Task {
  const db = getFocusDb();
  const now = new Date().toISOString();
  const status = cleanStatus(input.status);
  const task: Task = {
    id: crypto.randomUUID(),
    title: cleanTitle(input.title),
    notes: cleanNotes(input.notes),
    entity: cleanEntity(input.entity),
    priority: cleanPriority(input.priority),
    status,
    dueOn: cleanDue(input.dueOn),
    estimateMin: cleanEstimate(input.estimateMin),
    source: input.source ?? "manual",
    externalId: input.externalId ?? null,
    externalUrl: input.externalUrl ?? null,
    createdAt: now,
    updatedAt: now,
    touchedAt: now,
    completedAt: status === "done" ? now : null,
    snoozeCount: 0,
  };
  db.prepare(
    `INSERT INTO tasks (id, title, notes, entity, priority, status, due_on, estimate_min, source, external_id, external_url, created_at, updated_at, touched_at, completed_at, snooze_count)
     VALUES (@id, @title, @notes, @entity, @priority, @status, @dueOn, @estimateMin, @source, @externalId, @externalUrl, @createdAt, @updatedAt, @touchedAt, @completedAt, @snoozeCount)`
  ).run(task);
  logEvent(task.id, "created", task.source, now);
  return task;
}

export function updateTask(id: string, patch: TaskPatch): Task {
  const db = getFocusDb();
  const current = getTask(id);
  if (!current) throw new ValidationError("task not found");
  const now = new Date().toISOString();
  const next: Task = { ...current, updatedAt: now };

  if (patch.title !== undefined) next.title = cleanTitle(patch.title);
  if (patch.notes !== undefined) next.notes = cleanNotes(patch.notes);
  if (patch.entity !== undefined) next.entity = cleanEntity(patch.entity);
  if (patch.priority !== undefined) next.priority = cleanPriority(patch.priority);
  if (patch.estimateMin !== undefined) next.estimateMin = cleanEstimate(patch.estimateMin);

  if (patch.dueOn !== undefined) {
    const due = cleanDue(patch.dueOn);
    if (due !== current.dueOn) {
      const pushedBack = !!(current.dueOn && due && due > current.dueOn) || patch.snooze === true;
      if (pushedBack) {
        next.snoozeCount = current.snoozeCount + 1;
        logEvent(id, "snoozed", `${current.dueOn ?? "none"} → ${due ?? "none"}`, now);
      } else {
        logEvent(id, "rescheduled", `${current.dueOn ?? "none"} → ${due ?? "none"}`, now);
      }
      next.dueOn = due;
    }
  }

  if (patch.status !== undefined) {
    const status = cleanStatus(patch.status);
    if (status !== current.status) {
      next.status = status;
      next.completedAt = status === "done" ? now : null;
      next.touchedAt = now;
      logEvent(id, "status", `${current.status} → ${status}`, now);
    }
  }

  if (patch.touch) {
    next.touchedAt = now;
    logEvent(id, "touched", "", now);
  } else if (patch.title !== undefined || patch.notes !== undefined) {
    next.touchedAt = now;
  }

  db.prepare(
    `UPDATE tasks SET title=@title, notes=@notes, entity=@entity, priority=@priority, status=@status, due_on=@dueOn,
       estimate_min=@estimateMin, updated_at=@updatedAt, touched_at=@touchedAt, completed_at=@completedAt, snooze_count=@snoozeCount
     WHERE id=@id`
  ).run(next);
  return next;
}

export function deleteTask(id: string): boolean {
  const db = getFocusDb();
  const res = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  db.prepare("DELETE FROM task_events WHERE task_id = ?").run(id);
  return res.changes > 0;
}

/** Snooze = push the due date forward by `days` (default: tomorrow). Counts against you. */
export function snoozeTask(id: string, days = 1): Task {
  const current = getTask(id);
  if (!current) throw new ValidationError("task not found");
  const base = current.dueOn && current.dueOn > toDay(new Date()) ? current.dueOn : toDay(new Date());
  return updateTask(id, { dueOn: addDays(base, days), snooze: true });
}

/** Upsert a task from an external system. Never overwrites a manual edit of status once done. */
export function upsertExternalTask(input: NewTask & { source: Exclude<TaskSource, "manual">; externalId: string }): Task {
  const db = getFocusDb();
  const existing = db
    .prepare("SELECT * FROM tasks WHERE source = ? AND external_id = ?")
    .get(input.source, input.externalId) as TaskRow | undefined;
  if (!existing) return createTask(input);
  const current = rowToTask(existing);
  const patch: TaskPatch = {};
  if (input.title && input.title !== current.title) patch.title = input.title;
  if (input.dueOn !== undefined && input.dueOn !== current.dueOn) patch.dueOn = input.dueOn;
  if (input.priority && input.priority !== current.priority) patch.priority = input.priority;
  if (input.status && input.status !== current.status) patch.status = input.status;
  if (input.notes !== undefined && input.notes !== current.notes) patch.notes = input.notes;
  if (input.externalUrl && input.externalUrl !== current.externalUrl) {
    db.prepare("UPDATE tasks SET external_url = ? WHERE id = ?").run(input.externalUrl, current.id);
  }
  return Object.keys(patch).length ? updateTask(current.id, patch) : current;
}

/* ---------- calendar ---------- */

export function replaceCalendarEvents(calendar: string, events: Omit<CalendarEvent, "calendar" | "syncedAt">[]): number {
  const db = getFocusDb();
  const now = new Date().toISOString();
  const del = db.prepare("DELETE FROM calendar_events WHERE calendar = ?");
  const ins = db.prepare(
    `INSERT INTO calendar_events (uid, title, starts_at, ends_at, all_day, url, calendar, synced_at)
     VALUES (@uid, @title, @startsAt, @endsAt, @allDay, @url, @calendar, @syncedAt)
     ON CONFLICT(uid) DO UPDATE SET title=excluded.title, starts_at=excluded.starts_at, ends_at=excluded.ends_at,
       all_day=excluded.all_day, url=excluded.url, calendar=excluded.calendar, synced_at=excluded.synced_at`
  );
  const tx = db.transaction(() => {
    del.run(calendar);
    for (const e of events) {
      ins.run({ ...e, allDay: e.allDay ? 1 : 0, calendar, syncedAt: now });
    }
  });
  tx();
  return events.length;
}

export function listCalendarEvents(fromIso: string, toIso: string): CalendarEvent[] {
  const rows = getFocusDb()
    .prepare("SELECT * FROM calendar_events WHERE starts_at >= ? AND starts_at < ? ORDER BY starts_at")
    .all(fromIso, toIso) as {
    uid: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    all_day: number;
    url: string | null;
    calendar: string;
    synced_at: string;
  }[];
  return rows.map((r) => ({
    uid: r.uid,
    title: r.title,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    allDay: r.all_day === 1,
    url: r.url,
    calendar: r.calendar,
    syncedAt: r.synced_at,
  }));
}

/* ---------- nudges ---------- */

export function recordNudge(n: { kind: NudgeKind; channel: string; delivered: boolean; subject: string; body: string }): NudgeRecord {
  const db = getFocusDb();
  const sentAt = new Date().toISOString();
  const res = db
    .prepare("INSERT INTO nudges (kind, channel, delivered, sent_at, subject, body) VALUES (?, ?, ?, ?, ?, ?)")
    .run(n.kind, n.channel, n.delivered ? 1 : 0, sentAt, n.subject, n.body);
  return { id: Number(res.lastInsertRowid), sentAt, ...n };
}

export function listNudges(limit = 20): NudgeRecord[] {
  const rows = getFocusDb()
    .prepare("SELECT * FROM nudges ORDER BY id DESC LIMIT ?")
    .all(limit) as { id: number; kind: string; channel: string; delivered: number; sent_at: string; subject: string; body: string }[];
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as NudgeKind,
    channel: r.channel,
    delivered: r.delivered === 1,
    sentAt: r.sent_at,
    subject: r.subject,
    body: r.body,
  }));
}

/** Completions per day for the last `days` days (oldest first). Powers the activity strip. */
export function completionHistogram(days = 14): { day: string; done: number }[] {
  const today = toDay(new Date());
  const start = addDays(today, -(days - 1));
  const rows = getFocusDb()
    .prepare("SELECT completed_at FROM tasks WHERE completed_at IS NOT NULL AND completed_at >= ?")
    .all(new Date(Date.parse(start) - 86_400_000).toISOString()) as { completed_at: string }[];
  const counts = new Map<string, number>();
  for (const r of rows) {
    const d = toDay(r.completed_at);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const out: { day: string; done: number }[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = addDays(start, i);
    out.push({ day: d, done: counts.get(d) ?? 0 });
  }
  return out;
}

/* ---------- starter content ---------- */

export function seedStarterTasks(): Task[] {
  const today = toDay(new Date());
  const starters: NewTask[] = [
    { title: "Confirm Phuket venue shortlist for Q4 destination enquiry", entity: "alangkaar", priority: "p1", dueOn: today },
    { title: "Reply to Bali resort partnership email", entity: "alangkaar", priority: "p2", dueOn: addDays(today, 1) },
    { title: "Publish two nikkah reels from last weekend", entity: "nikkah", priority: "p2", dueOn: addDays(today, 2) },
    { title: "Send The Ivory Co. tea ceremony package quote", entity: "ivory", priority: "p1", dueOn: today },
    { title: "Lock AV vendor for corporate dinner and dance", entity: "prime", priority: "p2", dueOn: addDays(today, 3) },
    { title: "Review Raja's Catering weekly menu costing", entity: "rajas", priority: "p3", dueOn: addDays(today, 5) },
    { title: "File Lakshmi Holdings quarterly GST", entity: "holdings", priority: "p1", dueOn: addDays(today, 7) },
    { title: "Book dentist", entity: "personal", priority: "p3", dueOn: null },
  ];
  return starters.map((s) => createTask({ ...s, notes: "Starter example. Edit or delete." }));
}
