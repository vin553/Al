import fs from "node:fs";
import path from "node:path";
import type { Vendor } from "./vendor-types";
import { medianPackagePriceSgd, serviceBreadthScore } from "./vendor-types";

export interface Swot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  provider: "anthropic" | "offline-heuristic";
  model?: string;
  generatedAt: string;
}

const CACHE_DIR = path.join(process.cwd(), "data", "swot-cache");

function cachePath(slug: string): string {
  return path.join(CACHE_DIR, `${slug}.json`);
}

function readCache(slug: string): Swot | null {
  try {
    const raw = fs.readFileSync(cachePath(slug), "utf8");
    return JSON.parse(raw) as Swot;
  } catch {
    return null;
  }
}

function writeCache(slug: string, swot: Swot): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath(slug), JSON.stringify(swot, null, 2));
}

/**
 * Deterministic heuristic SWOT. No LLM needed — uses structured facts in the vendor record.
 * Transparent about its origin via `provider: "offline-heuristic"`.
 */
export function buildHeuristicSwot(v: Vendor, market: { breadthMedian: number; priceMedian: number }): Swot {
  const breadth = serviceBreadthScore(v);
  const median = medianPackagePriceSgd(v);
  const yearsActive = v.foundedYear ? new Date().getFullYear() - v.foundedYear : null;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  if (breadth >= market.breadthMedian) {
    strengths.push(
      `Full-stack coverage: ${v.services.length} of 17 service verticals, enabling single-contract weddings.`
    );
  } else {
    weaknesses.push(
      `Narrow service footprint (${v.services.length} verticals) forces couples to co-ordinate multiple vendors.`
    );
    opportunities.push(
      "Expand into adjacent verticals (mandap, photography) to raise contract size without changing the client base."
    );
  }

  if (v.googleRating >= 4.7) {
    strengths.push(
      `Elite Google rating (${v.googleRating.toFixed(1)} / ${v.googleReviews} reviews) — trust moat vs. newer entrants.`
    );
  } else if (v.googleRating < 4.5) {
    weaknesses.push(
      `Google rating (${v.googleRating.toFixed(1)}) trails the segment's top operators — review strategy needed.`
    );
  }

  if (v.instagramFollowers >= 10000) {
    strengths.push(
      `Instagram reach of ${v.instagramFollowers.toLocaleString()} — organic top-of-funnel advantage.`
    );
  } else {
    opportunities.push(
      "Instagram reach is sub-scale; reels + real-wedding content could 3×–5× follower base within 12 months."
    );
  }

  if (yearsActive != null && yearsActive >= 15) {
    strengths.push(`${yearsActive} years of operating history — deep temple, venue, and supplier relationships.`);
  } else if (yearsActive != null && yearsActive < 5) {
    weaknesses.push(`Young brand (${yearsActive} yrs) — couples still default to legacy names for marquee weddings.`);
    opportunities.push(
      "Lean into modern editorial aesthetic and social content to pull share from legacy, decor-heavy incumbents."
    );
  }

  if (median != null && median > market.priceMedian * 1.4) {
    strengths.push("Premium price realisation indicates strong brand equity and willingness-to-pay.");
    threats.push("A new premium boutique entrant could credibly undercut on design quality at 20–30% lower price.");
  } else if (median != null && median < market.priceMedian * 0.7) {
    strengths.push("Accessible pricing wins the budget-conscious mid-segment — volume flywheel.");
    threats.push(
      "Margin compression risk as hotel venues raise F&B minimums and Halal/vegetarian catering costs rise."
    );
  }

  if (v.services.includes("destination")) {
    opportunities.push(
      "Destination wedding arm (Bali/Thailand) is a high-margin export — bundle flights/hotels for full-trip LTV."
    );
  } else {
    opportunities.push(
      "Destination weddings in Phuket/Bali are under-served; partnering with one resort group would add a premium SKU."
    );
  }

  threats.push(
    "Hotel chains (Holiday Inn, Shangri-La) sell end-to-end Indian packages at S$148+/pax — direct squeeze on ballroom clients."
  );
  threats.push(
    "Gen-Z couples increasingly source vendors via Instagram + WhatsApp directly, bypassing full-service planners."
  );

  const pad = (list: string[], options: string[]) => {
    for (const opt of options) {
      if (list.length >= 3) break;
      if (!list.includes(opt)) list.push(opt);
    }
  };
  pad(strengths, [
    "Cultural fluency across Tamil, Telugu, North-Indian and Punjabi rites.",
    "Vertically-integrated supply chain buys cost leverage on decor, catering, AV.",
    "Team depth supports multi-day, multi-venue choreography without subcontracting.",
  ]);
  pad(weaknesses, [
    "Public pricing transparency below market-leader benchmark — erodes at-home conversion.",
    "Instagram posting cadence irregular; inconsistent feed undermines brand-pull.",
    "Google review velocity (reviews/year) trails dominant competitor — SEO penalty.",
  ]);
  pad(opportunities, [
    "Productised packages for intimate 40–80 pax weddings unlock a fast-growing SKU.",
    "Arrange-marriage tourism inbound (NRI couples) is a high-AOV segment to serve in-SG.",
    "Short-form UGC programme (bride-led reels) could 2× organic booking enquiries.",
  ]);
  pad(threats, [
    "Rising freelance wedding coordinators chip at the mid-tier margin pool.",
    "Temple committees tightening preferred-vendor rotations risk locking mid-tier players out.",
    "F&B halal/veg cost inflation squeezes per-pax margin in packaged pricing.",
  ]);

  return {
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    opportunities: opportunities.slice(0, 4),
    threats: threats.slice(0, 4),
    provider: "offline-heuristic",
    generatedAt: new Date().toISOString(),
  };
}

