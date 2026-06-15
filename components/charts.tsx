"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatSgd } from "@/lib/utils";
import type { CleanerUtil, DayPoint, PackageMix } from "@/lib/analytics";

const AXIS = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

export function RevenueChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => [formatSgd(v), "Revenue"]}
          labelStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function UtilisationChart({ data }: { data: CleanerUtil[] }) {
  const rows = data
    .filter((d) => d.cleaner.active)
    .map((d) => ({ name: d.cleaner.code, util: Math.round(d.utilisation * 100) }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 30)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
        <XAxis type="number" domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={28} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Utilisation"]} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
        <Bar dataKey="util" radius={[0, 4, 4, 0]} fill="#0d9488">
          {rows.map((r) => (
            <Cell key={r.name} fill={r.util >= 75 ? "#059669" : r.util >= 40 ? "#0d9488" : "#f59e0b"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PackageMixChart({ data }: { data: PackageMix[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="revenue" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.packageId} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [formatSgd(v), n as string]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--foreground))",
};
