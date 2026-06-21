// Roster + company config for May Myanmar Cleaning Services.
// Customers and jobs are imported from data/jobs.seed.json (built from the
// agency's May & June schedule spreadsheets).

import type { Cleaner, AvailabilityWindow, Weekday } from "./types";

const FULL_WEEK: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat"];

function window(days: Weekday[], start: string, end: string): AvailabilityWindow[] {
  return days.map((day) => ({ day, start, end }));
}

// The six real cleaners. Phone numbers and weekly schedules are placeholders
// (default Mon–Sat 09:00–18:00) until the client confirms the working schedule.
export const SEED_CLEANERS: Cleaner[] = [
  { id: "cln-ntz", code: "NTZ", name: "Nant Thin Zar", phone: "—", active: true, color: "#2563eb", availability: window(FULL_WEEK, "09:00", "18:00") },
  { id: "cln-yyn", code: "YYN", name: "Yu Ya Naing", phone: "—", active: true, color: "#7c3aed", availability: window(FULL_WEEK, "09:00", "18:00") },
  { id: "cln-hh", code: "HH", name: "Hnin Hnin", phone: "—", active: true, color: "#0d9488", availability: window(FULL_WEEK, "09:00", "18:00") },
  { id: "cln-sa", code: "SA", name: "Sai Aye", phone: "—", active: true, color: "#ea580c", availability: window(FULL_WEEK, "09:00", "18:00") },
  { id: "cln-tw", code: "TW", name: "Thidar Win", phone: "—", active: true, color: "#db2777", availability: window(FULL_WEEK, "09:00", "18:00") },
  { id: "cln-jen", code: "JEN", name: "Jenny", phone: "—", active: true, color: "#ca8a04", availability: window(FULL_WEEK, "09:00", "18:00") },
];

/** Company / business configuration used across the app and in emails. */
export const COMPANY = {
  name: "May Myanmar Cleaning Services",
  shortName: "May Myanmar",
  email: "bookings@maymyanmar.sg",
  phone: "+65 6100 2000",
  currency: "SGD",
  // Default hourly rate used to price jobs (staff can override per booking).
  hourlyRate: 17,
  // Standard operating window used for utilisation maths.
  openHour: 8,
  closeHour: 19,
};
