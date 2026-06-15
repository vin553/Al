import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type {
  Booking,
  BookingDetail,
  Cleaner,
  Customer,
  JobStatus,
  NewBookingInput,
  PaymentStatus,
} from "./types";
import { SEED_CLEANERS } from "./seed-data";
import { addHoursToTime, isoDate, today } from "./dates";

const DB_PATH = path.join(process.cwd(), "data", "cleaning.db");
const SEED_PATH = path.join(process.cwd(), "data", "jobs.seed.json");

interface SeedFile {
  rate: number;
  customers: Customer[];
  jobs: Array<Omit<Booking, "createdAt">>;
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS cleaners (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      cleaner_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      hours REAL NOT NULL,
      amount REAL NOT NULL,
      job_status TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      remark TEXT NOT NULL DEFAULT '',
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
  const insCustomer = db.prepare("INSERT INTO customers (id, data) VALUES (?, ?)");

  const seed: SeedFile | null = fs.existsSync(SEED_PATH)
    ? (JSON.parse(fs.readFileSync(SEED_PATH, "utf8")) as SeedFile)
    : null;

  db.transaction(() => {
    for (const c of SEED_CLEANERS) insCleaner.run(c.id, JSON.stringify(c));
    if (seed) {
      for (const cust of seed.customers) insCustomer.run(cust.id, JSON.stringify(cust));
      for (const j of seed.jobs) {
        insertBookingRow(db, { ...j, createdAt: new Date().toISOString() });
      }
    }
  })();
}

// ---- Row helpers -----------------------------------------------------------

function insertBookingRow(db: Database.Database, b: Booking) {
  db.prepare(
    `INSERT INTO bookings
      (id, customer_id, cleaner_id, date, start_time, end_time, hours, amount, job_status, payment_status, remark, email_sent, created_at)
     VALUES (@id, @customerId, @cleanerId, @date, @startTime, @endTime, @hours, @amount, @jobStatus, @paymentStatus, @remark, @emailSent, @createdAt)`
  ).run({ ...b, emailSent: b.emailSent ? 1 : 0 });
}

interface BookingRow {
  id: string;
  customer_id: string;
  cleaner_id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  amount: number;
  job_status: string;
  payment_status: string;
  remark: string;
  email_sent: number;
  created_at: string;
}

function rowToBooking(r: BookingRow): Booking {
  return {
    id: r.id,
    customerId: r.customer_id,
    cleanerId: r.cleaner_id,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    hours: r.hours,
    amount: r.amount,
    jobStatus: r.job_status as JobStatus,
    paymentStatus: r.payment_status as PaymentStatus,
    remark: r.remark,
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
  customers: Map<string, Customer>
): BookingDetail {
  return { ...b, cleaner: cleaners.get(b.cleanerId)!, customer: customers.get(b.customerId)! };
}

export function listBookingDetails(): BookingDetail[] {
  const cleaners = new Map(listCleaners().map((c) => [c.id, c]));
  const customers = new Map(listCustomers().map((c) => [c.id, c]));
  return listBookings()
    .map((b) => hydrate(b, cleaners, customers))
    .filter((b) => b.cleaner && b.customer)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export function getBookingDetail(id: string): BookingDetail | null {
  const b = getBooking(id);
  if (!b) return null;
  const cleaners = new Map(listCleaners().map((c) => [c.id, c]));
  const customers = new Map(listCustomers().map((c) => [c.id, c]));
  return hydrate(b, cleaners, customers);
}

// ---- Mutations -------------------------------------------------------------

let _seq = 0;
function newId(prefix: string): string {
  _seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${_seq.toString(36)}`;
}

export function createBooking(input: NewBookingInput): BookingDetail {
  const db = getDb();

  // Resolve or create the customer.
  let customerId = input.customer.id ?? "";
  const existing = customerId ? getCustomer(customerId) : null;
  if (!existing) {
    customerId = newId("cus");
    const customer: Customer = {
      id: customerId,
      code: input.customer.code ?? "",
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone,
      address: input.customer.address,
      postal: input.customer.postal ?? "",
    };
    db.prepare("INSERT INTO customers (id, data) VALUES (?, ?)").run(
      customerId,
      JSON.stringify(customer)
    );
  }

  const endTime = addHoursToTime(input.startTime, input.hours);
  const booking: Booking = {
    id: newId("bk"),
    customerId,
    cleanerId: input.cleanerId,
    date: input.date,
    startTime: input.startTime,
    endTime,
    hours: input.hours,
    amount: input.amount,
    jobStatus: "scheduled",
    paymentStatus: input.paymentStatus ?? "unbilled",
    remark: input.remark ?? "",
    emailSent: false,
    createdAt: new Date().toISOString(),
  };
  insertBookingRow(db, booking);
  return getBookingDetail(booking.id)!;
}

export function updateJobStatus(id: string, status: JobStatus): void {
  getDb().prepare("UPDATE bookings SET job_status = ? WHERE id = ?").run(status, id);
}

export function updatePaymentStatus(id: string, status: PaymentStatus): void {
  getDb().prepare("UPDATE bookings SET payment_status = ? WHERE id = ?").run(status, id);
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
      b.jobStatus !== "cancelled" &&
      b.id !== excludeId
  );
  for (const b of sameDay) {
    if (startTime < b.endTime && b.startTime < endTime) return b; // overlap
  }
  return null;
}

export { isoDate, today };
