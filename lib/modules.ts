// Module registry — the catalogue of features for the platform.
//
// This is both the product roadmap AND the in-app sales funnel: the Grow page
// renders these as the base plan + add-on modules. Add-on (locked) modules CTA
// to a sales call (SALES_CALL_URL); included modules ship with the base plan.

export type ModuleCategory =
  | "Foundation"
  | "Payments & Finance"
  | "Customer Growth"
  | "Field Operations"
  | "Team & HR"
  | "Insights";

export interface ModuleDef {
  key: string;
  name: string;
  tagline: string;
  unlocks: string[]; // what the client gets
  category: ModuleCategory;
  /** A = we bill the client, B = the client bills their own customers. */
  layer: "A" | "B";
  priceLabel: string; // e.g. "S$29/mo", "Included", "Talk to sales"
  points: number; // growth points awarded when enabled (gamification)
  icon: string; // lucide icon name (resolved in the UI)
  status: "live" | "soon"; // whether the underlying feature is built yet
  includedByDefault?: boolean; // ships with the base plan, always on
}

/** The base subscription every client starts on. */
export const PLAN = {
  name: "Operations Suite",
  price: "S$999",
  cadence: "/mo",
  includedUsers: 10,
  extraUser: "S$49 / extra user · mo",
  blurb:
    "Everything to run the day-to-day — booking, scheduling, customers, staff, payments tracking and the live dashboard. Add modules as you grow.",
};

/** Where add-on enquiries are routed (your booking calendar). */
export const SALES_CALL_URL = "https://cal.com/vin-mesh-exyqwy/30min";

