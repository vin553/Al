/**
 * Provider adapters. Each one is a thin call to its vendor's API with a
 * uniform result. Keys come from the environment only.
 *
 *   Claude     ANTHROPIC_API_KEY   (+ ANTHROPIC_MODEL, default claude-opus-5)
 *   ChatGPT    OPENAI_API_KEY      (+ OPENAI_MODEL,    default gpt-5.6)
 *   Gemini     GEMINI_API_KEY      (+ GEMINI_MODEL,    default gemini-3.8-flash)
 *   Higgsfield HIGGSFIELD_API_KEY_ID + HIGGSFIELD_API_KEY_SECRET
 *              (+ HIGGSFIELD_MODEL_PATH, default higgsfield-ai/soul/v2/standard)
 */

import type { MediaResult, ProviderId, ProviderStatus, TextProviderId, TextResult } from "./types";
import { PROVIDER_LABEL } from "./types";

export const DEFAULTS = {
  anthropic: "claude-opus-5",
  openai: "gpt-5.6",
  gemini: "gemini-3.8-flash",
  higgsfield: "higgsfield-ai/soul/v2/standard",
} as const;

export function modelFor(id: ProviderId): string {
  switch (id) {
    case "anthropic":
      return process.env.ANTHROPIC_MODEL || DEFAULTS.anthropic;
    case "openai":
      return process.env.OPENAI_MODEL || DEFAULTS.openai;
    case "gemini":
      return process.env.GEMINI_MODEL || DEFAULTS.gemini;
    case "higgsfield":
      return process.env.HIGGSFIELD_MODEL_PATH || DEFAULTS.higgsfield;
  }
}

export function isConfigured(id: ProviderId): boolean {
  switch (id) {
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "gemini":
      return !!process.env.GEMINI_API_KEY;
    case "higgsfield":
      return !!process.env.HIGGSFIELD_API_KEY_ID && !!process.env.HIGGSFIELD_API_KEY_SECRET;
  }
}

export function providerStatuses(): ProviderStatus[] {
  const env: Record<ProviderId, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    gemini: "GEMINI_API_KEY",
    higgsfield: "HIGGSFIELD_API_KEY_ID + HIGGSFIELD_API_KEY_SECRET",
  };
  return (["anthropic", "openai", "gemini", "higgsfield"] as ProviderId[]).map((id) => ({
    id,
    label: PROVIDER_LABEL[id],
    configured: isConfigured(id),
    model: modelFor(id),
    env: env[id],
  }));
}

export interface TextCall {
  system: string;
  prompt: string;
  maxTokens?: number;
}

/* ---------- Claude ---------- */

