"use client";

import { motion } from "framer-motion";
import {
  CartesianGrid,
  Label,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { medianPackagePriceSgd, serviceBreadthScore, type Vendor } from "@/lib/vendor-types";
import { formatCompact, formatSgd } from "@/lib/utils";

export function PositioningMap({ vendors }: { vendors: Vendor[] }) {
  const data = vendors.map((v) => ({
    slug: v.slug,
    name: v.name,
    x: Math.max(500, medianPackagePriceSgd(v)),
    y: serviceBreadthScore(v),
    z: v.instagramFollowers,
    tagline: v.tagline,
  }));

  // Quadrant midpoints: median-x, median-y
  const xs = [...data.map((d) => d.x)].sort((a, b) => a - b);
  const ys = [...data.map((d) => d.y)].sort((a, b) => a - b);
  const midX = xs[Math.floor(xs.length / 2)];
  const midY = ys[Math.floor(ys.length / 2)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Positioning · spend vs. breadth vs. reach</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[460px] w-full">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 16, right: 96, bottom: 32, left: 16 }}>
                <CartesianGrid stroke="hsl(var(--border) / 0.6)" strokeDasharray="2 4" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Median spend"
                  scale="log"
                  domain={["auto", "auto"]}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => formatSgd(v, { short: true })}
                  tick={{ fontSize: 11 }}
                >
                  <Label
                    value="Median spend (SGD, log)"
                    position="insideBottom"
                    offset={-16}
                    fill="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                </XAxis>
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Breadth"
                  domain={[0, 10]}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                >
                  <Label
                    value="Service breadth (0–10)"
                    position="insideLeft"
                    angle={-90}
                    offset={10}
                    fill="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                </YAxis>
                <ZAxis type="number" dataKey="z" range={[80, 1400]} name="IG" />
                <ReferenceLine x={midX} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <ReferenceLine y={midY} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as (typeof data)[number];
                    return (
                      <div className="rounded-lg border bg-popover/95 p-3 text-xs shadow-xl backdrop-blur-sm">
                        <div className="font-medium">{p.name}</div>
                        <div className="mt-1 text-muted-foreground">{p.tagline}</div>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
                          <span className="text-muted-foreground">Median</span>
                          <span className="text-right">{formatSgd(p.x)}</span>
                          <span className="text-muted-foreground">Breadth</span>
                          <span className="text-right">{p.y.toFixed(1)}/10</span>
                          <span className="text-muted-foreground">IG</span>
                          <span className="text-right">{formatCompact(p.z)}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={data}
                  fill="hsl(220 80% 60%)"
                  fillOpacity={0.85}
                  label={{
                    dataKey: "name",
                    position: "right",
                    offset: 10,
                    fill: "hsl(var(--foreground) / 0.85)",
                    fontSize: 11,
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
            <QuadrantTag label="Full-stack premium" hint="high spend · high breadth" />
            <QuadrantTag label="Volume packagers" hint="low spend · high breadth" />
            <QuadrantTag label="Boutique specialists" hint="high spend · focused" />
            <QuadrantTag label="Budget specialists" hint="low spend · focused" />
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {data.map((d) => (
              <li key={d.slug} className="tabular-nums">
                <span className="text-foreground">{d.name}</span> · {formatSgd(d.x, { short: true })} ·{" "}
                {d.y.toFixed(1)}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QuadrantTag({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded-md border bg-background/40 p-2">
      <div className="text-[11px] font-medium text-foreground">{label}</div>
      <div className="text-[10px] uppercase tracking-wide">{hint}</div>
    </div>
  );
}
