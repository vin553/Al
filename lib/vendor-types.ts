export type Service =
  | "planning"
  | "coordination"
  | "decor"
  | "mandap"
  | "photography"
  | "videography"
  | "catering"
  | "floral"
  | "bridal-makeup"
  | "henna"
  | "outfits"
  | "pre-wedding-shoot"
  | "destination"
  | "entertainment"
  | "bridal-car"
  | "cake"
  | "invites";

export const ALL_SERVICES: Service[] = [
  "planning",
  "coordination",
  "decor",
  "mandap",
  "photography",
  "videography",
  "catering",
  "floral",
  "bridal-makeup",
  "henna",
  "outfits",
  "pre-wedding-shoot",
  "destination",
  "entertainment",
  "bridal-car",
  "cake",
  "invites",
];

export type PricingTier = "entry" | "mid" | "premium" | "luxury";

export interface PricingRow {
  tier: PricingTier;
  label: string;
  perPaxSgd?: [number, number];
  packageSgd?: [number, number];
}

export interface SourceRef {
  url: string;
  note: string;
}

export interface Vendor {
  slug: string;
  name: string;
  tagline: string;
  foundedYear: number | null;
  url?: string;
  instagramHandle?: string;
  instagramFollowers: number;
  googleRating: number;
  googleReviews: number;
  services: Service[];
  pricing: PricingRow[];
  dataConfidence: "verified" | "partial" | "estimated";
  sources: SourceRef[];
  updatedAt: string;
}

export interface MarketContext {
  countryIso: string;
  segment: string;
  typicalBudgetSgd: [number, number];
  note: string;
}

export interface VendorDataset {
  collectedAt: string;
  marketContext: MarketContext;
  vendors: Vendor[];
}

/** Normalized score 0–10 based on how many service verticals a vendor covers. */
export function serviceBreadthScore(v: Pick<Vendor, "services">): number {
  const max = ALL_SERVICES.length;
  return Math.round((v.services.length / max) * 100) / 10;
}

/** Median package starting price in SGD. Used for positioning scatter. */
export function medianPackagePriceSgd(v: Pick<Vendor, "pricing">): number {
  const all: number[] = [];
  for (const row of v.pricing) {
    if (row.packageSgd) all.push((row.packageSgd[0] + row.packageSgd[1]) / 2);
    if (row.perPaxSgd) all.push(((row.perPaxSgd[0] + row.perPaxSgd[1]) / 2) * 150); // assume 150 pax
  }
  if (!all.length) return 0;
  const sorted = [...all].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Min per-pax price across tiers (or null if vendor has no per-pax pricing). */
export function minPerPaxSgd(v: Pick<Vendor, "pricing">): number | null {
  const perPax = v.pricing
    .filter((p) => !!p.perPaxSgd)
    .map((p) => p.perPaxSgd![0]);
  return perPax.length ? Math.min(...perPax) : null;
}

/** Min package price across tiers (or null). */
export function minPackageSgd(v: Pick<Vendor, "pricing">): number | null {
  const pkg = v.pricing
    .filter((p) => !!p.packageSgd)
    .map((p) => p.packageSgd![0]);
  return pkg.length ? Math.min(...pkg) : null;
}
