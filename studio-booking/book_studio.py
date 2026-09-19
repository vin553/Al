#!/usr/bin/env python3
"""book_studio.py - book the condo studio room on iPlus. One slot, one attempt, no retries.

Guards (hard-coded, not configurable from the CLI):
  a) refuses if the slot starts < 72 h from now
  b) refuses if an active booking already exists (prints it, never cancels it)
  c) --dry-run is the default; the final confirm click only happens with --confirm
  d) any unexpected page or error -> screenshot to ./logs, print path, exit 1
"""
import argparse
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from playwright.sync_api import Page, sync_playwright

HERE = Path(__file__).resolve().parent
load_dotenv(HERE / ".env")
SGT = ZoneInfo("Asia/Singapore")
LOGS, PROFILE = HERE / "logs", HERE / "profile"
MIN_LEAD = timedelta(hours=72)
SLOTS = {"morning": (9, "9am-3pm"), "evening": (16, "4pm-10pm")}
DISCOVERY_DONE = False  # flip to True only after FLOW.md is verified and PORTAL is filled in

# ---- Portal map. Every value comes from FLOW.md (Step 0). Placeholders are empty. ----
PORTAL = {
    "login_url": os.getenv("IPLUS_URL", ""),
    "login_user": "",            # selector: username field
    "login_pass": "",            # selector: password field (ignored for OTP)
    "login_submit": "",          # selector: login button
    "logged_in": "",             # selector visible only when logged in (e.g. logout link)
    "bookings_url": "",          # "My bookings" page
    "bookings_page": "",         # selector proving we are on the bookings page
    "active_rows": "",           # selector: one element per active/upcoming booking
    "studio_url": "",            # facility booking -> studio room page
    "date_mode": "input",        # "input" (type into a field) or "click" (calendar cell)
    "date_input": "",            # selector for the date field   (date_mode=input)
    "date_format": "%d/%m/%Y",   # strftime format the field expects (date_mode=input)
    "day_cell": "",              # selector template with {day}, {iso} (date_mode=click)
    "slot": {"morning": "", "evening": ""},  # selector per slot button/radio
    "confirm": "",               # the FINAL confirm button
    "success": "",               # selector visible after a successful booking
    "booking_ref": "",           # selector containing the booking reference (optional)
}
CAPTCHA_HINTS = ["iframe[src*='recaptcha']", "iframe[src*='hcaptcha']", "iframe[src*='turnstile']",
                 ".g-recaptcha", "#captcha", "input[name*='captcha']"]


class Stop(Exception):
    """Controlled stop: message is printed, exit code carried."""

    def __init__(self, msg: str, code: int = 1):
        super().__init__(msg)
        self.code = code


def log(msg: str) -> None:
    print(f"[{datetime.now(SGT):%Y-%m-%d %H:%M:%S}] {msg}", flush=True)


def snap(page: Page, tag: str) -> Path:
    LOGS.mkdir(exist_ok=True)
    path = LOGS / f"{datetime.now(SGT):%Y%m%d-%H%M%S}-{tag}.png"
    page.screenshot(path=str(path), full_page=True)
    return path


def next_saturday(today: date) -> date:
    return today + timedelta(days=(5 - today.weekday()) % 7 or 7)


def slot_start(day: date, slot: str) -> datetime:
    return datetime(day.year, day.month, day.day, SLOTS[slot][0], tzinfo=SGT)


def guard_lead_time(start: datetime, now: datetime) -> None:
    lead = start - now
    if lead < MIN_LEAD:
        raise Stop(f"REFUSED: slot starts in {lead} (< 72 h). Nothing was booked.", 2)


def guard_discovery() -> None:
    required = [k for k in ("login_url", "logged_in", "bookings_url", "bookings_page", "active_rows",
                            "studio_url", "confirm", "success") if not PORTAL[k]]
    if not DISCOVERY_DONE or required or not all(PORTAL["slot"].values()):
        raise Stop("REFUSED: Step 0 discovery not complete. Run discover.py, fill FLOW.md, then fill "
                   f"PORTAL in this file and set DISCOVERY_DONE = True. Missing: {required}", 2)


def check_captcha(page: Page) -> None:
    for sel in CAPTCHA_HINTS:
        if page.locator(sel).count():
            raise Stop(f"STOPPED: CAPTCHA detected ({sel}). Not attempting to bypass it. "
                       f"Screenshot: {snap(page, 'captcha')}")


