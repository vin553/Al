import { NextResponse } from "next/server";
import { listTasks, seedStarterTasks } from "@/lib/focus-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Loads starter tasks once, only onto an empty board. */
export async function POST() {
  if (listTasks({ includeDone: true }).length > 0) {
    return NextResponse.json({ error: "board is not empty" }, { status: 409 });
  }
  const tasks = seedStarterTasks();
  return NextResponse.json({ tasks }, { status: 201 });
}
