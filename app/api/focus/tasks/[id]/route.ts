import { NextResponse } from "next/server";
import { deleteTask, getTask, snoozeTask, updateTask, ValidationError } from "@/lib/focus-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_request: Request, { params }: Ctx) {
  const task = getTask(params.id);
  if (!task) return NextResponse.json({ error: "task not found" }, { status: 404 });
  return NextResponse.json({ task });
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === "snooze") {
      const days = typeof body.days === "number" && body.days > 0 && body.days <= 30 ? body.days : 1;
      return NextResponse.json({ task: snoozeTask(params.id, days) });
    }
    return NextResponse.json({ task: updateTask(params.id, body) });
  } catch (err) {
    if (err instanceof ValidationError) {
      const status = err.message === "task not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    if (err instanceof SyntaxError) return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const ok = deleteTask(params.id);
  if (!ok) return NextResponse.json({ error: "task not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
