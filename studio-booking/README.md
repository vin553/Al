# Studio room auto-booking (iPlus)

Books **one** weekly studio-room slot on the condo's iPlus resident portal using
Playwright with a persistent browser profile (log in once, stay logged in).

**Current status: Step 0 (discovery) is not done.** `book_studio.py` refuses to open the
portal until the selectors in `FLOW.md` are copied into `PORTAL` at the top of the script
and `DISCOVERY_DONE` is set to `True`. Everything else is built and tested against a
fake portal.

## What it does

`book_studio.py` opens iPlus in Chromium, checks "My bookings", goes to the studio room
page, selects the date and slot, screenshots the confirm step, and either stops there
(dry run, the default) or clicks confirm once and prints the booking reference.

Defaults: next Saturday, evening slot (4pm–10pm). Times are Asia/Singapore.

## Guards (hard-coded, cannot be turned off from the command line)

| Guard | Behaviour |
|---|---|
| 72 hours | Refuses if the slot starts less than 72 h from now. Exit code 2. |
| One booking | Reads "My bookings" first. If any active booking exists it prints it and exits 0. It never cancels anything. If that page cannot be read, it stops instead of assuming. |
| Dry run by default | Only `--confirm` clicks the final button. `--dry-run` overrides `--confirm` if both are given. |
| No retries | One attempt per run. Any unexpected page, timeout, or missing element saves a screenshot to `logs/`, prints the path, and exits 1. |
| CAPTCHA | If a reCAPTCHA, hCaptcha, or Turnstile widget appears, it stops and tells you. No bypass. |
| OTP | Never typed by the script. Log in once yourself with `--login`; the profile keeps the session. |

## Setup (on your Mac)

```bash
cd studio-booking
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env        # then fill in IPLUS_URL, IPLUS_USERNAME, IPLUS_AUTH
```

`.env`, `profile/` and `logs/` are git-ignored. Never commit them.

## Step 0: discovery (do this first, once)

```bash
python3 discover.py
```

A headed browser opens on the login URL with the Playwright Inspector beside it.
Log in yourself (password or OTP), go to facility booking, then studio room, choose a
date and a slot, and stop **before** the confirm button. Use the Inspector's
*Pick locator* to read selectors. Every page you visit is saved to `logs/discovery/`
as a screenshot and HTML, plus a trace you can replay with
`playwright show-trace logs/discovery/trace.zip`.

Then fill in `FLOW.md`, copy the selectors into `PORTAL` in `book_studio.py`, and set
`DISCOVERY_DONE = True`. If iPlus turns out to be app-only with no web portal, stop
here; the app and its API are out of scope.

## Run manually

```bash
python3 book_studio.py --login                       # once: log in (OTP ok), save session
python3 book_studio.py                               # dry run, next Saturday evening
python3 book_studio.py --date 2026-10-03 --slot morning   # dry run, specific date/slot
python3 book_studio.py --confirm                     # actually book
```

Every run prints a timestamped log line per step and the path of each screenshot.

## Change the slot or day

- Slot: pass `--slot morning` or `--slot evening`. For the scheduled job, add the flag in
  `run.sh` on the `book_studio.py --confirm` line.
- Day: the default is next Saturday, computed in `next_saturday()` in `book_studio.py`.
  Change the `5` (Monday=0) to another weekday, or pass `--date` for a one-off.
- Slot hours: the `SLOTS` table at the top of `book_studio.py` holds the start hour and label.

## Schedule (every Sunday 10:00 Asia/Singapore)

`run.sh` runs one `--confirm` attempt and appends everything to `logs/YYYY-MM-DD.txt`.

**macOS (launchd)**

```bash
DIR="$(pwd)"   # run from inside studio-booking
sed "s|__STUDIO_DIR__|$DIR|g" scheduling/com.alangkaar.studio-booking.plist \
  > ~/Library/LaunchAgents/com.alangkaar.studio-booking.plist
launchctl load ~/Library/LaunchAgents/com.alangkaar.studio-booking.plist
launchctl list | grep studio-booking        # should show the label
```

launchd fires on the Mac's local clock, so keep the Mac's time zone on Singapore. The
Mac must be awake and logged in at 10:00 on Sunday (Energy Saver, or `caffeinate`), and
the job opens a visible browser window in your session.

**Linux (cron)**: paste `scheduling/crontab.txt` into `crontab -e` after replacing the path.

**Check the last log**

```bash
ls -t logs/*.txt | head -1 | xargs tail -n 30
```

Look for `BOOKED`, `EXISTING BOOKING FOUND`, `REFUSED`, `STOPPED`, or `ERROR`.
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
| `book_studio.py` | The booking script (about 210 lines) |
| `discover.py` | Step 0 helper: headed browser, records pages and a trace |
| `FLOW.md` | The discovered page flow and selectors (template until Step 0) |
| `run.sh` | Scheduler wrapper, writes `logs/YYYY-MM-DD.txt` |
| `scheduling/` | launchd plist and crontab line |
| `.env.example` | Credential template; copy to `.env` |