async function callAnthropic(c: TextCall): Promise<TextResult> {
  const started = Date.now();
  const model = modelFor("anthropic");
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // Server-side fallback: if a safety classifier declines, the API re-runs the same
  // request on a fallback model inside the same call instead of returning a refusal.
  const res = await client.beta.messages.create({
    model,
    max_tokens: c.maxTokens ?? 4096,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: c.system,
    messages: [{ role: "user", content: c.prompt }],
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  if (res.stop_reason === "refusal") {
    return {
      provider: "anthropic",
      model: res.model,
      text: "",
      latencyMs: Date.now() - started,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      error: `declined: ${res.stop_details?.explanation ?? "policy"}`,
    };
  }
  return {
    provider: "anthropic",
    model: res.model,
    text,
    latencyMs: Date.now() - started,
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  };
}

/* ---------- ChatGPT ---------- */

async function callOpenAI(c: TextCall): Promise<TextResult> {
  const started = Date.now();
  const model = modelFor("openai");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: c.maxTokens ?? 4096,
      messages: [
        { role: "system", content: c.system },
        { role: "user", content: c.prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as {
    model?: string;
    choices?: { message?: { content?: string | null } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    provider: "openai",
    model: j.model ?? model,
    text: (j.choices?.[0]?.message?.content ?? "").trim(),
    latencyMs: Date.now() - started,
    inputTokens: j.usage?.prompt_tokens ?? null,
    outputTokens: j.usage?.completion_tokens ?? null,
  };
}

/* ---------- Gemini ---------- */

async function callGemini(c: TextCall): Promise<TextResult> {
  const started = Date.now();
  const model = modelFor("gemini");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY as string,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: c.system }] },
      contents: [{ role: "user", parts: [{ text: c.prompt }] }],
      generationConfig: { maxOutputTokens: c.maxTokens ?? 4096 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as {
    modelVersion?: string;
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const text = (j.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  return {
    provider: "gemini",
    model: j.modelVersion ?? model,
    text,
    latencyMs: Date.now() - started,
    inputTokens: j.usageMetadata?.promptTokenCount ?? null,
    outputTokens: j.usageMetadata?.candidatesTokenCount ?? null,
  };
}

const TEXT_CALLERS: Record<TextProviderId, (c: TextCall) => Promise<TextResult>> = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  gemini: callGemini,
};

/** Never throws: an error becomes a TextResult with `error` set so council runs keep going. */
export async function callText(id: TextProviderId, c: TextCall): Promise<TextResult> {
  const started = Date.now();
  try {
    return await TEXT_CALLERS[id](c);
  } catch (err) {
    return {
      provider: id,
      model: modelFor(id),
      text: "",
      latencyMs: Date.now() - started,
      inputTokens: null,
      outputTokens: null,
      error: (err as Error).message,
    };
  }
}

/* ---------- Higgsfield ---------- */

const HF_BASE = "https://api.higgsfield.ai";
const HF_TERMINAL = new Set(["completed", "failed", "nsfw", "canceled"]);

function hfHeaders(): Record<string, string> {
  return {
    authorization: `Key ${process.env.HIGGSFIELD_API_KEY_ID}:${process.env.HIGGSFIELD_API_KEY_SECRET}`,
    "content-type": "application/json",
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Submit a text-to-image job and poll its status URL until a terminal state.
 * Polling follows Higgsfield's guidance: start at 2 s, grow 1.5×, cap at 10 s.
 */
export async function generateImage(prompt: string, opts: { timeoutMs?: number } = {}): Promise<MediaResult> {
  const started = Date.now();
  const model = modelFor("higgsfield");
  if (!isConfigured("higgsfield")) {
    return { provider: "higgsfield", model, requestId: null, status: "skipped", urls: [], latencyMs: 0, error: "not configured" };
  }
  try {
    const submit = await fetch(`${HF_BASE}/${model}`, {
      method: "POST",
      headers: hfHeaders(),
      body: JSON.stringify({ prompt }),
    });
    if (!submit.ok) throw new Error(`Higgsfield ${submit.status}: ${(await submit.text()).slice(0, 300)}`);
    const job = (await submit.json()) as { request_id?: string; status_url?: string; status?: string };
    if (!job.request_id || !job.status_url) throw new Error("Higgsfield returned no request_id");

    const deadline = Date.now() + (opts.timeoutMs ?? 120_000);
    let wait = 2000;
    for (;;) {
      if (Date.now() > deadline) {
        return { provider: "higgsfield", model, requestId: job.request_id, status: "timeout", urls: [], latencyMs: Date.now() - started, error: "timed out waiting for the render" };
      }
      await sleep(wait + Math.random() * 300);
      wait = Math.min(10_000, wait * 1.5);
      const poll = await fetch(job.status_url, { headers: hfHeaders() });
      if (!poll.ok) throw new Error(`Higgsfield status ${poll.status}`);
      const s = (await poll.json()) as {
        status: string;
        images?: { url?: string }[];
        video?: { url?: string };
        error?: string;
      };
      if (!HF_TERMINAL.has(s.status)) continue;
      const urls = [...(s.images ?? []).map((i) => i.url).filter((u): u is string => !!u), ...(s.video?.url ? [s.video.url] : [])];
      return {
        provider: "higgsfield",
        model,
        requestId: job.request_id,
        status: s.status as MediaResult["status"],
        urls,
        latencyMs: Date.now() - started,
        error: s.status === "completed" ? undefined : s.error ?? s.status,
      };
    }
  } catch (err) {
    return { provider: "higgsfield", model, requestId: null, status: "failed", urls: [], latencyMs: Date.now() - started, error: (err as Error).message };
  }
}
