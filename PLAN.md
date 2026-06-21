# May Myanmar Cleaning Services — Build Plan

## Goal
A presentable internal app for a part-time cleaning agency: staff book hourly jobs
on a calendar, assign a cleaner, set the amount, email the customer, and management
sees utilisation, revenue, and outstanding payments.

## Status: demo-ready, seeded with real data

Built:
- [x] Data model + SQLite store (cleaners, customers, jobs)
- [x] Imported the agency's real May + June schedule (6 cleaners, ~68 customers,
      380 jobs) into `data/jobs.seed.json`
- [x] Hourly pricing model (S$17/hr default, editable per job)
- [x] Dashboard: revenue (today/week/30d), utilisation, outstanding, revenue by cleaner
- [x] Weekly booking calendar, colour-coded by cleaner, click-to-book
- [x] New-booking flow with hours-based auto-pricing + double-booking guard
- [x] Customer confirmation email: compose, preview, send (+ mailto fallback)
- [x] WhatsApp/SMS confirmation: pre-filled wa.me + sms links, send tracked per job
- [x] Jobs list with job-status + payment-status management and email status
- [x] Cleaners roster with per-cleaner utilisation; Customers ranked by revenue

## Awaiting from client
- [ ] Cleaner phone numbers and confirmed weekly working schedules (`lib/seed-data.ts`)
- [ ] Customer email addresses (so confirmations can actually be sent)
- [ ] Confirmation the S$17/hour rate is correct (or per-customer rates)

## Possible next steps
- [ ] Automatic/unattended sending: Twilio or WhatsApp Business API (today it's
      click-to-send via the staff member's own WhatsApp), plus an email provider
- [ ] Staff login / roles
- [ ] Monthly spreadsheet import button (drop in the next month's schedule)
- [ ] Payment capture (Stripe) and invoicing
- [ ] Auto-suggest the least-utilised available cleaner when booking
