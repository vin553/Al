/**
 * The router. Given a mode and a prompt it decides which provider answers,
 * builds the system prompt with Alangkaar Group context, runs it (or runs a
 * council), and records the run.
 *
 * Routing table (first configured wins; nothing configured → honest "offline" result):
 *   plan, breakdown, draft      Claude → ChatGPT → Gemini
 *   summarize                   Gemini → Claude → ChatGPT   (long context, cheap)
 *   second-opinion              ChatGPT → Gemini → Claude   (a different model than the one that drafted)
 *   council                     every configured text provider, merged by Claude (or the first configured)
 *   creative                    Claude writes the visual brief → Higgsfield renders it
 */

import { getTask } from "../focus-db";
import { currentReport } from "../focus-report";
import { entityMeta, ENTITIES } from "../focus-types";
import { formatDayLabel } from "../nudge";
import { callText, generateImage, isConfigured, modelFor } from "./providers";
import { recordAiRun } from "./store";
import { PROVIDER_LABEL, TEXT_PROVIDERS, type AiMode, type AiRequest, type AiRunResult, type MediaResult, type TextProviderId, type TextResult } from "./types";

const PREFERENCE: Record<Exclude<AiMode, "council" | "creative">, TextProviderId[]> = {
  plan: ["anthropic", "openai", "gemini"],
  breakdown: ["anthropic", "openai", "gemini"],
  draft: ["anthropic", "openai", "gemini"],
  summarize: ["gemini", "anthropic", "openai"],
  "second-opinion": ["openai", "gemini", "anthropic"],
};

export function configuredTextProviders(): TextProviderId[] {
  return TEXT_PROVIDERS.filter(isConfigured);
}

export function pickProvider(mode: AiMode, forced?: TextProviderId | null): { provider: TextProviderId | null; reason: string } {
  const configured = configuredTextProviders();
  if (forced) {
    return configured.includes(forced)
      ? { provider: forced, reason: `${PROVIDER_LABEL[forced]} chosen by you` }
      : { provider: null, reason: `${PROVIDER_LABEL[forced]} is not configured` };
  }
  const order = mode === "council" || mode === "creative" ? PREFERENCE.plan : PREFERENCE[mode];
  const provider = order.find((p) => configured.includes(p)) ?? null;
  if (!provider) return { provider: null, reason: "no text provider configured" };
  const first = order[0];
  return {
    provider,
    reason: provider === first ? `${PROVIDER_LABEL[provider]} is the default for ${mode}` : `${PROVIDER_LABEL[first]} not configured, fell back to ${PROVIDER_LABEL[provider]}`,
  };
}

/* ---------- prompts ---------- */

const GROUP_CONTEXT = [
  "You work for Vin, who runs the Alangkaar Group in Singapore:",
  ...ENTITIES.filter((e) => e.id !== "personal").map((e) => `- ${e.name}`),
  "Alangkaar Weddings does Indian weddings, Nikkah.com.sg Malay weddings, The Ivory Co. Chinese weddings,",
  "Prime Events corporate events, Raja's Catering Indian plus Malay, Western and Chinese catering.",
  "Markets: Singapore plus destination weddings in Phuket, Bali, Da Nang and Hoi An.",
  "Be direct and specific. No filler, no preamble, no closing pleasantries. Plain text, short lines.",
].join("\n");

const MODE_SYSTEM: Record<AiMode, string> = {
  plan: "Produce an ordered plan for today with realistic time blocks (Singapore time). Overdue work first, then Must priorities. Say what to drop or delegate. Under 250 words.",
  breakdown: "Break the task into concrete steps with a minute estimate each, mark which steps Vin must do personally versus delegate, and name the first step to start in the next 10 minutes. Under 250 words.",
  draft: "Write the requested text ready to send. Match the entity's tone: warm and premium for weddings, crisp for corporate. Keep it tight. Return only the draft.",
  summarize: "Summarize into: 3-6 bullet key points, decisions made, open questions, and action items with owners if stated. Under 200 words.",
  "second-opinion": "You are a sceptical operator. Find the three biggest weaknesses or risks, say what would go wrong, and give one concrete fix for each. Do not restate the input. Under 200 words.",
  council: "Answer the request as well as you can. Be concrete and commit to recommendations. Under 250 words.",
  creative: "Write a single image-generation prompt for a premium wedding or event visual. Include subject, setting, lighting, colour palette, composition and mood in one paragraph of at most 90 words. Return only the prompt, no title, no quotes.",
};

