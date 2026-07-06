import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listBookingDetails, listCustomers } from "@/lib/db";
import { formatSgd } from "@/lib/utils";
import { formatDateShort } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function CustomersPage() {
  const customers = listCustomers();
  const bookings = listBookingDetails();

  const byCustomer = new Map<string, { jobs: number; revenue: number; outstanding: number; last: string }>();
  for (const b of bookings) {
    if (b.jobStatus === "cancelled") continue;
    const cur = byCustomer.get(b.customerId) ?? { jobs: 0, revenue: 0, outstanding: 0, last: "" };
    cur.jobs += 1;
    cur.revenue += b.amount;
    if (b.paymentStatus !== "done") cur.outstanding += b.amount;
    if (b.date > cur.last) cur.last = b.date;
    byCustomer.set(b.customerId, cur);
  }

  const rows = customers
    .map((c) => ({ c, stats: byCustomer.get(c.id) }))
    .sort((a, b) => (b.stats?.revenue ?? 0) - (a.stats?.revenue ?? 0));

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        eyebrow="Clients"
        title="Customers"
        description={`${customers.length} customers imported from the May & June schedule, ranked by revenue. Email addresses can be added so confirmations can be sent.`}
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 text-right font-medium">Jobs</th>
                <th className="px-4 py-3 text-right font-medium">Revenue</th>
                <th className="px-4 py-3 text-right font-medium">Outstanding</th>
                <th className="px-4 py-3 font-medium">Last job</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, stats }) => (
                <tr key={c.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{c.code || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.phone}
                      {c.email ? ` · ${c.email}` : ""}
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <div className="truncate text-xs text-muted-foreground" title={`${c.address} ${c.postal}`}>
                      {c.address || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{stats?.jobs ?? 0}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatSgd(stats?.revenue ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {stats?.outstanding ? (
                      <Badge variant="warning">{formatSgd(stats.outstanding)}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {stats?.last ? formatDateShort(stats.last) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
