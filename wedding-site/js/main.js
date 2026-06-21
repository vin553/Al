/* ============================================================
   Aarav & Anaya — interaction & parallax engine
   ============================================================ */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Build decorative SVG petal rings (preloader + hero) ---------- */
  function buildPetalRing(group, count, radius, len) {
    if (!group) return;
    let markup = "";
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 360;
      markup += `<line x1="${100}" y1="${100}" x2="${100}" y2="${100 - radius}"
                 transform="rotate(${a} 100 100)" stroke-width="1"/>`;
    }
    group.innerHTML = markup;
  }
  buildPetalRing($("#petalRing"), 24, 92);

  // Hero mandala petals (lotus-like)
  (function heroPetals() {
    const g = $("#heroPetals");
    if (!g) return;
    let m = "";
    const petals = 16;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * 360;
      m += `<path d="M300 90 C 330 160, 330 220, 300 280 C 270 220, 270 160, 300 90 Z"
              transform="rotate(${a} 300 300)" stroke-width="1"/>`;
    }
    g.innerHTML = m;
  })();

  /* ---------- Preloader ---------- */
  window.addEventListener("load", () => {
    const pre = $("#preloader");
    setTimeout(() => pre && pre.classList.add("hidden"), 900);
  });

  /* ---------- Floating marigold petals ---------- */
  (function spawnPetals() {
    if (prefersReduced) return;
    const wrap = $("#petals");
    if (!wrap) return;
    const colors = ["#f5a623", "#ff9933", "#e9a40c", "#ffb347", "#c2185b"];
    const COUNT = window.innerWidth < 700 ? 16 : 30;
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement("span");
      p.className = "petal";
      const size = 8 + Math.random() * 14;
      p.style.left = Math.random() * 100 + "%";
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.background = colors[(Math.random() * colors.length) | 0];
      p.style.animationDuration = 7 + Math.random() * 9 + "s";
      p.style.animationDelay = -Math.random() * 12 + "s";
      p.style.opacity = (0.5 + Math.random() * 0.5).toFixed(2);
      wrap.appendChild(p);
    }
  })();

  /* ---------- Scroll-driven parallax on hero layers ---------- */
  const layers = $$(".hero__layer, .hero__content");
  let ticking = false;
  function parallaxScroll() {
    const y = window.scrollY;
    layers.forEach((el) => {
      const depth = parseFloat(el.dataset.depth || "0");
      el.style.transform = `translate3d(0, ${y * depth}px, 0)`;
    });
    ticking = false;
  }
  function onScroll() {
    if (!ticking && !prefersReduced) {
      window.requestAnimationFrame(parallaxScroll);
      ticking = true;
    }
    updateProgress();
    updateNav();
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mouse parallax on hero (subtle depth) ---------- */
  if (!prefersReduced) {
    const hero = $(".hero");
    hero &&
      hero.addEventListener("mousemove", (e) => {
        const cx = (e.clientX / window.innerWidth - 0.5) * 2;
        const cy = (e.clientY / window.innerHeight - 0.5) * 2;
        layers.forEach((el) => {
          const depth = parseFloat(el.dataset.depth || "0");
          const base = window.scrollY * depth;
          el.style.transform =
            `translate3d(${cx * depth * 26}px, ${base + cy * depth * 18}px, 0)`;
        });
      });
  }

  /* ---------- Scroll progress bar ---------- */
  const bar = $("#scrollProgress");
  function updateProgress() {
    if (!bar) return;
    const h = document.documentElement;
    const scrolled = (h.scrollTop || document.body.scrollTop);
    const height = h.scrollHeight - h.clientHeight;
    bar.style.width = (height ? (scrolled / height) * 100 : 0) + "%";
  }

  /* ---------- Nav: solidify on scroll ---------- */
  const nav = $("#nav");
  function updateNav() {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 60);
  }

  /* ---------- Mobile nav toggle ---------- */
  const toggle = $("#navToggle");
  const navLinks = $("#navLinks");
  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("open");
      navLinks.classList.toggle("open");
    });
    $$("#navLinks a").forEach((a) =>
      a.addEventListener("click", () => {
        toggle.classList.remove("open");
        navLinks.classList.remove("open");
      })
    );
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 0.08 + "s";
    io.observe(el);
  });

  /* ---------- Gallery (CSS-gradient "photos" so it works fully offline) ---------- */
  (function gallery() {
    const grid = $("#galleryGrid");
    if (!grid) return;
    const items = [
      { label: "The Proposal",  grad: "linear-gradient(135deg,#ff9a5a,#c2185b)", cls: "gallery__cell--tall" },
      { label: "Henna Nights",  grad: "linear-gradient(135deg,#1f8a70,#0b6e4f)", cls: "" },
      { label: "Golden Hour",   grad: "linear-gradient(135deg,#f5a623,#d4452f)", cls: "gallery__cell--wide" },
      { label: "Lake Pichola",  grad: "linear-gradient(135deg,#6a3fb5,#3d0a18)", cls: "" },
      { label: "First Dance",   grad: "linear-gradient(135deg,#c2185b,#6a1226)", cls: "" },
      { label: "Marigolds",     grad: "linear-gradient(135deg,#ffb347,#e9a40c)", cls: "gallery__cell--tall" },
      { label: "The Promise",   grad: "linear-gradient(135deg,#8b1a1a,#3d0a18)", cls: "gallery__cell--wide" },
      { label: "Together",      grad: "linear-gradient(135deg,#0b6e4f,#1f8a70)", cls: "" },
    ];
    items.forEach((it) => {
      const cell = document.createElement("div");
      cell.className = "gallery__cell " + it.cls;
      cell.style.backgroundImage = it.grad;
      cell.dataset.label = it.label;
      grid.appendChild(cell);
    });
  })();

  /* ---------- Countdown ---------- */
  (function countdown() {
    const target = new Date("2026-12-12T18:00:00+05:30").getTime();
    const d = $("#cd-days"), h = $("#cd-hours"), m = $("#cd-mins"), s = $("#cd-secs");
    if (!d) return;
    const pad = (n) => String(Math.max(0, n)).padStart(2, "0");
    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) {
        d.textContent = h.textContent = m.textContent = s.textContent = "00";
        return;
      }
      d.textContent = pad(Math.floor(diff / 864e5));
      h.textContent = pad(Math.floor((diff % 864e5) / 36e5));
      m.textContent = pad(Math.floor((diff % 36e5) / 6e4));
      s.textContent = pad(Math.floor((diff % 6e4) / 1e3));
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ---------- RSVP (front-end only demo) ---------- */
  (function rsvp() {
    const form = $("#rsvpForm");
    const thanks = $("#rsvpThanks");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      form.querySelectorAll("input,select,textarea,button").forEach((el) => (el.disabled = true));
      if (thanks) thanks.hidden = false;
      // In production, POST form data to your backend / Google Form / Formspree here.
    });
  })();

  // initial paint
  updateNav();
  updateProgress();
})();
