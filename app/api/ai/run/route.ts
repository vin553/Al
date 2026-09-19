import { NextResponse } from "next/server";
import { runAi } from "@/lib/ai/router";
import { AI_MODES, TEXT_PROVIDERS, type AiMode, type TextProviderId } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Council runs three providers plus a merge; Higgsfield renders can take a couple of minutes.
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const mode = body.mode as AiMode;
  if (!AI_MODES.some((m) => m.id === mode)) {
    return NextResponse.json({ error: `mode must be one of ${AI_MODES.map((m) => m.id).join(", ")}` }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 20_000) : "";
  if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  const provider = body.provider == null || body.provider === "" ? null : (body.provider as TextProviderId);
  if (provider && !TEXT_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: `provider must be one of ${TEXT_PROVIDERS.join(", ")}` }, { status: 400 });
  }
  const taskId = typeof body.taskId === "string" && body.taskId ? body.taskId : null;
  const context = typeof body.context === "string" ? body.context.slice(0, 20_000) : undefined;

  const run = await runAi({ mode, prompt, provider, taskId, context });
  return NextResponse.json({ run });
}
