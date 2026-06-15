import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listBookingDetails, listPackages } from "@/lib/db";
import { packageMix, reportingRanges } from "@/lib/analytics";
import { formatSgd } from "@/lib/utils";
import { Clock, Users } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function PackagesPage() {
  const packages = listPackages();
  const bookings = listBookingDetails();
  const ranges = reportingRanges();
  const mix = packageMix(bookings, ranges.month.from, ranges.month.to);
  const mixById = new Map(mix.map((m) => [m.packageId, m]));

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        eyebrow="Services"
        title="Package plans"
        description="The service packages customers can book. Prices and durations are placeholders — update them with the client's real rate card. The figures on the right show the last 30 days of demand."
      />

      <div className="space-y-3">
        {packages.map((p) => {
          const m = mixById.get(p.id);
          return (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-10 w-1.5 rounded-full" style={{ background: p.color }} />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">{p.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="muted" className="gap-1">
                        <Clock className="h-3 w-3" /> {p.durationHours}h
                      </Badge>
                      <Badge variant="muted" className="gap-1">
                        <Users className="h-3 w-3" /> {p.cleanersRequired} cleaner(s)
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-6 sm:text-right">
                  <div>
                    <div className="text-2xl font-semibold tabular-nums">{formatSgd(p.price)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Base price</div>
                  </div>
                  <div className="border-l pl-6">
                    <div className="text-lg font-semibold tabular-nums">{m?.jobs ?? 0}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Jobs / 30d</div>
                  </div>
                  <div className="border-l pl-6">
                    <div className="text-lg font-semibold tabular-nums">{formatSgd(m?.revenue ?? 0, { short: true })}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Revenue / 30d</div>
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
