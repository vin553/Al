"use client";

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
  BarChart3,
  Building2,
  CalendarCheck2,
  CalendarRange,
  Calculator,
  Camera,
  Check,
  Clock,
  CreditCard,
  FileText,
  Gift,
  Globe,
  LayoutDashboard,
  ListChecks,
  Lock,
  MapPin,
  Megaphone,
  MessageSquare,
  Package,
  Plug,
  QrCode,
  Repeat,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Trophy,
  UserCircle,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  MessageSquare,
  CalendarCheck2,
  Plug,
  QrCode,
  CreditCard,
  FileText,
  Wallet,
  Calculator,
  Globe,
  UserCircle,
  BadgeCheck,
  Trophy,
  Gift,
  Star,
  Megaphone,
  Repeat,
  Clock,
  Camera,
  ListChecks,
  Package,
  MapPin,
  Users,
  Smartphone,
  CalendarRange,
  ShieldCheck,
  BarChart3,
  Building2,
};

interface PlanInfo {
  name: string;
  price: string;
  cadence: string;
  includedUsers: number;
  extraUser: string;
  blurb: string;
}

interface Props {
  modules: ModuleDef[];
  unlocked: string[];
  progress: GrowthProgress;
  plan: PlanInfo;
  salesUrl: string;
}

export function GrowClient({ modules, unlocked, progress, plan, salesUrl }: Props) {
  const unlockedSet = new Set(unlocked);
  const total = modules.length;
  const enabledCount = modules.filter((m) => unlockedSet.has(m.key)).length;

  return (
    <div className="space-y-8">
      {/* Base plan banner */}
      <Card className="overflow-hidden border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex flex-wrap items-center justify-between gap-6 p-6">
          <div className="max-w-xl">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your plan
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight">{plan.name}</span>
              <span className="text-2xl font-semibold tabular-nums">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.cadence}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Includes up to {plan.includedUsers} users · {plan.extraUser}
            </p>
          </div>
          <a
            href={salesUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <CalendarRange className="h-4 w-4" />
            Book a strategy call
          </a>
        </CardContent>
      </Card>

      {/* Gamified progress header */}
      <Card className="overflow-hidden">
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
                {enabledCount} of {total} tools active
              </div>
            </div>
          </div>
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
                ? `${progress.pointsToNext} pts to ${progress.nextLevel.name} — add modules to level up.`
                : "Top level reached — every module active. 🎉"}
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
                  enabled={unlockedSet.has(m.key)}
                  index={i}
                  salesUrl={salesUrl}
                />
              ))}
            </div>
          </section>
        );
      })}

      <p className="pt-2 text-center text-xs text-muted-foreground">
        Add-on modules are enabled after a quick chat —{" "}
        <a href={salesUrl} target="_blank" rel="noreferrer" className="underline">
          book a call
        </a>{" "}
        to switch any of them on. Pricing shown is indicative.
      </p>
    </div>
  );
}

function ModuleCard({
  mod,
  enabled,
  index,
  salesUrl,
}: {
  mod: ModuleDef;
  enabled: boolean;
  index: number;
  salesUrl: string;
}) {
  const Icon = ICONS[mod.icon] ?? Sparkles;
  const included = mod.includedByDefault;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.04 }}
    >
      <Card className={cn("flex h-full flex-col", enabled && "border-primary/30")}>
        <CardContent className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-start justify-between">
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="flex items-center gap-1.5">
              {mod.status === "soon" && !included && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Add-on
                </span>
              )}
              {enabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" /> {included ? "Included" : "Active"}
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
            <span className="text-sm font-medium">{mod.priceLabel}</span>
            {included ? (
              <span className="text-xs font-medium text-muted-foreground">Active</span>
            ) : enabled ? (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Enabled
              </span>
            ) : (
              <a
                href={salesUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Book a call
                <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
