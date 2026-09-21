/**
 * Tests for rate disclosure.
 *
 * Each case mirrors a real venue record whose wording the classifier has to get
 * right. Getting one wrong means either leaking a rate a venue asked us never
 * to publish, or withholding a rate we are free to quote.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import {
  classifyRate,
  handlingNote,
  redact,
  venueVisibleTo,
} from "../../lib/venues/disclosure";
import type { Venue } from "../../lib/venues/types";

async function fixture(name: string): Promise<Venue> {
  const raw = await readFile(
    path.join(process.cwd(), "data", "fixtures", `${name}.json`),
    "utf8",
  );
  return JSON.parse(raw) as Venue;
}

test("a venue-wide 'never publish' instruction makes every rate confidential", async () => {
  const venue = await fixture("confidential-hotel");

  for (const rate of venue.rates) {
    assert.equal(classifyRate(rate, venue), "confidential");
  }

  const view = redact(venue, "customer");
  assert.equal(view.rates.length, 0, "no rate may reach a customer");
  assert.equal(view.withheld?.count, 2);
  assert.equal(view.contact, undefined, "contacts are internal only");
});

test("'partner rate is not shown' hides the partner rate but keeps the public card", async () => {
  const venue = await fixture("partner-club");
  const [partner, publicCard] = venue.rates;

  assert.equal(classifyRate(partner, venue), "confidential");
  assert.equal(
    classifyRate(publicCard, venue),
    "public",
    "an explicit PUBLIC label outranks the 'non-member' wording",
  );

  const view = redact(venue, "customer");
  assert.equal(view.rates.length, 1);
  assert.match(view.rates[0].room, /PUBLIC/);
  assert.equal(view.withheld?.count, 1);
});

test("a partner rate with no non-disclosure ask is 'partner', still internal only", async () => {
  const venue = await fixture("partner-venue");
  const [partner, publicRate] = venue.rates;

  assert.equal(classifyRate(partner, venue), "partner");
  assert.equal(classifyRate(publicRate, venue), "public");

  const view = redact(venue, "customer");
  assert.equal(view.rates.length, 1);
  assert.match(view.rates[0].rate, /5,555/);
});

test("a negotiated marker in the rate string is caught, not just in the room name", async () => {
  const venue = await fixture("affiliate-hall");
  const [affiliate, plain] = venue.rates;

  assert.match(affiliate.rate, /AFFILIATE/);
  assert.doesNotMatch(affiliate.room, /AFFILIATE/);
  assert.equal(
    classifyRate(affiliate, venue),
    "partner",
    "AFFILIATE appears only in the rate string",
  );
  assert.equal(classifyRate(plain, venue), "public");
});

test("a NOT ALLOWED venue never reaches a customer", async () => {
  const venue = await fixture("blocked-club");

  assert.equal(venueVisibleTo(venue, "customer"), false);
  assert.equal(venueVisibleTo(venue, "internal"), true);
  assert.match(handlingNote(venue) ?? "", /never propose or quote/i);
});

test("the internal audience keeps contacts and every rate", async () => {
  const venue = await fixture("confidential-hotel");
  const view = redact(venue, "internal");

  assert.equal(view.rates.length, venue.rates.length);
  assert.equal(view.contact, venue.contact);
  assert.equal(view.withheld, undefined);
  for (const rate of view.rates) {
    assert.equal(rate.disclosure, "confidential", "classification is still attached");
  }
});

test("an ordinary public rate stays quotable", async () => {
  const venue = await fixture("temple-hall");

  assert.equal(classifyRate(venue.rates[0], venue), "public");
  assert.equal(redact(venue, "customer").rates.length, 1);
});

test("a negotiated rate written as '$4,000 (list $5,000)' is not treated as public", () => {
  // Venues write a negotiated offer against the rack rate this way. Matching
  // "list" would classify our own negotiated figure as the public one.
  const venue = {
    catering_policy: "Partner rates under the Alangkaar agreement.",
  };
  const rate = {
    room: "Rooms 1+2, PARTNER",
    rate: "$4,000 (list $5,000)",
    notes: "offer of 15 Sep 2026",
  };

  assert.equal(classifyRate(rate, venue), "partner");
});

test("handling notes name the constraint for each status", async () => {
  assert.match(
    handlingNote(await fixture("confidential-hotel")) ?? "",
    /never publish/i,
  );
  assert.match(handlingNote(await fixture("partner-club")) ?? "", /'from' price/i);
  assert.equal(handlingNote(await fixture("temple-hall")), null);
});
