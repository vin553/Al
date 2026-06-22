"use client";

import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PaymentBadge } from "@/components/status-badge";
import { RevenueChart, UtilisationChart, CleanerRevenueChart } from "@/components/charts";
import {
  dailyRevenue,
  revenueByCleaner,
  reportingRanges,
  statsForRange,
  paymentSummary,
  jobCounts,
  utilisationByCleaner,
  bookingHours,
  type CleanerUtil,
} from "@/lib/analytics";
import { formatSgd } from "@/lib/utils";
import { formatDateShort, formatTime12, monthLabel, today } from "@/lib/dates";
import type { BookingDetail, Cleaner } from "@/lib/types";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Gauge,
  MapPin,
  Phone,
  Receipt,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

type DrillKey =
  | "today"
  | "nextWeek"
  | "collected"
  | "outstanding"
  | "utilisation"
  | "avg"
  | "jobsDone";

const billable = (b: BookingDetail) => b.jobStatus !== "cancelled";

export function DashboardClient({
  bookings,
  cleaners,
}: {
  bookings: BookingDetail[];
  cleaners: Cleaner[];
}) {
  const t = today();
  const ranges = reportingRanges();
  const monthName = monthLabel(t);

  // ---- KPI aggregates ----
  const todayStats = statsForRange(bookings, cleaners, ranges.today.from, ranges.today.to);
  const weekStats = statsForRange(bookings, cleaners, ranges.week.from, ranges.week.to);
  const nextWeekStats = statsForRange(bookings, cleaners, ranges.nextWeek.from, ranges.nextWeek.to);
  const pay = paymentSummary(bookings, ranges.thisMonth.from, ranges.thisMonth.to);
  const jc = jobCounts(bookings, ranges.thisMonth.from, ranges.thisMonth.to);
  const collectionPct = Math.round(pay.collectionRate * 100);

  const revenueSeries = dailyRevenue(bookings, 14);
  const util = utilisationByCleaner(bookings, cleaners, ranges.week.from, ranges.week.to);
  const mix = revenueByCleaner(bookings, ranges.month.from, ranges.month.to);

  // ---- Drill-down datasets ----
  const inThisMonth = (b: BookingDetail) =>
    b.date >= ranges.thisMonth.from && b.date <= ranges.thisMonth.to;

  const lists = useMemo(() => {
    const byTime = (a: BookingDetail, b: BookingDetail) =>
      (a.date + a.startTime).localeCompare(b.date + b.startTime);
    const byAmount = (a: BookingDetail, b: BookingDetail) => b.amount - a.amount;

    const todayJobs = bookings.filter((b) => b.date === t && billable(b)).sort(byTime);
    const nextWeekList = bookings
      .filter((b) => b.date >= ranges.nextWeek.from && b.date <= ranges.nextWeek.to && billable(b))
      .sort(byTime);
    const collectedJobs = bookings
      .filter((b) => inThisMonth(b) && billable(b) && b.paymentStatus === "done")
      .sort(byAmount);
    const outstandingJobs = bookings
      .filter((b) => inThisMonth(b) && billable(b) && b.paymentStatus !== "done")
      .sort(byAmount);
    const monthJobs = bookings.filter((b) => inThisMonth(b) && billable(b)).sort(byTime);

    // Next week grouped by client
    const map = new Map<string, { name: string; amount: number; jobs: number }>();
    for (const b of nextWeekList) {
      const cur = map.get(b.customerId) ?? { name: b.customer.name, amount: 0, jobs: 0 };
      cur.amount += b.amount;
      cur.jobs += 1;
      map.set(b.customerId, cur);
    }
    const nextWeekByClient = Array.from(map.values()).sort((a, b) => b.amount - a.amount);

    return { todayJobs, nextWeekList, nextWeekByClient, collectedJobs, outstandingJobs, monthJobs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, t]);

  // ---- Modal state ----
  const [drill, setDrill] = useState<DrillKey | null>(null);
  const [job, setJob] = useState<BookingDetail | null>(null);
  const open = drill !== null || job !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function closeAll() {
    setDrill(null);
    setJob(null);
  }

  return (
    <>
      {/* Money row */}
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
          hint={`${nextWeekStats.jobs} jobs · by client`}
          icon={<TrendingUp />}
          index={1}
          onClick={() => setDrill("nextWeek")}
        />
        <KpiCard
          label={`Collected in ${monthName}`}
          value={formatSgd(pay.collected)}
          hint={`${collectionPct}% collected · who paid`}
          icon={<Banknote />}
          index={2}
          onClick={() => setDrill("collected")}
        />
        <KpiCard
          label="Outstanding payments"
          value={formatSgd(pay.outstanding)}
          hint={`${lists.outstandingJobs.length} jobs · who owes`}
          icon={<Wallet />}
          index={3}
          onClick={() => setDrill("outstanding")}
        />
      </div>

      {/* Operations row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue today"
          value={formatSgd(todayStats.revenue)}
          hint={`${lists.todayJobs.length} job(s) today`}
          icon={<DollarSign />}
          index={0}
          onClick={() => setDrill("today")}
        />
        <KpiCard
          label="Utilisation this week"
          value={`${Math.round(weekStats.utilisation * 100)}%`}
          hint={`${weekStats.bookedHours.toFixed(0)} of ${weekStats.availableHours.toFixed(0)} hrs · by cleaner`}
          icon={<Gauge />}
          index={1}
          onClick={() => setDrill("utilisation")}
        />
        <KpiCard
          label="Avg job value"
          value={formatSgd(jc.avgValue)}
          hint={`across ${jc.total} jobs in ${monthName}`}
          icon={<Receipt />}
          index={2}
          onClick={() => setDrill("avg")}
        />
        <KpiCard
          label={`Jobs done in ${monthName}`}
          value={`${jc.completed}/${jc.total}`}
          hint={`${jc.scheduled} upcoming · view list`}
          icon={<CheckCircle2 />}
          index={3}
          onClick={() => setDrill("jobsDone")}
        />
      </div>

      {/* Charts */}
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

      {/* Payments + utilisation + upcoming */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="cursor-pointer transition-colors hover:border-primary/40" onClick={() => setDrill("collected")}>
          <CardHeader>
            <CardTitle>Payments — {monthName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-semibold tabular-nums">{collectionPct}%</span>
                <span className="text-xs text-muted-foreground">collected</span>
              </div>
              <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                {pay.billed > 0 && (
                  <>
                    <span className="bg-emerald-500" style={{ width: `${(pay.collected / pay.billed) * 100}%` }} />
                    <span className="bg-amber-400" style={{ width: `${(pay.pending / pay.billed) * 100}%` }} />
                    <span className="bg-muted-foreground/30" style={{ width: `${(pay.unbilled / pay.billed) * 100}%` }} />
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

        <Card className="cursor-pointer transition-colors hover:border-primary/40" onClick={() => setDrill("utilisation")}>
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
              {bookings
                .filter((b) => b.jobStatus === "scheduled" && b.date >= t)
                .slice(0, 6)
                .map((b) => (
                  <JobRow key={b.id} b={b} onClick={() => setJob(b)} />
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeAll}
        >
          <div
            className="my-8 w-full max-w-2xl rounded-xl border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogBody
              drill={drill}
              job={job}
              monthName={monthName}
              lists={lists}
              util={util}
              pay={pay}
              jc={jc}
              onSelectJob={setJob}
              onBack={() => setJob(null)}
              onClose={closeAll}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function DialogBody({
  drill,
  job,
  monthName,
  lists,
  util,
  pay,
  jc,
  onSelectJob,
  onBack,
  onClose,
}: {
  drill: DrillKey | null;
  job: BookingDetail | null;
  monthName: string;
  lists: {
    todayJobs: BookingDetail[];
    nextWeekList: BookingDetail[];
    nextWeekByClient: { name: string; amount: number; jobs: number }[];
    collectedJobs: BookingDetail[];
    outstandingJobs: BookingDetail[];
    monthJobs: BookingDetail[];
  };
  util: CleanerUtil[];
  pay: ReturnType<typeof paymentSummary>;
  jc: ReturnType<typeof jobCounts>;
  onSelectJob: (b: BookingDetail) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  // Job detail view (may sit on top of a list)
  if (job) {
    return <JobDetail job={job} showBack={drill !== null} onBack={onBack} onClose={onClose} />;
  }

  const titles: Record<DrillKey, string> = {
    today: `Today's jobs (${lists.todayJobs.length})`,
    nextWeek: "Next week — revenue by client",
    collected: `Collected in ${monthName} — who paid`,
    outstanding: "Outstanding payments — who owes",
    utilisation: "Utilisation this week — by cleaner",
    avg: `All jobs in ${monthName}`,
    jobsDone: `Jobs in ${monthName} — ${jc.completed} done / ${jc.total}`,
  };

  return (
    <>
      <Header title={drill ? titles[drill] : ""} onClose={onClose} />
      <div className="max-h-[70vh] overflow-y-auto">
        {drill === "today" && <JobList jobs={lists.todayJobs} onSelect={onSelectJob} empty="No jobs today." />}
        {drill === "avg" && <JobList jobs={lists.monthJobs} onSelect={onSelectJob} empty="No jobs this month." />}
        {drill === "jobsDone" && <JobList jobs={lists.monthJobs} onSelect={onSelectJob} empty="No jobs this month." />}
        {drill === "collected" && (
          <JobList jobs={lists.collectedJobs} onSelect={onSelectJob} empty="Nothing collected yet." />
        )}
        {drill === "outstanding" && (
          <>
            <SummaryStrip
              items={[
                { label: "Pending invoice", value: formatSgd(pay.pending) },
                { label: "Not yet billed", value: formatSgd(pay.unbilled) },
                { label: "Total outstanding", value: formatSgd(pay.outstanding) },
              ]}
            />
            <JobList jobs={lists.outstandingJobs} onSelect={onSelectJob} empty="All paid up! 🎉" />
          </>
        )}
        {drill === "nextWeek" && <ClientList rows={lists.nextWeekByClient} />}
        {drill === "utilisation" && <UtilList rows={util} />}
      </div>
    </>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b px-5 py-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function SummaryStrip({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-px border-b bg-border">
      {items.map((it) => (
        <div key={it.label} className="bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground">{it.label}</div>
          <div className="mt-0.5 font-semibold tabular-nums">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function JobList({
  jobs,
  onSelect,
  empty,
}: {
  jobs: BookingDetail[];
  onSelect: (b: BookingDetail) => void;
  empty: string;
}) {
  if (jobs.length === 0) {
    return <div className="px-5 py-12 text-center text-sm text-muted-foreground">{empty}</div>;
  }
  return (
    <div className="divide-y">
      {jobs.map((b) => (
        <JobRow key={b.id} b={b} onClick={() => onSelect(b)} />
      ))}
    </div>
  );
}

function JobRow({ b, onClick }: { b: BookingDetail; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{b.customer.name}</div>
        <div className="text-xs text-muted-foreground">
          {formatDateShort(b.date)} · {formatTime12(b.startTime)}–{formatTime12(b.endTime)} · {b.cleaner.code}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-medium tabular-nums">{formatSgd(b.amount)}</span>
        <PaymentBadge status={b.paymentStatus} />
        <StatusBadge status={b.jobStatus} />
      </div>
    </button>
  );
}

function ClientList({ rows }: { rows: { name: string; amount: number; jobs: number }[] }) {
  if (rows.length === 0) {
    return <div className="px-5 py-12 text-center text-sm text-muted-foreground">No jobs booked next week yet.</div>;
  }
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="divide-y">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{r.name}</div>
            <div className="text-xs text-muted-foreground">{r.jobs} job(s) next week</div>
          </div>
          <span className="text-sm font-medium tabular-nums">{formatSgd(r.amount)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between bg-muted/30 px-5 py-3 font-medium">
        <span>Total projected</span>
        <span className="tabular-nums">{formatSgd(total)}</span>
      </div>
    </div>
  );
}

function UtilList({ rows }: { rows: CleanerUtil[] }) {
  return (
    <div className="divide-y">
      {rows.map((r) => (
        <div key={r.cleaner.id} className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.cleaner.color }} />
            <div>
              <div className="text-sm font-medium">{r.cleaner.name}</div>
              <div className="text-xs text-muted-foreground">
                {r.bookedHours.toFixed(0)} of {r.availableHours.toFixed(0)} hrs · {r.jobs} jobs ·{" "}
                {formatSgd(r.revenue)}
              </div>
            </div>
          </div>
          <span className="text-sm font-semibold tabular-nums">
            {Math.round(r.utilisation * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function JobDetail({
  job,
  showBack,
  onBack,
  onClose,
}: {
  job: BookingDetail;
  showBack: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          {showBack && (
            <button onClick={onBack} className="rounded-md p-1 text-muted-foreground hover:bg-secondary">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-lg font-semibold">{job.customer.name}</h2>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={job.jobStatus} />
          <PaymentBadge status={job.paymentStatus} />
          <span className="ml-auto text-2xl font-semibold tabular-nums">{formatSgd(job.amount)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Date">{formatDateShort(job.date)}</Field>
          <Field label="Time">
            {formatTime12(job.startTime)}–{formatTime12(job.endTime)} · {bookingHours(job)} hr
          </Field>
          <Field label="Cleaner">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: job.cleaner.color }} />
              {job.cleaner.name} ({job.cleaner.code})
            </span>
          </Field>
          <Field label="Customer code">{job.customer.code || "—"}</Field>
          <Field label="Phone">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              {job.customer.phone || "—"}
            </span>
          </Field>
          <Field label="Email">{job.customer.email || "—"}</Field>
          <Field label="Address" full>
            <span className="inline-flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {[job.customer.address, job.customer.postal].filter(Boolean).join(", ") || "—"}
            </span>
          </Field>
          {job.remark && (
            <Field label="Notes" full>
              {job.remark}
            </Field>
          )}
        </div>

        <div className="flex flex-wrap gap-3 border-t pt-4 text-xs text-muted-foreground">
          {job.whatsappSent && <span>✓ WhatsApp sent</span>}
          {job.emailSent && <span>✓ Email confirmation sent</span>}
          {job.googleEventId && <span>✓ Synced to Google Calendar</span>}
        </div>
      </div>
    </>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{children}</div>
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
