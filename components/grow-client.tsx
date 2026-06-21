"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CATEGORY_ORDER,
  type ModuleCategory,
  type ModuleDef,
  type GrowthProgress,
} from "@/lib/modules";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck2,
  Camera,
  Check,
  Clock,
  CreditCard,
  LayoutDashboard,
  Lock,
  Plug,
  QrCode,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  CalendarCheck2,
  Plug,
  QrCode,
  CreditCard,
  BadgeCheck,
  Trophy,
  Users,
  Clock,
  Camera,
};

interface Props {
  modules: ModuleDef[];
  unlocked: string[];
  progress: GrowthProgress;
}

export function GrowClient({ modules, unlocked, progress }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const unlockedSet = new Set(unlocked);

  const total = modules.length;
  const unlockedCount = modules.filter((m) => unlockedSet.has(m.key)).length;

  async function toggle(key: string, action: "unlock" | "lock") {
    setBusy(key);
    try {
      await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, action }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Gamified progress header */}
      <Card className="overflow-hidden border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Business level
              </div>
              <div className="mt-1 text-3xl font-semibold tracking-tight">
                {progress.level.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold tabular-nums">{progress.points} pts</div>
              <div className="text-xs text-muted-foreground">
                {unlockedCount} of {total} tools unlocked
              </div>
            </div>
          </div>

          {/* Progress to next level */}
          <div className="mt-4">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.span
                className="block h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress.pctToNext}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {progress.nextLevel
                ? `${progress.pointsToNext} pts to ${progress.nextLevel.name} — unlock more tools to level up.`
                : "Top level reached — every tool unlocked. 🎉"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module catalogue grouped by category */}
      {CATEGORY_ORDER.map((cat) => {
        const inCat = modules.filter((m) => m.category === cat);
        if (inCat.length === 0) return null;
        return (
          <section key={cat} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inCat.map((m, i) => (
                <ModuleCard
                  key={m.key}
                  mod={m}
                  unlocked={unlockedSet.has(m.key)}
                  busy={busy === m.key}
                  index={i}
                  onToggle={toggle}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ModuleCard({
  mod,
  unlocked,
  busy,
  index,
  onToggle,
}: {
  mod: ModuleDef;
  unlocked: boolean;
  busy: boolean;
  index: number;
  onToggle: (key: string, action: "unlock" | "lock") => void;
}) {
  const Icon = ICONS[mod.icon] ?? Sparkles;
  const included = mod.includedByDefault;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Card
        className={cn(
          "flex h-full flex-col transition-colors",
          unlocked ? "border-primary/30" : "opacity-95"
        )}
      >
        <CardContent className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-start justify-between">
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="flex items-center gap-1.5">
              {mod.status === "soon" && !included && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Preview
                </span>
              )}
              {unlocked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" /> {included ? "Included" : "Unlocked"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold leading-tight">{mod.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{mod.tagline}</p>
          </div>

          <ul className="space-y-1 text-xs text-muted-foreground">
            {mod.unlocks.map((u) => (
              <li key={u} className="flex items-center gap-1.5">
                <Check className="h-3 w-3 shrink-0 text-primary/70" /> {u}
              </li>
            ))}
          </ul>

          <div className="mt-auto flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{mod.priceLabel}</span>
              {mod.points > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  +{mod.points} pts
                </span>
              )}
            </div>

            {included ? (
              <span className="text-xs font-medium text-muted-foreground">Active</span>
            ) : unlocked ? (
              <button
                onClick={() => onToggle(mod.key, "lock")}
                disabled={busy}
                className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
              >
                {busy ? "…" : "Lock"}
              </button>
            ) : (
              <button
                onClick={() => onToggle(mod.key, "unlock")}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "…" : "Unlock"}
                {!busy && <ArrowUpRight className="h-3 w-3" />}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
