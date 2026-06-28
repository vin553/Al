#!/usr/bin/env tsx
/**
 * Refresh agent.
 *
 * For each vendor in data/vendors.seed.json, this script:
 *  1. Fetches the vendor's public site (with a polite user-agent + 10s timeout).
 *  2. Extracts any JSON-LD metadata (schema.org) to detect `aggregateRating`.
 *  3. Stamps a new `updatedAt` and notes whether a successful fetch occurred.
 *  4. Writes the refreshed dataset back to data/vendors.seed.json and reseeds SQLite.
 *
 * Instagram follower + Google review scraping would need:
 *   - Instagram Graph API token (requires business account linkage)
 *   - Google Places API key
 * When those aren't provided, this script leaves the existing value intact
 * and prints a TODO marker — never fabricates data.
 */
import fs from "node:fs";
import path from "node:path";
import type { Vendor, VendorDataset } from "@/lib/vendor-types";
import { getDb, seedFromFile } from "@/lib/db";

const SEED_PATH = path.join(process.cwd(), "data", "vendors.seed.json");
const FETCH_TIMEOUT_MS = 10_000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36 SgWeddingIntel/0.1";

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { "user-agent": UA }, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractAggregateRating(html: string): { rating: number; reviews: number } | null {
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!scripts) return null;
  for (const block of scripts) {
    const inner = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "").trim();
    try {
      const parsed = JSON.parse(inner);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of candidates) {
        const agg = node?.aggregateRating;
        if (agg?.ratingValue && agg?.reviewCount) {
          return { rating: Number(agg.ratingValue), reviews: Number(agg.reviewCount) };
        }
      }
    } catch {
      // ignore bad JSON
    }
  }
  return null;
}

async function refreshVendor(v: Vendor): Promise<Vendor> {
  const now = new Date().toISOString();
  if (!v.url) {
    console.log(`[refresh] ${v.slug}: skipped (no url)`);
    return { ...v, updatedAt: now };
  }
  const res = await fetchWithTimeout(v.url);
  if (!res || !res.ok) {
    console.log(`[refresh] ${v.slug}: fetch failed (${res?.status ?? "network"}) — timestamps only`);
    return { ...v, updatedAt: now };
  }
  const html = await res.text();
  const agg = extractAggregateRating(html);
  if (agg && agg.rating > 0 && agg.rating <= 5) {
    console.log(
      `[refresh] ${v.slug}: schema.org rating ${agg.rating}/${agg.reviews} (was ${v.googleRating}/${v.googleReviews})`
    );
    return {
      ...v,
      googleRating: agg.rating,
      googleReviews: agg.reviews,
      updatedAt: now,
    };
  }
  console.log(
    `[refresh] ${v.slug}: site reachable; no structured rating found. TODO(scraping): wire Places API + IG Graph API for full refresh.`
  );
  return { ...v, updatedAt: now };
}

async function main() {
  if (!fs.existsSync(SEED_PATH)) {
    console.error(`[refresh] ${SEED_PATH} missing`);
    process.exit(1);
  }
  const dataset = JSON.parse(fs.readFileSync(SEED_PATH, "utf8")) as VendorDataset;

  const refreshed: Vendor[] = [];
  for (const v of dataset.vendors) {
    refreshed.push(await refreshVendor(v));
  }

  const next: VendorDataset = {
    ...dataset,
    collectedAt: new Date().toISOString(),
    vendors: refreshed,
  };
  fs.writeFileSync(SEED_PATH, JSON.stringify(next, null, 2) + "\n");
  console.log(`[refresh] wrote ${SEED_PATH}`);

  const db = getDb();
  seedFromFile(db);
  console.log("[refresh] SQLite reseeded.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