export const MODULES: ModuleDef[] = [
  // ---------- Foundation (ships with the S$999 base plan) ----------
  {
    key: "core",
    name: "Booking & Operations Core",
    tagline: "Calendar, jobs, customers, cleaners, dispatch, and the live dashboard.",
    unlocks: ["Booking calendar & dispatch", "Job / customer / cleaner registers", "Revenue & utilisation dashboard"],
    category: "Foundation",
    layer: "A",
    priceLabel: "Included",
    points: 0,
    icon: "LayoutDashboard",
    status: "live",
    includedByDefault: true,
  },
  {
    key: "notifications",
    name: "Customer Notifications",
    tagline: "Send booking confirmations by email and WhatsApp in one tap.",
    unlocks: ["Email confirmations", "WhatsApp confirmations", "Pre-filled messages"],
    category: "Foundation",
    layer: "A",
    priceLabel: "Included",
    points: 40,
    icon: "MessageSquare",
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

  // ---------- Payments & Finance ----------
  {
    key: "stripe_connect",
    name: "Connect Stripe",
    tagline: "Link the client's own Stripe so customer payments land in their account.",
    unlocks: ["Stripe Connect onboarding", "Enables all payment modules"],
    category: "Payments & Finance",
    layer: "B",
    priceLabel: "Free to connect",
    points: 80,
    icon: "Plug",
    status: "soon",
  },
  {
    key: "instant_pay",
    name: "Instant Pay (QR / link)",
    tagline: "Generate a Stripe QR + link per booking so customers pay on the spot.",
    unlocks: ["Per-booking payment QR", "Shareable pay link", "Auto-mark paid"],
    category: "Payments & Finance",
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
    category: "Payments & Finance",
    layer: "B",
    priceLabel: "S$29/mo",
    points: 160,
    icon: "CreditCard",
    status: "soon",
  },
  {
    key: "invoicing",
    name: "Invoicing & GST Receipts",
    tagline: "Branded invoices and tax receipts, sent and tracked automatically.",
    unlocks: ["Branded invoices", "GST / tax receipts", "Auto payment reminders"],
    category: "Payments & Finance",
    layer: "B",
    priceLabel: "S$25/mo",
    points: 120,
    icon: "FileText",
    status: "soon",
  },
  {
    key: "payroll",
    name: "Cleaner Payroll & Commissions",
    tagline: "Pay cleaners by hours or commission, with payout summaries.",
    unlocks: ["Hours → pay calculation", "Commission rules", "Payout summaries"],
    category: "Payments & Finance",
    layer: "A",
    priceLabel: "S$39/mo",
    points: 150,
    icon: "Wallet",
    status: "soon",
  },
  {
    key: "accounting_sync",
    name: "Accounting Sync",
    tagline: "Push invoices and payments to Xero or QuickBooks automatically.",
    unlocks: ["Xero / QuickBooks sync", "No double entry", "Reconciliation-ready"],
    category: "Payments & Finance",
    layer: "A",
    priceLabel: "Talk to sales",
    points: 120,
    icon: "Calculator",
    status: "soon",
  },

  // ---------- Customer Growth ----------
  {
    key: "online_booking",
    name: "Online Booking Widget",
    tagline: "Let customers book on the client's own website 24/7.",
    unlocks: ["Embeddable booking page", "Live availability", "Instant confirmations"],
    category: "Customer Growth",
    layer: "B",
    priceLabel: "S$39/mo",
    points: 170,
    icon: "Globe",
    status: "soon",
  },
  {
    key: "customer_portal",
    name: "Customer Portal",
    tagline: "Customers self-serve: rebook, reschedule, view invoices and history.",
    unlocks: ["Self-serve rebooking", "Invoice history", "Saved addresses"],
    category: "Customer Growth",
    layer: "B",
    priceLabel: "S$29/mo",
    points: 140,
    icon: "UserCircle",
    status: "soon",
  },
  {
    key: "memberships",
    name: "Memberships",
    tagline: "Sell recurring plans to customers (e.g. 4 cleans / month).",
    unlocks: ["Recurring plans", "Auto-renew billing", "Member pricing"],
    category: "Customer Growth",
    layer: "B",
    priceLabel: "S$39/mo",
    points: 180,
    icon: "BadgeCheck",
    status: "soon",
  },
  {
    key: "loyalty_tokens",
    name: "Loyalty Tokens & Tiers",
    tagline: "Customers earn points, climb tiers, and redeem free cleaning sessions.",
    unlocks: ["Points per booking", "Customer tiers", "Free-session rewards"],
    category: "Customer Growth",
    layer: "B",
    priceLabel: "S$29/mo",
    points: 170,
    icon: "Trophy",
    status: "soon",
  },
  {
    key: "referrals",
    name: "Referral Program",
    tagline: "Turn happy customers into a referral engine with reward links.",
    unlocks: ["Personal referral links", "Reward tracking", "Auto-credit"],
    category: "Customer Growth",
    layer: "B",
    priceLabel: "S$19/mo",
    points: 110,
    icon: "Gift",
    status: "soon",
  },
  {
    key: "reviews",
    name: "Reviews & Reputation",
    tagline: "Auto-request reviews after each job and grow the client's Google rating.",
    unlocks: ["Post-job review asks", "Google review funnel", "Rating dashboard"],
    category: "Customer Growth",
    layer: "B",
    priceLabel: "S$19/mo",
    points: 110,
    icon: "Star",
    status: "soon",
  },
  {
    key: "marketing",
    name: "Email & SMS Campaigns",
    tagline: "Win-back, promos, and seasonal campaigns to the customer list.",
    unlocks: ["Email & SMS blasts", "Segments", "Win-back automations"],
    category: "Customer Growth",
    layer: "A",
    priceLabel: "Talk to sales",
    points: 120,
    icon: "Megaphone",
    status: "soon",
  },

  // ---------- Field Operations ----------
  {
    key: "recurring_jobs",
    name: "Recurring & Repeat Jobs",
    tagline: "Auto-schedule weekly / fortnightly cleans without re-entering anything.",
    unlocks: ["Recurring schedules", "Auto-generated jobs", "Bulk reschedule"],
    category: "Field Operations",
    layer: "A",
    priceLabel: "S$25/mo",
    points: 150,
    icon: "Repeat",
    status: "soon",
  },
  {
    key: "time_clock",
    name: "Time Clock",
    tagline: "Staff clock in / out per job (with GPS), and automatic timesheets.",
    unlocks: ["Time-in / time-out", "GPS check-in", "Weekly timesheets"],
    category: "Field Operations",
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
    category: "Field Operations",
    layer: "A",
    priceLabel: "S$15/mo",
    points: 110,
    icon: "Camera",
    status: "soon",
  },
  {
    key: "checklists",
    name: "Checklists & SOPs",
    tagline: "Standardise quality with per-job checklists the cleaner ticks off.",
    unlocks: ["Job checklists", "Quality SOPs", "Completion tracking"],
    category: "Field Operations",
    layer: "A",
    priceLabel: "S$15/mo",
    points: 100,
    icon: "ListChecks",
    status: "soon",
  },
  {
    key: "inventory",
    name: "Supplies & Inventory",
    tagline: "Track cleaning supplies and equipment so jobs never run short.",
    unlocks: ["Supply levels", "Low-stock alerts", "Per-job usage"],
    category: "Field Operations",
    layer: "A",
    priceLabel: "S$19/mo",
    points: 100,
    icon: "Package",
    status: "soon",
  },
  {
    key: "route_planning",
    name: "Route & Area Planning",
    tagline: "Group jobs by location to cut travel time and fit more in a day.",
    unlocks: ["Jobs by area", "Optimised order", "Travel-time aware"],
    category: "Field Operations",
    layer: "A",
    priceLabel: "S$25/mo",
    points: 120,
    icon: "MapPin",
    status: "soon",
  },

  // ---------- Team & HR ----------
  {
    key: "staff_seats",
    name: "Extra Staff Seats",
    tagline: "Add employees and cleaners beyond the included users as you grow.",
    unlocks: ["Add more users", "Per-seat access", "Roles & permissions"],
    category: "Team & HR",
    layer: "A",
    priceLabel: "+S$49/seat",
    points: 90,
    icon: "Users",
    status: "soon",
  },
  {
    key: "staff_app",
    name: "Cleaner Mobile App",
    tagline: "Cleaners see their jobs, routes, and tasks on their phone.",
    unlocks: ["Daily job list", "Tap-to-navigate", "Task updates on the go"],
    category: "Team & HR",
    layer: "A",
    priceLabel: "Talk to sales",
    points: 160,
    icon: "Smartphone",
    status: "soon",
  },
  {
    key: "scheduling",
    name: "Shift & Leave Management",
    tagline: "Plan shifts and manage staff availability and time off.",
    unlocks: ["Shift planning", "Leave requests", "Availability windows"],
    category: "Team & HR",
    layer: "A",
    priceLabel: "S$25/mo",
    points: 110,
    icon: "CalendarRange",
    status: "soon",
  },
  {
    key: "compliance",
    name: "Permits & Compliance",
    tagline: "Track work permits, certifications, and expiry reminders (MOM-ready).",
    unlocks: ["Work permit tracking", "Expiry reminders", "Document store"],
    category: "Team & HR",
    layer: "A",
    priceLabel: "Talk to sales",
    points: 120,
    icon: "ShieldCheck",
    status: "soon",
  },

  // ---------- Insights ----------
  {
    key: "analytics",
    name: "Advanced Analytics",
    tagline: "Forecasts, retention, and capacity planning beyond the core dashboard.",
    unlocks: ["Revenue forecasting", "Churn / retention", "Capacity planning"],
    category: "Insights",
    layer: "A",
    priceLabel: "S$49/mo",
    points: 150,
    icon: "BarChart3",
    status: "soon",
  },
  {
    key: "multi_location",
    name: "Multi-Branch",
    tagline: "Run several outlets or franchises from one account with rollups.",
    unlocks: ["Per-branch data", "Group rollup reports", "Branch permissions"],
    category: "Insights",
    layer: "A",
    priceLabel: "Talk to sales",
    points: 160,
    icon: "Building2",
    status: "soon",
  },
];

export function getModule(key: string): ModuleDef | undefined {
  return MODULES.find((m) => m.key === key);
}

export const CATEGORY_ORDER: ModuleCategory[] = [
  "Foundation",
  "Payments & Finance",
  "Customer Growth",
  "Field Operations",
  "Team & HR",
  "Insights",
];

// ---- Gamification: growth levels driven by total enabled points ----------

export interface GrowthLevel {
  name: string;
  min: number; // minimum total points to reach this level
}

export const LEVELS: GrowthLevel[] = [
  { name: "Seedling", min: 0 },
  { name: "Sprout", min: 200 },
  { name: "Growing", min: 500 },
  { name: "Established", min: 900 },
  { name: "Scaling", min: 1400 },
  { name: "Powerhouse", min: 2000 },
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
