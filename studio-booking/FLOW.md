# iPlus studio room — discovered booking flow

**Status: DISCOVERED on 2026-09-19** against the live portal, logged in as Vin, stopping before
the Submit button. Nothing was booked. Screenshots and saved HTML of every page are in
`logs/discovery/` (git-ignored, on the machine that ran discovery).

## 0. Access

| Item | Value |
|---|---|
| Portal | https://app.iplusliving.com (linked from iplusliving.com). `iplus.sg` has no DNS record. |
| Login URL | https://app.iplusliving.com/site/login |
| Login method | **Username + password** on the web. Vin's SMS OTP is the mobile app's login only. |
| Session persistence | The session cookie is **not** kept across browser restarts, and the login page shows a "Your session has expired, please login again." popup with an **Ok** button on the next visit. The script dismisses it and logs in with the password every run. |
| CAPTCHA | Login form: **none**. A reCAPTCHA v2 checkbox exists on the page but only inside the hidden Sign Up form. Booking form: **none**. The script still stops if a *visible* CAPTCHA widget ever appears. |
| Condo | Piccadilly Grand, Unit Block 05 #20-16 |

## 1. Login page (`/site/login`)

| Item | Selector |
|---|---|
| Username field | `#user-username` (`User[username]`) |
| Password field | `#user-password` (`User[password]`) |
| Submit button | `input[name='login-button']` (text "Login") |
| Expired-session popup | `button.button-fill-primary-large` with text "Ok" (appears about 1 s after load) |
| Logged-in marker | `button.btnLogout` (in the profile menu; present in the DOM once logged in) |
| After login | Redirects to `/` ("Wall"). Left menu: Service Request, **Facilities** (`/amenity/index`), Wall, Documents, Online Forms, Units, Polls, Visitors, Packages. |

## 2. Existing bookings

| Item | Value |
|---|---|
| Page | Facilities → **Booking History** tab (`a.wallTypeList` "Booking History") |
| Default filter | Status = "Approval / Fee / Deposit Collection" (value 99), which **hides confirmed bookings**. "View All Status" = empty value. |
| List endpoint the tab uses | `GET /amenity/amenitiesbokking?status=&fromfaclity=1&pageIndex=1&sort=-created` → JSON `{"Status":"200","html":"<table class=list-view-table>…"}`, 10 rows per page. Optional filters: `amenityId=<facility id>`, `requestBookingStartTime` / `requestBookingEndTime` in the format `19 Sep '26` (ISO dates are ignored). |
| Row columns | Booking code, Facility, Unit, Booking From, Booking Till, Status, Booking Fee Due Date, Deposit Due Date, Requested On, Facility Access Time, Remark, Unit Quota Skipped, Actions |
| Status values | Pending Approval (1), Booking Confirmed (2), Booking Rejected (3), Booking Cancelled (4), Awaiting Booking Fee (5), Awaiting Deposit (6), Complete (8), Deposit not Refunded (199) |
| Empty state | One row: `No result found` |
| Example active row | `SAB01515287 | Gourmet Grill Pavilion | #20-16 | 22 Sep 26 04:00 PM | 22 Sep 26 10:00 PM | Booking Confirmed | - | - | 15 Sep 26 06:36:24 AM | …` |
| Studio bookings on file | none (as of discovery) |
| Booking detail page | `/amenity/amenityaudittrial?booking=<id>` (booking number, slot, fees, payment transactions, status history) |

## 3. Studio room

| Item | Value |
|---|---|
| Facility list | `/amenity/index`, link text **Studio** → `/amenity/amenitiesdetail?amenity=9acefacd-7661-11f0-b5f8-06f0d5b3a6c5` |
| Studio id | `9acefacd-7661-11f0-b5f8-06f0d5b3a6c5` |
| Book Now | `a.book-btn` → `/amenity/amenitybooking?amenity=9acefacd-7661-11f0-b5f8-06f0d5b3a6c5` (page title "Studio", heading "Book Slot") |
| Fees shown | Booking fee S$21.80 flat (S$20 + GST, non-refundable), deposit S$200.00 (refundable) |
| Sessions | Session 1 **0900–1500**, Session 2 **1600–2200**, daily |
| How far ahead | Up to **4 weeks** in advance. Today and the next 3 days are greyed out (`css_not_available`/`grayColour`), so the portal itself enforces roughly a 72 h minimum. |
| Portal rule | **Each unit may book one (1) Studio session per calendar month.** Booking fee must be paid by the due date or the booking is auto-cancelled ("Your booking cancelled by system due to unpaid booking fee" seen in history). Cancellation must be at least 1 week before. |

