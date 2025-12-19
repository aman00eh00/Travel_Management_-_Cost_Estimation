// ---------------------------------------------
// TrulyTravels: Backend + Amadeus + PDF + IATA
// ---------------------------------------------

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs").promises;
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const Amadeus = require("amadeus");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const TRIP_FILE = path.join(__dirname, "trips.json");

// ---------------------------------------------
// Load / Save Trips
// ---------------------------------------------

async function loadTrips() {
  try {
    return JSON.parse(await fs.readFile(TRIP_FILE, "utf8"));
  } catch {
    return [];
  }
}

async function saveTrips(data) {
  await fs.writeFile(TRIP_FILE, JSON.stringify(data, null, 2));
}

let trips = [];
(async () => (trips = await loadTrips()))();

// ---------------------------------------------
// IATA CITY → AIRPORT CODE MAP
// ---------------------------------------------

const IATA_MAP = {
  "delhi": "DEL",
  "new delhi": "DEL",
  "noida": "DEL",
  "mumbai": "BOM",
  "bombay": "BOM",
  "goa": "GOI",
  "bengaluru": "BLR",
  "bangalore": "BLR",
  "hyderabad": "HYD",
  "kolkata": "CCU",
  "calcutta": "CCU",
  "chennai": "MAA",
  "pune": "PNQ",
  "jaipur": "JAI",
  "lucknow": "LKO",

  // International
  "dubai": "DXB",
  "abu dhabi": "AUH",
  "paris": "CDG",
  "london": "LHR",
  "new york": "JFK",
  "los angeles": "LAX",
  "doha": "DOH",

  "default": "DEL"
};

function cityToIATA(city) {
  if (!city) return IATA_MAP.default;
  const key = String(city).trim().toLowerCase();
  if (IATA_MAP[key]) return IATA_MAP[key];
  if (/^[a-zA-Z]{3}$/.test(key)) return key.toUpperCase(); // user entered IATA directly
  return IATA_MAP.default;
}

// ---------------------------------------------
// Amadeus Client
// ---------------------------------------------

const AMA_CLIENT_ID = process.env.AMA_CLIENT_ID;
const AMA_CLIENT_SECRET = process.env.AMA_CLIENT_SECRET;

let amadeus = null;

if (AMA_CLIENT_ID && AMA_CLIENT_SECRET) {
  amadeus = new Amadeus({
    clientId: AMA_CLIENT_ID,
    clientSecret: AMA_CLIENT_SECRET,
  });
  console.log("✔ Amadeus client configured.");
} else {
  console.log("⚠ Amadeus credentials missing — using fallback flight price.");
}

// ---------------------------------------------
// Helpers
// ---------------------------------------------

function daysBetween(start, end) {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  } catch {
    return 1;
  }
}

const FALLBACK_FLIGHT_PRICE = 6000;

// ---------------------------------------------
// Get Live Flight Price from Amadeus
// ---------------------------------------------

async function getFlightPrice(originIATA, destinationIATA, departureDate) {
  if (!amadeus) {
    return { price: FALLBACK_FLIGHT_PRICE, source: "fallback" };
  }

  try {
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: originIATA,
      destinationLocationCode: destinationIATA,
      departureDate,
      adults: 1,
      currencyCode: "INR",
      max: 5,
    });

    const flights = response.data;
    if (!flights || flights.length === 0) {
      return { price: FALLBACK_FLIGHT_PRICE, source: "fallback" };
    }

    let lowest = Math.min(
      ...flights.map(f => Number(f.price.total) || FALLBACK_FLIGHT_PRICE)
    );

    return { price: Math.round(lowest), source: "amadeus" };
  } catch (error) {
    console.log("⚠ Amadeus API Error:", error?.response?.data || error);
    return { price: FALLBACK_FLIGHT_PRICE, source: "fallback" };
  }
}

// ---------------------------------------------
// POST /api/estimate
// ---------------------------------------------

app.post("/api/estimate", async (req, res) => {
  try {
    const form = req.body;

    const nights = daysBetween(form.startDate, form.endDate);
    const travelers = Math.max(1, Number(form.travelers || 1));

    // ⭐ FIXED: Declare IATA BEFORE using it
    const originIATA = cityToIATA(form.origin);
    const destinationIATA = cityToIATA(form.destination);

    const flight = await getFlightPrice(originIATA, destinationIATA, form.startDate);

    const hotelRates = { budget: 1200, mid: 2500, luxury: 6500 };

    const rooms = Math.ceil(travelers / 2);

    const breakdown = {
      transportation: flight.price * travelers,
      accommodation: hotelRates[form.accommodation] * nights * rooms,
      food: 500 * nights * travelers,
      activities: 1200 * travelers,
      misc: 300 * travelers,
      flightPerPerson: flight.price,
      flightSource: flight.source
    };

    let totalCost = breakdown.transportation + breakdown.accommodation + breakdown.food + breakdown.activities + breakdown.misc;

    const trip = {
      id: Date.now().toString(),
      ...form,
      originIATA,
      destinationIATA,
      breakdown,
      totalCost,
      meta: { nights, roomsNeeded: rooms },
      createdAt: new Date().toISOString()
    };

    trips.unshift(trip);
    await saveTrips(trips);

    res.json(trip);

  } catch (err) {
    console.error("Estimate error:", err);
    res.status(500).json({ error: "Estimation failed" });
  }
});

// ---------------------------------------------
// GET /api/trips
// ---------------------------------------------

app.get("/api/trips", async (req, res) => {
  trips = await loadTrips();
  res.json(trips);
});

// ---------------------------------------------
// POST /api/trips
// ---------------------------------------------

app.post("/api/trips", async (req, res) => {
  const trip = req.body;
  trips.unshift(trip);
  await saveTrips(trips);
  res.json({ status: "saved" });
});

// ---------------------------------------------
// PDF Export
// ---------------------------------------------

app.post("/api/export-pdf", async (req, res) => {
  try {
    const trip = req.body;

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([600, 800]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    let y = 760;
    const write = (txt, size = 14) => {
      page.drawText(txt, { x: 50, y, size, font, color: rgb(0, 0, 0) });
      y -= 24;
    };

    write("TrulyTravels — Trip Summary", 18);
    write(`From: ${trip.origin} (${trip.originIATA})`);
    write(`To: ${trip.destination} (${trip.destinationIATA})`);
    write(`Dates: ${trip.startDate} to ${trip.endDate}`);
    write(`Travelers: ${trip.travelers}`);

    write("Cost Breakdown:", 16);
    write(`Transportation: INR ${trip.breakdown.transportation.toLocaleString()}`);
    write(`Accommodation: INR ${trip.breakdown.accommodation.toLocaleString()}`);
    write(`Food: INR ${trip.breakdown.food.toLocaleString()}`);
    write(`Activities: INR ${trip.breakdown.activities.toLocaleString()}`);
    write(`Misc: INR ${trip.breakdown.misc.toLocaleString()}`);
    write(`Total Cost: INR ${trip.totalCost.toLocaleString()}`, 18);

    const pdfBytes = await pdf.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=trip-summary.pdf");
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error("PDF Error:", err);
    res.status(500).send("PDF generation failed");
  }
});

// ---------------------------------------------
// FALLBACK ROUTE
// ---------------------------------------------

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------------------------------------

app.listen(PORT, () =>
  console.log(`✔ Server running at http://localhost:${PORT}`)
);
