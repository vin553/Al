# Singapore Luxury Wedding Market Intelligence Platform — PLAN

_Living plan document. All assumptions stated up-front. No questions back to the user._

## Assumptions

1. **Vendors chosen (6).** Four named by user + two picked by me:
   1. **Alangkaar** — alangkaar.com.sg (market leader, 28 yrs, most public data)
   2. **Divine Bride** — Indian/South Asian wedding boutique presence in SG
   3. **Rasa Weddings** — boutique Indian wedding planner in SG
   4. **1-Stop Wedding** — full-service packager in SG
   5. **8 Asthas** — 8asthas.com (premium, Race Course Rd, SG)
   6. **KM Wedding Services** — kmwedding.com.sg (pioneer since 1996)

2. **Data fidelity.** Public data on the hardest-to-find vendors (Divine Bride / Rasa / 1-Stop) is sparse. For each vendor record I store a `data_confidence` field (`verified`, `partial`, `estimated`) and a `sources[]` array of URLs that backed the numbers. Nothing is invented without provenance.

3. **Credentials.** No `ANTHROPIC_API_KEY` or `VERCEL_TOKEN` in the sandbox env. The app therefore:
   - Generates SWOTs via Anthropic when `ANTHROPIC_API_KEY` is set; otherwise falls back to a pre-generated, disk-cached SWOT per vendor (honest — the cache is prebuilt from deterministic heuristics and clearly labelled as `provider: "offline-heuristic"`).
   - Documents Vercel deploy steps in the README but does not auto-deploy; the branch is pushed and deploy is a one-command follow-up.

4. **Stack.**
   - Next.js 14 App Router + TypeScript strict + Tailwind + shadcn/ui (handwritten, not CLI-generated, to keep offline install working).
   - SQLite via `better-sqlite3` for persistent vendor state; a JSON seed is the source of truth.
   - Recharts for the heatmap and positioning scatter (one chart lib, consistent styling).
   - `@react-pdf/renderer` for PDF export.
   - Framer Motion for page & card transitions.
   - Playwright for E2E.

5. **"One-command setup"** = `pnpm i && pnpm dev`. `pnpm refresh` re-runs research → writes JSON → re-seeds SQLite. `pnpm test:e2e` runs Playwright.

6. **Design bar.** Linear/Vercel-esque: neutral palette, dense-but-calm typography (Inter), dark-first, generous whitespace, subtle motion, no gradients-for-gradient's-sake. Every view has loading skeletons + empty states.

## Architecture

```
apps/web (Next.js)
 ├─ app/
 │   ├─ layout.tsx              // root shell, theme provider, nav
 │   ├─ page.tsx                // Dashboard (KPI cards)
 │   ├─ compare/page.tsx        // Comparison matrix
 │   ├─ pricing/page.tsx        // Heatmap
 │   ├─ positioning/page.tsx    // Scatter 2D
 │   ├─ vendor/[slug]/page.tsx  // SWOT + detail
 │   └─ api/
 │        ├─ vendors/route.ts   // list/get from SQLite
 │        ├─ swot/route.ts      // Anthropic-backed w/ cache fallback
 │        └─ export-pdf/route.ts// streams a PDF
 ├─ components/ui/…             // shadcn primitives (Button, Card, …)
 ├─ components/charts/…         // Heatmap, Scatter, KPIs
 ├─ lib/db.ts                   // better-sqlite3 accessor
 ├─ lib/vendor-types.ts         // typed model
 ├─ data/vendors.seed.json      // research output, committed
 ├─ scripts/refresh.ts          // `pnpm refresh`
 └─ tests/e2e/…                 // Playwright specs
```

## Data model (summary)

```ts
type Vendor = {
  slug: string
  name: string
  tagline: string
  foundedYear: number | null
  services: Service[]                  // ["planning","decor","photography",…]
  pricing: { tier: "entry"|"mid"|"premium"|"luxury"; perPaxSgd?: [number,number]; packageSgd?: [number,number]; label: string }[]
  instagramFollowers: number
  instagramHandle?: string
  googleRating: number                 // 0–5
  googleReviews: number
  serviceBreadth: number               // derived 0–10, services.length-weighted
  url?: string
  dataConfidence: "verified"|"partial"|"estimated"
  sources: { url: string; note: string }[]
  updatedAt: string                    // ISO
}
```

## Execution order

1. PLAN.md + repo hygiene (.gitignore, LICENSE).
2. Research → commit `data/vendors.seed.json`.
3. Scaffold Next.js app (handwritten package.json + tsconfig + tailwind, no `create-next-app` to stay hermetic).
4. Shell: layout, nav, theme, shadcn primitives, KPI cards, skeletons.
5. Comparison matrix (sort/filter).
6. Pricing heatmap.
7. Positioning scatter.
8. Vendor detail + SWOT (Anthropic w/ fallback).
9. PDF export.
10. Refresh agent.
11. Playwright tests, fix red.
12. Screenshots → README.
13. Push branch.

## What I can't do (and why)

- **Scrape Instagram/Google live.** Instagram is login-walled and serves an SPA; Google Business profile needs Places API. The refresh agent therefore does a best-effort `fetch` of each vendor's public site + structured-data extraction, stamps `updatedAt`, and leaves follower/review metrics from the last manual check — with a `TODO(scraping)` marker in the code explaining the path to upgrade (Places API + IG oEmbed) when keys are provided.
- **Auto-deploy to Vercel.** No token. README documents `vercel --prod`.

End of plan.
