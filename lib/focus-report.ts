/**
 * Glue between the store and the pure nudge engine. Server-only.
 */

import { listCalendarEvents, listRecentTasks } from "./focus-db";
import { buildReport, type NudgeReport } from "./nudge";

export function currentReport(now = new Date()): NudgeReport {
  const tasks = listRecentTasks(14);
  const from = new Date(now.getTime() - 86_400_000).toISOString();
  const to = new Date(now.getTime() + 2 * 86_400_000).toISOString();
  const events = listCalendarEvents(from, to);
  return buildReport(tasks, now, events);
}
