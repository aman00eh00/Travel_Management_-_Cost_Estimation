// public/app.js
(function () {
  const $ = (q) => document.querySelector(q);

  const STORAGE = "trulytravels_trips";
  const FAILED_QUEUE_KEY = "trulytravels_failed_queue";

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE) || "[]");
    } catch {
      localStorage.removeItem(STORAGE);
      return [];
    }
  }

  function saveLocal(list) {
    localStorage.setItem(STORAGE, JSON.stringify(list));
  }

  function pushFailedSave(trip) {
    const q = JSON.parse(localStorage.getItem(FAILED_QUEUE_KEY) || "[]");
    q.push({ trip, ts: new Date().toISOString() });
    localStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(q));
  }

  async function processFailedQueue() {
    const raw = localStorage.getItem(FAILED_QUEUE_KEY);
    if (!raw) return;

    const q = JSON.parse(raw);
    const newQueue = [];

    for (const item of q) {
      try {
        const res = await fetch("/api/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.trip),
        });
        if (!res.ok) throw new Error();
      } catch {
        newQueue.push(item);
      }
    }

    if (newQueue.length)
      localStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(newQueue));
    else localStorage.removeItem(FAILED_QUEUE_KEY);
  }

  window.addEventListener("load", () =>
    processFailedQueue().catch(() => {})
  );

  // ========================================
  // PAGE LOADED
  // ========================================

  window.addEventListener("DOMContentLoaded", () => {
    // NAV BUTTONS
    const homeBtn = $("#home-btn");
    const historyBtn = $("#history-btn");
    const pricingBtn = $("#pricing-btn");
    const planBtn = $("#plan-btn");

    const homeSection = $("#home-section");
    const historySection = $("#history-section");
    const pricingSection = $("#pricing-section");
    const resultsSectionNav = $("#results-section");

    function hideAll() {
      homeSection?.classList.add("hidden");
      historySection?.classList.add("hidden");
      pricingSection?.classList.add("hidden");
      resultsSectionNav?.classList.add("hidden");
    }

    function showHome() {
      hideAll();
      homeSection?.classList.remove("hidden");
    }

    function showHistory() {
      hideAll();
      historySection?.classList.remove("hidden");
      renderHistory();
    }

    function showPricing() {
      hideAll();
      pricingSection?.classList.remove("hidden");
    }

    if (homeBtn) homeBtn.onclick = () => (location.href = "index.html");
    if (historyBtn) historyBtn.onclick = () => {
      location.href = "index.html";
      // Note: To show history, we can add a hash or parameter, but for simplicity, redirect to index.html
    };
    if (pricingBtn) pricingBtn.onclick = () => (location.href = "pricing.html");
    if (planBtn) planBtn.onclick = () => (location.href = "plan-trip.html");

    // ⭐⭐⭐ GET STARTED BUTTON FIXED ⭐⭐⭐
    const getStart = $("#get-started-btn");
    if (getStart) getStart.onclick = () => (location.href = "plan-trip.html");

    // FORM ELEMENTS
    const form = $("#trip-form");
    const costBox = $("#cost-breakdown");
    const saveBtn = $("#save-trip-btn");
    const pdfBtn = $("#download-pdf-btn");
    const historyBox = $("#trip-history");
    const resultsSection = $("#results-section");

    // RENDER HISTORY
    function renderHistory() {
      const trips = loadLocal();
      historyBox.innerHTML =
        trips.length === 0
          ? "<p>No trips saved yet.</p>"
          : trips
              .map(
                (t) => `
            <div class="trip-item">
              <h3>${t.origin} (${t.originIATA}) → ${t.destination} (${t.destinationIATA})</h3>
              <p>Dates: ${t.startDate} to ${t.endDate}</p>
              <p>Travelers: ${t.travelers}</p>
              <p>Total Cost: ₹${t.totalCost.toLocaleString()}</p>
            </div>`
              )
              .join("");
    }

    // FETCH SERVER ESTIMATE
    async function estimateTrip(data) {
      try {
        const res = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) throw new Error();
        return await res.json();
      } catch {
        alert("⚠ Server offline — using fallback estimator.");
        return fallbackEstimate(data);
      }
    }

    // CLEAN UI COST DISPLAY (NO TEXT MERGING)
    function displayCost(trip) {
      const b = trip.breakdown;

      costBox.innerHTML = `
        <div class="breakdown-item"><span>Transportation:</span><span>₹${b.transportation.toLocaleString()}</span></div>
        <div class="breakdown-item"><span>Accommodation:</span><span>₹${b.accommodation.toLocaleString()}</span></div>
        <div class="breakdown-item"><span>Food:</span><span>₹${b.food.toLocaleString()}</span></div>
        <div class="breakdown-item"><span>Activities:</span><span>₹${b.activities.toLocaleString()}</span></div>
        <div class="breakdown-item"><span>Misc:</span><span>₹${b.misc.toLocaleString()}</span></div>

        <div class="breakdown-item total">
          <span>Total Cost:</span>
          <span>₹${trip.totalCost.toLocaleString()}</span>
        </div>

        <p style="margin-top:15px;">Flight price source: <b>${b.flightSource}</b></p>
        <p>IATA: ${trip.originIATA} → ${trip.destinationIATA}</p>
      `;

      resultsSection.classList.remove("hidden");
    }

    // SAVE TRIP
    async function saveTrip(trip) {
      const local = loadLocal();
      local.unshift(trip);
      saveLocal(local);

      try {
        const res = await fetch("/api/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trip),
        });

        if (!res.ok) throw new Error();
        alert("✔ Trip saved to server AND local storage!");
      } catch {
        pushFailedSave(trip);
        alert("⚠ Saved locally — server unavailable.");
      }

      renderHistory();
    }

    // FORM SUBMIT
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = {
          origin: $("#origin").value.trim(),
          destination: $("#destination").value.trim(),
          startDate: $("#start-date").value,
          endDate: $("#end-date").value,
          travelers: $("#travelers").value,
          accommodation: $("#accommodation").value,
          transportation: $("#transportation").value,
          promoCode: $("#promoCode")?.value || "",
        };

        const trip = await estimateTrip(data);
        window.lastTrip = trip;

        displayCost(trip);

        saveBtn.onclick = () => saveTrip(trip);
      });
    }

    // PDF DOWNLOAD
    if (pdfBtn) {
      pdfBtn.onclick = async () => {
        if (!window.lastTrip)
          return alert("Estimate a trip first!");

        try {
          const res = await fetch("/api/export-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(window.lastTrip),
          });

          if (!res.ok) throw new Error();

          const blob = await res.blob();
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = "trip-summary.pdf";
          a.click();

          URL.revokeObjectURL(url);
        } catch {
          alert("PDF download failed — check server.");
        }
      };
    }

    // INITIAL HISTORY LOAD
    renderHistory();
  });
})();
