# Mei Myanmar Cleaning Services — Build Plan

## Goal
A presentable internal app for a part-time cleaning agency (8–10 cleaners): staff
book jobs on a calendar, choose a package, set the amount, email the customer, and
management sees utilisation and revenue.

## Status: MVP complete (demo-ready)

Built:
- [x] Data model + SQLite store (cleaners, packages, customers, bookings)
- [x] Seeded placeholder data: cleaners A–J, 5 packages, ~3 weeks of sample jobs
- [x] Dashboard: revenue (today/week/30d), utilisation, package mix, upcoming jobs
- [x] Weekly booking calendar, colour-coded, click-to-book, cleaner filter
- [x] New-booking flow with package auto-pricing + double-booking guard
- [x] Customer confirmation email: compose, preview, send (+ mailto fallback)
- [x] Bookings list with status management and email status
- [x] Cleaners roster with per-cleaner utilisation; Packages with demand stats

## Awaiting from client (drops into `lib/seed-data.ts`)
- [ ] Real cleaner names, phone numbers, and weekly working schedules
- [ ] Final package names, prices, durations, and crew sizes
- [ ] Business contact details for the confirmation emails

## Possible next steps
- [ ] Wire a real email provider (Resend/SendGrid/SMTP) for automatic sending
- [ ] Staff login / roles
- [ ] Customer-facing self-service booking page
- [ ] Payment capture (Stripe) and invoicing
- [ ] Auto-suggest the least-utilised available cleaner when booking
