/**
 * Multi-AI routing — shared types.
 *
 * Text providers answer prompts. Higgsfield is a media provider and gets its own lane.
 * Every call goes through the router (lib/ai/router.ts) which picks the provider per
 * mode, falls back when a key is missing, and records the run.
 */

export type TextProviderId = "anthropic" | "openai" | "gemini";
export type ProviderId = TextProviderId | "higgsfield";

export const TEXT_PROVIDERS: TextProviderId[] = ["anthropic", "openai", "gemini"];

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  anthropic: "Claude",
  openai: "ChatGPT",
  gemini: "Gemini",
  higgsfield: "Higgsfield",
};

/** What the user is trying to do. Drives provider choice and the system prompt. */
export type AiMode =
  | "plan" // plan the day / week from the board
  | "draft" // write a reply, proposal, caption, brief
  | "summarize" // long input → short output
  | "breakdown" // break a task into steps with estimates
  | "second-opinion" // critique a plan or draft
  | "council" // all configured providers answer, one merges
  | "creative"; // brief + Higgsfield image

export const AI_MODES: { id: AiMode; label: string; hint: string }[] = [
  { id: "plan", label: "Plan my day", hint: "Turns the board into an ordered plan with time blocks." },
  { id: "breakdown", label: "Break down a task", hint: "Steps, estimates, and what to delegate." },
  { id: "draft", label: "Draft", hint: "Client replies, quotes, captions, proposals." },
  { id: "summarize", label: "Summarize", hint: "Long emails, contracts, meeting notes." },
  { id: "second-opinion", label: "Second opinion", hint: "Poke holes in a plan or a draft." },
  { id: "council", label: "Council", hint: "Every configured model answers, one merges." },
  { id: "creative", label: "Creative", hint: "Write a visual brief and render it with Higgsfield." },
];

export interface AiRequest {
  mode: AiMode;
  prompt: string;
  /** Optional Focus task this run is about. */
  taskId?: string | null;
  /** Force a provider instead of the routing table. */
  provider?: TextProviderId | null;
  /** Extra context the router injects (board summary, task details). */
  context?: string;
}

export interface TextResult {
  provider: TextProviderId;
  model: string;
  text: string;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  error?: string;
}

export interface MediaResult {
  provider: "higgsfield";
  model: string;
  requestId: string | null;
  status: "completed" | "failed" | "nsfw" | "canceled" | "timeout" | "skipped";
  urls: string[];
  latencyMs: number;
  error?: string;
}

export interface AiRunResult {
  id: number;
  mode: AiMode;
  prompt: string;
  taskId: string | null;
  /** The answer shown first. For council it is the merged answer. */
  answer: TextResult | null;
  /** Every text provider that took part (council, or single). */
  responses: TextResult[];
  media: MediaResult | null;
  /** Why this provider was chosen. */
  routing: string;
  createdAt: string;
}

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  configured: boolean;
  model: string;
  env: string;
}