const MERGE_SYSTEM =
  "You are the chair of a council of AI models. You receive several answers to the same request. Merge them into one best answer: keep what they agree on, resolve disagreements by picking the stronger argument and say so in one line, and drop anything unsupported. Under 300 words. Then add one line 'Where they disagreed:' with the key differences.";

function boardContext(): string {
  const r = currentReport();
  const list = (label: string, items: typeof r.overdue) =>
    items.length ? `${label}:\n${items.slice(0, 10).map((t) => `- [${t.priority}] ${t.title} (${entityMeta(t.entity).short}${t.dueOn ? `, ${formatDayLabel(t.dueOn, r.today)}` : ""})`).join("\n")}` : "";
  return [
    `Today is ${r.today}. Pressure ${r.pressure}/100, streak ${r.streak}, ${r.openCount} open.`,
    list("Overdue", r.overdue),
    list("Due today", r.dueToday),
    list("Next 3 days", r.dueSoon),
    list("In progress", r.inProgress),
    r.events.length ? `Calendar today:\n${r.events.map((e) => `- ${e.allDay ? "all day" : e.startsAt.slice(11, 16)} ${e.title}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function taskContext(taskId: string | null | undefined): string {
  if (!taskId) return "";
  const t = getTask(taskId);
  if (!t) return "";
  return `Task: ${t.title}\nEntity: ${entityMeta(t.entity).name}\nPriority: ${t.priority}\nDue: ${t.dueOn ?? "no date"}\nStatus: ${t.status}${t.notes ? `\nNotes: ${t.notes}` : ""}`;
}

export function buildPrompt(req: AiRequest): { system: string; prompt: string } {
  const parts = [req.context, taskContext(req.taskId), req.mode === "plan" ? boardContext() : ""].filter(Boolean);
  const prompt = parts.length ? `${parts.join("\n\n")}\n\nRequest:\n${req.prompt}` : req.prompt;
  return { system: `${GROUP_CONTEXT}\n\n${MODE_SYSTEM[req.mode]}`, prompt };
}

/* ---------- run ---------- */

function offline(provider: TextProviderId | null, reason: string): TextResult {
  return {
    provider: provider ?? "anthropic",
    model: provider ? modelFor(provider) : "none",
    text: "",
    latencyMs: 0,
    inputTokens: null,
    outputTokens: null,
    error: reason,
  };
}

export async function runAi(req: AiRequest): Promise<AiRunResult> {
  const { system, prompt } = buildPrompt(req);
  let answer: TextResult | null = null;
  let responses: TextResult[] = [];
  let media: MediaResult | null = null;
  let routing = "";

  if (req.mode === "council") {
    const members = configuredTextProviders();
    if (members.length === 0) {
      routing = "no text provider configured";
      answer = offline(null, routing);
    } else {
      responses = await Promise.all(members.map((p) => callText(p, { system, prompt })));
      const good = responses.filter((r) => !r.error && r.text);
      const chair = pickProvider("plan").provider as TextProviderId;
      if (good.length >= 2) {
        const merged = await callText(chair, {
          system: `${GROUP_CONTEXT}\n\n${MERGE_SYSTEM}`,
          prompt: `Request:\n${req.prompt}\n\n${good.map((r) => `=== ${PROVIDER_LABEL[r.provider]} (${r.model}) ===\n${r.text}`).join("\n\n")}`,
        });
        answer = merged;
        routing = `${good.map((r) => PROVIDER_LABEL[r.provider]).join(", ")} answered, ${PROVIDER_LABEL[chair]} merged`;
      } else if (good.length === 1) {
        answer = good[0];
        routing = `only ${PROVIDER_LABEL[good[0].provider]} answered, nothing to merge`;
      } else {
        answer = offline(chair, "every provider failed");
        routing = "every provider failed";
      }
    }
  } else {
    const pick = pickProvider(req.mode, req.provider);
    routing = pick.reason;
    if (!pick.provider) {
      answer = offline(null, pick.reason);
    } else {
      answer = await callText(pick.provider, { system, prompt });
      responses = [answer];
    }
    if (req.mode === "creative") {
      if (answer.text && !answer.error) {
        media = await generateImage(answer.text);
        routing += media.status === "skipped" ? "; Higgsfield not configured, brief only" : `; Higgsfield ${media.status}`;
      } else {
        media = { provider: "higgsfield", model: modelFor("higgsfield"), requestId: null, status: "skipped", urls: [], latencyMs: 0, error: "no brief to render" };
      }
    }
  }

  const stored = recordAiRun({
    mode: req.mode,
    prompt: req.prompt,
    taskId: req.taskId ?? null,
    answer,
    responses,
    media,
    routing,
  });
  return stored;
}
