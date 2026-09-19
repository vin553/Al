#!/usr/bin/env python3
"""book_studio.py - book the condo Studio on iPlus (app.iplusliving.com). One slot, one attempt, no retries.

Guards (hard-coded, not configurable from the CLI):
  a) refuses if the slot starts < 72 h from now
  b) refuses if an active Studio booking already exists (prints it, never cancels it)
  c) --dry-run is the default; Submit and the Payment page's Proceed only happen with --confirm
  d) any unexpected page or error -> screenshot to ./logs, print path, exit 1
Selectors come from FLOW.md (discovered 2026-09-19).
"""
import argparse
import json
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
SLOTS = {"morning": (9, 15, "9am-3pm"), "evening": (16, 22, "4pm-10pm")}
BASE = os.getenv("IPLUS_BASE", "https://app.iplusliving.com")
STUDIO_ID = "9acefacd-7661-11f0-b5f8-06f0d5b3a6c5"  # the Studio's amenity id on iPlus (FLOW.md)
ACTIVE = {"Pending Approval", "Booking Confirmed", "Awaiting Booking Fee", "Awaiting Deposit"}
P = {  # portal map, see FLOW.md
    "login_url": BASE + "/site/login", "user": "#user-username", "pass": "#user-password",
    "login_btn": "input[name='login-button']", "modal_ok": "button.button-fill-primary-large:visible",
    "logged_in": "button.btnLogout", "bookings_api": BASE + "/amenity/amenitiesbokking",
    "book_url": BASE + f"/amenity/amenitybooking?amenity={STUDIO_ID}", "cal_title": "#calendar h2",
    "cal_next": "button.fc-next-button", "day": "td.fc-day-number[data-date='{iso}']",
    "slot": ".amenitydayslot .bookingSlot[data-link-start='{start}']", "start": "#bookingStartTime",
    "end": "#bookingEndTime", "submit": "#submit-button", "rows": "table.list-view-table tbody tr",
    "pay_boxes": ["dynamicmodel-ismanual", "dynamicmodel-isdepositebymanual", "dynamicmodel-termsandconditions"],
    "proceed": "a.btnpaymentsubmit", "proceed_yes": "#customConfirm button.confirm-ok",
}
CAPTCHA = ["iframe[src*='recaptcha']", "iframe[src*='hcaptcha']", "iframe[src*='turnstile']", ".g-recaptcha"]


class Stop(Exception):
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
    if start - now < MIN_LEAD:
        raise Stop(f"REFUSED: slot starts in {start - now} (< 72 h). Nothing was booked.", 2)


def check_captcha(page: Page) -> None:
    for sel in CAPTCHA:
        if page.locator(f"{sel}:visible").count():  # hidden widgets (sign-up form) are ignored
            raise Stop(f"STOPPED: CAPTCHA visible ({sel}). Not bypassing it. Screenshot: {snap(page, 'captcha')}")


def ensure_logged_in(page: Page) -> None:
    page.goto(P["login_url"], wait_until="domcontentloaded")
    if page.locator(P["user"]).count():
        try:  # "Your session has expired, please login again." popup, injected ~1 s after load
            page.locator(P["modal_ok"]).filter(has_text="Ok").first.click(timeout=4_000)
        except Exception:
            pass
        check_captcha(page)
        page.fill(P["user"], os.environ["IPLUS_USERNAME"])
        page.fill(P["pass"], os.environ["IPLUS_PASSWORD"])
        page.click(P["login_btn"])
        page.wait_for_url(lambda u: "/site/login" not in u, timeout=30_000)
        page.wait_for_load_state("networkidle")
    if not page.locator(P["logged_in"]).count():
        raise Stop(f"STOPPED: login did not succeed. Screenshot: {snap(page, 'login-failed')}")
    log("Logged in.")


def bookings(page: Page, day: date, amenity: str | None) -> list[list[str]]:
    """Rows of the Booking History list (the portal's own list endpoint), upcoming bookings only."""
    params = {"status": "", "fromfaclity": 1, "pageIndex": 1, "sort": "-created",
              "requestBookingStartTime": day.strftime("%d %b '%y"),
              "requestBookingEndTime": (day + timedelta(days=35)).strftime("%d %b '%y")}
    if amenity:
        params["amenityId"] = amenity
    data = json.loads(page.request.get(P["bookings_api"], params=params).text())
    if str(data.get("Status")) != "200":
        raise Stop(f"STOPPED: booking list returned status {data.get('Status')!r}; not proceeding.")
    tmp = page.context.new_page()
    tmp.set_content(data["html"])
    rows = [[" ".join(c.split()) for c in r.locator("td").all_inner_texts()] for r in tmp.locator(P["rows"]).all()]
    tmp.close()
    if not rows:
        raise Stop("STOPPED: booking list has no table; page layout may have changed. Not proceeding.")
    return [r for r in rows if len(r) >= 6]  # drops the "No result found" row


