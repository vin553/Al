// Revenue and utilisation analytics derived from bookings.

import type { BookingDetail, Cleaner } from "./types";
import { addDays, durationHours, today, weekdayOf, startOfWeek, formatDateShort } from "./dates";

function billable(b: BookingDetail): boolean {
  return b.status !== "cancelled";
}

export function bookingHours(b: BookingDetail): number {
  return durationHours(b.startTime, b.endTime);
}

/** Available working hours for a cleaner on a specific date (from weekly availability). */
export function availableHoursOnDate(cleaner: Cleaner, date: string): number {
  const wd = weekdayOf(date);
  return cleaner.availability
    .filter((w) => w.day === wd)
    .reduce((sum, w) => sum + durationHours(w.start, w.end), 0);
}

export interface RangeStats {
  revenue: number;
  jobs: number;
  bookedHours: number;
  availableHours: number;
  utilisation: number; // 0..1
}

export function statsForRange(
  bookings: BookingDetail[],
  cleaners: Cleaner[],
  from: string,
  to: string
): RangeStats {
  const inRange = bookings.filter((b) => b.date >= from && b.date <= to && billable(b));
  const revenue = inRange.reduce((s, b) => s + b.amount, 0);
  const bookedHours = inRange.reduce((s, b) => s + bookingHours(b), 0);

  let availableHours = 0;
  const active = cleaners.filter((c) => c.active);
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const c of active) availableHours += availableHoursOnDate(c, d);
  }

  return {
    revenue,
    jobs: inRange.length,
    bookedHours,
    availableHours,
    utilisation: availableHours > 0 ? bookedHours / availableHours : 0,
  };
}

/** Per-cleaner utilisation over a range, sorted by utilisation desc. */
export interface CleanerUtil {
  cleaner: Cleaner;
  jobs: number;
  bookedHours: number;
  availableHours: number;
  utilisation: number;
  revenue: number;
}

export function utilisationByCleaner(
  bookings: BookingDetail[],
  cleaners: Cleaner[],
  from: string,
  to: string
): CleanerUtil[] {
  return cleaners
    .map((cleaner) => {
      const mine = bookings.filter(
        (b) => b.cleanerId === cleaner.id && b.date >= from && b.date <= to && billable(b)
      );
      let availableHours = 0;
      for (let d = from; d <= to; d = addDays(d, 1)) {
        availableHours += availableHoursOnDate(cleaner, d);
      }
      const bookedHours = mine.reduce((s, b) => s + bookingHours(b), 0);
      return {
        cleaner,
        jobs: mine.length,
        bookedHours,
        availableHours,
        utilisation: availableHours > 0 ? bookedHours / availableHours : 0,
        revenue: mine.reduce((s, b) => s + b.amount, 0),
      };
    })
    .sort((a, b) => b.utilisation - a.utilisation);
}

/** Daily revenue series for the last `days` days (inclusive of today). */
export interface DayPoint {
  date: string;
  label: string;
  revenue: number;
  jobs: number;
}

export function dailyRevenue(bookings: BookingDetail[], days = 14): DayPoint[] {
  const end = today();
  const start = addDays(end, -(days - 1));
  const out: DayPoint[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const dayBookings = bookings.filter((b) => b.date === d && billable(b));
    out.push({
      date: d,
      label: formatDateShort(d),
      revenue: dayBookings.reduce((s, b) => s + b.amount, 0),
      jobs: dayBookings.length,
    });
  }
  return out;
}

/** Revenue and job count grouped by package. */
export interface PackageMix {
  packageId: string;
  name: string;
  color: string;
  revenue: number;
  jobs: number;
}

export function packageMix(bookings: BookingDetail[], from: string, to: string): PackageMix[] {
  const map = new Map<string, PackageMix>();
  for (const b of bookings) {
    if (b.date < from || b.date > to || !billable(b)) continue;
    const cur = map.get(b.packageId) ?? {
      packageId: b.packageId,
      name: b.package.name,
      color: b.package.color,
      revenue: 0,
      jobs: 0,
    };
    cur.revenue += b.amount;
    cur.jobs += 1;
    map.set(b.packageId, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

/** Convenience: common reporting ranges anchored to today. */
export function reportingRanges() {
  const t = today();
  return {
    today: { from: t, to: t },
    week: { from: startOfWeek(t), to: addDays(startOfWeek(t), 6) },
    month: { from: addDays(t, -29), to: t },
  };
}
