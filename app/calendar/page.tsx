import { PageHeader } from "@/components/page-header";
import { CalendarClient } from "@/components/calendar-client";
import { listBookingDetails, listCleaners, listCustomers, listPackages } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        eyebrow="Schedule"
        title="Booking calendar"
        description="Week-at-a-glance schedule for the whole team. Click an open slot to create a booking, then send the customer a confirmation."
      />
      <CalendarClient
        bookings={listBookingDetails()}
        packages={listPackages()}
        cleaners={listCleaners()}
        customers={listCustomers()}
      />
    </div>
  );
}
