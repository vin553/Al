import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Vendor, VendorDataset } from "./vendor-types";

const DB_PATH = path.join(process.cwd(), "data", "vendors.db");
const SEED_PATH = path.join(process.cwd(), "data", "vendors.seed.json");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS vendors (
      slug TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  ensureSeeded(_db);
  return _db;
}

function ensureSeeded(db: Database.Database) {
  const count = (db.prepare("SELECT COUNT(*) as n FROM vendors").get() as { n: number }).n;
  if (count > 0) return;
  seedFromFile(db);
}

export function seedFromFile(db: Database.Database = getDb()): void {
  if (!fs.existsSync(SEED_PATH)) return;
  const raw = fs.readFileSync(SEED_PATH, "utf8");
  const dataset: VendorDataset = JSON.parse(raw);
  const upsert = db.prepare(
    "INSERT INTO vendors (slug, data, updated_at) VALUES (@slug, @data, @updated_at) ON CONFLICT(slug) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at"
  );
  const setMeta = db.prepare(
    "INSERT INTO meta (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  );
  const tx = db.transaction(() => {
    for (const v of dataset.vendors) {
      upsert.run({ slug: v.slug, data: JSON.stringify(v), updated_at: v.updatedAt });
    }
    setMeta.run({ key: "collectedAt", value: dataset.collectedAt });
    setMeta.run({ key: "marketContext", value: JSON.stringify(dataset.marketContext) });
  });
  tx();
}

export function listVendors(): Vendor[] {
  const rows = getDb().prepare("SELECT data FROM vendors ORDER BY slug").all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as Vendor);
}

export function getVendor(slug: string): Vendor | null {
  const row = getDb().prepare("SELECT data FROM vendors WHERE slug = ?").get(slug) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as Vendor) : null;
}

export function getDataset(): VendorDataset {
  const db = getDb();
  const vendors = listVendors();
  const collectedAt =
    (db.prepare("SELECT value FROM meta WHERE key = 'collectedAt'").get() as { value: string } | undefined)
      ?.value ?? new Date().toISOString();
  const marketContextRaw = (
    db.prepare("SELECT value FROM meta WHERE key = 'marketContext'").get() as { value: string } | undefined
  )?.value;
  const marketContext = marketContextRaw
    ? JSON.parse(marketContextRaw)
    : {
        countryIso: "SG",
        segment: "Indian luxury weddings",
        typicalBudgetSgd: [20000, 150000],
        note: "",
      };
  return { collectedAt, marketContext, vendors };
}
