// Module registry — the catalogue of features that can be unlocked in stages.
//
// Every monetizable feature is a "module". The Grow page renders these as
// gamified locked/unlocked cards, and unlocking one flips an entitlement
// (see lib/entitlements.ts). Later, each unlock CTA connects to Stripe.

export type ModuleCategory = "Foundation" | "Payments" | "Loyalty" | "Operations";

export interface ModuleDef {
  key: string;
  name: string;
  tagline: string;
  unlocks: string[]; // what the client gets
  category: ModuleCategory;
  /** A = we bill the client, B = the client bills their own customers. */
  layer: "A" | "B";
  priceLabel: string; // e.g. "S$29/mo", "Included", "+S$9/seat"
  points: number; // growth points awarded on unlock (gamification)
  icon: string; // lucide icon name (resolved in the UI)
  status: "live" | "soon"; // whether the underlying feature is built yet
  includedByDefault?: boolean; // always on, can't be locked
}

export const MODULES: ModuleDef[] = [
  // ---- Foundation (already part of the product) ----
  {
    key: "core",
    name: "Booking & Operations Core",
    tagline: "Calendar, jobs, customers, cleaners, and the live dashboard.",
    unlocks: ["Booking calendar", "Job & customer registers", "Revenue dashboard"],
    category: "Foundation",
    layer: "A",
    priceLabel: "Included",
    points: 0,
    icon: "LayoutDashboard",
    status: "live",
    includedByDefault: true,
  },
  {
    key: "google_calendar",
    name: "Google Calendar Sync",
    tagline: "Push every booking to the owner's Google Calendar in real time.",
    unlocks: ["Real-time calendar sync", "Auto-remove on cancel"],
    category: "Foundation",
    layer: "A",
    priceLabel: "Included",
    points: 60,
    icon: "CalendarCheck2",
    status: "live",
    includedByDefault: true,
  },
  {
    key: "stripe_connect",
    name: "Connect Stripe",
    tagline: "Link your Stripe so payments land in your account. Unlocks payments.",
    unlocks: ["Stripe Connect onboarding", "Enables all payment modules"],
    category: "Foundation",
    layer: "B",
    priceLabel: "Free to connect",
    points: 80,
    icon: "Plug",
    status: "soon",
  },

  // ---- Payments (client bills their customers) ----
  {
    key: "instant_pay",
    name: "Instant Pay (QR / link)",
    tagline: "Generate a Stripe QR + link per booking so customers pay on the spot.",
    unlocks: ["Per-booking payment QR", "Shareable pay link", "Auto-mark paid"],
    category: "Payments",
    layer: "B",
    priceLabel: "S$19/mo",
    points: 140,
    icon: "QrCode",
    status: "soon",
  },
  {
    key: "card_on_file",
    name: "Card on File",
    tagline: "Securely save & tokenize a customer's card for repeat billing.",
    unlocks: ["Saved cards (tokenized)", "One-tap re-bill", "Auto-charge recurring jobs"],
    category: "Payments",
    layer: "B",
    priceLabel: "S$29/mo",
    points: 160,
    icon: "CreditCard",
    status: "soon",
  },
  {
    key: "memberships",
    name: "Memberships",
    tagline: "Sell recurring plans to customers (e.g. 4 cleans / month).",
    unlocks: ["Recurring plans", "Auto-renew billing", "Member pricing"],
    category: "Payments",
    layer: "B",
    priceLabel: "S$39/mo",
    points: 180,
    icon: "BadgeCheck",
    status: "soon",
  },

  // ---- Loyalty / gamification for end-customers ----
  {
    key: "loyalty_tokens",
    name: "Loyalty Tokens & Tiers",
    tagline: "Customers earn points, climb tiers, and redeem free cleaning sessions.",
    unlocks: ["Points per booking", "Customer tiers", "Free-session rewards"],
    category: "Loyalty",
    layer: "B",
    priceLabel: "S$29/mo",
    points: 170,
    icon: "Trophy",
    status: "soon",
  },

  // ---- Operations add-ons ----
  {
    key: "staff_seats",
    name: "Staff Seats",
    tagline: "Add employees and cleaners as your team grows.",
    unlocks: ["Add unlimited staff", "Per-seat access", "Roles & permissions"],
    category: "Operations",
    layer: "A",
    priceLabel: "+S$9/seat",
    points: 120,
    icon: "Users",
    status: "soon",
  },
  {
    key: "time_clock",
    name: "Time Clock",
    tagline: "Staff clock in / out per job, with automatic timesheets.",
    unlocks: ["Time-in / time-out", "Per-job hours", "Weekly timesheets"],
    category: "Operations",
    layer: "A",
    priceLabel: "S$15/mo",
    points: 110,
    icon: "Clock",
    status: "soon",
  },
  {
    key: "job_photos",
    name: "Job Photos",
    tagline: "Helpers upload before/after photos as proof of work.",
    unlocks: ["Before/after uploads", "Photo proof on jobs", "Share with customer"],
    category: "Operations",
    layer: "A",
    priceLabel: "S$15/mo",
    points: 110,
    icon: "Camera",
    status: "soon",
  },
];

export function getModule(key: string): ModuleDef | undefined {
  return MODULES.find((m) => m.key === key);
}

export const CATEGORY_ORDER: ModuleCategory[] = [
  "Foundation",
  "Payments",
  "Loyalty",
  "Operations",
];

// ---- Gamification: growth levels driven by total unlocked points ----------

export interface GrowthLevel {
  name: string;
  min: number; // minimum total points to reach this level
}

export const LEVELS: GrowthLevel[] = [
  { name: "Seedling", min: 0 },
  { name: "Sprout", min: 120 },
  { name: "Growing", min: 300 },
  { name: "Established", min: 520 },
  { name: "Scaling", min: 800 },
  { name: "Powerhouse", min: 1100 },
];

export interface GrowthProgress {
  points: number;
  level: GrowthLevel;
  nextLevel: GrowthLevel | null;
  pointsToNext: number;
  pctToNext: number; // 0..100 progress within the current level band
}

export function computeProgress(points: number): GrowthProgress {
  let level = LEVELS[0];
  let nextLevel: GrowthLevel | null = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].min) {
      level = LEVELS[i];
      nextLevel = LEVELS[i + 1] ?? null;
    }
  }
  const span = nextLevel ? nextLevel.min - level.min : 1;
  const into = points - level.min;
  return {
    points,
    level,
    nextLevel,
    pointsToNext: nextLevel ? Math.max(0, nextLevel.min - points) : 0,
    pctToNext: nextLevel ? Math.min(100, Math.round((into / span) * 100)) : 100,
  };
}
