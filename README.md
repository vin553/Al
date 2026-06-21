# May Myanmar Cleaning Services — Booking & Operations Console

An internal web app for a part-time cleaning agency. Service staff book jobs on a
calendar, set the hours and amount, assign a cleaner, and email the customer a
confirmation — while management sees live **revenue**, **outstanding payments**,
and **cleaner utilisation**.

> Seeded with the agency's **real May + June schedule** — 6 cleaners, ~68 customers,
> and 380 jobs — imported from the source spreadsheets into `data/jobs.seed.json`.

## What it does

- **Dashboard** (`/`) — revenue today / this week / last 30 days, team utilisation,
  outstanding (unpaid) amount, revenue-by-cleaner mix, and upcoming jobs.
- **Calendar** (`/calendar`) — week-at-a-glance schedule, colour-coded by cleaner,
  filterable. Click any empty slot to start a booking pre-filled with that day/time.
- **New booking flow** — pick (or create) a customer, set the date / start time /
  **hours** (amount auto-fills at the hourly rate and stays editable), assign a
  cleaner, set payment status, then **send the customer a confirmation email**.
  Double-bookings for the same cleaner are blocked.
- **Jobs** (`/bookings`) — searchable list; filter by job/payment status, mark jobs
  complete, mark payments received, see who has been emailed.
- **Cleaners** (`/cleaners`) — roster with weekly availability and each cleaner's
  utilisation, job count, and revenue for the week.
- **Customers** (`/customers`) — every client ranked by revenue, with outstanding
  balance and last job date.

## Pricing model

Jobs are priced **by the hour** (default **S$17/hour**, set in `lib/seed-data.ts`
as `COMPANY.hourlyRate`). The amount auto-fills as `hours × rate` and staff can
override it on any booking. The imported history is valued the same way.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind · Recharts · better-sqlite3.
Data lives in a local SQLite file (`data/cleaning.db`), auto-created and seeded
from `data/jobs.seed.json` on first run.

## Run locally

```bash
pnpm install      # builds the better-sqlite3 native binding
pnpm dev          # http://localhost:3000
```

Other scripts: `pnpm build` / `pnpm start` (production), `pnpm typecheck`.
To reset the data, delete `data/cleaning.db*` and restart — it reseeds.

## Deploy a shareable link

The repo includes a `render.yaml` blueprint for a near one-click deploy to
[Render](https://render.com) (free tier). See **[DEPLOY.md](DEPLOY.md)** for the
step-by-step. In short: Render → New + → Blueprint → connect `vin553/Al` → Apply,
and you get a public URL in a few minutes.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/vin553/Al/tree/claude/magical-pasteur-d84lsc)

## Customising for the client

- **Cleaners** — names, phone numbers, and weekly availability are in
  `SEED_CLEANERS` (`lib/seed-data.ts`).
- **Hourly rate / company details** — `COMPANY` in the same file.
- **Jobs & customers** — `data/jobs.seed.json`, regenerated from the monthly
  schedule spreadsheets. New jobs entered in the app are stored in SQLite.

## Customer confirmations (WhatsApp / SMS / email)

After a booking is created, staff can send the customer a confirmation:

- **WhatsApp (primary)** — the message is pre-composed and a **Send via WhatsApp**
  button opens `wa.me/<number>` with the text ready to send. No API keys needed; it
  uses the staff member's own WhatsApp. Phone numbers are auto-normalised to the
  Singapore `+65` format. An **SMS** fallback link (`sms:`) is provided too.
- **Email** — fully composed and previewed; **Send confirmation** records the send
  with an "Open in mail app" (`mailto:`) fallback. Imported customers have phone
  numbers but no email yet, so the email panel prompts to add one.

The app tracks, per job, whether a WhatsApp/SMS and/or email confirmation was sent.
To send WhatsApp/SMS automatically (unattended), plug in a provider such as Twilio
or the WhatsApp Business API at `app/api/bookings/[id]/whatsapp/route.ts`; for email,
Resend / SendGrid / SMTP at `app/api/bookings/[id]/email/route.ts`.

## Screenshots

| Dashboard | Calendar |
| --- | --- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Calendar](docs/screenshots/calendar.png) |

| Jobs | Customers |
| --- | --- |
| ![Jobs](docs/screenshots/bookings.png) | ![Customers](docs/screenshots/customers.png) |

Booking confirmation with WhatsApp / SMS / email:

![Booking confirmation](docs/screenshots/booking-confirm.png)
