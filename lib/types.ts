// Domain types for Mei Myanmar Cleaning Services booking platform.

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** A cleaner's recurring weekly availability window, e.g. 9am–6pm on a given day. */
export interface AvailabilityWindow {
  day: Weekday;
  start: string; // "HH:MM" 24h
  end: string; // "HH:MM" 24h
}

export interface Cleaner {
  id: string;
  code: string; // short label A, B, C ...
  name: string;
  phone: string;
  active: boolean;
  /** Recurring weekly availability. */
  availability: AvailabilityWindow[];
}

export interface Package {
  id: string;
  name: string;
  description: string;
  /** Base price in SGD. Staff can override per booking. */
  price: number;
  /** Job duration in hours. */
  durationHours: number;
  /** How many cleaners this package normally needs. */
  cleanersRequired: number;
  color: string; // tailwind-friendly hex for calendar blocks
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export type BookingStatus = "confirmed" | "completed" | "cancelled";

export interface Booking {
  id: string;
  customerId: string;
  packageId: string;
  cleanerId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  amount: number; // SGD billed
  status: BookingStatus;
  notes: string;
  emailSent: boolean;
  createdAt: string; // ISO
}

/** A booking joined with its related entities, used widely in the UI. */
export interface BookingDetail extends Booking {
  customer: Customer;
  package: Package;
  cleaner: Cleaner;
}

export interface NewBookingInput {
  customer: {
    id?: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  packageId: string;
  cleanerId: string;
  date: string;
  startTime: string;
  amount: number;
  notes?: string;
}
