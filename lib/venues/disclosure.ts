/**
 * Disclosure classification and redaction.
 *
 * Some venue rates may not be shown to customers. Three real cases drive this:
 *
 *   - Pan Pacific's catering policy reads "CONFIDENTIAL planner-exclusive
 *     rates: never publish".
 *   - Sembawang's reads "They prefer the partner rate is not shown; a 'from'
 *     price or our package price is fine."
 *   - HAUS217 bills us a partner rate of $3,600 against a public rate of
 *     $5,000, and only when HAUS217 bills us.
 *
 * Venue contacts are personal data (names, direct emails, mobile numbers) and
 * never leave the internal audience.
 *
 * Everything here fails closed: when a signal is ambiguous, the more
 * restrictive classification wins.
 */

import type {
  Audience,
  Disclosure,
  RedactedVenue,
  Rate,
  Venue,
} from "./types";

/**
 * A venue-wide confidentiality instruction, e.g. Pan Pacific's "never publish".
 * Checked against `catering_policy`, which is where venues' own wording lands.
 */
const VENUE_CONFIDENTIAL = /\bconfidential\b|\bnever publish\b|\bdo not publish\b/i;

/**
 * A venue asking that its negotiated rate specifically is not shown, while the
 * venue itself stays quotable — Sembawang's case.
 */
const VENUE_PARTNER_RATE_HIDDEN =
  /partner rate is not shown|rate is not to be shown|not shown to (?:the )?(?:client|customer|couple)/i;

/** A rate line that is a negotiated or membership rate rather than rack rate. */
const RATE_NEGOTIATED = /\b(partner|affiliate|member|corporate|trade|nett\s*to\s*us)\b/i;

/**
 * A rate line explicitly marked as the public or rack rate.
 *
 * Deliberately excludes "list": venues write negotiated offers as
 * "$4,000 (list $5,000)", where the quoted figure is ours and the list figure
 * is the public one. Matching "list" there would classify the negotiated rate
 * as public, which is backwards.
 */
const RATE_PUBLIC = /\b(public|non-member|rack|walk-?in)\b/i;

/**
 * Classify a single rate line for a venue.
 *
 * Order matters. A venue-wide confidentiality instruction outranks anything the
 * individual rate line says, because the instruction came from the venue's
 * contract rather than from our own labelling.
 */
export function classifyRate(
  rate: Pick<Rate, "room" | "notes" | "rate">,
  venue: Pick<Venue, "catering_policy">,
): Disclosure {
  if (VENUE_CONFIDENTIAL.test(venue.catering_policy)) return "confidential";

  // The negotiated marker is not always in the room name. HomeTeamNS writes
  // "AFFILIATE 4h $7,412 off-peak / …" into the rate string itself, so all
  // three free-text fields are searched.
  const line = `${rate.room} ${rate.rate} ${rate.notes}`;

  // An explicit "public"/"non-member" label wins over the negotiated pattern,
  // so "Banquet Hall, PUBLIC non-member card (reference)" is not caught by the
  // `member` branch of RATE_NEGOTIATED.
  if (RATE_PUBLIC.test(line)) return "public";
  if (RATE_NEGOTIATED.test(line)) {
    return VENUE_PARTNER_RATE_HIDDEN.test(venue.catering_policy)
      ? "confidential"
      : "partner";
  }

  return "public";
}

/** Attach a `disclosure` to every rate on a venue. */
export function classifyVenue(venue: Venue): Venue {
  return {
    ...venue,
    rates: venue.rates.map((r) => ({ ...r, disclosure: classifyRate(r, venue) })),
  };
}

/** Whether a rate may be shown to the given audience. */
export function rateVisibleTo(disclosure: Disclosure, audience: Audience): boolean {
  if (audience === "internal") return true;
  return disclosure === "public";
}

/**
 * Whether a venue may be surfaced at all.
 *
 * `NOT ALLOWED` venues are kept in the dataset — their rate sheets are useful
 * internal reference — but must never reach a customer-facing answer.
 */
export function venueVisibleTo(venue: Venue, audience: Audience): boolean {
  if (audience === "internal") return true;
  return venue.status !== "NOT ALLOWED";
}

/**
 * Strip everything the given audience may not see.
 *
 * For `internal` this is a pass-through that still guarantees rates carry their
 * classification, so a caller always knows what it is holding.
 */
export function redact(venue: Venue, audience: Audience): RedactedVenue {
  const classified = classifyVenue(venue);

  if (audience === "internal") return classified;

  const visible = classified.rates.filter((r) => rateVisibleTo(r.disclosure, audience));
  const withheldCount = classified.rates.length - visible.length;

  const { contact: _contact, ...rest } = classified;

  return {
    ...rest,
    rates: visible,
    ...(withheldCount > 0
      ? {
          withheld: {
            count: withheldCount,
            reason:
              "Negotiated or confidential rates are withheld from customer-facing " +
              "answers. Quote the public rate, a 'from' price, or the Alangkaar " +
              "package price instead.",
          },
        }
      : {}),
  };
}

/**
 * A one-line handling note for a venue, so a model that receives the data knows
 * how to treat it without having to infer anything.
 */
export function handlingNote(venue: Venue): string | null {
  if (VENUE_CONFIDENTIAL.test(venue.catering_policy)) {
    return (
      `${venue.name} rates are contractually confidential — never publish them, ` +
      `and do not put the venue in direct contact with the couple.`
    );
  }
  if (VENUE_PARTNER_RATE_HIDDEN.test(venue.catering_policy)) {
    return (
      `${venue.name} asked that the partner rate is not shown. Quote a 'from' ` +
      `price or the Alangkaar package price.`
    );
  }
  if (venue.status === "NOT ALLOWED") {
    return `${venue.name} is NOT ALLOWED — never propose or quote it.`;
  }
  if (venue.status === "PENDING") {
    return `${venue.name} is PENDING — not confirmed, so do not promise it.`;
  }
  if (venue.status === "CONDITIONAL") {
    return `${venue.name} is CONDITIONAL — check the venue README before quoting.`;
  }
  return null;
}
