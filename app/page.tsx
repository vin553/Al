import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PaymentBadge } from "@/components/status-badge";
import { RevenueChart, UtilisationChart, CleanerRevenueChart } from "@/components/charts";
import { listBookingDetails, listCleaners } from "@/lib/db";
import {
  dailyRevenue,
  revenueByCleaner,
  reportingRanges,
  statsForRange,
  utilisationByCleaner,
} from "@/lib/analytics";
import { formatSgd } from "@/lib/utils";
import { formatDateShort, formatTime12, today } from "@/lib/dates";
import { CalendarDays, DollarSign, Gauge, Wallet } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const bookings = listBookingDetails();
  const cleaners = listCleaners();
  const ranges = reportingRanges();

  const todayStats = statsForRange(bookings, cleaners, ranges.today.from, ranges.today.to);
  const weekStats = statsForRange(bookings, cleaners, ranges.week.from, ranges.week.to);
  const monthStats = statsForRange(bookings, cleaners, ranges.month.from, ranges.month.to);

  const revenueSeries = dailyRevenue(bookings, 14);
  const util = utilisationByCleaner(bookings, cleaners, ranges.week.from, ranges.week.to);
  const mix = revenueByCleaner(bookings, ranges.month.from, ranges.month.to);

  const t = today();
  const upcoming = bookings.filter((b) => b.jobStatus === "scheduled" && b.date >= t).slice(0, 6);

  return (
    <div className="container space-y-8 py-8">
      <PageHeader
        eyebrow="May Myanmar Cleaning Services"
        title="Operations dashboard"
        description="Live revenue, payments, and cleaner utilisation — built from the May & June job schedule."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue today"
          value={formatSgd(todayStats.revenue)}
          hint={`${todayStats.jobs} job(s) scheduled`}
          icon={<DollarSign />}
          index={0}
        />
        <KpiCard
          label="Revenue this week"
          value={formatSgd(weekStats.revenue)}
          hint={`${weekStats.jobs} jobs · ${weekStats.bookedHours.toFixed(0)} hrs worked`}
          icon={<CalendarDays />}
          index={1}
        />
        <KpiCard
          label="Utilisation this week"
          value={`${Math.round(weekStats.utilisation * 100)}%`}
          hint={`${weekStats.bookedHours.toFixed(0)} of ${weekStats.availableHours.toFixed(0)} available hrs`}
          icon={<Gauge />}
          index={2}
        />
        <KpiCard
          label="Outstanding (30 days)"
          value={formatSgd(monthStats.outstanding, { short: true })}
          hint={`${formatSgd(monthStats.revenue, { short: true })} billed · ${monthStats.jobs} jobs`}
          icon={<Wallet />}
          index={3}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue — last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueSeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue by cleaner (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <CleanerRevenueChart data={mix} />
            <div className="mt-3 space-y-1.5">
              {mix.map((m) => (
                <div key={m.cleanerId} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                    {m.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatSgd(m.revenue)} · {m.jobs} jobs
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Cleaner utilisation this week</CardTitle>
          </CardHeader>
          <CardContent>
            <UtilisationChart data={util} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming jobs</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y">
              {upcoming.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{b.customer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateShort(b.date)} · {formatTime12(b.startTime)}–{formatTime12(b.endTime)} ·
                      Cleaner {b.cleaner.code}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums">{formatSgd(b.amount)}</span>
                    <PaymentBadge status={b.paymentStatus} />
                    <StatusBadge status={b.jobStatus} />
                  </div>
                </div>
              ))}
              {upcoming.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No upcoming jobs.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
