/**
 * MCP tool definitions and handlers for the Alangkaar venue data.
 *
 * Transport-agnostic: `app/api/mcp/route.ts` serves these over Streamable HTTP
 * for remote clients (ChatGPT), and `scripts/mcp-stdio.ts` serves them over
 * stdio for a local Claude client.
 *
 * Tool descriptions carry the business conventions deliberately. They are the
 * only thing a fresh model sees before it decides how to use a number, so the
 * tax-notation rules live there rather than only in documentation.
 */

import { handlingNote, redact, venueVisibleTo } from "../venues/disclosure";
import { cacheStatus, loadVenues } from "../venues/source";
import { VENUE_STATUSES, type Audience, type Venue } from "../venues/types";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const AUDIENCE_PROPERTY = {
  audience: {
    type: "string",
    enum: ["customer", "internal"],
    description:
      "Who the answer is for. 'customer' (the default) withholds negotiated " +
      "and confidential rates, hides venue staff contacts, and excludes " +
      "NOT ALLOWED venues. Use 'internal' only for Alangkaar staff.",
  },
} as const;

const TAX_RULES =
  "Tax notation is verbatim from the venue and must be preserved when you " +
  "repeat a rate: 'nett' and 'nett nett' are final; '+ 9% GST' means add GST; " +
  "'++' means add BOTH 10% service charge AND 9% GST (about +19.9% compounded); " +
  "'includes 9% GST' means GST is already in the figure. Never present a '++' " +
  "rate as a final price.";

