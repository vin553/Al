/**
 * Optional AI polish for digests. Goes through the shared Claude adapter in
 * lib/ai/providers.ts. With ANTHROPIC_API_KEY set the digest is rewritten to be
 * sharper and more motivating; without it, the heuristic text is used as-is and
 * the provider is labelled honestly.
 */

import { callText, isConfigured, modelFor } from "./ai/providers";
import type { Digest, NudgeReport } from "./nudge";

export interface PolishedDigest extends Digest {
  provider: "anthropic" | "offline-heuristic";
  model?: string;
}

const SYSTEM = [
  "You are Vin's chief of staff. Vin runs five businesses in Singapore: Alangkaar Weddings (Indian weddings),",
  "Nikkah.com.sg (Malay weddings), The Ivory Co. (Chinese weddings), Prime Events (corporate events) and",
  "Raja's Catering. Rewrite the draft digest below so it is direct, specific and pushes Vin to act now.",
  "Keep every task name and number exactly as given. Do not invent tasks. Plain text only, no markdown,",
  "no emojis except the ✓ already present, under 180 words. Keep the section order. End with one sharp line.",
].join(" ");

export async function polishDigest(d: Digest, r: NudgeReport): Promise<PolishedDigest> {
  if (!isConfigured("anthropic")) return { ...d, provider: "offline-heuristic" };
  const res = await callText("anthropic", {
    system: SYSTEM,
    prompt: `Draft (${d.kind}, pressure ${r.pressure}/100, streak ${r.streak}):\n\n${d.body}`,
    maxTokens: 700,
  });
  if (res.error || !res.text) {
    console.error("[focus-ai] Claude call failed, using heuristic digest:", res.error ?? "empty output");
    return { ...d, provider: "offline-heuristic" };
  }
  return { ...d, body: res.text, provider: "anthropic", model: res.model || modelFor("anthropic") };
}
