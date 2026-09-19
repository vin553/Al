import { NextResponse } from "next/server";
import { createTask, listRecentTasks, listTasks, ValidationError } from "@/lib/focus-db";
import type { EntityId } from "@/lib/focus-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity") as EntityId | null;
  const includeDone = searchParams.get("done") === "1";
  const tasks = entity ? listTasks({ entity, includeDone }) : includeDone ? listRecentTasks() : listTasks();
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const task = createTask(body);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof SyntaxError) return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
    throw err;
  }
}
