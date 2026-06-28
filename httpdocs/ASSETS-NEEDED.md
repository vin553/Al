# Assets Needed — Sri Veeramakaliamman Temple Website

The site is fully built and works **right now** with tasteful palette/gold
placeholders (no copyrighted images are used anywhere). To make it sing, the
temple should supply the photographs below. Drop each file into
`assets/img/` (create the sub-folders shown) using the exact filename, and the
placeholders will be replaced.

**General guidance**
- Format: JPG for photos (quality ~80), PNG only where transparency is needed.
- Always supply at roughly **2× the display size** for sharp retina rendering,
  then compress (e.g. [Squoosh](https://squoosh.app)). Keep each photo well
  under ~300 KB where possible.
- Every `<img>` already has an aspect-ratio box, so layout will not shift.
- Please ensure the temple owns or has permission to use every image.
- Respectful, well-lit, straight-on framing for all deity portraits.

---

## 1. Hero (home page) — the centrepiece

The hero is a 3-layer parallax. For the best depth effect:

| File | What | Recommended size | Notes |
|------|------|------------------|-------|
| `assets/img/hero-sky.jpg` | Sky / atmosphere behind the tower | 2000 × 1200 | Optional — a gradient is used if absent. Dawn/dusk tones suit the palette. |
| `assets/img/hero-tower.png` | The rajagopuram, **background removed** | 1400 × 1800, transparent PNG | The star of the hero. A clean cut-out of the tower so it can float over the sky layer. Replaces the placeholder `hero-tower.svg`. |
| `assets/img/hero-fore.png` | Optional foreground (lamps, steps, silhouette) | 2000 × 700, transparent PNG | A gradient is used if absent. |

> After adding `hero-tower.png`, update one line in
> `assets/css/styles.css` (`.hero__layer--tower`) to point at the PNG instead
> of the placeholder SVG.

Also: `assets/img/og-home.jpg` — **1200 × 630** social-share image (used by all
pages' Open Graph/Twitter cards).

---

## 2. Presiding deity

| File | What | Size |
|------|------|------|
| `assets/img/deity-veeramakaliamman.jpg` | High-res, respectful portrait of Sri Veeramakaliamman | 1200 × 1600 (3:4) |

---

## 3. The 14 shrine thumbnails (deities page)

Portrait orientation (3:4). Display ~400 × 533; supply ~800 × 1066.
Folder: `assets/img/deities/`

| File | Deity |
|------|-------|
| `deities/veeramakaliamman.jpg` | Sri Veeramakaliamman |
| `deities/periachi.jpg` | Sri Periachi |
| `deities/vinayagar.jpg` | Lord Vinayagar |
| `deities/subramaniyar.jpg` | Lord Subramaniyar |
| `deities/visalatchi.jpg` | Sri Visalatchi |
| `deities/lakshmi-durgai.jpg` | Sri Lakshmi Durgai |
| `deities/dhakshinamoorthy.jpg` | Sri Dhakshinamoorthy |
| `deities/kasi-viswanathar.jpg` | Sri Kasi Viswanathar |
| `deities/ramar.jpg` | Sri Ramar |
| `deities/idumbar.jpg` | Sri Idumbar |
| `deities/nagar.jpg` | Sri Nagar |
| `deities/bhairavar.jpg` | Sri Bhairavar |
| `deities/chandikeshwarar.jpg` | Sri Chandikeshwarar |
| `deities/sani-bagawan.jpg` | Sri Sani Bagawan |

---

## 4. History timeline (history page)

Landscape (16:9), ~800 × 450 each. Folder: `assets/img/history/`

| File | What |
|------|------|
| `history/early-shrine.jpg` | Earliest temple / lime-kiln era (archival) |
| `history/rebuild.jpg` | An early rebuild / expansion |
| `history/rajagopuram.jpg` | The rajagopuram tower |
| `history/stucco-detail.jpg` | Close detail of the ~600 stucco figures |

---

## 5. Donation-cause images (8) — optional

The donation cards currently use gold marks (clean and consistent). If you'd
like photos instead, supply 4:3, ~700 × 525. Folder: `assets/img/causes/`

`causes/general.jpg`, `causes/annadhanam.jpg`, `causes/abishekam.jpg`,
`causes/aadi.jpg`, `causes/navaratri.jpg`, `causes/deepavali.jpg`,
`causes/thaipusam.jpg`, `causes/renovation.jpg`

---

## 6. Gallery (gallery page)

A masonry grid + lightbox. Supply a **thumbnail** (~600 px wide) and a
**full-size** (~1600 px wide) for each. Folder: `assets/img/gallery/`

Suggested set (add as many as you like):
- `gallery/tower.jpg` — the rajagopuram
- `gallery/stucco-1.jpg`, `gallery/stucco-2.jpg` — figure details
- `gallery/sanctum.jpg` — inner sanctum
- `gallery/arti.jpg` — daily worship / arti
- `gallery/aadi.jpg` — Aadi Thiruvizha
- `gallery/navaratri.jpg` — Navaratri Kolu display
- `gallery/deepavali-ther.jpg` — Deepavali chariot
- `gallery/thaipusam.jpg` — Thaipusam
- `gallery/annadhanam.jpg` — free meals

In `gallery.html`, each item becomes:
```html
<button class="gallery-item" data-lightbox="assets/img/gallery/tower.jpg" data-alt="The rajagopuram at dawn">
  <img src="assets/img/gallery/tower-thumb.jpg" alt="The rajagopuram at dawn" loading="lazy" width="600" height="600" />
</button>
```

### Videos
Replace the placeholder YouTube IDs in `gallery.html` with the temple's
official videos (e.g. Kumbhabishekam). The embeds already use
`youtube-nocookie.com` and `loading="lazy"`.

---

## 7. Fonts (optional self-hosted fallback)

The site loads **Cormorant Garamond** and **Catamaran** from Google Fonts via
`<link>`. If you prefer to self-host (for privacy/offline resilience):

1. Download both families (with Tamil + Latin subsets for Catamaran) from
   Google Fonts.
2. Place the `.woff2` files in `assets/fonts/`.
3. Add `@font-face` rules at the top of `styles.css` and remove the Google
   Fonts `<link>` tags from each HTML `<head>`.

Catamaran covers Tamil script, which is required for the temple name lockup.

---

## 8. Favicon / icons

A gold "ॐ" on oxblood `favicon.svg` is included and used as both the favicon
and Apple touch icon. If you'd like a raster fallback for older devices, add
`favicon-180.png` (180 × 180) and reference it with an extra
`<link rel="apple-touch-icon">`.
