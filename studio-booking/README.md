# Studio auto-booking (iPlus Living, Piccadilly Grand)

Books **one** Studio session on the condo's iPlus web portal (app.iplusliving.com) with
Playwright. Default target: next Saturday, evening session (4pm–10pm), Singapore time.

The exact page flow and selectors are in `FLOW.md` (discovered 2026-09-19 on the live portal).

## What it does

1. Opens the login page, dismisses the "session expired" popup, logs in with username + password.
2. Reads Booking History for upcoming bookings. Any active **Studio** booking stops the run.
3. Opens Studio → Book Slot, moves the calendar to the target month, clicks the date, clicks the
   session button, and checks the start/end fields filled in.
4. Screenshots the confirm step. In dry-run mode it stops here.
5. With `--confirm` it clicks **Submit** once. That opens a Payment page with a 5-minute hold.
   The script ticks *Manual Payment (PayNow)* for the booking fee and for the deposit, ticks
   the payment terms, clicks **Proceed**, then re-reads Booking History and prints the booking
   code, status and fee due dates.

## Read this before turning it on

- **Payment is manual.** Proceed creates a *Pending Approval* booking with PayNow (manual)
  selected. You must pay the booking fee (S$21.80) and deposit (S$200) by PayNow or at the
  management office within 3 working days, or the portal cancels it ("cancelled by system due
  to unpaid booking fee"). To use DBS PayLah! for the deposit instead, change `pay_boxes` in
  `book_studio.py`; PayLah opens an online gateway the script does not complete.
- **Portal rule: one Studio session per unit per calendar month.** A weekly schedule will be
  rejected by the portal after the first booking each month. The script reports the portal's
  message and exits; it never retries.
- **Bookings open 4 weeks ahead**, and the portal greys out today plus the next 3 days.
- **Cancellations** must be made at least 1 week before the booked date (condo rule).

## Guards (hard-coded, cannot be turned off from the command line)

| Guard | Behaviour |
|---|---|
| 72 hours | Refuses if the session starts less than 72 h from now. Exit 2. No browser is opened. |
| One booking | Reads Booking History (all statuses, upcoming dates). If an active Studio booking exists it prints it and exits 0. It never cancels anything. Other facilities' bookings are printed as info only. If the list cannot be read, it stops instead of assuming. |
| Dry run by default | Only `--confirm` clicks Submit. `--dry-run` overrides `--confirm` if both are given. |
| No retries | One attempt per run. Any unexpected page, timeout, or missing element saves a screenshot to `logs/`, prints the path, and exits 1. |
| CAPTCHA | Stops if a *visible* reCAPTCHA, hCaptcha, or Turnstile widget appears. (The hidden one inside the Sign Up form is ignored.) |
| Unbookable date | Stops if the portal marks the date unavailable, or the session button is missing, or the start/end fields did not fill in. |

## Setup

```bash
cd studio-booking
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env        # fill in IPLUS_USERNAME and IPLUS_PASSWORD
```

`.env`, `profile/` and `logs/` are git-ignored. Never commit them.

## Run manually

```bash
python3 book_studio.py --login                            # just log in and check the credentials
python3 book_studio.py                                    # dry run, next Saturday evening
python3 book_studio.py --date 2026-10-03 --slot morning   # dry run, specific date/slot
python3 book_studio.py --confirm                          # actually book
```

Each run prints one timestamped line per step and the path of every screenshot.
`--headless` hides the browser window (used by the scheduler).

## Change the slot or day

- Session: `--slot morning` (9am–3pm) or `--slot evening` (4pm–10pm). For the scheduled job,
  add the flag on the `book_studio.py --confirm` line in `run.sh`.
- Day: the default is next Saturday, computed in `next_saturday()` in `book_studio.py`.
  Change the `5` (Monday = 0) for another weekday, or pass `--date` for a one-off.
- Session hours live in the `SLOTS` table at the top of `book_studio.py`.

## Schedule (every Sunday 10:00 Asia/Singapore)

`run.sh` runs one `--confirm --headless` attempt and appends to `logs/YYYY-MM-DD.txt`.

**macOS (launchd)**

```bash
DIR="$(pwd)"   # run from inside studio-booking
sed "s|__STUDIO_DIR__|$DIR|g" scheduling/com.alangkaar.studio-booking.plist \
  > ~/Library/LaunchAgents/com.alangkaar.studio-booking.plist
launchctl load ~/Library/LaunchAgents/com.alangkaar.studio-booking.plist
launchctl list | grep studio-booking        # should show the label
```

launchd fires on the Mac's local clock, so keep the Mac's time zone on Singapore, awake and
logged in at 10:00 on Sunday (Energy Saver, or `caffeinate`).

**Linux (cron)**: paste `scheduling/crontab.txt` into `crontab -e` after replacing the path.

**Check the last log**

```bash
ls -t logs/*.txt | head -1 | xargs tail -n 30
```

Look for `BOOKED`, `EXISTING STUDIO BOOKING FOUND`, `REFUSED`, `STOPPED`, `DRY RUN` or `ERROR`.
Screenshots from that run sit next to it in `logs/` with the same date prefix.

**Turn it off**

```bash
launchctl unload ~/Library/LaunchAgents/com.alangkaar.studio-booking.plist   # macOS
crontab -e   # Linux: delete the run.sh line
```

To remove it completely on macOS, also delete the plist from `~/Library/LaunchAgents`.

## Files

| File | Purpose |
|---|---|
| `book_studio.py` | The booking script (about 220 lines) |
| `discover.py` | Headed discovery helper; records every page and a trace (used for FLOW.md) |
| `FLOW.md` | The discovered page flow, selectors and portal rules |
| `run.sh` | Scheduler wrapper, writes `logs/YYYY-MM-DD.txt` |
| `scheduling/` | launchd plist and crontab line |
| `.env.example` | Credential template; copy to `.env` |
