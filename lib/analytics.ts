// Revenue, payment, and utilisation analytics derived from bookings.

import type { BookingDetail, Cleaner } from "./types";
import {
  addDays,
  durationHours,
  today,
  weekdayOf,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  formatDateShort,
} from "./dates";

function billable(b: BookingDetail): boolean {
  return b.jobStatus !== "cancelled";
}

export function bookingHours(b: BookingDetail): number {
  return b.hours || durationHours(b.startTime, b.endTime);
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
  outstanding: number; // unpaid billable amount
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
  const outstanding = inRange
    .filter((b) => b.paymentStatus !== "done")
    .reduce((s, b) => s + b.amount, 0);

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
    outstanding,
  };
}

/**
 * Payment breakdown over a range: how much has actually been collected vs
 * still owed. Drives the "money in the bank" view a business owner cares about.
 */
export interface PaymentSummary {
  collected: number; // paymentStatus === "done"
  pending: number; // invoiced, awaiting payment
  unbilled: number; // work done/booked, not yet invoiced
  billed: number; // total billable value (collected + pending + unbilled)
  outstanding: number; // pending + unbilled
  collectionRate: number; // collected / billed, 0..1
}

export function paymentSummary(
  bookings: BookingDetail[],
  from: string,
  to: string
): PaymentSummary {
  const inRange = bookings.filter((b) => b.date >= from && b.date <= to && billable(b));
  const sum = (status: BookingDetail["paymentStatus"]) =>
    inRange.filter((b) => b.paymentStatus === status).reduce((s, b) => s + b.amount, 0);
  const collected = sum("done");
  const pending = sum("pending");
  const unbilled = sum("unbilled");
  const billed = collected + pending + unbilled;
  return {
    collected,
    pending,
    unbilled,
    billed,
    outstanding: pending + unbilled,
    collectionRate: billed > 0 ? collected / billed : 0,
  };
}

/** Job counts by status over a range. */
export interface JobCounts {
  total: number; // billable (excludes cancelled)
  completed: number;
  scheduled: number;
  cancelled: number;
  avgValue: number; // average billable job amount
}

export function jobCounts(bookings: BookingDetail[], from: string, to: string): JobCounts {
  const inRange = bookings.filter((b) => b.date >= from && b.date <= to);
  const billableJobs = inRange.filter(billable);
  const revenue = billableJobs.reduce((s, b) => s + b.amount, 0);
  return {
    total: billableJobs.length,
    completed: inRange.filter((b) => b.jobStatus === "completed").length,
    scheduled: inRange.filter((b) => b.jobStatus === "scheduled").length,
    cancelled: inRange.filter((b) => b.jobStatus === "cancelled").length,
    avgValue: billableJobs.length > 0 ? revenue / billableJobs.length : 0,
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

/** Revenue and job count grouped by cleaner (for the dashboard pie). */
export interface CleanerMix {
  cleanerId: string;
  name: string;
  color: string;
  revenue: number;
  jobs: number;
}

export function revenueByCleaner(
  bookings: BookingDetail[],
  from: string,
  to: string
): CleanerMix[] {
  const map = new Map<string, CleanerMix>();
  for (const b of bookings) {
    if (b.date < from || b.date > to || !billable(b)) continue;
    const cur = map.get(b.cleanerId) ?? {
      cleanerId: b.cleanerId,
      name: b.cleaner.name,
      color: b.cleaner.color,
      revenue: 0,
      jobs: 0,
    };
    cur.revenue += b.amount;
    cur.jobs += 1;
    map.set(b.cleanerId, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

/** Convenience: common reporting ranges anchored to today. */
export function reportingRanges() {
  const t = today();
  const weekStart = startOfWeek(t);
  const nextWeekStart = addDays(weekStart, 7);
  return {
    today: { from: t, to: t },
    week: { from: weekStart, to: addDays(weekStart, 6) },
    nextWeek: { from: nextWeekStart, to: addDays(nextWeekStart, 6) },
    month: { from: addDays(t, -29), to: t }, // rolling 30 days
    thisMonth: { from: startOfMonth(t), to: endOfMonth(t) }, // calendar month
    monthToDate: { from: startOfMonth(t), to: t },
  };
}
