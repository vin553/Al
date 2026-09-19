# iPlus studio room — discovered booking flow

**Status: NOT YET DISCOVERED.** Fill this in from a `discover.py` run, then copy the
selectors into `PORTAL` in `book_studio.py` and set `DISCOVERY_DONE = True`.
Until then `book_studio.py` refuses to open the portal.

## 0. Access

| Item | Value |
|---|---|
| Login URL | https://app.iplusliving.com/site/login (linked from https://iplusliving.com; iplus.sg has no DNS record) |
| Login method | Web form shows **Username + Password**. Vin's SMS OTP is the mobile app's login; confirm on the Mac whether the web login adds an OTP step after the password. |
| Web portal exists? | **yes** (read-only check of the public login page on 2026-09-19) |
| CAPTCHA anywhere? | Login form: none seen. Sign-up form has a "confirm you are not a bot" checkbox. If it also appears on login or booking, the script stops. |

## 1. Login page

| Item | Selector / note |
|---|---|
| Username field | |
| Password field | |
| Submit button | |
| Element visible only when logged in (e.g. Logout link) | |

## 2. My bookings page

| Item | Selector / note |
|---|---|
| URL | |
| Element proving we are on this page | |
| One element per active/upcoming booking | |
| What the page shows when a booking exists (exact text) | |
| What it shows when there are none (exact text) | |

## 3. Studio room page

| Item | Selector / note |
|---|---|
| Path from home (menu clicks, in order) | |
| Direct URL (if any) | |
| Date picker type | text input (format: `DD/MM/YYYY`?) / calendar cell |
| Date input selector, or day-cell selector template | |
| Slot label as shown on the page: morning | e.g. `9am–3pm` |
| Slot label as shown on the page: evening | e.g. `4pm–10pm` |
| Slot button/radio selector: morning | |
| Slot button/radio selector: evening | |
| How far ahead bookings open | e.g. 14 days |
| Any minimum notice enforced by the portal | |

## 4. Confirm step

| Item | Selector / note |
|---|---|
| Final confirm button (the click that books) | |
| Any intermediate "Next"/"Review" buttons before it | |
| Success indicator after booking | |
| Booking reference element | |
| Screenshot of the confirm step | `logs/discovery/NN.png` |

## 5. Notes

- Anything unexpected (pop-ups, T&C checkboxes, payment step, quota message).
