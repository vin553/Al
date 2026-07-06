import { PageHeader } from "@/components/page-header";
import { CalendarClient } from "@/components/calendar-client";
import { listBookingDetails, listCleaners, listCustomers } from "@/lib/db";
import { COMPANY } from "@/lib/seed-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        eyebrow="Schedule"
        title="Booking calendar"
        description="Week-at-a-glance schedule for the whole team, coloured by cleaner. Click an open slot to create a booking, then send the customer a confirmation."
      />
      <CalendarClient
        bookings={listBookingDetails()}
        cleaners={listCleaners()}
        customers={listCustomers()}
        hourlyRate={COMPANY.hourlyRate}
      />
    </div>
  );
}
