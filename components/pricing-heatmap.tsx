"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PricingTier, Vendor } from "@/lib/vendor-types";
import { cn, formatSgd } from "@/lib/utils";

const TIERS: PricingTier[] = ["entry", "mid", "premium", "luxury"];
const TIER_LABEL: Record<PricingTier, string> = {
  entry: "Entry",
  mid: "Mid-market",
  premium: "Premium",
  luxury: "Luxury",
};

/** Convert a pricing row to a single SGD midpoint, normalised per wedding @ 150 pax. */
function rowMidpointSgd(row: Vendor["pricing"][number]): number | null {
  if (row.packageSgd) return (row.packageSgd[0] + row.packageSgd[1]) / 2;
  if (row.perPaxSgd) return ((row.perPaxSgd[0] + row.perPaxSgd[1]) / 2) * 150;
  return null;
}

export function PricingHeatmap({ vendors }: { vendors: Vendor[] }) {
  const { matrix, min, max } = useMemo(() => {
    const m: Record<string, Record<PricingTier, number | null>> = {};
    let mn = Number.POSITIVE_INFINITY;
    let mx = 0;
    for (const v of vendors) {
      m[v.slug] = { entry: null, mid: null, premium: null, luxury: null };
      for (const tier of TIERS) {
        const rows = v.pricing.filter((p) => p.tier === tier);
        if (!rows.length) continue;
        const vals = rows.map(rowMidpointSgd).filter((n): n is number => n !== null);
        if (!vals.length) continue;
        const avg = vals.reduce((s, n) => s + n, 0) / vals.length;
        m[v.slug][tier] = avg;
        mn = Math.min(mn, avg);
        mx = Math.max(mx, avg);
      }
    }
    return { matrix: m, min: mn, max: mx };
  }, [vendors]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Price heatmap · SGD per wedding (150 pax eq.)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr>
                <th className="w-48 px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Vendor
                </th>
                {TIERS.map((t) => (
                  <th
                    key={t}
                    className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {TIER_LABEL[t]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendors.map((v, i) => (
                <motion.tr
                  key={v.slug}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.04 * i }}
                >
                  <td className="px-2 py-1.5 pr-4 font-medium">{v.name}</td>
                  {TIERS.map((t) => {
                    const val = matrix[v.slug][t];
                    return <HeatCell key={t} value={val} min={min} max={max} />;
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
          <LegendBar min={min} max={max} />
        </CardContent>
      </Card>
    </motion.div>
  );
}

function HeatCell({
  value,
  min,
  max,
}: {
  value: number | null;
  min: number;
  max: number;
}) {
  if (value == null)
    return (
      <td className="px-1 py-1">
        <div className="mx-auto flex h-14 w-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground/60">
          n/a
        </div>
      </td>
    );
  const t = Math.max(0, Math.min(1, (value - min) / Math.max(1, max - min)));
  const style = {
    backgroundColor: `hsl(220, 80%, ${Math.round(20 + (1 - t) * 45)}%)`,
    color: t > 0.55 ? "white" : "hsl(220, 40%, 96%)",
  };
  return (
    <td className="px-1 py-1">
      <div
        className={cn(
          "mx-auto flex h-14 w-full flex-col items-center justify-center rounded-md text-center tabular-nums",
          "font-medium tracking-tight shadow-inner"
        )}
        style={style}
        title={`${formatSgd(value)} avg`}
      >
        <span className="text-sm">{formatSgd(value, { short: true })}</span>
      </div>
    </td>
  );
}

function LegendBar({ min, max }: { min: number; max: number }) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <span className="text-xs tabular-nums text-muted-foreground">{formatSgd(min, { short: true })}</span>
      <div
        className="h-2 flex-1 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, hsl(220, 80%, 65%) 0%, hsl(220, 80%, 45%) 50%, hsl(220, 80%, 22%) 100%)",
        }}
      />
      <span className="text-xs tabular-nums text-muted-foreground">{formatSgd(max, { short: true })}</span>
    </div>
  );
}
