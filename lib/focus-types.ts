/**
 * Focus — task tracking + push engine for the Alangkaar Group.
 * Types and constants shared by the store, the nudge engine, the API and the UI.
 */

export const TIMEZONE = "Asia/Singapore";

export const ENTITIES = [
  { id: "alangkaar", name: "Alangkaar Weddings", short: "Alangkaar", tone: "amber" },
  { id: "nikkah", name: "Nikkah.com.sg", short: "Nikkah", tone: "emerald" },
  { id: "ivory", name: "The Ivory Co.", short: "Ivory", tone: "rose" },
  { id: "prime", name: "Prime Events", short: "Prime", tone: "sky" },
  { id: "rajas", name: "Raja's Catering", short: "Raja's", tone: "orange" },
  { id: "holdings", name: "Lakshmi Holdings", short: "Holdings", tone: "violet" },
  { id: "personal", name: "Personal", short: "Personal", tone: "zinc" },
] as const;

export type EntityId = (typeof ENTITIES)[number]["id"];
export const ENTITY_IDS = ENTITIES.map((e) => e.id) as EntityId[];

export function entityMeta(id: EntityId) {
  return ENTITIES.find((e) => e.id === id) ?? ENTITIES[ENTITIES.length - 1];
}

export type Priority = "p1" | "p2" | "p3";
export const PRIORITIES: Priority[] = ["p1", "p2", "p3"];
export const PRIORITY_LABEL: Record<Priority, string> = {
  p1: "Must",
  p2: "Should",
  p3: "Could",
};

export type Status = "todo" | "doing" | "done";
export const STATUSES: Status[] = ["todo", "doing", "done"];

export type TaskSource = "manual" | "clickup" | "calendar";

export interface Task {
  id: string;
  title: string;
  notes: string;
  entity: EntityId;
  priority: Priority;
  status: Status;
  /** Due date as YYYY-MM-DD in Asia/Singapore, or null. */
  dueOn: string | null;
  estimateMin: number | null;
  source: TaskSource;
  externalId: string | null;
  externalUrl: string | null;
  createdAt: string;
  updatedAt: string;
  /** Last time the task was worked on (status change, edit, explicit "touch"). */
  touchedAt: string;
  completedAt: string | null;
  /** Number of times the due date was pushed back. Fuel for the nag engine. */
  snoozeCount: number;
}

export type NewTask = Pick<Task, "title"> &
  Partial<Pick<Task, "notes" | "entity" | "priority" | "status" | "dueOn" | "estimateMin" | "source" | "externalId" | "externalUrl">>;

export type TaskPatch = Partial<
  Pick<Task, "title" | "notes" | "entity" | "priority" | "status" | "dueOn" | "estimateMin">
> & { touch?: boolean; snooze?: boolean };

export interface CalendarEvent {
  uid: string;
  title: string;
  startsAt: string; // ISO
  endsAt: string | null;
  allDay: boolean;
  url: string | null;
  calendar: string;
  syncedAt: string;
}

export type NudgeKind = "morning" | "midday" | "evening";

export interface NudgeRecord {
  id: number;
  kind: NudgeKind;
  channel: string;
  delivered: boolean;
  sentAt: string;
  subject: string;
  body: string;
}

export const STALE_AFTER_DAYS = 3;
