"use client";

import { AlertTriangle, CircleCheck, Sparkles, Target, TriangleAlert } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Swot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  provider: "anthropic" | "offline-heuristic";
  model?: string;
  generatedAt: string;
}

const QUADRANTS: {
  key: keyof Pick<Swot, "strengths" | "weaknesses" | "opportunities" | "threats">;
  label: string;
  icon: React.ReactNode;
  tone: string;
}[] = [
  { key: "strengths", label: "Strengths", icon: <CircleCheck className="h-4 w-4" />, tone: "text-emerald-400" },
  { key: "weaknesses", label: "Weaknesses", icon: <TriangleAlert className="h-4 w-4" />, tone: "text-amber-400" },
  { key: "opportunities", label: "Opportunities", icon: <Target className="h-4 w-4" />, tone: "text-sky-400" },
  { key: "threats", label: "Threats", icon: <AlertTriangle className="h-4 w-4" />, tone: "text-rose-400" },
];

export function SwotCard({ slug }: { slug: string }) {
  const [swot, setSwot] = useState<Swot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/swot?slug=${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j: Swot) => {
        if (!cancelled) setSwot(j);
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function refresh() {
    setRefreshing(true);
    try {
      const r = await fetch(`/api/swot?slug=${encodeURIComponent(slug)}&force=1`);
      if (r.ok) setSwot(await r.json());
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            SWOT analysis
          </CardTitle>
          {swot ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Generated {new Date(swot.generatedAt).toLocaleString("en-SG")} ·{" "}
              <Badge variant={swot.provider === "anthropic" ? "success" : "muted"} className="ml-1">
                {swot.provider === "anthropic" ? `anthropic · ${swot.model}` : "offline heuristic"}
              </Badge>
            </p>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading || refreshing}>
          {refreshing ? "Refreshing…" : "Regenerate"}
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load SWOT: {error}
          </div>
        ) : loading || !swot ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {QUADRANTS.map((q, i) => (
              <motion.section
                key={q.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="rounded-lg border bg-background/40 p-4"
              >
                <h4 className={cn("mb-2 flex items-center gap-2 text-sm font-medium", q.tone)}>
                  {q.icon}
                  {q.label}
                </h4>
                <ul className="space-y-2 text-sm">
                  {swot[q.key].map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed text-foreground/90">
                      <span
                        aria-hidden
                        className={cn("mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-current opacity-60", q.tone)}
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </motion.section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
