/**
 * AI run log. Lives in the Focus database so a run can point at a task.
 */

import { getFocusDb } from "../focus-db";
import type { AiMode, AiRunResult, MediaResult, TextResult } from "./types";

let ready = false;
function db() {
  const d = getFocusDb();
  if (!ready) {
    d.exec(`
      CREATE TABLE IF NOT EXISTS ai_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mode TEXT NOT NULL,
        prompt TEXT NOT NULL,
        task_id TEXT,
        answer TEXT,
        responses TEXT NOT NULL,
        media TEXT,
        routing TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ai_runs_task ON ai_runs(task_id);
    `);
    ready = true;
  }
  return d;
}

interface Row {
  id: number;
  mode: string;
  prompt: string;
  task_id: string | null;
  answer: string | null;
  responses: string;
  media: string | null;
  routing: string;
  created_at: string;
}

function rowToRun(r: Row): AiRunResult {
  return {
    id: r.id,
    mode: r.mode as AiMode,
    prompt: r.prompt,
    taskId: r.task_id,
    answer: r.answer ? (JSON.parse(r.answer) as TextResult) : null,
    responses: JSON.parse(r.responses) as TextResult[],
    media: r.media ? (JSON.parse(r.media) as MediaResult) : null,
    routing: r.routing,
    createdAt: r.created_at,
  };
}

export function recordAiRun(run: Omit<AiRunResult, "id" | "createdAt">): AiRunResult {
  const createdAt = new Date().toISOString();
  const res = db()
    .prepare("INSERT INTO ai_runs (mode, prompt, task_id, answer, responses, media, routing, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(run.mode, run.prompt, run.taskId, run.answer ? JSON.stringify(run.answer) : null, JSON.stringify(run.responses), run.media ? JSON.stringify(run.media) : null, run.routing, createdAt);
  return { ...run, id: Number(res.lastInsertRowid), createdAt };
}

export function listAiRuns(opts: { limit?: number; taskId?: string } = {}): AiRunResult[] {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const rows = opts.taskId
    ? (db().prepare("SELECT * FROM ai_runs WHERE task_id = ? ORDER BY id DESC LIMIT ?").all(opts.taskId, limit) as Row[])
    : (db().prepare("SELECT * FROM ai_runs ORDER BY id DESC LIMIT ?").all(limit) as Row[]);
  return rows.map(rowToRun);
}

export function getAiRun(id: number): AiRunResult | null {
  const row = db().prepare("SELECT * FROM ai_runs WHERE id = ?").get(id) as Row | undefined;
  return row ? rowToRun(row) : null;
}