export async function generateSwot(
  v: Vendor,
  market: { breadthMedian: number; priceMedian: number },
  opts: { force?: boolean } = {}
): Promise<Swot> {
  if (!opts.force) {
    const cached = readCache(v.slug);
    if (cached) return cached;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });
      const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
      const userPrompt = buildPrompt(v, market);
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system:
          "You are a market strategy analyst. Output ONLY valid JSON matching the user schema. No prose, no markdown.",
        messages: [{ role: "user", content: userPrompt }],
      });
      const text = res.content
        .map((c) => (c.type === "text" ? c.text : ""))
        .join("")
        .trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in model output");
      const parsed = JSON.parse(match[0]) as Omit<Swot, "provider" | "generatedAt" | "model">;
      const swot: Swot = {
        ...parsed,
        provider: "anthropic",
        model: MODEL,
        generatedAt: new Date().toISOString(),
      };
      writeCache(v.slug, swot);
      return swot;
    } catch (err) {
      console.error("[swot] Anthropic call failed, falling back:", (err as Error).message);
    }
  }

  const heuristic = buildHeuristicSwot(v, market);
  writeCache(v.slug, heuristic);
  return heuristic;
}

function buildPrompt(v: Vendor, market: { breadthMedian: number; priceMedian: number }): string {
  return `Produce a SWOT for this Singapore Indian wedding vendor.

Vendor JSON:
${JSON.stringify(v, null, 2)}

Market context:
- Segment: Indian luxury weddings in Singapore
- Median service breadth across peers: ${market.breadthMedian.toFixed(1)}/10
- Median wedding spend across peers: SGD ${market.priceMedian.toFixed(0)}

Requirements:
- 3 to 4 bullets per quadrant.
- Each bullet <= 160 chars, specific, actionable, quantified where possible.
- Reference concrete facts from the JSON (pricing, reviews, IG).
- Output ONLY this JSON schema (no markdown, no prose):

{
  "strengths": string[],
  "weaknesses": string[],
  "opportunities": string[],
  "threats": string[]
}`;
}

export function marketMedians(vendors: Vendor[]): { breadthMedian: number; priceMedian: number } {
  const breadths = vendors.map(serviceBreadthScore).sort((a, b) => a - b);
  const prices = vendors.map(medianPackagePriceSgd).sort((a, b) => a - b);
  const bM = breadths.length % 2 === 0
    ? (breadths[breadths.length / 2 - 1] + breadths[breadths.length / 2]) / 2
    : breadths[Math.floor(breadths.length / 2)];
  const pM = prices.length % 2 === 0
    ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
    : prices[Math.floor(prices.length / 2)];
  return { breadthMedian: bM ?? 0, priceMedian: pM ?? 0 };
}
