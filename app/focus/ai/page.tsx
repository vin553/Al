import type { Metadata } from "next";
import { AiDesk } from "@/components/focus/ai-desk";
import { providerStatuses } from "@/lib/ai/providers";
import { pickProvider } from "@/lib/ai/router";
import { listAiRuns } from "@/lib/ai/store";
import { AI_MODES, type AiMode } from "@/lib/ai/types";
import { getTask } from "@/lib/focus-db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI desk — Focus",
  description: "Route any request to Claude, ChatGPT, Gemini or Higgsfield, or ask all of them at once.",
};

export default function AiPage({ searchParams }: { searchParams: { task?: string; mode?: string; prompt?: string } }) {
  const task = searchParams.task ? getTask(searchParams.task) : null;
  const mode = AI_MODES.some((m) => m.id === searchParams.mode) ? (searchParams.mode as AiMode) : task ? "breakdown" : "plan";
  const routes = Object.fromEntries(AI_MODES.map((m) => [m.id, pickProvider(m.id)]));
  return (
    <AiDesk
      providers={providerStatuses()}
      routes={routes}
      initialRuns={listAiRuns({ limit: 20, taskId: task?.id })}
      task={task}
      initialMode={mode}
      initialPrompt={searchParams.prompt ?? ""}
    />
  );
}
