// Default / placeholder seed data for Mei Myanmar Cleaning Services.
// Cleaner names and exact package pricing are placeholders — easy to swap once
// the client provides the real roster and price list.

import type { Cleaner, Customer, Package, AvailabilityWindow, Weekday } from "./types";

const FULL_WEEK: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat"];

function window(days: Weekday[], start: string, end: string): AvailabilityWindow[] {
  return days.map((day) => ({ day, start, end }));
}

// 10 cleaners, coded A–J. Names are placeholders.
export const SEED_CLEANERS: Cleaner[] = [
  { id: "cln-a", code: "A", name: "Cleaner A", phone: "+65 8100 0001", active: true, availability: window(FULL_WEEK, "09:00", "18:00") },
  { id: "cln-b", code: "B", name: "Cleaner B", phone: "+65 8100 0002", active: true, availability: window(FULL_WEEK, "09:00", "18:00") },
  { id: "cln-c", code: "C", name: "Cleaner C", phone: "+65 8100 0003", active: true, availability: window(["mon", "tue", "wed", "thu", "fri"], "10:00", "19:00") },
  { id: "cln-d", code: "D", name: "Cleaner D", phone: "+65 8100 0004", active: true, availability: window(FULL_WEEK, "08:00", "16:00") },
  { id: "cln-e", code: "E", name: "Cleaner E", phone: "+65 8100 0005", active: true, availability: window(["tue", "wed", "thu", "fri", "sat"], "09:00", "18:00") },
  { id: "cln-f", code: "F", name: "Cleaner F", phone: "+65 8100 0006", active: true, availability: window(FULL_WEEK, "09:00", "17:00") },
  { id: "cln-g", code: "G", name: "Cleaner G", phone: "+65 8100 0007", active: true, availability: window(["mon", "wed", "fri", "sat"], "10:00", "18:00") },
  { id: "cln-h", code: "H", name: "Cleaner H", phone: "+65 8100 0008", active: true, availability: window(FULL_WEEK, "09:00", "18:00") },
  { id: "cln-i", code: "I", name: "Cleaner I", phone: "+65 8100 0009", active: true, availability: window(["mon", "tue", "thu", "fri", "sat"], "08:00", "17:00") },
  { id: "cln-j", code: "J", name: "Cleaner J", phone: "+65 8100 0010", active: false, availability: window(FULL_WEEK, "09:00", "18:00") },
];

// 5 cleaning packages with sensible Singapore part-time-cleaning defaults.
export const SEED_PACKAGES: Package[] = [
  {
    id: "pkg-standard",
    name: "Standard Home Cleaning",
    description: "General housekeeping: sweeping, mopping, dusting, bathrooms and kitchen wipe-down.",
    price: 75,
    durationHours: 3,
    cleanersRequired: 1,
    color: "#2563eb",
  },
  {
    id: "pkg-deep",
    name: "Deep Cleaning",
    description: "Top-to-bottom deep clean including interior windows, skirting, and appliance exteriors.",
    price: 280,
    durationHours: 5,
    cleanersRequired: 2,
    color: "#7c3aed",
  },
  {
    id: "pkg-move",
    name: "Move-In / Move-Out",
    description: "Full handover clean for an empty unit, cabinets inside-out, ready for keys.",
    price: 380,
    durationHours: 6,
    cleanersRequired: 2,
    color: "#0d9488",
  },
  {
    id: "pkg-reno",
    name: "Post-Renovation Cleaning",
    description: "Heavy-duty dust and debris removal after renovation or A&A works.",
    price: 650,
    durationHours: 8,
    cleanersRequired: 3,
    color: "#ea580c",
  },
  {
    id: "pkg-office",
    name: "Office / Commercial",
    description: "Scheduled commercial cleaning for offices, retail, and F&B premises.",
    price: 220,
    durationHours: 4,
    cleanersRequired: 2,
    color: "#db2777",
  },
];

export const SEED_CUSTOMERS: Customer[] = [
  { id: "cus-1", name: "Tan Wei Ming", email: "weiming.tan@example.com", phone: "+65 9123 4501", address: "12 Bishan St 23, #08-114, S570012" },
  { id: "cus-2", name: "Priya Nair", email: "priya.nair@example.com", phone: "+65 9123 4502", address: "8 Sentosa Cove, #02-03, S098297" },
  { id: "cus-3", name: "James Lim", email: "james.lim@example.com", phone: "+65 9123 4503", address: "45 Clementi Ave 3, #11-22, S120045" },
  { id: "cus-4", name: "Aishah Rahman", email: "aishah.rahman@example.com", phone: "+65 9123 4504", address: "330 Anchorvale St, #05-67, S540330" },
  { id: "cus-5", name: "Daniel Koh", email: "daniel.koh@example.com", phone: "+65 9123 4505", address: "1 Raffles Place, #20-01, S048616" },
  { id: "cus-6", name: "Mei Ling Chua", email: "meiling.chua@example.com", phone: "+65 9123 4506", address: "60 Tiong Bahru Rd, #03-12, S168478" },
  { id: "cus-7", name: "Arjun Mehta", email: "arjun.mehta@example.com", phone: "+65 9123 4507", address: "21 Holland Grove Rd, S278793" },
  { id: "cus-8", name: "Grace Wong", email: "grace.wong@example.com", phone: "+65 9123 4508", address: "200 Pasir Ris Dr 1, #12-44, S510200" },
];

/** Company / business configuration used across the app and in emails. */
export const COMPANY = {
  name: "Mei Myanmar Cleaning Services",
  shortName: "Mei Myanmar",
  email: "bookings@meimyanmar.sg",
  phone: "+65 6100 2000",
  currency: "SGD",
  // Standard operating window used for utilisation maths.
  openHour: 8,
  closeHour: 19,
};
