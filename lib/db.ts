import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type {
  Booking,
  BookingDetail,
  Cleaner,
  Customer,
  NewBookingInput,
  Package,
} from "./types";
import { SEED_CLEANERS, SEED_CUSTOMERS, SEED_PACKAGES } from "./seed-data";
import { addDays, addHoursToTime, isoDate, today, weekdayOf } from "./dates";

const DB_PATH = path.join(process.cwd(), "data", "cleaning.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS cleaners (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS packages (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      package_id TEXT NOT NULL,
      cleaner_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      email_sent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
  ensureSeeded(_db);
  return _db;
}

function ensureSeeded(db: Database.Database) {
  const n = (db.prepare("SELECT COUNT(*) AS n FROM cleaners").get() as { n: number }).n;
  if (n > 0) return;

  const insCleaner = db.prepare("INSERT INTO cleaners (id, data) VALUES (?, ?)");
  const insPackage = db.prepare("INSERT INTO packages (id, data) VALUES (?, ?)");
  const insCustomer = db.prepare("INSERT INTO customers (id, data) VALUES (?, ?)");

  db.transaction(() => {
    for (const c of SEED_CLEANERS) insCleaner.run(c.id, JSON.stringify(c));
    for (const p of SEED_PACKAGES) insPackage.run(p.id, JSON.stringify(p));
    for (const c of SEED_CUSTOMERS) insCustomer.run(c.id, JSON.stringify(c));
    for (const b of generateSampleBookings()) insertBookingRow(db, b);
  })();
}

