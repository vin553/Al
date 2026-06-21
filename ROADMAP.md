# Product & Monetization Roadmap

## Pricing & packaging

- **Base plan — "Operations Suite": S$999/mo**, includes up to **10 users**, then
  **+S$49 / extra user / mo**. Covers the day-to-day: booking, scheduling,
  customers, cleaners, dispatch, notifications, Google Calendar sync, payments
  tracking, and the live dashboard.
- **Add-on modules** are sold **sales-led**: each locked module on the Grow page
  CTAs to a **strategy call** (https://cal.com/vin-mesh-exyqwy/30min). Module
  prices shown in-app are indicative and finalised on the call.
- Later, enabling a module is automated via Stripe (Layer A billing). Until then,
  modules are switched on per account after the call (entitlement engine).



This captures the vision for turning the booking app into a **modular,
gamified platform** you sell to cleaning businesses, where features unlock in
stages and every unlock is connected to sales.

---

## The two paywalls (keep these separate)

Almost every idea below belongs to one of two layers. They use Stripe
differently and must not be mixed.

### Layer A — You → your client (your revenue)
A **paywall inside the app**. Your client subscribes and unlocks **modules** in
stages as their business grows (gamified: "grow → unlock the next tool").
- Stripe **Billing** (subscriptions + add-ons) on **your** Stripe account.
- This is also the "stops working if they stop paying" kill-switch, generalized:
  each module is an entitlement that's on or off.
- "Connected to sales" = unlocking a module starts a Stripe Checkout / upgrades
  their plan.

### Layer B — Your client → their customers (their revenue)
Tools your client uses to **charge and engage their own customers**.
- Needs your client to connect **their own** Stripe (via Stripe **Connect**), so
  money flows to *them*, not you.
- Examples: QR/instant pay, saved cards for repeat billing, memberships,
  loyalty tokens / free sessions.

---

## The foundation (build first)

Everything plugs into a small **entitlement engine**:

- A **module registry** — each feature is a module with a key, name, tier, price,
  and "what it unlocks".
- An **entitlements store** — which modules/tiers a workspace currently has.
- A gate helper — `hasModule("instant_pay")` — used to show/lock features.
- A **gamified "Grow / Upgrade" page** — shows all modules as locked/unlocked
  cards with progress, teasers, and an "Unlock" CTA. Manual unlock at first (so
  we can demo), then each CTA wires to Stripe ("connect to sales").

Build this once; then every add-on below is just a new module that plugs in.

---

## Module catalog (mapped to your ideas)

### Foundation
- **M0 · Entitlement engine + Grow page** *(Layer A)* — the gamified paywall itself.
- **M1 · Connect Stripe** *(Layer B)* — client links their Stripe (Stripe Connect).
  Unlocks all payment modules.

### Payments (Layer B)
- **M2 · Instant Pay (QR / link)** — generate a Stripe payment link + QR per
  booking; staff sends it, customer pays on the spot.
- **M3 · Card on file** — collect & tokenize a customer's card for repeat /
  automatic billing of future jobs.
- **M4 · Memberships** — recurring plans your client sells to their customers
  (e.g. "4 cleans/month").

### Loyalty / gamification for end-customers (Layer B)
- **M5 · Tokens & tiers** — customers earn points per booking, climb levels, and
  redeem rewards like **free cleaning sessions**. Configurable earn/redeem rules.

### Operations (mostly Layer A add-ons)
- **M6 · Staff seats** — add employees/cleaners; seat-based add-on that scales
  with the team.
- **M7 · Time clock** — staff time-in / time-out per job (and timesheets).
- **M8 · Job photos** — helpers upload before/after photos as proof of work.

---

## Suggested phasing

1. **Phase 0 — Ship the core app live** (already built; just deploy).
2. **Phase 1 — M0 foundation**: entitlement engine + gamified Grow page, modules
   unlockable manually. Demo-ready, no Stripe yet.
3. **Phase 2 — Connect to sales**: wire module unlocks + the base subscription to
   Stripe (Layer A). This is the money switch.
4. **Phase 3 — First flagship revenue module** (pick one): e.g. M2 Instant Pay or
   M5 Loyalty — the "wow" add-on to upsell.
5. **Phase 4+** — add remaining modules one at a time; each is independent.

Rule of thumb: **foundation → sales wiring → one flagship module → expand.**