def ensure_logged_in(page: Page) -> None:
    page.goto(PORTAL["login_url"], wait_until="domcontentloaded")
    check_captcha(page)
    if page.locator(PORTAL["logged_in"]).count():
        log("Already logged in (persistent profile).")
        return
    auth = os.getenv("IPLUS_AUTH", "otp").lower()
    if auth == "password":
        page.fill(PORTAL["login_user"], os.environ["IPLUS_USERNAME"])
        page.fill(PORTAL["login_pass"], os.environ["IPLUS_PASSWORD"])
        page.click(PORTAL["login_submit"])
    elif sys.stdin.isatty():
        log("OTP login: complete it in the browser window. Waiting up to 5 minutes...")
    else:
        raise Stop(f"STOPPED: not logged in and OTP needs a human. Run `python3 book_studio.py --login` "
                   f"once, interactively. Screenshot: {snap(page, 'login-needed')}")
    page.locator(PORTAL["logged_in"]).first.wait_for(timeout=300_000 if auth != "password" else 30_000)
    check_captcha(page)
    log("Logged in.")


def guard_existing_booking(page: Page) -> None:
    page.goto(PORTAL["bookings_url"], wait_until="networkidle")
    check_captcha(page)
    page.locator(PORTAL["bookings_page"]).first.wait_for(state="attached", timeout=15_000)  # fail closed
    rows = page.locator(PORTAL["active_rows"])
    if rows.count():
        details = " | ".join(" ".join(t.split()) for t in rows.all_inner_texts())
        snap(page, "existing-booking")
        raise Stop(f"EXISTING BOOKING FOUND - not booking, not cancelling:\n  {details}", 0)
    log("No active booking found.")


def select_date(page: Page, day: date) -> None:
    if PORTAL["date_mode"] == "input":
        page.fill(PORTAL["date_input"], day.strftime(PORTAL["date_format"]))
        page.keyboard.press("Enter")
    else:
        page.click(PORTAL["day_cell"].format(day=day.day, iso=day.isoformat()))


def book(page: Page, day: date, slot: str, confirm: bool) -> None:
    page.goto(PORTAL["studio_url"], wait_until="networkidle")
    check_captcha(page)
    select_date(page, day)
    page.click(PORTAL["slot"][slot])
    button = page.locator(PORTAL["confirm"]).first
    button.wait_for(timeout=15_000)
    shot = snap(page, "confirm-step")
    log(f"At confirm step for {day} {SLOTS[slot][1]}. Screenshot: {shot}")
    if not confirm:
        raise Stop("DRY RUN: stopped before the final confirm button. Re-run with --confirm to book.", 0)
    button.click()  # the one and only booking attempt
    page.locator(PORTAL["success"]).first.wait_for(timeout=30_000)
    ref = ""
    if PORTAL["booking_ref"] and page.locator(PORTAL["booking_ref"]).count():
        ref = " ".join(page.locator(PORTAL["booking_ref"]).first.inner_text().split())
    shot = snap(page, "booked")
    log(f"BOOKED  date={day}  slot={SLOTS[slot][1]}  reference={ref or 'n/a'}  screenshot={shot}")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--date", type=date.fromisoformat, default=None, help="YYYY-MM-DD (default: next Saturday)")
    p.add_argument("--slot", choices=SLOTS, default="evening", help="morning=9am-3pm, evening=4pm-10pm")
    p.add_argument("--dry-run", action="store_true", help="stop before the confirm button (default)")
    p.add_argument("--confirm", action="store_true", help="actually click the final confirm button")
    p.add_argument("--login", action="store_true", help="only open the portal and log in, then exit")
    p.add_argument("--headless", action="store_true", help="no browser window (scheduled runs only)")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    now = datetime.now(SGT)
    day = args.date or next_saturday(now.date())
    confirm = args.confirm and not args.dry_run
    log(f"Target: {day} ({day:%A}) {SLOTS[args.slot][1]}  mode={'CONFIRM' if confirm else 'DRY RUN'}")
    try:
        guard_discovery()
        if not args.login:
            guard_lead_time(slot_start(day, args.slot), now)
    except Stop as s:
        log(str(s))
        return s.code
    with sync_playwright() as pw:  # error handling stays inside so screenshots can still be taken
        page = None
        try:
            ctx = pw.chromium.launch_persistent_context(str(PROFILE), headless=args.headless,
                                                        viewport={"width": 1280, "height": 900})
            page = ctx.pages[0] if ctx.pages else ctx.new_page()
            page.set_default_timeout(20_000)
            ensure_logged_in(page)
            if args.login:
                raise Stop("Login saved to the persistent profile. Done.", 0)
            guard_existing_booking(page)
            book(page, day, args.slot, confirm)
            return 0
        except Stop as s:
            log(str(s))
            return s.code
        except Exception as e:  # unexpected page, timeout, selector miss: screenshot and stop, no retry
            where = snap(page, "error") if page else "no page"
            log(f"ERROR: {type(e).__name__}: {str(e).splitlines()[0]}\n  screenshot: {where}\n  Not retrying.")
            return 1


if __name__ == "__main__":
    sys.exit(main())
