import { PageHeader } from "@/components/page-header";
import { DashboardClient } from "@/components/dashboard-client";
import { listBookingDetails, listCleaners } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const bookings = listBookingDetails();
  const cleaners = listCleaners();

  return (
    <div className="container space-y-8 py-8">
      <PageHeader
        eyebrow="May Myanmar Cleaning Services"
        title="Operations dashboard"
        description="Live revenue, payments, projections, and cleaner utilisation. Click any metric to drill into the customers and jobs behind it."
      />
      <DashboardClient bookings={bookings} cleaners={cleaners} />
    </div>
  );
}
