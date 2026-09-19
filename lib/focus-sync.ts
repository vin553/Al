/**
 * Sync sources for the Focus tracker.
 *
 *   ClickUp   CLICKUP_API_TOKEN (personal token, Settings → Apps)
 *             CLICKUP_TEAM_ID   optional, defaults to the first workspace
 *   Calendar  CALENDAR_ICS_URLS comma-separated "Name=https://…ics" (Google Calendar → Settings →
 *             "Secret address in iCal format"). Plain URLs are allowed; the name is then derived.
 *
 * Both are pull-based so no OAuth app is needed. Run them via POST /api/focus/sync
 * (the cron hits it before the morning digest) or the Sync button on /focus.
 */

import { replaceCalendarEvents, upsertExternalTask } from "./focus-db";
import { ENTITIES, type EntityId, type Priority, type Status } from "./focus-types";
import { toDay } from "./nudge";

export interface SyncSummary {
  source: "clickup" | "calendar";
  configured: boolean;
  count: number;
  detail?: string;
}

/* ---------- entity guessing ---------- */

const ENTITY_HINTS: [RegExp, EntityId][] = [
  [/nikkah|malay/i, "nikkah"],
  [/ivory|chinese/i, "ivory"],
  [/prime|corporate/i, "prime"],
  [/raja|cater/i, "rajas"],
  [/lakshmi|holding/i, "holdings"],
  [/alangkaar|indian|wedding/i, "alangkaar"],
  [/personal|home|family/i, "personal"],
];

export function guessEntity(...texts: (string | null | undefined)[]): EntityId {
  const hay = texts.filter(Boolean).join(" ");
  for (const [re, id] of ENTITY_HINTS) if (re.test(hay)) return id;
  return ENTITIES[0].id;
}

/* ---------- ClickUp ---------- */

interface ClickUpTask {
  id: string;
  name: string;
  url: string;
  description?: string | null;
  due_date?: string | null;
  priority?: { id: string; priority: string } | null;
  status: { status: string; type: string };
  space?: { id: string; name?: string };
  folder?: { id: string; name?: string };
  list?: { id: string; name?: string };
}

function clickUpPriority(p: ClickUpTask["priority"]): Priority {
  const id = p?.id ? Number(p.id) : 3;
  if (id <= 2) return "p1";
  if (id === 3) return "p2";
  return "p3";
}

function clickUpStatus(s: ClickUpTask["status"]): Status {
  if (s.type === "closed" || s.type === "done") return "done";
  if (/progress|doing|active|working/i.test(s.status)) return "doing";
  return "todo";
}

