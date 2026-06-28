import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Star, Users2, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SwotCard } from "@/components/swot-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getVendor } from "@/lib/db";
import {
  medianPackagePriceSgd,
  minPackageSgd,
  minPerPaxSgd,
  serviceBreadthScore,
} from "@/lib/vendor-types";
import { formatCompact, formatSgd, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function VendorDetail({ params }: { params: { slug: string } }) {
  const v = getVendor(params.slug);
  if (!v) notFound();

  const breadth = serviceBreadthScore(v);
  const median = medianPackagePriceSgd(v);
  const entryPerPax = minPerPaxSgd(v);
  const minPkg = minPackageSgd(v);
  const yearsActive = v.foundedYear ? new Date().getFullYear() - v.foundedYear : null;

  return (
    <div className="container max-w-6xl py-10">
      <div className="mb-4">
        <Link
          href="/compare"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to matrix
        </Link>
      </div>

      <PageHeader
        eyebrow={`Vendor · ${v.dataConfidence} data`}
        title={v.name}
        description={v.tagline}
        actions={
          <>
            {v.url ? (
              <Button variant="outline" size="sm" asChild>
                <a href={v.url} target="_blank" rel="noreferrer">
                  Visit site <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/export-pdf?view=vendor&slug=${v.slug}`} target="_blank" rel="noreferrer">
                <Download className="h-3.5 w-3.5" /> PDF
              </a>
            </Button>
          </>
        }
      />

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <StatTile label="Google rating" value={`${v.googleRating.toFixed(1)}`} sub={`${v.googleReviews} reviews`} icon={<Star className="h-4 w-4 text-amber-400" />} />
        <StatTile label="Instagram" value={formatCompact(v.instagramFollowers)} sub={v.instagramHandle ? `@${v.instagramHandle}` : "—"} icon={<Users2 className="h-4 w-4" />} />
        <StatTile label="Breadth" value={`${breadth.toFixed(1)}/10`} sub={`${v.services.length} services`} />
        <StatTile
          label="Median spend"
          value={formatSgd(median, { short: true })}
          sub={entryPerPax ? `from ${formatSgd(entryPerPax)}/pax` : minPkg ? `from ${formatSgd(minPkg, { short: true })} pkg` : "—"}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pricing tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left">Tier</th>
                    <th className="px-2 py-2 text-left">Package</th>
                    <th className="px-2 py-2 text-right">Per pax</th>
                    <th className="px-2 py-2 text-right">Package SGD</th>
                  </tr>
                </thead>
                <tbody>
                  {v.pricing.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-2 capitalize">
                        <Badge variant="outline">{row.tier}</Badge>
                      </td>
                      <td className="px-2 py-2">{row.label}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {row.perPaxSgd
                          ? `${formatSgd(row.perPaxSgd[0])}–${formatSgd(row.perPaxSgd[1])}`
                          : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {row.packageSgd
                          ? `${formatSgd(row.packageSgd[0], { short: true })}–${formatSgd(
                              row.packageSgd[1],
                              { short: true }
                            )}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services covered</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {v.services.map((s) => (
              <Badge key={s} variant="default" className="capitalize">
                {titleCase(s)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <SwotCard slug={v.slug} />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Meta</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Founded</dt>
            <dd className="tabular-nums">{v.foundedYear ?? "—"}</dd>
            <dt className="text-muted-foreground">Years active</dt>
            <dd className="tabular-nums">{yearsActive ?? "—"}</dd>
            <dt className="text-muted-foreground">Data confidence</dt>
            <dd className="capitalize">
              <Badge
                variant={
                  v.dataConfidence === "verified"
                    ? "success"
                    : v.dataConfidence === "partial"
                      ? "info"
                      : "muted"
                }
              >
                {v.dataConfidence}
              </Badge>
            </dd>
            <dt className="text-muted-foreground">Last refresh</dt>
            <dd className="tabular-nums">{new Date(v.updatedAt).toLocaleDateString("en-SG")}</dd>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {v.sources.length === 0 ? (
              <p className="text-muted-foreground">No sources recorded.</p>
            ) : (
              v.sources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2 rounded-md border bg-background/40 p-2 transition-colors hover:bg-secondary/40"
                >
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block text-foreground">{s.note}</span>
                    <span className="block truncate text-muted-foreground">{s.url}</span>
                  </span>
                </a>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}
