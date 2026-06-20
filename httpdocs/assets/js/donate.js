/* ============================================================================
   Sri Veeramakaliamman Temple — donate.js
   Per-cause donation forms → Stripe Checkout via create-checkout-session.php
   Client-side validation only; the server re-validates and owns the labels.
   ========================================================================== */
(function () {
  "use strict";

  // Known causes — MUST mirror the server's allow-list in
  // create-checkout-session.php. The client uses this only for UX guards;
  // the PHP endpoint is the source of truth for the human label & price floor.
  var KNOWN_EVENTS = {
    general:    "Temple Fund (General Donation)",
    annadhanam: "Annadhanam — Sponsor Free Meals",
    abishekam:  "Abishekam / Archanai Sponsorship",
    aadi:       "Aadi Thiruvizha Festival",
    navaratri:  "Navaratri Kolu",
    deepavali:  "Deepavali Chariot Procession (Ther)",
    thaipusam:  "Thaipusam",
    renovation: "Kumbhabishekam / Building Fund"
  };

  var MIN_SGD = 1;
  var MAX_SGD = 100000; // sane upper guard; server enforces too

  function formatSGD(n) {
    return "S$" + Number(n).toLocaleString("en-SG");
  }

  function initCard(card) {
    var eventId = card.getAttribute("data-event");
    var amountInput = card.querySelector('[data-role="amount"]');
    var tierButtons = card.querySelectorAll(".tier-btn");
    var nameInput = card.querySelector('[data-role="name"]');
    var emailInput = card.querySelector('[data-role="email"]');
    var submit = card.querySelector('[data-role="submit"]');
    var errorEl = card.querySelector('[data-role="error"]');
    var statusEl = card.querySelector('[data-role="status"]');

    if (!eventId || !amountInput || !submit) return;

    function setError(msg) {
      if (errorEl) errorEl.textContent = msg || "";
    }
    function setStatus(msg) {
      if (statusEl) statusEl.textContent = msg || "";
    }

    // Tier buttons set the amount field
    tierButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        tierButtons.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        btn.setAttribute("aria-pressed", "true");
        amountInput.value = btn.getAttribute("data-amount");
        setError("");
      });
    });

    // Typing a custom amount clears tier selection
    amountInput.addEventListener("input", function () {
      tierButtons.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      setError("");
    });

    function validate() {
      if (!KNOWN_EVENTS[eventId]) {
        setError("Unknown donation cause. Please reload the page.");
        return null;
      }
      var raw = (amountInput.value || "").trim();
      var amount = Number(raw);
      if (!raw || isNaN(amount)) {
        setError("Please enter a donation amount.");
        amountInput.focus();
        return null;
      }
      // Whole-dollar amounts keep things tidy and avoid float cents issues.
      if (!Number.isInteger(amount)) {
        setError("Please enter a whole-dollar amount (no cents).");
        amountInput.focus();
        return null;
      }
      if (amount < MIN_SGD) {
        setError("Minimum donation is " + formatSGD(MIN_SGD) + ".");
        amountInput.focus();
        return null;
      }
      if (amount > MAX_SGD) {
        setError("For donations above " + formatSGD(MAX_SGD) +
          ", please contact the temple office directly.");
        return null;
      }
      var email = (emailInput && emailInput.value || "").trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Please enter a valid email address (or leave it blank).");
        if (emailInput) emailInput.focus();
        return null;
      }
      setError("");
      return {
        amountSGD: amount,
        eventId: eventId,
        donorName: (nameInput && nameInput.value || "").trim(),
        donorEmail: email
      };
    }

    submit.addEventListener("click", function () {
      var payload = validate();
      if (!payload) return;

      submit.disabled = true;
      var originalText = submit.textContent;
      submit.textContent = "Redirecting…";
      setStatus("Securely connecting to Stripe…");

      fetch("create-checkout-session.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok && result.data && result.data.url) {
            window.location = result.data.url;
          } else {
            var msg =
              (result.data && result.data.error) ||
              "We could not start the checkout. Please try again.";
            setError(msg);
            setStatus("");
            submit.disabled = false;
            submit.textContent = originalText;
          }
        })
        .catch(function () {
          setError(
            "Network error — please check your connection and try again."
          );
          setStatus("");
          submit.disabled = false;
          submit.textContent = originalText;
        });
    });
  }

  function init() {
    var cards = document.querySelectorAll("[data-donate-card]");
    cards.forEach(initCard);

    // Deep-link support: donate.html#annadhanam scrolls + highlights a cause
    if (window.location.hash) {
      var target = document.getElementById(window.location.hash.slice(1));
      if (target && target.hasAttribute("data-donate-card")) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
