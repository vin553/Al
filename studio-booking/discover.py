#!/usr/bin/env python3
"""discover.py - Step 0 helper. Opens iPlus in a HEADED browser with the persistent profile.

You log in (password or OTP - nothing is typed by this script), then click through
facility booking -> studio room -> pick a date -> pick a slot, and stop BEFORE confirming.
Every page you land on is saved to logs/discovery/ (screenshot + HTML + URL) and a
Playwright trace is written, so the selectors can be read off afterwards and copied
into FLOW.md and PORTAL in book_studio.py. Close the browser window when finished.
"""
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
load_dotenv(HERE / ".env")
OUT = HERE / "logs" / "discovery"
OUT.mkdir(parents=True, exist_ok=True)


def main() -> int:
    url = os.getenv("IPLUS_URL", "").strip()
    if not url:
        print("Set IPLUS_URL in studio-booking/.env first (copy .env.example).")
        return 2
    visited: list[str] = []

    def capture(page):
        n = len(visited) + 1
        visited.append(page.url)
        stem = OUT / f"{n:02d}"
        try:
            page.wait_for_load_state("networkidle", timeout=10_000)
        except Exception:
            pass
        page.screenshot(path=f"{stem}.png", full_page=True)
        Path(f"{stem}.html").write_text(page.content(), encoding="utf-8")
        print(f"  [{n:02d}] {page.url}")

    with sync_playwright() as pw:
        ctx = pw.chromium.launch_persistent_context(str(HERE / "profile"), headless=False,
                                                    viewport={"width": 1280, "height": 900})
        ctx.tracing.start(screenshots=True, snapshots=True)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.on("framenavigated", lambda f: capture(page) if f == page.main_frame else None)
        page.goto(url)
        print("Browser open. Log in, go to facility booking -> studio room, choose a date and a slot,\n"
              "stop before the confirm button. Press 'Resume' in the Inspector when done, then close.")
        page.pause()  # Playwright Inspector: use 'Pick locator' to read selectors
        try:
            capture(page)
            ctx.tracing.stop(path=str(OUT / "trace.zip"))
            ctx.close()
        except Exception:
            pass
    (OUT / "visited.txt").write_text("\n".join(visited) + "\n")
    print(f"\nSaved {len(visited)} pages to {OUT}. Trace: {OUT/'trace.zip'} "
          f"(open with: playwright show-trace {OUT/'trace.zip'}). {datetime.now():%H:%M}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
