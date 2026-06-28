# Deploying the Sri Veeramakaliamman Temple Website (Plesk)

This is a **static site** (plain HTML/CSS/JS) plus **one PHP endpoint** for
Stripe donations. No build step, no npm, no Composer. You deploy by uploading
files into your Plesk document root (`httpdocs`).

---

## 1. What to upload

Upload **everything inside this `httpdocs/` folder** into your Plesk site's
document root (also called `httpdocs`):

```
index.html  history.html  deities.html  events.html  donate.html
gallery.html  contact.html  success.html  cancelled.html  404.html
create-checkout-session.php  stripe-webhook.php
favicon.svg  robots.txt  sitemap.xml
assets/  (css, js, img, fonts)
```

Do **not** upload `stripe-config.example.php` as-is — see step 3.
The Markdown docs (`README-DEPLOY.md`, `ASSETS-NEEDED.md`) are for you; you may
upload them or not (they're harmless, but unnecessary on the live server).

---

## 2. Point the 404 page (Plesk)

In **Plesk → Apache & nginx Settings** for the domain, add to the
*Additional Apache directives*:

```apache
ErrorDocument 404 /404.html
```

(If your host is nginx-only, set `error_page 404 /404.html;` in the nginx
directives instead.)

---

## 3. Stripe configuration (the important part)

### 3a. Create your config file

Copy `stripe-config.example.php` to **`stripe-config.php`** and fill in your
keys:

```php
<?php
return array(
    'secret_key'     => 'sk_test_...',          // test key first; live key later
    'allowed_origin' => 'https://YOUR-DOMAIN',  // e.g. https://srivkt.org
);
```

### 3b. Place it securely — choose ONE:

**Preferred — one level ABOVE the web root** (so it can never be served over
HTTP). On Plesk the web root is usually:

```
/var/www/vhosts/YOUR-DOMAIN/httpdocs/      <- your files go here
/var/www/vhosts/YOUR-DOMAIN/stripe-config.php   <- put config HERE (one level up)
```

`create-checkout-session.php` automatically looks for `../stripe-config.php`
first, so no code change is needed.

**Fallback — inside `httpdocs`** (only if your plan forbids writing above the
web root). Then you **must** block direct HTTP access. Add to the Apache
directives (Plesk → Apache & nginx Settings):

```apache
<Files "stripe-config.php">
    Require all denied
</Files>
```

Or, if you can use `.htaccess` in `httpdocs`, create one containing:

```apache
<Files "stripe-config.php">
    Require all denied
</Files>
<Files "stripe-webhook.php">
    # webhook is fine to expose; left here only as a reminder
</Files>
```

> **Never commit a real `stripe-config.php` to git.** It is already listed in
> `.gitignore`. Keys belong only on the server.

### 3c. Requirements on the host

- PHP 7.x or 8.x with the **cURL** extension enabled (standard on Plesk).
- Outbound HTTPS allowed to `api.stripe.com`.

---

## 4. Success / cancel URLs

These are built **automatically** from your request host, so they work on any
domain with no edit. If you set `allowed_origin` in `stripe-config.php`, that
value is used as the canonical base for redirects instead — recommended for
production so links always point at your real domain:

- Success: `https://YOUR-DOMAIN/success.html?session_id={CHECKOUT_SESSION_ID}`
- Cancel:  `https://YOUR-DOMAIN/cancelled.html`

Also update the placeholder domain `https://srivkt.org` in these files once the
final domain is known:

- `robots.txt` (Sitemap line)
- `sitemap.xml` (`<loc>` entries)
- the `<link rel="canonical">`, Open Graph URLs, and JSON-LD `url` in each HTML
  page.

---

## 5. Testing with Stripe TEST mode

1. In `stripe-config.php`, use your **test** secret key (`sk_test_...`).
2. Open `https://YOUR-DOMAIN/donate.html`, pick a cause, enter an amount, and
   click **Donate**.
3. On the Stripe Checkout page, pay with the test card:
   - **Card:** `4242 4242 4242 4242`
   - **Expiry:** any future date (e.g. `12/34`)
   - **CVC:** any 3 digits (e.g. `123`)
   - **Postal code:** any (e.g. `018956`)
4. You should be redirected to `success.html`. The donation appears in your
   Stripe Dashboard (in **test** mode) and a receipt email is sent if you
   entered an email.
5. Test the cancel path by clicking the back arrow on Stripe Checkout — you
   should land on `cancelled.html`.

### Going live

- Switch the key in `stripe-config.php` to your **live** key (`sk_live_...`).
- Make sure your Stripe account is activated and SGD is enabled.
- Do a small real donation (e.g. S$1) to confirm, then refund it from the
  Dashboard if desired.

---

## 6. Optional webhook (reconciliation only)

Not required — Stripe emails receipts and records every donation. If you later
want automated bookkeeping, see `stripe-webhook.php` for a documented stub and
setup instructions.

---

## 7. Fallback if PHP is unavailable (Payment Links)

If your host cannot run PHP, you can still take donations with **Stripe Payment
Links** (pure static, but set up manually per cause, with fixed amounts):

1. In the Stripe Dashboard → **Payment Links**, create one link per cause
   (General, Annadhanam, Abishekam, Aadi, Navaratri, Deepavali, Thaipusam,
   Renovation). Set "Customers choose what to pay" if you want variable amounts.
2. In `donate.html`, replace each form's **Donate** button with a normal link:
   ```html
   <a class="btn btn--block btn--donate" href="https://buy.stripe.com/XXXX">Donate</a>
   ```
   and you can remove the amount/tier inputs for that card.
3. You can then delete `create-checkout-session.php`, `stripe-config.php`,
   `stripe-webhook.php`, and `assets/js/donate.js`.

Trade-off: no dynamic amounts from the page, and you maintain links by hand.

---

## 8. Performance & caching (optional but recommended)

Add to your Apache directives or `.htaccess` for better Lighthouse scores:

```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType image/svg+xml "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
</IfModule>
```

Force HTTPS (Plesk also offers a checkbox for this):

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
```

---

## 9. Before you publish — checklist

- [ ] Replace every `<!-- TODO: confirm from temple -->` and `TODO`/`verify`
      marker with confirmed facts (hours, phone, email, festival dates, bank/IPC
      details).
- [ ] Supply real photos per `ASSETS-NEEDED.md` (placeholders are in place).
- [ ] Set the final domain everywhere (canonical, OG, sitemap, robots,
      `allowed_origin`).
- [ ] Confirm Stripe **live** key in `stripe-config.php`, placed securely.
- [ ] Test a real donation, then verify the receipt + Dashboard record.