def guard_existing_booking(page: Page, today: date) -> None:
    others = [r for r in bookings(page, today, None) if r[5] in ACTIVE]
    for r in others:
        log(f"  info: other upcoming booking  {r[0]}  {r[1]}  {r[3]} - {r[4]}  [{r[5]}]")
    active = [r for r in bookings(page, today, STUDIO_ID) if r[5] in ACTIVE]
    if active:
        lines = "\n".join(f"  {r[0]}  {r[1]}  {r[3]} - {r[4]}  [{r[5]}]" for r in active)
        raise Stop(f"EXISTING STUDIO BOOKING FOUND - not booking, not cancelling:\n{lines}", 0)
    log("No active Studio booking found.")


def open_day(page: Page, day: date) -> None:
    page.goto(P["book_url"], wait_until="domcontentloaded")
    page.wait_for_selector(P["cal_title"])
    check_captcha(page)
    for _ in range(2):  # bookings open at most 4 weeks ahead, so at most one month forward
        if day.strftime("%B %Y") in page.locator(P["cal_title"]).inner_text():
            break
        page.click(P["cal_next"])
        page.wait_for_timeout(1500)
    cell = page.locator(P["day"].format(iso=day.isoformat()))
    cls = cell.get_attribute("class") or ""
    if "not_available" in cls or "grayColour" in cls:
        raise Stop(f"REFUSED: portal marks {day} as not bookable (class '{cls}'). Screenshot: {snap(page, 'day-unavailable')}")
    cell.click()
    page.wait_for_selector(".amenitydayslot .bookingSlot", timeout=15_000)


def book(page: Page, day: date, slot: str, confirm: bool) -> None:
    h0, h1, label = SLOTS[slot]
    start, end = f"{day} {h0:02d}:00:00", f"{day} {h1:02d}:00:00"
    open_day(page, day)
    button = page.locator(P["slot"].format(start=start))
    if not button.count():
        raise Stop(f"REFUSED: slot {label} on {day} is not offered. Screenshot: {snap(page, 'slot-missing')}")
    button.click()
    page.wait_for_timeout(1500)
    got = (page.locator(P["start"]).input_value(), page.locator(P["end"]).input_value())
    if got != (start, end):
        raise Stop(f"STOPPED: slot did not select (got {got}). Screenshot: {snap(page, 'slot-not-selected')}")
    log(f"At confirm step: {day} {label} ({start} to {end}). Screenshot: {snap(page, 'confirm-step')}")
    if not confirm:
        raise Stop("DRY RUN: stopped before the Submit button. Re-run with --confirm to book.", 0)
    page.click(P["submit"])  # the one and only booking attempt: Submit -> Payment page (5-minute hold)
    page.wait_for_url(lambda u: "/common/payment" in u, timeout=45_000)
    page.wait_for_load_state("networkidle")
    for box in P["pay_boxes"]:  # PayNow (manual) for fee and deposit, and the payment T&C, per Vin
        page.locator(f"label[for='{box}']").dispatch_event("click")  # styled labels fail Playwright's visibility check
        page.wait_for_timeout(500)
        if not page.locator(f"#{box}").is_checked():
            raise Stop(f"STOPPED: could not tick #{box} on the Payment page. Screenshot: {snap(page, 'payment-tick')}")
    log(f"Payment page: PayNow (manual) for fee and deposit ticked. Screenshot: {snap(page, 'payment-step')}")
    page.click(P["proceed"])
    page.click(P["proceed_yes"], timeout=15_000)  # "Are you sure you want to proceed the booking?" -> Yes
    page.wait_for_url(lambda u: "/common/payment" not in u, timeout=45_000)
    page.wait_for_timeout(2000)
    shot = snap(page, "after-submit")
    mine = [r for r in bookings(page, day, STUDIO_ID) if r[3].startswith(day.strftime("%d %b %y"))]
    if not mine:
        raise Stop(f"Submit clicked but no Studio booking for {day} appears in Booking History. Check {shot}")
    r = mine[0]
    log(f"BOOKED  date={day}  slot={label}  reference={r[0]}  status={r[5]}  fee-due={r[6]}  deposit-due={r[7]}  screenshot={shot}")
    log("Pay the booking fee (S$21.80) and deposit (S$200) by PayNow / at the management office within 3 working days.")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--date", type=date.fromisoformat, default=None, help="YYYY-MM-DD (default: next Saturday)")
    p.add_argument("--slot", choices=SLOTS, default="evening", help="morning=9am-3pm, evening=4pm-10pm")
    p.add_argument("--dry-run", action="store_true", help="stop before the Submit button (default)")
    p.add_argument("--confirm", action="store_true", help="actually click Submit")
    p.add_argument("--login", action="store_true", help="only log in to check the credentials, then exit")
    p.add_argument("--headless", action="store_true", help="no browser window (scheduled runs)")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    now = datetime.now(SGT)
    day = args.date or next_saturday(now.date())
    confirm = args.confirm and not args.dry_run
    log(f"Target: {day} ({day:%A}) {SLOTS[args.slot][2]}  mode={'CONFIRM' if confirm else 'DRY RUN'}")
    try:
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
                raise Stop("Login OK. Done.", 0)
            guard_existing_booking(page, now.date())
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
