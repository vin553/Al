"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Download, Star, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Service, Vendor } from "@/lib/vendor-types";
import {
  medianPackagePriceSgd,
  minPerPaxSgd,
  minPackageSgd,
  serviceBreadthScore,
} from "@/lib/vendor-types";
import { cn, formatCompact, formatSgd, titleCase } from "@/lib/utils";

type SortKey =
  | "name"
  | "founded"
  | "instagram"
  | "rating"
  | "reviews"
  | "breadth"
  | "entryPerPax"
  | "minPackage"
  | "median";

type Row = {
  v: Vendor;
  instagram: number;
  rating: number;
  reviews: number;
  breadth: number;
  entryPerPax: number | null;
  minPackage: number | null;
  median: number;
};

export function CompareMatrix({ vendors }: { vendors: Vendor[] }) {
  const [search, setSearch] = useState("");
  const [serviceFilters, setServiceFilters] = useState<Service[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("rating");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows: Row[] = useMemo(
    () =>
      vendors.map((v) => ({
        v,
        instagram: v.instagramFollowers,
        rating: v.googleRating,
        reviews: v.googleReviews,
        breadth: serviceBreadthScore(v),
        entryPerPax: minPerPaxSgd(v),
        minPackage: minPackageSgd(v),
        median: medianPackagePriceSgd(v),
      })),
    [vendors]
  );

  const allServices = useMemo(
    () =>
      Array.from(new Set(vendors.flatMap((v) => v.services))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [vendors]
  );

  const filtered = rows.filter((r) => {
    if (search && !r.v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (serviceFilters.length && !serviceFilters.every((s) => r.v.services.includes(s))) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const k = sortKey;
    const av =
      k === "name"
        ? a.v.name
        : k === "founded"
          ? a.v.foundedYear ?? 0
          : k === "entryPerPax"
            ? (a.entryPerPax ?? Number.POSITIVE_INFINITY)
            : k === "minPackage"
              ? (a.minPackage ?? Number.POSITIVE_INFINITY)
              : a[k as Exclude<SortKey, "name" | "founded" | "entryPerPax" | "minPackage">];
    const bv =
      k === "name"
        ? b.v.name
        : k === "founded"
          ? b.v.foundedYear ?? 0
          : k === "entryPerPax"
            ? (b.entryPerPax ?? Number.POSITIVE_INFINITY)
            : k === "minPackage"
              ? (b.minPackage ?? Number.POSITIVE_INFINITY)
              : b[k as Exclude<SortKey, "name" | "founded" | "entryPerPax" | "minPackage">];
    const cmp = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Leaders per numeric metric
  const leader = {
    instagram: Math.max(...rows.map((r) => r.instagram)),
    rating: Math.max(...rows.map((r) => r.rating)),
    reviews: Math.max(...rows.map((r) => r.reviews)),
    breadth: Math.max(...rows.map((r) => r.breadth)),
    entryPerPax: Math.min(...rows.map((r) => r.entryPerPax ?? Number.POSITIVE_INFINITY)),
    minPackage: Math.min(...rows.map((r) => r.minPackage ?? Number.POSITIVE_INFINITY)),
    median: Math.max(...rows.map((r) => r.median)),
  };

  function toggleService(s: Service) {
    setServiceFilters((curr) => (curr.includes(s) ? curr.filter((x) => x !== s) : [...curr, s]));
  }

  function setSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "name" ? "asc" : "desc");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 rounded-xl border bg-card/50 p-4 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            aria-label="Filter by name"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs uppercase tracking-wide text-muted-foreground">
            Require services:
          </span>
          {allServices.map((s) => {
            const active = serviceFilters.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleService(s)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                {titleCase(s)}
              </button>
            );
          })}
          {serviceFilters.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setServiceFilters([])}>
              Clear
            </Button>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/api/export-pdf?view=compare" target="_blank" rel="noreferrer">
            <Download className="h-3.5 w-3.5" /> Export PDF
          </a>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card/50 backdrop-blur-sm">
        <table className="min-w-[960px] w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <Th sortable onClick={() => setSort("name")} active={sortKey === "name"} dir={sortDir}>
                Vendor
              </Th>
              <Th sortable onClick={() => setSort("founded")} active={sortKey === "founded"} dir={sortDir}>
                Founded
              </Th>
              <Th sortable onClick={() => setSort("rating")} active={sortKey === "rating"} dir={sortDir} numeric>
                Rating
              </Th>
              <Th sortable onClick={() => setSort("reviews")} active={sortKey === "reviews"} dir={sortDir} numeric>
                Reviews
              </Th>
              <Th sortable onClick={() => setSort("instagram")} active={sortKey === "instagram"} dir={sortDir} numeric>
                IG
              </Th>
              <Th sortable onClick={() => setSort("breadth")} active={sortKey === "breadth"} dir={sortDir} numeric>
                Breadth
              </Th>
              <Th
                sortable
                onClick={() => setSort("entryPerPax")}
                active={sortKey === "entryPerPax"}
                dir={sortDir}
                numeric
              >
                Entry /pax
              </Th>
              <Th
                sortable
                onClick={() => setSort("minPackage")}
                active={sortKey === "minPackage"}
                dir={sortDir}
                numeric
              >
                Min package
              </Th>
              <Th sortable onClick={() => setSort("median")} active={sortKey === "median"} dir={sortDir} numeric>
                Median
              </Th>
              <Th>Confidence</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-16 text-center text-sm text-muted-foreground">
                  No vendors match your filters.
                </td>
              </tr>
            ) : (
              sorted.map((r, i) => (
                <motion.tr
                  key={r.v.slug}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  className="border-b last:border-0 transition-colors hover:bg-secondary/30"
                >
                  <td className="px-4 py-3">
                    <Link href={`/vendor/${r.v.slug}`} className="font-medium hover:underline">
                      {r.v.name}
                    </Link>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{r.v.tagline}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.v.foundedYear ?? "—"}</td>
                  <Td highlighted={r.rating === leader.rating}>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400" />
                      {r.rating.toFixed(1)}
                    </span>
                  </Td>
                  <Td highlighted={r.reviews === leader.reviews} numeric>
                    {r.reviews}
                  </Td>
                  <Td highlighted={r.instagram === leader.instagram} numeric>
                    {formatCompact(r.instagram)}
                  </Td>
                  <Td highlighted={r.breadth === leader.breadth} numeric>
                    {r.breadth.toFixed(1)}
                  </Td>
                  <Td highlighted={r.entryPerPax != null && r.entryPerPax === leader.entryPerPax} numeric>
                    {r.entryPerPax ? formatSgd(r.entryPerPax) : "—"}
                  </Td>
                  <Td highlighted={r.minPackage != null && r.minPackage === leader.minPackage} numeric>
                    {r.minPackage ? formatSgd(r.minPackage, { short: true }) : "—"}
                  </Td>
                  <Td highlighted={r.median === leader.median} numeric>
                    {formatSgd(r.median, { short: true })}
                  </Td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        r.v.dataConfidence === "verified"
                          ? "success"
                          : r.v.dataConfidence === "partial"
                            ? "info"
                            : "muted"
                      }
                      className="capitalize"
                    >
                      {r.v.dataConfidence}
                    </Badge>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {sorted.length} of {rows.length} vendors · leader per metric is highlighted.
      </p>
    </motion.div>
  );
}

function Th({
  children,
  sortable,
  active,
  dir,
  onClick,
  numeric,
}: {
  children: React.ReactNode;
  sortable?: boolean;
  active?: boolean;
  dir?: "asc" | "desc";
  onClick?: () => void;
  numeric?: boolean;
}) {
  const Icon = !sortable ? null : active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-left font-medium",
        numeric && "text-right tabular-nums",
        sortable && "cursor-pointer select-none hover:text-foreground"
      )}
      onClick={onClick}
    >
      <span className={cn("inline-flex items-center gap-1", numeric && "flex-row-reverse")}>
        {Icon ? <Icon className="h-3 w-3 opacity-60" /> : null}
        {children}
      </span>
    </th>
  );
}

function Td({
  children,
  highlighted,
  numeric,
}: {
  children: React.ReactNode;
  highlighted?: boolean;
  numeric?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 tabular-nums",
        numeric && "text-right",
        highlighted && "bg-emerald-500/5 text-emerald-300"
      )}
    >
      {children}
    </td>
  );
}
