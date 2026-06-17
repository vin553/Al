# Aarav & Anaya — A Royal Indian Wedding Website

A standalone, dependency-free, single-page Indian wedding website with rich,
scroll-driven **parallax** and a royal Rajasthani aesthetic (marigold, maroon,
saffron and gold).

> This folder is fully independent from the rest of the repo. No build step,
> no framework — just open `index.html`.

## ✨ Features

- **Multi-layer parallax hero** — sky, glow, sun, a slow-rotating lotus mandala,
  a palace-skyline silhouette and the couple's names all move at different
  depths on scroll **and** on mouse-move.
- **Animated mandala preloader** with a Sanskrit blessing (शुभ विवाह).
- **Falling marigold petals** continuously drifting over the hero.
- **Scroll progress bar** in saffron→gold→magenta.
- **Reveal-on-scroll** animations via `IntersectionObserver`.
- **Fixed-attachment parallax bands** for Story, Countdown and Venue.
- **Live countdown** to the wedding day.
- **Sections:** Hero · Invitation · Our Story (timeline) · The Couple ·
  Countdown · The Celebrations (Mehndi/Haldi/Sangeet/Wedding/Reception) ·
  Gallery · Venue · RSVP form · Footer.
- **Fully responsive** with a slide-in mobile menu.
- **Accessible:** honours `prefers-reduced-motion`.

## ▶️ Run it

Just open the file:

```bash
open wedding-site/index.html      # macOS
# or simply double-click index.html
```

Or serve it (recommended so the fonts/CDN load):

```bash
cd wedding-site && python3 -m http.server 8080
# visit http://localhost:8080
```

## 🛠️ Make it yours

| What | Where |
| ---- | ----- |
| Names / date / venue | `index.html` (hero, footer, countdown text) |
| Countdown target | `js/main.js` → `new Date("2026-12-12T18:00:00+05:30")` |
| Colours | `css/styles.css` → `:root` variables |
| Gallery images | `js/main.js` → `gallery()` (swap the gradients for real `background-image` URLs) |
| RSVP backend | `js/main.js` → `rsvp()` (POST to Formspree / Google Forms / your API) |

The gallery and parallax "photo" bands use CSS gradients so the site looks
complete with **zero image assets**. Drop in real photographs by replacing the
gradient backgrounds with image URLs.

## 🖼️ Previews

See `assets/preview-*.png` for rendered screenshots of the hero, story,
countdown and celebrations sections.