## 4. Book Slot page (`/amenity/amenitybooking?amenity=<id>`)

| Item | Selector / behaviour |
|---|---|
| Calendar | FullCalendar in `#calendar`; month title `#calendar h2` ("September 2026"); `button.fc-next-button` / `button.fc-prev-button` |
| Day cell | `td.fc-day-number[data-date='YYYY-MM-DD']`. Classes: `css_fully_available` (green, bookable), `css_not_available`/`css_not_available1 grayColour` (not bookable), fully-booked days are red per the legend. |
| Day click | POSTs `/amenity/amenitygetslot` and renders slot buttons into `.amenitydayslot` |
| Slot buttons | `.amenitydayslot .bookingSlot` with `data-link-start="2026-09-26 16:00:00"` and `data-link-end="2026-09-26 22:00:00"`; visible text **"09:00 AM"** and **"04:00 PM"** |
| Slot click | Fills the hidden selects `#bookingStartTime` (value `2026-09-26 16:00:00`, shows "04:00 PM") and `#bookingEndTime` (value `2026-09-26 22:00:00`, shows "10:00 PM"); the clicked button turns green |
| Notes field | `#dynamicmodel-requestnote` (optional) |
| **Final confirm** | `#submit-button` ("Submit", top right). Its handler validates start/end, then POSTs `/amenity/amenitybookingadd` and on success redirects (`window.location = backurl`) to a payment page. The security-PIN modal (`#modalSecurityPin`) is only used for on-behalf bookings, not for Vin. |
| Held / booked slot | Renders as `.slot.grey` with `data-slot-flag="0"` (no `bookingSlot` class), so the slot selector finds nothing and the script refuses with "slot not offered". A lapsed payment hold keeps the slot grey for a while afterwards. |
| After submit | **Submit does not book yet.** It redirects to a **Payment** page (heading "Payment", green **Proceed** button, a 5:00 countdown) showing Studio, date, slot, fee S$21.80, deposit S$200.00, total S$221.80 and the note "Please make necessary payment at the management office within 3 working days to avoid auto cancellation." Required checkboxes: Booking Fees → *Manual Payment (Paynow)*; Deposit Fee → *DBS PayLah!* **or** *Manual Payment (Paynow)*; *I agree to the terms & conditions of the payment methods*. Only after **Proceed** does a booking row appear in Booking History. If the page is abandoned the hold lapses and nothing is booked (observed 2026-09-19). Vin's choice: Manual Payment (PayNow) for both. |
| Payment page URL | `/common/payment?refTable=7&refId=<hold id>&behalf=` (form `#payment-form-section`) |
| Payment checkboxes | Hidden inputs behind styled labels, so the script clicks `label[for=…]`: `#dynamicmodel-ismanual` (fee, Manual Payment PayNow), `#dynamicmodel-isdepositebymanual` (deposit, Manual Payment PayNow), `#dynamicmodel-isdepositebypaylah` (deposit, DBS PayLah!, not used), `#dynamicmodel-termsandconditions` (payment T&C) |
| **Proceed** | `a.btnpaymentsubmit` (the `input[type=submit]` is commented out). Its handler POSTs the form by AJAX and then `window.location = data.url`; an error shows an `iplus.alert` popup. Leaving the page (`beforeunload`) releases the slot lock. |
| Dry-run screenshot | `logs/discovery/09-evening-selected.png` (26 Sep 2026, 04:00 PM–10:00 PM selected, Submit not clicked) |

## 5. Notes

- Booking History shows many prior bookings for other facilities under the same unit, so the
  existing-booking guard is **Studio-specific** (it also prints any other upcoming bookings).
- A visible "Your session has expired" popup on the login page is normal and is dismissed.
- Discovery ran headed under a virtual display in a cloud container, not on Vin's Mac.
