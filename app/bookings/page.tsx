import { PageHeader } from "@/components/page-header";
import { BookingsClient } from "@/components/bookings-client";
import { listBookingDetails, listCleaners, listCustomers } from "@/lib/db";
import { COMPANY } from "@/lib/seed-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function BookingsPage({ searchParams }: { searchParams: { new?: string } }) {
  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        eyebrow="Jobs"
        title="All jobs"
        description="Create, search, and manage cleaning jobs. Mark jobs complete, track payment status, and confirm whether the customer has been emailed."
      />
      <BookingsClient
        bookings={listBookingDetails()}
        cleaners={listCleaners()}
        customers={listCustomers()}
        hourlyRate={COMPANY.hourlyRate}
        openNew={!!searchParams?.new}
      />
    </div>
  );
}
