# Studio booking (iPlus Living, Piccadilly Grand)

Books the condo **Studio** on the iPlus web portal (app.iplusliving.com) for unit #20-16.
Everything goes through one command, `./studio`, run from this folder.

## Everyday use

```bash
./studio status                      # what's booked + free Studio sessions next Saturday
./studio status 2026-10-17           # same, for any date
./studio try 2026-10-17 morning      # dry run: goes to the confirm step, books nothing
./studio book 2026-10-17 morning     # real booking, one attempt
./studio book                        # real booking, next Saturday evening (the default)
./studio last                        # last scheduled-run log
```

Sessions: `morning` = 9am–3pm, `evening` = 4pm–10pm (the default).
`status` never books anything, so it is always safe to run.

**After any booking, pay within 72 hours.** The script prints a `PAY BY` line with the exact
time. Pay the booking fee (S$21.80) and deposit (S$200) by PayNow (QR code in the app's
Documents section) or at the management office. The Payment page says "3 working days",
but the portal cancels an unpaid booking exactly 72 hours after it was made.

## The weekly automatic booking

A scheduled cloud job runs every **Sunday 10:00 Singapore time** and books next Saturday
evening. It needs no computer of yours to be on. It sends you a notification with the result:
the booking code and the pay-by time, or why it did not book.

It reads two environment variables, which you set once in the cloud environment's settings
(environment menu in the session's title bar, then Edit):

| Variable | Value |
|---|---|
| `IPLUS_USERNAME` | your iPlus login email |
| `IPLUS_PASSWORD` | your iPlus password |

Turn it off, or change its day or time, under Routines on claude.ai (it is named
"Studio booking - Sunday 10:00"). To book the morning session instead, ask Claude to change
the routine's command to `./studio book morning`.

**Optional, instead of the cloud job: run it on your Mac.** One-time setup, then switch on:

```bash
./studio setup              # installs Python packages + browser, creates .env
# put IPLUS_USERNAME and IPLUS_PASSWORD in .env
./studio schedule on        # Sundays 10:00 (Mac on Singapore time, awake, logged in)
./studio schedule off       # remove it
```

Use only one of the two, or both will try to book. The second would be refused by the
one-booking guard, so this is noisy rather than harmful.

## Guards (hard-coded)

| Guard | Behaviour |
|---|---|
| 72 hours | Refuses if the session starts less than 72 h from now. No browser is opened. |
| One booking | If any Studio booking is already active (pending, awaiting fee or confirmed, from today on), it prints it and stops. It never cancels anything. |
| Dry run | `try` stops at the confirm step. Only `book` submits. |
| No retries | One attempt per run. Any unexpected page saves a screenshot to `logs/` and stops. |
| CAPTCHA | Stops if a visible CAPTCHA appears. No bypass. |
| Portal says no | Stops if the date is greyed out, fully booked, or the session is taken. |

## Portal facts worth knowing

- Bookings open up to 4 weeks ahead. Today and the next 3 days are greyed out.
- Submit only holds the slot for 5 minutes on a Payment page. The script ticks Manual Payment
  (PayNow) for fee and deposit, accepts the payment terms and confirms. That creates the booking.
- The condo terms say one Studio session per unit per calendar month. The portal does not
  strictly enforce it: in October 2026 the unit holds two confirmed sessions (3 and 10 Oct).
  The script's own rule is stricter: never more than one active booking at a time.
- Cancellations must be made at least 1 week before the booked date (condo rule).

Every selector and page step is documented in `FLOW.md`.

## Files

| File | Purpose |
|---|---|
| `studio` | The one command (status, try, book, last, setup, schedule) |
| `book_studio.py` | The booking script behind it |
| `FLOW.md` | The portal's page flow, selectors and rules, as discovered on 2026-09-19 |
| `run.sh` | Entry point for the optional Mac/Linux schedule, logs to `logs/YYYY-MM-DD.txt` |
| `scheduling/` | launchd plist and crontab line used by `./studio schedule on` |
| `.env.example` | Credential template for `.env` (git-ignored, never committed) |
| `CLIENT_DIRECTIONS.md` | Ready-to-send directions for clients meeting Vin at the Studio |

The original discovery helper (`discover.py`) was removed once the flow was documented.
It is in git history if the portal ever changes and the flow needs re-recording.
