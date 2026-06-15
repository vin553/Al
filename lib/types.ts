// Domain types for Mei Myanmar Cleaning Services booking platform.
// Modelled on the agency's real job register: hourly jobs with an assigned
// cleaner, job status, and payment status.

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

export interface AvailabilityWindow {
  day: Weekday;
  start: string; // "HH:MM" 24h
  end: string; // "HH:MM" 24h
}

export interface Cleaner {
  id: string;
  code: string; // short label e.g. NTZ, JEN
  name: string;
  phone: string;
  active: boolean;
  color: string; // hex used for calendar blocks & charts
  availability: AvailabilityWindow[];
}

export interface Customer {
  id: string;
  code: string; // agency customer code e.g. MCC0178
  name: string;
  email: string;
  phone: string;
  address: string;
  postal: string;
}

export type JobStatus = "scheduled" | "completed" | "cancelled";
export type PaymentStatus = "unbilled" | "pending" | "done";

export interface Booking {
  id: string;
  customerId: string;
  cleanerId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  hours: number;
  amount: number; // SGD billed
  jobStatus: JobStatus;
  paymentStatus: PaymentStatus;
  remark: string;
  emailSent: boolean;
  whatsappSent: boolean;
  createdAt: string; // ISO
}

/** A booking joined with its related entities, used widely in the UI. */
export interface BookingDetail extends Booking {
  customer: Customer;
  cleaner: Cleaner;
}

export interface NewBookingInput {
  customer: {
    id?: string;
    code?: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    postal?: string;
  };
  cleanerId: string;
  date: string;
  startTime: string;
  hours: number;
  amount: number;
  paymentStatus?: PaymentStatus;
  remark?: string;
}