// ---- Sample booking generation (deterministic) -----------------------------

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSampleBookings(): Booking[] {
  const rng = mulberry32(20260615);
  const pick = <T>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const activeCleaners = SEED_CLEANERS.filter((c) => c.active);
  const out: Booking[] = [];
  const start = today();

  // Span from 21 days ago to +14 days ahead.
  for (let offset = -21; offset <= 14; offset++) {
    const date = addDays(start, offset);
    const wd = weekdayOf(date);
    if (wd === "sun") continue; // closed Sundays in sample
    // 2–5 jobs per day.
    const jobs = 2 + Math.floor(rng() * 4);
    const usedSlots = new Map<string, number[]>(); // cleanerId -> start minutes used

    for (let j = 0; j < jobs; j++) {
      const pkg = pick(SEED_PACKAGES);
      const cleaner = pick(activeCleaners);
      const startHour = 9 + Math.floor(rng() * 6); // 9..14
      const startTime = `${String(startHour).padStart(2, "0")}:00`;
      const endTime = addHoursToTime(startTime, pkg.durationHours);

      // Avoid obvious double-booking of the same cleaner same start.
      const used = usedSlots.get(cleaner.id) ?? [];
      if (used.includes(startHour)) continue;
      used.push(startHour);
      usedSlots.set(cleaner.id, used);

      const customer = pick(SEED_CUSTOMERS);
      // Price varies +/- 10% around package base.
      const amount = Math.round((pkg.price * (0.95 + rng() * 0.15)) / 5) * 5;
      const status = offset < 0 ? "completed" : "confirmed";

      out.push({
        id: `bk-seed-${offset + 21}-${j}`,
        customerId: customer.id,
        packageId: pkg.id,
        cleanerId: cleaner.id,
        date,
        startTime,
        endTime,
        amount,
        status,
        notes: "",
        emailSent: true,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return out;
}

// ---- Row helpers -----------------------------------------------------------

function insertBookingRow(db: Database.Database, b: Booking) {
  db.prepare(
    `INSERT INTO bookings
      (id, customer_id, package_id, cleaner_id, date, start_time, end_time, amount, status, notes, email_sent, created_at)
     VALUES (@id, @customerId, @packageId, @cleanerId, @date, @startTime, @endTime, @amount, @status, @notes, @emailSent, @createdAt)`
  ).run({ ...b, emailSent: b.emailSent ? 1 : 0 });
}

interface BookingRow {
  id: string;
  customer_id: string;
  package_id: string;
  cleaner_id: string;
  date: string;
  start_time: string;
  end_time: string;
  amount: number;
  status: string;
  notes: string;
  email_sent: number;
  created_at: string;
}

function rowToBooking(r: BookingRow): Booking {
  return {
    id: r.id,
    customerId: r.customer_id,
    packageId: r.package_id,
    cleanerId: r.cleaner_id,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    amount: r.amount,
    status: r.status as Booking["status"],
    notes: r.notes,
    emailSent: !!r.email_sent,
    createdAt: r.created_at,
  };
}

// ---- Public queries --------------------------------------------------------

export function listCleaners(): Cleaner[] {
  return (getDb().prepare("SELECT data FROM cleaners").all() as { data: string }[])
    .map((r) => JSON.parse(r.data) as Cleaner)
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function listPackages(): Package[] {
  return (getDb().prepare("SELECT data FROM packages").all() as { data: string }[]).map(
    (r) => JSON.parse(r.data) as Package
  );
}

export function listCustomers(): Customer[] {
  return (getDb().prepare("SELECT data FROM customers").all() as { data: string }[])
    .map((r) => JSON.parse(r.data) as Customer)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCustomer(id: string): Customer | null {
  const row = getDb().prepare("SELECT data FROM customers WHERE id = ?").get(id) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as Customer) : null;
}

export function listBookings(): Booking[] {
  return (getDb().prepare("SELECT * FROM bookings").all() as BookingRow[]).map(rowToBooking);
}

export function getBooking(id: string): Booking | null {
  const row = getDb().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as
    | BookingRow
    | undefined;
  return row ? rowToBooking(row) : null;
}

function hydrate(
  b: Booking,
  cleaners: Map<string, Cleaner>,
  packages: Map<string, Package>,
  customers: Map<string, Customer>
): BookingDetail {
  return {
    ...b,
    cleaner: cleaners.get(b.cleanerId)!,
    package: packages.get(b.packageId)!,
    customer: customers.get(b.customerId)!,
  };
}

export function listBookingDetails(): BookingDetail[] {
  const cleaners = new Map(listCleaners().map((c) => [c.id, c]));
  const packages = new Map(listPackages().map((p) => [p.id, p]));
  const customers = new Map(listCustomers().map((c) => [c.id, c]));
  return listBookings()
    .map((b) => hydrate(b, cleaners, packages, customers))
    .filter((b) => b.cleaner && b.package && b.customer)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export function getBookingDetail(id: string): BookingDetail | null {
  const b = getBooking(id);
  if (!b) return null;
  const cleaners = new Map(listCleaners().map((c) => [c.id, c]));
  const packages = new Map(listPackages().map((p) => [p.id, p]));
  const customers = new Map(listCustomers().map((c) => [c.id, c]));
  return hydrate(b, cleaners, packages, customers);
}

// ---- Mutations -------------------------------------------------------------

let _seq = 0;
function newId(prefix: string): string {
  _seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${_seq.toString(36)}`;
}

export function createBooking(input: NewBookingInput): BookingDetail {
  const db = getDb();
  const pkg = listPackages().find((p) => p.id === input.packageId);
  if (!pkg) throw new Error("Unknown package");

  // Resolve or create the customer.
  let customerId = input.customer.id ?? "";
  const existing = customerId ? getCustomer(customerId) : null;
  if (!existing) {
    customerId = newId("cus");
    const customer: Customer = {
      id: customerId,
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone,
      address: input.customer.address,
    };
    db.prepare("INSERT INTO customers (id, data) VALUES (?, ?)").run(
      customerId,
      JSON.stringify(customer)
    );
  }

  const endTime = addHoursToTime(input.startTime, pkg.durationHours);
  const booking: Booking = {
    id: newId("bk"),
    customerId,
    packageId: input.packageId,
    cleanerId: input.cleanerId,
    date: input.date,
    startTime: input.startTime,
    endTime,
    amount: input.amount,
    status: "confirmed",
    notes: input.notes ?? "",
    emailSent: false,
    createdAt: new Date().toISOString(),
  };
  insertBookingRow(db, booking);
  return getBookingDetail(booking.id)!;
}

export function updateBookingStatus(id: string, status: Booking["status"]): void {
  getDb().prepare("UPDATE bookings SET status = ? WHERE id = ?").run(status, id);
}

export function markEmailSent(id: string): void {
  getDb().prepare("UPDATE bookings SET email_sent = 1 WHERE id = ?").run(id);
}

export function deleteBooking(id: string): void {
  getDb().prepare("DELETE FROM bookings WHERE id = ?").run(id);
}

/** Detect overlapping bookings for the same cleaner (excludes cancelled). */
export function findConflict(
  cleanerId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Booking | null {
  const sameDay = listBookings().filter(
    (b) =>
      b.cleanerId === cleanerId &&
      b.date === date &&
      b.status !== "cancelled" &&
      b.id !== excludeId
  );
  const s = startTime;
  const e = endTime;
  for (const b of sameDay) {
    if (s < b.endTime && b.startTime < e) return b; // overlap
  }
  return null;
}

export { isoDate, today };