export async function syncClickUp(): Promise<SyncSummary> {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) return { source: "clickup", configured: false, count: 0, detail: "CLICKUP_API_TOKEN not set" };
  const headers = { authorization: token, "content-type": "application/json" };

  const me = (await (await fetch("https://api.clickup.com/api/v2/user", { headers })).json()) as {
    user?: { id: number };
  };
  if (!me.user?.id) return { source: "clickup", configured: true, count: 0, detail: "could not resolve ClickUp user" };

  let teamId = process.env.CLICKUP_TEAM_ID;
  if (!teamId) {
    const teams = (await (await fetch("https://api.clickup.com/api/v2/team", { headers })).json()) as {
      teams?: { id: string }[];
    };
    teamId = teams.teams?.[0]?.id;
  }
  if (!teamId) return { source: "clickup", configured: true, count: 0, detail: "no ClickUp workspace found" };

  let page = 0;
  let count = 0;
  for (;;) {
    const qs = new URLSearchParams({
      page: String(page),
      subtasks: "true",
      include_closed: "false",
      order_by: "due_date",
    });
    qs.append("assignees[]", String(me.user.id));
    const res = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/task?${qs}`, { headers });
    if (!res.ok) return { source: "clickup", configured: true, count, detail: `ClickUp ${res.status}` };
    const data = (await res.json()) as { tasks?: ClickUpTask[]; last_page?: boolean };
    const tasks = data.tasks ?? [];
    for (const t of tasks) {
      upsertExternalTask({
        source: "clickup",
        externalId: t.id,
        externalUrl: t.url,
        title: t.name,
        notes: (t.description ?? "").slice(0, 1000),
        entity: guessEntity(t.space?.name, t.folder?.name, t.list?.name, t.name),
        priority: clickUpPriority(t.priority),
        status: clickUpStatus(t.status),
        dueOn: t.due_date ? toDay(new Date(Number(t.due_date))) : null,
      });
      count += 1;
    }
    if (data.last_page || tasks.length === 0) break;
    page += 1;
    if (page > 20) break;
  }
  return { source: "clickup", configured: true, count };
}

/* ---------- ICS calendar ---------- */

interface ParsedEvent {
  uid: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  url: string | null;
}

/** Unfold RFC 5545 continuation lines. */
function unfold(ics: string): string[] {
  return ics
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

function parseIcsDate(value: string, params: string): { iso: string; allDay: boolean } | null {
  const isDate = /VALUE=DATE(?!-TIME)/i.test(params) || /^\d{8}$/.test(value);
  if (isDate) {
    const y = value.slice(0, 4);
    const m = value.slice(4, 6);
    const d = value.slice(6, 8);
    // All-day events are pinned to 00:00 Singapore time (UTC+8).
    return { iso: new Date(`${y}-${m}-${d}T00:00:00+08:00`).toISOString(), allDay: true };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s = "00", z] = m;
  if (z) return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}.000Z`, allDay: false };
  const tzid = params.match(/TZID=([^;:]+)/i)?.[1];
  // Google exports Singapore events as TZID=Asia/Singapore; anything unknown is treated as local SG time.
  const offset = !tzid || /Singapore|Kuala_Lumpur|Manila|Shanghai|Hong_Kong|Taipei|Perth/i.test(tzid) ? "+08:00" : "Z";
  return { iso: new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${offset}`).toISOString(), allDay: false };
}

/**
 * Minimal VEVENT parser. Single events only; RRULE recurrences are not expanded
 * (Google's ICS export includes each instance of recent recurrences, which is enough
 * for a 14-day window in practice).
 */
export function parseIcs(ics: string): ParsedEvent[] {
  const out: ParsedEvent[] = [];
  let cur: Partial<ParsedEvent> | null = null;
  for (const raw of unfold(ics)) {
    if (raw === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (raw === "END:VEVENT") {
      if (cur?.uid && cur.title && cur.startsAt) {
        out.push({
          uid: cur.uid,
          title: cur.title,
          startsAt: cur.startsAt,
          endsAt: cur.endsAt ?? null,
          allDay: cur.allDay ?? false,
          url: cur.url ?? null,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = raw.indexOf(":");
    if (idx < 0) continue;
    const head = raw.slice(0, idx);
    const value = raw.slice(idx + 1);
    const [name, ...paramParts] = head.split(";");
    const params = paramParts.join(";");
    switch (name.toUpperCase()) {
      case "UID":
        cur.uid = value;
        break;
      case "SUMMARY":
        cur.title = value.replace(/\\,/g, ",").replace(/\\n/g, " ").trim();
        break;
      case "URL":
        cur.url = value;
        break;
      case "DTSTART": {
        const p = parseIcsDate(value, params);
        if (p) {
          cur.startsAt = p.iso;
          cur.allDay = p.allDay;
        }
        break;
      }
      case "DTEND": {
        const p = parseIcsDate(value, params);
        if (p) cur.endsAt = p.iso;
        break;
      }
      case "RECURRENCE-ID":
        // Keep instance uid unique so an overridden recurrence doesn't collide with its master.
        cur.uid = `${cur.uid ?? ""}#${value}`;
        break;
      default:
        break;
    }
  }
  return out;
}

export function parseCalendarSources(raw: string | undefined): { name: string; url: string }[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const eq = s.indexOf("=");
      if (eq > 0 && !s.slice(0, eq).includes("://")) {
        return { name: s.slice(0, eq).trim(), url: s.slice(eq + 1).trim() };
      }
      const host = s.match(/https?:\/\/([^/]+)/)?.[1] ?? "calendar";
      return { name: host, url: s };
    });
}

export async function syncCalendar(windowDays = 14): Promise<SyncSummary> {
  const sources = parseCalendarSources(process.env.CALENDAR_ICS_URLS);
  if (sources.length === 0) {
    return { source: "calendar", configured: false, count: 0, detail: "CALENDAR_ICS_URLS not set" };
  }
  const from = Date.now() - 86_400_000;
  const to = Date.now() + windowDays * 86_400_000;
  let count = 0;
  const problems: string[] = [];
  for (const src of sources) {
    try {
      const res = await fetch(src.url, { headers: { accept: "text/calendar" } });
      if (!res.ok) {
        problems.push(`${src.name}: ${res.status}`);
        continue;
      }
      const events = parseIcs(await res.text()).filter((e) => {
        const t = Date.parse(e.startsAt);
        return t >= from && t <= to;
      });
      count += replaceCalendarEvents(src.name, events);
    } catch (err) {
      problems.push(`${src.name}: ${(err as Error).message}`);
    }
  }
  return { source: "calendar", configured: true, count, detail: problems.length ? problems.join("; ") : undefined };
}

export async function syncAll(): Promise<SyncSummary[]> {
  return Promise.all([syncClickUp(), syncCalendar()]);
}
