import Link from "next/link";
import { ArrowRight, Building2, Crown, Percent, Star, Users2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDataset } from "@/lib/db";
import {
  medianPackagePriceSgd,
  minPerPaxSgd,
  serviceBreadthScore,
} from "@/lib/vendor-types";
import { formatCompact, formatSgd, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const { vendors, marketContext, collectedAt } = getDataset();
  const totalFollowers = vendors.reduce((s, v) => s + v.instagramFollowers, 0);
  const avgRating =
    vendors.reduce((s, v) => s + v.googleRating, 0) / Math.max(vendors.length, 1);
  const entryPerPax = vendors
    .map((v) => minPerPaxSgd(v))
    .filter((n): n is number => n !== null);
  const entryMin = entryPerPax.length ? Math.min(...entryPerPax) : null;
  const breadthLeader = [...vendors].sort(
    (a, b) => serviceBreadthScore(b) - serviceBreadthScore(a)
  )[0];

  return (
    <div className="container max-w-7xl py-10">
      <PageHeader
        eyebrow="Market Intelligence · Singapore · Indian Weddings"
        title="Luxury wedding market, at a glance."
        description={`Six planners · one ruthless dashboard. Typical wedding budget: ${formatSgd(
          marketContext.typicalBudgetSgd[0]
        )}–${formatSgd(marketContext.typicalBudgetSgd[1])}. Last refresh ${new Date(
          collectedAt
        ).toLocaleDateString("en-SG")}.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/compare">
              Open matrix <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      />

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Vendors tracked"
          value={vendors.length}
          icon={<Building2 />}
          hint="Indian luxury segment · SG"
          index={0}
        />
        <KpiCard
          label="Avg Google rating"
          value={avgRating.toFixed(2)}
          icon={<Star />}
          hint={`Across ${formatCompact(
            vendors.reduce((s, v) => s + v.googleReviews, 0)
          )} reviews`}
          index={1}
        />
        <KpiCard
          label="Aggregate IG reach"
          value={formatCompact(totalFollowers)}
          icon={<Users2 />}
          hint="Sum of public IG followers"
          index={2}
        />
        <KpiCard
          label="Entry pp pricing"
          value={entryMin ? `${formatSgd(entryMin)}/pax` : "—"}
          icon={<Percent />}
          hint="Lowest per-pax across vendors"
          index={3}
        />
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Vendor line-up</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {vendors
              .sort((a, b) => b.googleRating - a.googleRating)
              .map((v) => (
                <Link
                  key={v.slug}
                  href={`/vendor/${v.slug}`}
                  className="group flex items-center justify-between rounded-lg border bg-background/40 p-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-secondary text-xs font-semibold uppercase">
                      {v.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {v.name}
                        <Badge
                          variant={
                            v.dataConfidence === "verified"
                              ? "success"
                              : v.dataConfidence === "partial"
                                ? "info"
                                : "muted"
                          }
                          className="capitalize"
                        >
                          {v.dataConfidence}
                        </Badge>
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {v.tagline}
                      </div>
                    </div>
                  </div>
                  <div className="hidden items-center gap-6 text-right text-xs tabular-nums text-muted-foreground sm:flex">
                    <span>
                      <Star className="mr-1 inline h-3 w-3 text-amber-400" />
                      {v.googleRating.toFixed(1)}
                    </span>
                    <span>{formatCompact(v.instagramFollowers)} IG</span>
                    <span>{serviceBreadthScore(v).toFixed(1)} breadth</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Market shape</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{marketContext.note}</p>
            <div className="rounded-lg border bg-background/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Crown className="h-4 w-4 text-amber-400" />
                Breadth leader
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {breadthLeader?.name}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {breadthLeader
                  ? `${breadthLeader.services.length} of 17 service verticals covered — full-stack.`
                  : ""}
              </p>
            </div>
            <div className="rounded-lg border bg-background/40 p-3 text-xs">
              <div className="mb-2 font-medium uppercase tracking-wide text-muted-foreground">
                Median package spend
              </div>
              <ul className="space-y-1.5">
                {vendors
                  .map((v) => ({ v, m: medianPackagePriceSgd(v) }))
                  .sort((a, b) => b.m - a.m)
                  .map(({ v, m }) => (
                    <li key={v.slug} className="flex items-center justify-between">
                      <span>{v.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatSgd(m, { short: true })}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between border-b pb-3">
          <h2 className="text-lg font-medium tracking-tight">Services coverage</h2>
          <p className="text-xs text-muted-foreground">
            Counts of vendors offering each vertical · {vendors.length} total
          </p>
        </div>
        <ServicesBar vendors={vendors} />
      </section>
    </div>
  );
}

function ServicesBar({ vendors }: { vendors: ReturnType<typeof getDataset>["vendors"] }) {
  const services = Array.from(new Set(vendors.flatMap((v) => v.services)));
  const counts = services
    .map((s) => ({ s, n: vendors.filter((v) => v.services.includes(s)).length }))
    .sort((a, b) => b.n - a.n);
  const max = Math.max(...counts.map((c) => c.n));

  return (
    <ul className="mt-4 grid gap-1.5">
      {counts.map(({ s, n }) => (
        <li key={s} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">{titleCase(s)}</span>
          <div className="relative h-6 flex-1 overflow-hidden rounded bg-secondary/40">
            <div
              className="absolute inset-y-0 left-0 rounded bg-foreground/70"
              style={{ width: `${(n / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{n}</span>
        </li>
      ))}
    </ul>
  );
}
