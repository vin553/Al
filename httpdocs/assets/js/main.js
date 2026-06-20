/* ============================================================================
   Sri Veeramakaliamman Temple — main.js
   Nav, header condense, scroll-reveal, parallax hero, incense particles.
   Vanilla JS. No dependencies. Respects prefers-reduced-motion.
   ========================================================================== */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ------------------------------------------------------------------ */
  /* Mobile navigation                                                  */
  /* ------------------------------------------------------------------ */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("primary-nav");
    if (!toggle || !nav) return;

    var backdrop = document.createElement("div");
    backdrop.className = "nav-backdrop";
    document.body.appendChild(backdrop);

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      backdrop.classList.toggle("is-visible", open);
      document.body.style.overflow = open ? "hidden" : "";
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    backdrop.addEventListener("click", function () { setOpen(false); });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Header condense on scroll                                          */
  /* ------------------------------------------------------------------ */
  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header || header.classList.contains("site-header--solid")) return;

    var ticking = false;
    function update() {
      header.classList.toggle("is-condensed", window.scrollY > 60);
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  /* ------------------------------------------------------------------ */
  /* Scroll-reveal via IntersectionObserver                            */
  /* ------------------------------------------------------------------ */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------ */
  /* Parallax hero layers (transform only, rAF-throttled)              */
  /* ------------------------------------------------------------------ */
  function initParallax() {
    var layers = document.querySelectorAll("[data-parallax]");
    if (!layers.length || prefersReducedMotion) return;

    var hero = document.querySelector(".hero");
    if (!hero) return;

    var latestY = 0;
    var ticking = false;

    function render() {
      var rect = hero.getBoundingClientRect();
      // Only compute while hero is roughly in view
      if (rect.bottom > -200 && rect.top < window.innerHeight) {
        layers.forEach(function (layer) {
          var speed = parseFloat(layer.getAttribute("data-parallax")) || 0;
          var shift = latestY * speed;
          layer.style.transform = "translate3d(0," + shift.toFixed(2) + "px,0)";
        });
      }
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        latestY = window.scrollY;
        if (!ticking) {
          window.requestAnimationFrame(render);
          ticking = true;
        }
      },
      { passive: true }
    );
    render();
  }

  /* ------------------------------------------------------------------ */
  /* Incense / smoke particles (lightweight canvas)                    */
  /* ------------------------------------------------------------------ */
  function initIncense() {
    var canvas = document.querySelector(".hero__incense");
    if (!canvas || prefersReducedMotion) return;

    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var particles = [];
    var running = true;
    var w = 0, h = 0;
    // Particle count scales down on small screens for performance
    var COUNT = window.innerWidth < 700 ? 14 : 26;

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn() {
      // Emit from two "lamp" points near the lower centre
      var originX = w * (0.5 + (Math.random() - 0.5) * 0.32);
      return {
        x: originX,
        y: h + 10,
        r: 14 + Math.random() * 30,
        vy: -(0.25 + Math.random() * 0.5),
        vx: (Math.random() - 0.5) * 0.25,
        life: 0,
        ttl: 320 + Math.random() * 260,
        drift: Math.random() * Math.PI * 2
      };
    }

    for (var i = 0; i < COUNT; i++) {
      var p = spawn();
      p.y = Math.random() * h;
      p.life = Math.random() * p.ttl;
      particles.push(p);
    }

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.life++;
        p.drift += 0.01;
        p.x += p.vx + Math.sin(p.drift) * 0.3;
        p.y += p.vy;
        p.r += 0.06;

        var t = p.life / p.ttl;
        var alpha = Math.sin(t * Math.PI) * 0.12; // fade in/out, very low opacity
        if (p.life >= p.ttl || p.y < -p.r) {
          particles[i] = spawn();
          continue;
        }
        var grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grd.addColorStop(0, "rgba(201,162,39," + alpha + ")");
        grd.addColorStop(1, "rgba(201,162,39,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      window.requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Pause when hero scrolls out of view to save battery/CPU
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        running = entries[0].isIntersecting;
        if (running) window.requestAnimationFrame(tick);
      });
      io.observe(canvas);
    }
    // Pause on tab hidden
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        running = false;
      } else {
        running = true;
        window.requestAnimationFrame(tick);
      }
    });

    window.requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------ */
  /* Gallery lightbox                                                   */
  /* ------------------------------------------------------------------ */
  function initLightbox() {
    var items = document.querySelectorAll("[data-lightbox]");
    if (!items.length) return;

    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Image viewer");
    box.innerHTML =
      '<button class="lightbox__close" aria-label="Close image viewer">&times;</button>' +
      '<img class="lightbox__img" alt="" />';
    document.body.appendChild(box);

    var img = box.querySelector(".lightbox__img");
    var closeBtn = box.querySelector(".lightbox__close");
    var lastFocus = null;

    function open(src, alt) {
      img.src = src;
      img.alt = alt || "";
      box.classList.add("is-open");
      document.body.style.overflow = "hidden";
      lastFocus = document.activeElement;
      closeBtn.focus();
    }
    function close() {
      box.classList.remove("is-open");
      document.body.style.overflow = "";
      img.src = "";
      if (lastFocus) lastFocus.focus();
    }

    items.forEach(function (el) {
      el.addEventListener("click", function () {
        var src = el.getAttribute("data-lightbox");
        var alt = el.getAttribute("data-alt") || "";
        if (src) open(src, alt);
      });
    });
    closeBtn.addEventListener("click", close);
    box.addEventListener("click", function (e) {
      if (e.target === box) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && box.classList.contains("is-open")) close();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Footer year                                                        */
  /* ------------------------------------------------------------------ */
  function initYear() {
    var el = document.querySelector("[data-year]");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------------ */
  function init() {
    initNav();
    initHeader();
    initReveal();
    initParallax();
    initIncense();
    initLightbox();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
