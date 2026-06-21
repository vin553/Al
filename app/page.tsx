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
  paymentSummary,
  jobCounts,
  utilisationByCleaner,
} from "@/lib/analytics";
import { formatSgd } from "@/lib/utils";
import { formatDateShort, formatTime12, monthLabel, today } from "@/lib/dates";
import {
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Gauge,
  Receipt,
  Banknote,
  TrendingUp,
  Wallet,
} from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const bookings = listBookingDetails();
  const cleaners = listCleaners();
  const ranges = reportingRanges();
  const t = today();

  const todayStats = statsForRange(bookings, cleaners, ranges.today.from, ranges.today.to);
  const weekStats = statsForRange(bookings, cleaners, ranges.week.from, ranges.week.to);
  const nextWeekStats = statsForRange(bookings, cleaners, ranges.nextWeek.from, ranges.nextWeek.to);
  const pay = paymentSummary(bookings, ranges.thisMonth.from, ranges.thisMonth.to);
  const jobs = jobCounts(bookings, ranges.thisMonth.from, ranges.thisMonth.to);

  const revenueSeries = dailyRevenue(bookings, 14);
  const util = utilisationByCleaner(bookings, cleaners, ranges.week.from, ranges.week.to);
  const mix = revenueByCleaner(bookings, ranges.month.from, ranges.month.to);

  const thisMonthName = monthLabel(t);
  const upcoming = bookings.filter((b) => b.jobStatus === "scheduled" && b.date >= t).slice(0, 6);

  const collectionPct = Math.round(pay.collectionRate * 100);

  return (
    <div className="container space-y-8 py-8">
      <PageHeader
        eyebrow="May Myanmar Cleaning Services"
        title="Operations dashboard"
        description="Live revenue, payments, projections, and cleaner utilisation — built from the May & June job schedule."
      />

      {/* Money: what's coming in and what's owed */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue this week"
          value={formatSgd(weekStats.revenue)}
          hint={`${weekStats.jobs} jobs · ${weekStats.bookedHours.toFixed(0)} hrs`}
          icon={<CalendarDays />}
          index={0}
        />
        <KpiCard
          label="Next week (projected)"
          value={formatSgd(nextWeekStats.revenue)}
          hint={`${nextWeekStats.jobs} jobs already booked`}
          icon={<TrendingUp />}
          index={1}
        />
        <KpiCard
          label={`Collected in ${thisMonthName}`}
          value={formatSgd(pay.collected)}
          hint={`${collectionPct}% of ${formatSgd(pay.billed, { short: true })} billed`}
          icon={<Banknote />}
          index={2}
        />
        <KpiCard
          label="Outstanding payments"
          value={formatSgd(pay.outstanding)}
          hint={`${formatSgd(pay.pending, { short: true })} pending · ${formatSgd(pay.unbilled, { short: true })} unbilled`}
          icon={<Wallet />}
          index={3}
        />
      </div>

      {/* Operations: today, capacity, and job throughput */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue today"
          value={formatSgd(todayStats.revenue)}
          hint={`${todayStats.jobs} job(s) scheduled`}
          icon={<DollarSign />}
          index={0}
        />
        <KpiCard
          label="Utilisation this week"
          value={`${Math.round(weekStats.utilisation * 100)}%`}
          hint={`${weekStats.bookedHours.toFixed(0)} of ${weekStats.availableHours.toFixed(0)} available hrs`}
          icon={<Gauge />}
          index={1}
        />
        <KpiCard
          label="Avg job value"
          value={formatSgd(jobs.avgValue)}
          hint={`across ${jobs.total} jobs in ${thisMonthName}`}
          icon={<Receipt />}
          index={2}
        />
        <KpiCard
          label={`Jobs done in ${thisMonthName}`}
          value={`${jobs.completed}/${jobs.total}`}
          hint={`${jobs.scheduled} still upcoming`}
          icon={<CheckCircle2 />}
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
        <Card>
          <CardHeader>
            <CardTitle>Payments — {thisMonthName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-semibold tabular-nums">{collectionPct}%</span>
                <span className="text-xs text-muted-foreground">collected</span>
              </div>
              {/* Stacked bar: collected / pending / unbilled */}
              <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                {pay.billed > 0 && (
                  <>
                    <span
                      className="bg-emerald-500"
                      style={{ width: `${(pay.collected / pay.billed) * 100}%` }}
                    />
                    <span
                      className="bg-amber-400"
                      style={{ width: `${(pay.pending / pay.billed) * 100}%` }}
                    />
                    <span
                      className="bg-muted-foreground/30"
                      style={{ width: `${(pay.unbilled / pay.billed) * 100}%` }}
                    />
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <PaymentRow color="bg-emerald-500" label="Collected" amount={pay.collected} />
              <PaymentRow color="bg-amber-400" label="Pending invoice" amount={pay.pending} />
              <PaymentRow color="bg-muted-foreground/30" label="Not yet billed" amount={pay.unbilled} />
              <div className="flex items-center justify-between border-t pt-2 font-medium">
                <span>Total billed</span>
                <span className="tabular-nums">{formatSgd(pay.billed)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cleaner utilisation this week</CardTitle>
          </CardHeader>
          <CardContent>
            <UtilisationChart data={util} />
          </CardContent>
        </Card>

        <Card>
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
                      {formatDateShort(b.date)} · {formatTime12(b.startTime)} · {b.cleaner.code}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">{formatSgd(b.amount)}</span>
                    <PaymentBadge status={b.paymentStatus} />
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

function PaymentRow({ color, label, amount }: { color: string; label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        {label}
      </span>
      <span className="tabular-nums">{formatSgd(amount)}</span>
    </div>
  );
}
