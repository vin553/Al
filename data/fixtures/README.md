# Venue fixtures

Synthetic venues used by the tests and by the MCP server when no Google Drive
credentials are configured.

**Every figure and contact in here is invented.** Real venue data lives only in
the Google Drive venue master folder and is read at request time — see
`lib/venues/source.ts`.

That is deliberate. Several real venues carry contractual confidentiality terms
("never publish"), and the real records carry venue staff names, direct emails
and mobile numbers. None of that belongs in version control.

Each fixture reproduces one pattern the disclosure logic has to get right:

| Fixture | Pattern it covers |
|---|---|
| `confidential-hotel.json` | Venue-wide "never publish" instruction — every rate is confidential |
| `partner-club.json` | Venue asked that the partner rate is not shown, but publishes a public card |
| `partner-venue.json` | Partner rate alongside a public rate, no non-disclosure ask |
| `affiliate-hall.json` | Negotiated marker appears in the rate string, not the room name |
| `blocked-club.json` | `NOT ALLOWED` — must never reach a customer-facing answer |
| `temple-hall.json` | Ordinary public rates, vegetarian temple |
