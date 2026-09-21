/**
 * Types for the Alangkaar venue dataset.
 *
 * These mirror the `pricing.json` files that live in each venue folder of the
 * Google Drive venue master folder. Drive is the source of truth; nothing here
 * snapshots it.
 */

/** Whether Alangkaar may work at a venue. Drawn from the venue folder's INDEX row. */
export type VenueStatus =
  | "ALLOWED"
  | "CONDITIONAL"
  | "PENDING"
  | "NOT ALLOWED"
  | "VEGETARIAN TEMPLE";

export const VENUE_STATUSES: readonly VenueStatus[] = [
  "ALLOWED",
  "CONDITIONAL",
  "PENDING",
  "NOT ALLOWED",
  "VEGETARIAN TEMPLE",
] as const;

/**
 * How a quoted rate relates to tax and service charge. These strings come from
 * the venues themselves and are deliberately kept verbatim — reformatting them
 * has historically been where misquotes come from.
 */
export type TaxBasis = string;

/**
 * Who a rate may be shown to.
 *
 * - `public` — safe to quote to a customer.
 * - `partner` — negotiated rate under an Alangkaar agreement. Internal only;
 *   the venue may quote a different public rate.
 * - `confidential` — the venue has contractually asked that the rate is never
 *   published. Internal only, and flagged loudly.
 */
export type Disclosure = "public" | "partner" | "confidential";

export interface Rate {
  /** Room or line item, verbatim from the venue. */
  room: string;
  /** Seated capacity for this room, where known. */
  capacity: number | null;
  /** Rate string, verbatim. May encode several rates (weekday/weekend). */
  rate: string;
  /** Tax basis, verbatim: `nett`, `+ 9% GST`, `++ (10% service + 9% GST)`, … */
  tax: TaxBasis;
  notes: string;
  /** Derived, not stored in Drive. See `classifyRate`. */
  disclosure: Disclosure;
}

export interface Addon {
  /** Name. */
  n: string;
  /** Price in SGD. */
  p: number;
  /** Unit, e.g. `per guest`, `per table`. */
  u: string;
  /** Optional auto-apply hint, e.g. `perPax`. */
  auto?: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  map: string;
  status: VenueStatus;
  /** Priority ranking; 1 is pushed hardest. Null means not prioritised. */
  push_rank: number | null;
  catering_policy: string;
  /** Free text; `Not asked` means unknown, NOT permitted. */
  fire_ceremony: string;
  /** Venue staff contact. Personal data — never leaves the internal audience. */
  contact: string;
  rates: Rate[];
  /** Venue rental divided by max seats. A comparison aid, not a quotable price. */
  rental_per_guest_all_in: number | null;
  terms: string;
  includes: string[];
  rules: string[];
  addons: Addon[];
  links: string[];
  photos: string[];
  originals: string[];
  docs: string[];
  next_action: string;
  /** Date the venue folder was last reviewed, e.g. `19 Sep 2026`. */
  updated: string;
}

/**
 * Who is asking.
 *
 * `customer` is the safe default for any transport that is not proven to be
 * Vin or Alangkaar staff — notably the remote HTTP endpoint that ChatGPT and
 * other third-party assistants connect to.
 */
export type Audience = "customer" | "internal";

/** A venue with everything a `customer` audience may not see removed. */
export interface RedactedVenue extends Omit<Venue, "contact" | "rates"> {
  contact?: string;
  rates: Rate[];
  /** Set when one or more rates were withheld for this audience. */
  withheld?: {
    count: number;
    reason: string;
  };
}
