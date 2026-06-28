#!/usr/bin/env tsx
/**
 * Seeds the local SQLite database from data/vendors.seed.json.
 * Idempotent — safe to re-run.
 */
import { getDb, seedFromFile } from "@/lib/db";

function main() {
  const db = getDb();
  seedFromFile(db);
  const count = (db.prepare("SELECT COUNT(*) as n FROM vendors").get() as { n: number }).n;
  console.log(`[seed] OK — ${count} vendors in data/vendors.db`);
}

main();