export const TOOLS: ToolDefinition[] = [
  {
    name: "list_venues",
    description:
      "List Alangkaar's Singapore wedding venues with their status, capacity " +
      "and headline rate. Use this first for any 'which venue' question. " +
      "Status meanings: ALLOWED = quote freely; CONDITIONAL = conditions " +
      "apply, check the venue before quoting; PENDING = not confirmed, do not " +
      "promise it; NOT ALLOWED = never propose or quote; VEGETARIAN TEMPLE = " +
      "temple venue, vegetarian catering only. " +
      TAX_RULES,
    inputSchema: {
      type: "object",
      properties: {
        ...AUDIENCE_PROPERTY,
        status: {
          type: "string",
          enum: [...VENUE_STATUSES],
          description: "Only return venues with this status.",
        },
        min_capacity: {
          type: "number",
          description: "Only venues with at least one room seating this many guests.",
        },
        max_rental_per_guest: {
          type: "number",
          description:
            "Only venues whose rental-per-guest figure is at or below this. " +
            "That figure is venue rental divided by max seats — a comparison " +
            "aid only, never a quotable per-head price.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_venue",
    description:
      "Full detail for one venue: every rate line, what the rental includes, " +
      "terms, rules, add-ons, photo and document filenames, and the open data " +
      "gaps. Look the venue up by its id (e.g. 'panpacific') or by name. " +
      TAX_RULES,
    inputSchema: {
      type: "object",
      properties: {
        ...AUDIENCE_PROPERTY,
        venue: {
          type: "string",
          description: "Venue id or a substring of its name.",
        },
      },
      required: ["venue"],
      additionalProperties: false,
    },
  },
  {
    name: "search_venues",
    description:
      "Free-text search across venue names, addresses, terms, inclusions and " +
      "catering policies. Use when the question is about a feature rather than " +
      "a name — for example 'which venues allow a fire ceremony', 'pillarless " +
      "ballroom', or 'outside caterer welcome'.",
    inputSchema: {
      type: "object",
      properties: {
        ...AUDIENCE_PROPERTY,
        query: { type: "string", description: "Words to look for." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "pricing_notation",
    description:
      "Explain how to read Alangkaar's rate notation and venue status " +
      "vocabulary. Call this before doing any arithmetic on a rate, or when " +
      "unsure whether a figure is final.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "health",
    description:
      "Report where the venue data is currently being read from and how fresh " +
      "it is. Useful when a rate looks wrong or out of date.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

function parseAudience(raw: unknown): Audience {
  // Anything other than an explicit "internal" falls back to the safe audience.
  return raw === "internal" ? "internal" : "customer";
}

function maxCapacity(venue: Venue): number | null {
  const caps = venue.rates.map((r) => r.capacity).filter((c): c is number => c !== null);
  return caps.length ? Math.max(...caps) : null;
}

function headlineRate(venue: Venue, audience: Audience): string {
  const view = redact(venue, audience);
  const first = view.rates[0];
  if (!first) {
    return view.withheld?.count
      ? "withheld — negotiated or confidential"
      : "not on file";
  }
  return `${first.rate} ${first.tax}`.trim();
}

function match(venue: Venue, needle: string): boolean {
  const hay = [
    venue.id,
    venue.name,
    venue.address,
    venue.terms,
    venue.catering_policy,
    venue.fire_ceremony,
    ...venue.includes,
    ...venue.rules,
    ...venue.rates.map((r) => `${r.room} ${r.notes}`),
  ]
    .join(" ")
    .toLowerCase();
  return needle
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

export interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

function text(value: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const audience = parseAudience(args.audience);

  switch (name) {
    case "pricing_notation":
      return text({
        tax_basis: {
          nett: "Final. Nothing further to add.",
          "nett nett": "Final, emphatically. Nothing further to add.",
          "+ 9% GST": "Add 9% GST to the figure shown.",
          "++": "Add 10% service charge AND 9% GST. Compounded, about +19.9%.",
          "includes 9% GST": "GST is already in the figure. Do not add it again.",
        },
        worked_example: {
          rate: "$20,000",
          tax: "++ (10% service + 9% GST)",
          calculation: "20000 × 1.10 × 1.09",
          final: 23980,
          note: "Reading this as final understates by $3,980.",
        },
        status: {
          ALLOWED: "We can work here. Quote freely.",
          CONDITIONAL: "Conditions apply. Check the venue before quoting.",
          PENDING: "Not confirmed. Do not promise this venue.",
          "NOT ALLOWED": "Never quote or propose.",
          "VEGETARIAN TEMPLE":
            "Temple venue, vegetarian catering only. Fire ceremony permitted.",
        },
        rules: [
          "Never invent or interpolate a rate. If it is not on file, say so.",
          "'RATE WITH VIN' and 'NOT ON FILE' mean the rate is deliberately absent — ask Vin.",
          "'Not asked' under fire ceremony means unknown, not permitted.",
          "rental_per_guest_all_in is a comparison aid, not a quotable per-head price.",
        ],
      });

    case "health": {
      const status = cacheStatus();
      return text({
        ...status,
        ageMinutes: status.ageMs === null ? null : Math.round(status.ageMs / 60000),
        note:
          status.source === "fixtures"
            ? "Serving synthetic fixtures — no Drive credentials configured. " +
              "Figures are not real."
            : "Serving live data from the Google Drive venue master folder.",
      });
    }

    case "list_venues": {
      const all = await loadVenues();
      const minCapacity = typeof args.min_capacity === "number" ? args.min_capacity : null;
      const maxPerGuest =
        typeof args.max_rental_per_guest === "number" ? args.max_rental_per_guest : null;

      const rows = all
        .filter((v) => venueVisibleTo(v, audience))
        .filter((v) => (args.status ? v.status === args.status : true))
        .filter((v) => {
          if (minCapacity === null) return true;
          const cap = maxCapacity(v);
          return cap !== null && cap >= minCapacity;
        })
        .filter((v) => {
          if (maxPerGuest === null) return true;
          return (
            v.rental_per_guest_all_in !== null && v.rental_per_guest_all_in <= maxPerGuest
          );
        })
        .map((v) => ({
          id: v.id,
          name: v.name,
          status: v.status,
          push_rank: v.push_rank,
          max_capacity: maxCapacity(v),
          headline_rate: headlineRate(v, audience),
          rental_per_guest_all_in: v.rental_per_guest_all_in,
          fire_ceremony: v.fire_ceremony,
          updated: v.updated,
          handling: handlingNote(v),
        }));

      return text({ audience, count: rows.length, venues: rows });
    }

    case "get_venue": {
      const needle = String(args.venue ?? "").trim();
      if (!needle) {
        return { content: [{ type: "text", text: "A venue id or name is required." }], isError: true };
      }

      const all = await loadVenues();
      const visible = all.filter((v) => venueVisibleTo(v, audience));
      const found =
        visible.find((v) => v.id.toLowerCase() === needle.toLowerCase()) ??
        visible.find((v) => v.name.toLowerCase().includes(needle.toLowerCase()));

      if (!found) {
        const blocked = all.find(
          (v) =>
            v.id.toLowerCase() === needle.toLowerCase() ||
            v.name.toLowerCase().includes(needle.toLowerCase()),
        );
        if (blocked) {
          return text({
            error: "withheld",
            venue: blocked.name,
            status: blocked.status,
            handling: handlingNote(blocked),
          });
        }
        return text({ error: "not_found", searched: needle });
      }

      return text({
        audience,
        handling: handlingNote(found),
        venue: redact(found, audience),
      });
    }

    case "search_venues": {
      const query = String(args.query ?? "").trim();
      if (!query) {
        return { content: [{ type: "text", text: "A query is required." }], isError: true };
      }

      const all = await loadVenues();
      const hits = all
        .filter((v) => venueVisibleTo(v, audience))
        .filter((v) => match(v, query))
        .map((v) => ({
          id: v.id,
          name: v.name,
          status: v.status,
          max_capacity: maxCapacity(v),
          headline_rate: headlineRate(v, audience),
          fire_ceremony: v.fire_ceremony,
          handling: handlingNote(v),
        }));

      return text({ audience, query, count: hits.length, venues: hits });
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}
