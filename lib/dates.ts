// Lightweight date/time helpers. We keep dates as "YYYY-MM-DD" and times as
// "HH:MM" strings to stay timezone-agnostic (the agency operates in SGT).

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addHoursToTime(time: string, hours: number): string {
  return fromMinutes(toMinutes(time) + Math.round(hours * 60));
}

export function durationHours(start: string, end: string): number {
  return (toMinutes(end) - toMinutes(start)) / 60;
}

const WEEKDAY_INDEX = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function weekdayOf(dateStr: string): (typeof WEEKDAY_INDEX)[number] {
  // Parse as local date (no timezone shift).
  const [y, m, d] = dateStr.split("-").map(Number);
  return WEEKDAY_INDEX[new Date(y, m - 1, d).getDay()];
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday of the week containing the given date. */
export function startOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  dt.setDate(dt.getDate() + diff);
  return isoDate(dt);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return isoDate(dt);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** First day ("YYYY-MM-01") of the calendar month containing the given date. */
export function startOfMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

/** Last day of the calendar month containing the given date. */
export function endOfMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate(); // day 0 of next month = last of this
  return `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

/** Human label for the month, e.g. "June". */
export function monthLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", { month: "long" });
}

export function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, "0")}${period}`;
}

/** Today in SGT-ish terms; the app is seeded relative to this. */
export function today(): string {
  return isoDate(new Date());
}
