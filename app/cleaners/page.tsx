import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listBookingDetails, listCleaners } from "@/lib/db";
import { reportingRanges, utilisationByCleaner } from "@/lib/analytics";
import { formatSgd } from "@/lib/utils";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/lib/types";
import { formatTime12 } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function CleanersPage() {
  const cleaners = listCleaners();
  const bookings = listBookingDetails();
  const ranges = reportingRanges();
  const util = utilisationByCleaner(bookings, cleaners, ranges.week.from, ranges.week.to);
  const utilById = new Map(util.map((u) => [u.cleaner.id, u]));

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        eyebrow="Team"
        title="Cleaners"
        description="The cleaning team (placeholder names A–J). Each card shows weekly availability plus this week's utilisation and revenue. Names, phone numbers, and schedules can be swapped for the real roster."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cleaners.map((c) => {
          const u = utilById.get(c.id);
          const pct = u ? Math.round(u.utilisation * 100) : 0;
          return (
            <Card key={c.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground">
                      {c.code}
                    </span>
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </div>
                  </div>
                  <Badge variant={c.active ? "success" : "muted"}>{c.active ? "Active" : "Off"}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center">
                  <Stat label="Utilisation" value={`${pct}%`} />
                  <Stat label="Jobs (wk)" value={String(u?.jobs ?? 0)} />
                  <Stat label="Revenue" value={formatSgd(u?.revenue ?? 0, { short: true })} />
                </div>

                <div>
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">Weekly availability</div>
                  <div className="flex flex-wrap gap-1">
                    {WEEKDAYS.map((d) => {
                      const win = c.availability.find((a) => a.day === d);
                      return (
                        <span
                          key={d}
                          className={`rounded px-1.5 py-1 text-[10px] ${
                            win ? "bg-secondary text-foreground" : "bg-muted/40 text-muted-foreground/50"
                          }`}
                          title={win ? `${formatTime12(win.start)}–${formatTime12(win.end)}` : "Off"}
                        >
                          {WEEKDAY_LABELS[d]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
