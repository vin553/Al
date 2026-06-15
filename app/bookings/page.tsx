import { PageHeader } from "@/components/page-header";
import { BookingsClient } from "@/components/bookings-client";
import { listBookingDetails, listCleaners, listCustomers, listPackages } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function BookingsPage({ searchParams }: { searchParams: { new?: string } }) {
  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        eyebrow="Bookings"
        title="All bookings"
        description="Create, search, and manage jobs. Mark jobs complete or cancelled, and confirm whether the customer has been emailed."
      />
      <BookingsClient
        bookings={listBookingDetails()}
        packages={listPackages()}
        cleaners={listCleaners()}
        customers={listCustomers()}
        openNew={!!searchParams?.new}
      />
    </div>
  );
}
