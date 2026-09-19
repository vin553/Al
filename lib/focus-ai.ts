/**
 * Optional AI polish for digests. Follows the same rule as lib/swot.ts:
 * with ANTHROPIC_API_KEY set the digest is rewritten by Claude to be sharper
 * and more motivating; without it, the heuristic text is used as-is and the
 * provider is labelled honestly.
 */

import type { Digest, NudgeReport } from "./nudge";

export interface PolishedDigest extends Digest {
  provider: "anthropic" | "offline-heuristic";
  model?: string;
}

export async function polishDigest(d: Digest, r: NudgeReport): Promise<PolishedDigest> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ...d, provider: "offline-heuristic" };
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: [
        "You are Vin's chief of staff. Vin runs five businesses in Singapore: Alangkaar Weddings (Indian weddings),",
        "Nikkah.com.sg (Malay weddings), The Ivory Co. (Chinese weddings), Prime Events (corporate events) and",
        "Raja's Catering. Rewrite the draft digest below so it is direct, specific and pushes Vin to act now.",
        "Keep every task name and number exactly as given. Do not invent tasks. Plain text only, no markdown,",
        "no emojis except the ✓ already present, under 180 words. Keep the section order. End with one sharp line.",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: `Draft (${d.kind}, pressure ${r.pressure}/100, streak ${r.streak}):\n\n${d.body}`,
        },
      ],
    });
    const text = res.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim();
    if (!text) throw new Error("empty model output");
    return { ...d, body: text, provider: "anthropic", model: MODEL };
  } catch (err) {
    console.error("[focus-ai] Anthropic call failed, using heuristic digest:", (err as Error).message);
    return { ...d, provider: "offline-heuristic" };
  }
}
