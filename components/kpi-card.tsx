"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  index?: number;
  onClick?: () => void;
}

export function KpiCard({ label, value, hint, icon, delta, index = 0, onClick }: KpiCardProps) {
  const clickable = typeof onClick === "function";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card
        onClick={onClick}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick!();
                }
              }
            : undefined
        }
        className={cn(
          "overflow-hidden",
          clickable &&
            "cursor-pointer select-none transition-colors hover:border-primary/40 hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        )}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          {icon ? (
            <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4" aria-hidden>
              {icon}
            </span>
          ) : null}
        </div>
        <div className="flex items-baseline justify-between px-5 pb-5">
          <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
          {delta ? (
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                delta.direction === "up" && "text-emerald-400",
                delta.direction === "down" && "text-rose-400",
                delta.direction === "flat" && "text-muted-foreground"
              )}
            >
              {delta.value}
            </span>
          ) : null}
        </div>
        {hint ? (
          <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-5 py-2 text-xs text-muted-foreground">
            <span>{hint}</span>
            {clickable && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />}
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
}
