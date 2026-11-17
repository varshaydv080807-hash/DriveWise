// DriveWise — customer view logic
// Plain JavaScript. The map uses Leaflet (vendor/leaflet).
//
// Two data modes:
// - LIVE: vehicles, bookings and the profile come from the backend API (api.js).
//   Booking and cancelling write to the MySQL database through the API.
// - DEMO: if the server can't be reached, the page falls back to the mock data in
//   customer-data.js and keeps everything in localStorage, and says so in a banner.

(function () {
  "use strict";

  let LIVE = false;          // true once data has loaded from the backend
  let SLOTS_KNOWN = false;   // true if the backend told us which dates are booked
  let liveProblem = "";      // why we fell back to demo data

  /* ==================================================================
     Helpers
  ================================================================== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const DAY_MS = 24 * 60 * 60 * 1000;
  const STORAGE_KEY = "drivewise_customer_v2";

  const rupees = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Date -> "YYYY-MM-DDTHH:MM" (local time) for <input type="datetime-local"> and storage
  function toInputValue(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const parseInput = (v) => (v ? new Date(v) : null);
  const asDate = (v) => (v instanceof Date ? v : new Date(v));

  const fmtDateTime = (v) => asDate(v).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const fmtDate = (v) => asDate(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const rentalDays = (pickup, dropoff) => Math.max(1, Math.ceil((dropoff - pickup) / DAY_MS));

  // Day offset from today (see customer-data.js) -> Date
  function atOffset(days, hhmm = "00:00") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    const [h, m] = hhmm.split(":").map(Number);
    d.setHours(h, m, 0, 0);
    return d;
  }

  // The hidden attribute loses to CSS display rules, so hide with inline style
  const setShown = (el, shown) => { if (el) el.style.display = shown ? "" : "none"; };

  const byId = (list, id) => list.find((x) => x.id === id);
  const ownerOf = (v) => byId(DW_OWNERS, v.ownerId);
  const locationOf = (id) => byId(DW_LOCATIONS, id);
  const vehicleOf = (id) => byId(DW_VEHICLES, id);
  const driverOf = (id) => (id ? byId(DW_DRIVERS, id) : null);
  const vName = (v) => `${v.make} ${v.model}`;

  function initials(name) {
    return String(name).trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase() || "?";
  }

  function tint(hex, amount = 0.8) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (c) => Math.round(c + (255 - c) * amount);
    return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
  }

  // Small deterministic hash so the same booking always gets the same simulated route
  function hash(str) {
    let h = 0;
    for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h;
  }

  /* ==================================================================
     Photos (Wikimedia Commons) with drawn fallback
  ================================================================== */
  const WIKI_FILEPATH = "https://commons.wikimedia.org/wiki/Special:FilePath/";

  // Live vehicles carry a full image URL (Vehicle_Image_URL); demo ones a Wikimedia file name.
  function photoUrl(v, width = 640) {
    if (v.imageUrl) {
      return v.imageUrl.startsWith(WIKI_FILEPATH) && !v.imageUrl.includes("?")
        ? `${v.imageUrl}?width=${width}` : v.imageUrl;
    }
    return `${WIKI_FILEPATH}${encodeURIComponent(v.photo)}?width=${width}`;
  }
  function photoPage(v) {
    if (v.imageUrl) {
      return v.imageUrl.startsWith(WIKI_FILEPATH)
        ? "https://commons.wikimedia.org/wiki/File:" + v.imageUrl.slice(WIKI_FILEPATH.length).split("?")[0]
        : v.imageUrl;
    }
    return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(v.photo)}`;
  }
  const hasPhoto = (v) => Boolean(v.imageUrl || v.photo);

  function photoHTML(v, width = 640, cls = "vphoto") {
    if (!hasPhoto(v)) {
      return `<div class="vphoto-fallback" style="background:${tint(v.color)}">${vehicleArt(v)}</div>`;
    }
    return `<img class="${cls}" src="${esc(photoUrl(v, width))}" alt="${esc(vName(v))}" loading="lazy" decoding="async" data-vid="${v.id}">`;
  }

  // If a photo fails (offline, or the file moved), draw the vehicle instead
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (img.tagName !== "IMG" || !img.dataset.vid) return;
    const v = vehicleOf(img.dataset.vid);
    const box = document.createElement("div");
    box.className = "vphoto-fallback";
    box.style.background = tint(v.color);
    box.innerHTML = vehicleArt(v);
    img.replaceWith(box);
  }, true);

  function wheel(x, y, r) {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#1A1433"/><circle cx="${x}" cy="${y}" r="${r * 0.42}" fill="#B9B4CC"/>`;
  }

  function vehicleArt(v) {
    const c = v.color;
    const stroke = `stroke="#1A1433" stroke-width="2" stroke-linejoin="round"`;
    const glass = `fill="#BFD3EF" ${stroke}`;
    const shapes = {
      hatchback: `<path d="M10 60 L14 44 Q18 38 30 36 L62 34 L84 18 Q90 14 100 14 L136 14 Q148 14 156 26 L168 38 Q186 40 190 48 L192 62 Q192 66 186 66 L14 66 Q10 66 10 60 Z" fill="${c}" ${stroke}/>
        <path d="M70 34 L88 20 L118 20 L118 34 Z" ${glass}/><path d="M124 20 L138 20 Q148 22 154 34 L124 34 Z" ${glass}/>${wheel(50, 66, 14)}${wheel(154, 66, 14)}`,
      sedan: `<path d="M6 58 L10 46 Q14 40 30 38 L58 36 L80 20 Q86 16 96 16 L130 16 Q140 16 148 26 L158 38 L184 40 Q193 42 194 50 L194 62 Q194 66 189 66 L11 66 Q6 66 6 58 Z" fill="${c}" ${stroke}/>
        <path d="M66 36 L84 22 L112 22 L112 36 Z" ${glass}/><path d="M118 22 L132 22 Q140 22 146 30 L150 36 L118 36 Z" ${glass}/>${wheel(46, 66, 14)}${wheel(158, 66, 14)}`,
      suv: `<path d="M8 60 L10 40 Q12 34 22 34 L54 32 L70 12 Q74 8 82 8 L154 8 Q164 8 170 18 L182 34 Q192 36 193 44 L193 62 Q193 66 188 66 L12 66 Q8 66 8 60 Z" fill="${c}" ${stroke}/>
        <path d="M60 32 L74 14 L112 14 L112 32 Z" ${glass}/><path d="M118 14 L154 14 Q162 14 166 22 L172 32 L118 32 Z" ${glass}/>${wheel(48, 66, 15)}${wheel(156, 66, 15)}`,
      muv: `<path d="M6 60 L8 42 Q10 36 20 35 L42 34 L60 12 Q64 8 72 8 L176 8 Q186 8 189 18 L194 34 L194 62 Q194 66 189 66 L10 66 Q6 66 6 60 Z" fill="${c}" ${stroke}/>
        <path d="M48 34 L64 14 L98 14 L98 34 Z" ${glass}/><path d="M104 14 L140 14 L140 34 L104 34 Z" ${glass}/><path d="M146 14 L178 14 Q184 14 186 22 L188 34 L146 34 Z" ${glass}/>${wheel(42, 66, 15)}${wheel(160, 66, 15)}`,
      bike: `<circle cx="42" cy="62" r="20" fill="none" stroke="#1A1433" stroke-width="7"/><circle cx="158" cy="62" r="20" fill="none" stroke="#1A1433" stroke-width="7"/>
        <path d="M42 62 L80 44 L120 44 L158 62" fill="none" stroke="#645E7A" stroke-width="5" stroke-linecap="round"/><path d="M150 62 L138 24" stroke="#645E7A" stroke-width="5" stroke-linecap="round"/>
        <path d="M130 22 L148 18" stroke="#1A1433" stroke-width="5" stroke-linecap="round"/><path d="M84 40 Q92 20 116 22 L132 30 Q130 42 118 44 L84 44 Z" fill="${c}" ${stroke}/>
        <path d="M52 38 Q62 32 84 34 L84 42 L58 44 Z" fill="#1A1433"/>`,
      scooter: `${wheel(46, 66, 14)}${wheel(150, 66, 14)}<path d="M24 58 Q22 40 40 36 L84 34 Q92 34 92 42 L92 52 L120 52 L136 18 L146 18 L140 34 Q162 40 166 60 L166 62 L24 62 Z" fill="${c}" ${stroke}/>
        <path d="M42 32 Q48 24 80 26 L84 34 L40 36 Z" fill="#1A1433"/><path d="M132 16 L152 12" stroke="#1A1433" stroke-width="5" stroke-linecap="round"/>`
    };
    return `<svg viewBox="0 0 200 86" role="img" aria-label="${esc(vName(v))}"><ellipse cx="100" cy="80" rx="92" ry="5" fill="rgba(26,20,51,.15)"/>${shapes[v.body] || ""}</svg>`;
  }

  const heartIcon = (filled) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
  const closeIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const pinIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9.5" r="2.5" fill="currentColor"/></svg>`;

  /* ==================================================================
     Pricing, availability, drivers
  ================================================================== */
  // Live vehicles: real booked slots from the database. Demo vehicles: day offsets.
  const ownerBlocks = (v) => (v.blocks ? v.blocks : v.booked.map(([a, b]) => [atOffset(a), atOffset(b + 1)]));
  const overlaps = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;
  const isActiveStatus = (status) => status === "confirmed" || status === "pending";

  function isFree(v, pickup, dropoff, ignoreBookingId) {
    if (v.available === false) return false;
    for (const [s, e] of ownerBlocks(v)) if (overlaps(pickup, dropoff, s, e)) return false;
    for (const b of store.bookings) {
      if (b.vehicleId !== v.id || !isActiveStatus(b.status) || b.id === ignoreBookingId) continue;
      if (overlaps(pickup, dropoff, new Date(b.pickup), new Date(b.dropoff))) return false;
    }
    return true;
  }

  // Live prices are per hour, exactly like the calculate_booking_amount procedure:
  // hours between pickup and return × Price_Per_Hour.
  const rentalHours = (pickup, dropoff) => Math.max(0, (dropoff - pickup) / (60 * 60 * 1000));
  const fmtHours = (h) => {
    const r = Math.round(h * 100) / 100;
    return `${r.toLocaleString("en-IN", { maximumFractionDigits: 2 })} hour${r === 1 ? "" : "s"}`;
  };
  const unitPrice = (v) => (LIVE ? v.pricePerHour : v.pricePerDay);
  const unitLabel = () => (LIVE ? "per hour" : "per day");

  function quote(v, pickup, dropoff, addonIds, opts = {}) {
    if (LIVE) {
      const hours = rentalHours(pickup, dropoff);
      const total = Math.round(hours * v.pricePerHour * 100) / 100;
      return { hours, days: rentalDays(pickup, dropoff), rentalCost: total, addonCost: 0, driverCost: 0, deliveryCost: 0, tax: 0, deposit: 0, total };
    }
    const days = rentalDays(pickup, dropoff);
    const rentalCost = v.pricePerDay * days;
    const addonCost = addonIds.reduce((sum, id) => sum + byId(DW_ADDONS, id).price * days, 0);
    const driverCost = opts.driver ? DW_PRICING.driverPerDay * days : 0;
    const deliveryCost = opts.door ? DW_PRICING.deliveryFee[v.type] : 0;
    const subtotal = rentalCost + addonCost + driverCost + deliveryCost;
    const tax = Math.round(subtotal * DW_PRICING.taxRate);
    return { days, rentalCost, addonCost, driverCost, deliveryCost, tax, deposit: v.deposit, total: subtotal + tax };
  }

  function driverBusy(driverId, pickup, dropoff, ignoreBookingId) {
    return store.bookings.some((b) => b.driverId === driverId && b.status === "confirmed" && b.id !== ignoreBookingId &&
      overlaps(pickup, dropoff, new Date(b.pickup), new Date(b.dropoff)));
  }

  // Best-rated free driver near the vehicle's pickup point, else any free driver
  function findDriver(v, pickup, dropoff) {
    const free = DW_DRIVERS.filter((d) => !driverBusy(d.id, pickup, dropoff));
    const near = free.filter((d) => d.locationIds.includes(v.locationId));
    const pool = near.length ? near : free;
    return pool.sort((a, b) => b.rating - a.rating || b.years - a.years)[0] || null;
  }

  /* ==================================================================
     Persistent state
  ================================================================== */
  function buildSampleBooking(s) {
    const v = vehicleOf(s.vehicleId);
    const pickup = atOffset(s.start[0], s.start[1]);
    const dropoff = atOffset(s.end[0], s.end[1]);
    const door = s.delivery.mode === "door";
    const q = quote(v, pickup, dropoff, s.addons, { driver: Boolean(s.driverId), door });
    const addr = door ? byId(DW_DEFAULT_CUSTOMER.addresses, s.delivery.addressId) : null;
    let created = atOffset(s.booked, "12:30");
    if (created > new Date()) created = new Date(Date.now() - 60 * 60 * 1000);
    return {
      id: s.id, vehicleId: v.id, locationId: v.locationId,
      pickup: toInputValue(pickup), dropoff: toInputValue(dropoff),
      addons: s.addons.slice(), driverId: s.driverId,
      delivery: door ? { mode: "door", label: addr.label, line: addr.line, lat: addr.lat, lng: addr.lng } : { mode: "hub" },
      ...q, status: s.status, createdAt: toInputValue(created),
      cancelledAt: s.status === "cancelled" ? toInputValue(new Date(created.getTime() + DAY_MS)) : null
    };
  }

  function freshState() {
    return {
      customer: JSON.parse(JSON.stringify(DW_DEFAULT_CUSTOMER)),
      bookings: DW_SAMPLE_BOOKINGS.map(buildSampleBooking),
      saved: ["VH103", "VH302", "VH112"]
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.customer && Array.isArray(s.bookings) && Array.isArray(s.saved)) return s;
      }
    } catch (e) { /* storage blocked: use defaults */ }
    return freshState();
  }

  function saveState() {
    try {
      // Live mode: the database holds bookings and the profile; only saved vehicles stay in the browser
      if (LIVE) localStorage.setItem(LIVE_SAVED_KEY, JSON.stringify(store.saved));
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) { /* ignore */ }
  }

  let store = loadState();

  /* ==================================================================
     Live data from the backend API
  ================================================================== */
  const LIVE_SAVED_KEY = "drivewise_saved_live";
  const CITY_CENTRES = {
    "new delhi": [28.6139, 77.2090], delhi: [28.6139, 77.2090], gurugram: [28.4595, 77.0266],
    gurgaon: [28.4595, 77.0266], noida: [28.5355, 77.3910], faridabad: [28.4089, 77.3178], ghaziabad: [28.6692, 77.4538]
  };
  const COLOURS = ["#C8412F", "#2E6E8E", "#3F5A3A", "#8A8F96", "#1F4E8C", "#A31F34", "#5B5F66", "#E86A10", "#25303B", "#9A3B2E"];

  const num = (x) => (x === null || x === undefined || x === "" ? null : Number(x));

  function vehicleTypeOf(row) {
    const cat = String(row.Vehicle_Category || "").toLowerCase();
    if (cat === "scooter") return "scooter";
    if (cat === "bike") return /activa|scooty|jupiter|access|scooter/i.test(`${row.Model} ${row.Type_Name}`) ? "scooter" : "bike";
    return "car";
  }

  function bodyOf(row, type) {
    if (type !== "car") return type;
    const t = String(row.Type_Name || "").toLowerCase();
    if (t.includes("hatch")) return "hatchback";
    if (t.includes("sedan")) return "sedan";
    if (t.includes("muv") || t.includes("traveller") || t.includes("van")) return "muv";
    if (t.includes("suv") || t.includes("off")) return "suv";
    return "sedan";
  }

  // Turn one row from GET /api/vehicles into the shape the page uses
  function mapVehicle(row, locations) {
    const type = vehicleTypeOf(row);
    const city = row.City || "Delhi NCR";
    const placeName = row.Pickup_Address || city;
    const locId = "L" + hash(`${placeName}|${city}`);
    if (!locations.has(locId)) {
      const centre = CITY_CENTRES[city.toLowerCase()] || CITY_CENTRES.delhi;
      const lat = num(row.Latitude), lng = num(row.Longitude);
      locations.set(locId, { id: locId, name: placeName, city, lat: lat ?? centre[0], lng: lng ?? centre[1] });
    }
    const features = [];
    if (row.Type_Name) features.push(row.Type_Name);
    if (Number(row.GPS_Enabled) === 1) features.push("GPS tracked");
    if (row.Manufacture_Year) features.push(`${row.Manufacture_Year} model`);
    const pricePerHour = Number(row.Price_Per_Hour) || 0;
    return {
      id: "V" + row.Vehicle_ID,
      dbId: row.Vehicle_ID,
      type,
      body: bodyOf(row, type),
      make: row.Brand || "Vehicle",
      model: row.Model || `#${row.Vehicle_ID}`,
      year: row.Manufacture_Year || "",
      plate: row.Registration_No || `DW ${row.Vehicle_ID}`,
      color: COLOURS[hash(String(row.Registration_No || row.Vehicle_ID)) % COLOURS.length],
      imageUrl: row.Vehicle_Image_URL || null,
      fuel: row.Fuel_Type || "Petrol",
      transmission: null,
      seats: num(row.Seating_Capacity) ?? (type === "car" ? 5 : 2),
      pricePerHour,
      pricePerDay: pricePerHour * 24,
      deposit: 0,
      kmLimit: null,
      gps: Number(row.GPS_Enabled) === 1,
      ownerId: "P" + row.Provider_ID,
      locationId: locId,
      features,
      booked: [],
      blocks: [],
      available: row.Status === "Available",
      listed: row.Vehicle_Verification_Status === "Verified"
    };
  }

  function mapOwner(row) {
    return {
      id: "P" + row.Provider_ID,
      type: String(row.Provider_Type || "").toLowerCase() === "individual" ? "individual" : "company",
      name: row.Provider_Name || `Provider ${row.Provider_ID}`,
      rating: num(row.Provider_Rating),
      trips: num(row.Provider_Review_Count) || 0,
      since: null,
      phone: null
    };
  }

  // Turn one row from GET /api/bookings/my into the shape the page uses
  function mapBooking(row) {
    const v = vehicleOf("V" + row.Vehicle_ID);
    const pickup = DW_API.parseSqlDateTime(row.Start_DateTime);
    const dropoff = DW_API.parseSqlDateTime(row.End_DateTime);
    const total = Number(row.Total_Amount) || 0;
    return {
      id: "DW-" + row.Booking_ID,
      dbId: row.Booking_ID,
      vehicleId: "V" + row.Vehicle_ID,
      locationId: v ? v.locationId : null,
      pickup: toInputValue(pickup),
      dropoff: toInputValue(dropoff),
      addons: [], driverId: null, delivery: { mode: "hub" },
      hours: rentalHours(pickup, dropoff),
      days: rentalDays(pickup, dropoff),
      rate: Number(row.Price_Per_Hour_Snapshot) || (v ? v.pricePerHour : 0),
      rentalCost: total, addonCost: 0, driverCost: 0, deliveryCost: 0, tax: 0, deposit: 0, total,
      status: String(row.Booking_Status || "Pending").toLowerCase(),
      createdAt: null, cancelledAt: null
    };
  }

  // Replace the contents of a mock-data array in place (the arrays are const)
  function replaceAll(arr, items) { arr.length = 0; items.forEach((x) => arr.push(x)); }

  const session = () => (LIVE ? DW_API.getUser() : null);
  const isCustomer = () => { const u = session(); return Boolean(u && u.userRole === "Customer"); };

  function guestCustomer() {
    return { id: null, name: "Guest", email: "", phone: "", licenseNo: "", licenseVerified: false, city: "Delhi", addresses: [] };
  }

  function readLiveSaved() {
    try { const s = JSON.parse(localStorage.getItem(LIVE_SAVED_KEY)); return Array.isArray(s) ? s : []; } catch (e) { return []; }
  }

  async function loadLiveVehicles() {
    const [vRes, sRes] = await Promise.all([
      DW_API.getVehicles(),
      DW_API.getBookedSlots().catch(() => null) // older backends don't have this endpoint
    ]);
    const rows = (vRes && vRes.vehicles) || [];
    const locations = new Map();
    const owners = new Map();
    const vehicles = rows.map((r) => {
      if (!owners.has("P" + r.Provider_ID)) owners.set("P" + r.Provider_ID, mapOwner(r));
      return mapVehicle(r, locations);
    });

    SLOTS_KNOWN = Boolean(sRes && Array.isArray(sRes.slots));
    if (SLOTS_KNOWN) {
      const byVehicle = new Map(vehicles.map((v) => [v.dbId, v]));
      sRes.slots.forEach((s) => {
        const v = byVehicle.get(s.Vehicle_ID);
        if (v) v.blocks.push([DW_API.parseSqlDateTime(s.Start_DateTime), DW_API.parseSqlDateTime(s.End_DateTime)]);
      });
    }

    replaceAll(DW_VEHICLES, vehicles);
    replaceAll(DW_OWNERS, [...owners.values()]);
    replaceAll(DW_LOCATIONS, [...locations.values()].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name)));
  }

  // Bookings + profile of the logged-in customer
  async function loadLiveCustomer() {
    const user = DW_API.getUser();
    store.customer = guestCustomer();
    store.bookings = [];
    if (!user) return;
    store.customer.name = user.name || "Customer";
    store.customer.email = user.email || "";
    if (user.userRole !== "Customer") return;

    const [pRes, bRes] = await Promise.all([DW_API.getProfile(), DW_API.getMyBookings()]);
    const p = pRes.user || {};
    Object.assign(store.customer, {
      id: p.User_ID, name: p.Name || store.customer.name, email: p.Email || store.customer.email,
      phone: p.Phone || "", licenseNo: p.Driving_License_No || "", licenseVerified: Boolean(p.Driving_License_No)
    });
    store.bookings = (bRes.bookings || []).map(mapBooking);
  }

  // Reload vehicles, booked slots and the customer's trips after a change
  async function refreshLive() {
    await loadLiveVehicles();
    await loadLiveCustomer();
  }

  async function startLive() {
    if (!window.DW_API) throw new Error("api.js didn't load");
    await loadLiveVehicles();
    LIVE = true;
    store = { customer: guestCustomer(), bookings: [], saved: readLiveSaved() };
    try {
      await loadLiveCustomer();
    } catch (e) {
      if (e.status === 401) { DW_API.logout(); store.customer = guestCustomer(); }
      else showBanner(`Vehicles loaded, but your trips couldn't be loaded: ${e.message}`, true);
    }
  }

  /* ---------------- Banner + loading state ---------------- */
  function showBanner(text, isError, withRetry) {
    let b = $("#dataBanner");
    if (!b) {
      b = document.createElement("div");
      b.id = "dataBanner";
      b.setAttribute("role", "status");
      $("#main").prepend(b);
    }
    b.className = "data-banner" + (isError ? " is-error" : "");
    b.innerHTML = `<span>${esc(text)}</span>${withRetry ? `<button class="btn btn-ghost" type="button" data-action="retry-live">Try again</button>` : ""}`;
    b.hidden = false;
  }

  function showLoading() {
    $("#listing").innerHTML = `<li class="loading-row"><span class="spinner" aria-hidden="true"></span><span id="loadingText">Loading vehicles…</span></li>`;
    $("#resultsSummary").textContent = "";
    return setTimeout(() => {
      const t = $("#loadingText");
      if (t) t.textContent = "Waking up the DriveWise server. The first load can take up to a minute…";
    }, 4000);
  }

  function loginUrl(hashName) {
    return `login.html?next=${encodeURIComponent("customer-portal.html" + (hashName ? "#" + hashName : ""))}`;
  }

  /* ==================================================================
     Search + filter state
  ================================================================== */
  const search = { type: "all", location: "all", pickup: atOffset(1, "10:00"), dropoff: atOffset(3, "10:00") };
  let PRICE_MAX = 6000; // per day in demo mode, per hour in live mode (set in setupBrowse)
  const filters = { text: "", fuel: new Set(), trans: new Set(), owner: new Set(), seats: 0, maxPrice: PRICE_MAX, driver: false, onlyFree: true, sort: "recommended" };
  let tripTab = "upcoming";

  /* ==================================================================
     Browse
  ================================================================== */
  function setupBrowse() {
    const locSel = $("#searchLocation");
    DW_LOCATIONS.forEach((l) => locSel.insertAdjacentHTML("beforeend", `<option value="${l.id}">${esc(l.name)}, ${esc(l.city)}</option>`));

    const minNow = toInputValue(new Date());
    $("#searchPickup").value = toInputValue(search.pickup);
    $("#searchDropoff").value = toInputValue(search.dropoff);
    $("#searchPickup").min = minNow;
    $("#searchDropoff").min = minNow;

    const chip = (value) => `<label class="chip"><input type="checkbox" value="${esc(value)}"><span>${esc(value)}</span></label>`;
    const listed = DW_VEHICLES.filter((v) => v.listed !== false);
    [...new Set(listed.map((v) => v.fuel).filter(Boolean))].forEach((f) => $("#fFuel").insertAdjacentHTML("beforeend", chip(f)));
    const gearboxes = [...new Set(listed.map((v) => v.transmission).filter(Boolean))];
    gearboxes.forEach((t) => $("#fTrans").insertAdjacentHTML("beforeend", chip(t)));
    setShown($("#fTrans").closest("fieldset"), gearboxes.length > 0);

    if (LIVE) {
      // Prices in the database are per hour; drivers aren't part of the backend yet
      const top = Math.max(50, ...listed.map((v) => v.pricePerHour));
      PRICE_MAX = Math.ceil(top / 10) * 10;
      const range = $("#fPrice");
      Object.assign(range, { min: 10, max: PRICE_MAX, step: 5, value: PRICE_MAX });
      range.closest(".field").querySelector(".field-label").firstChild.textContent = "Max price per hour: ";
      setShown($("#fDriver").closest(".toggle"), false);
      // Doorstep delivery and drivers aren't in the backend yet, so don't promise them
      $("#browseTitle").textContent = "Pick it up nearby. Pay by the hour.";
      $(".hero-text p").textContent = "Cars, bikes and scooters from rental companies and local owners across Delhi NCR. Book for a few hours or a few days.";
    }
    filters.maxPrice = PRICE_MAX;
    $("#fPriceOut").textContent = rupees(PRICE_MAX);

    // Featured vehicle in the hero
    const feat = LIVE
      ? (listed.find((v) => /thar/i.test(v.model) && hasPhoto(v)) || listed.find(hasPhoto) || listed[0])
      : vehicleOf("VH103");
    $("#heroPhoto").innerHTML = feat ? `
      ${photoHTML(feat, 960, "hero-img")}
      <figcaption>
        <span class="plate plate-sm">${esc(feat.plate)}</span>
        <span>${esc(vName(feat))} from ${rupees(unitPrice(feat))} ${LIVE ? "an hour" : "a day"}</span>
        <button class="btn btn-go btn-sm" type="button" data-open="${feat.id}">View</button>
      </figcaption>` : "";

    $$('input[name="type"]').forEach((r) => r.addEventListener("change", () => { search.type = r.value; renderListing(); }));
    locSel.addEventListener("change", () => { search.location = locSel.value; renderListing(); });

    $("#searchForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const p = parseInput($("#searchPickup").value);
      const d = parseInput($("#searchDropoff").value);
      const msg = dateProblem(p, d);
      const err = $("#searchError");
      err.hidden = !msg;
      err.textContent = msg;
      if (msg) return;
      search.pickup = p;
      search.dropoff = d;
      renderListing();
      $("#results").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });

    $("#fText").addEventListener("input", (e) => { filters.text = e.target.value.trim().toLowerCase(); renderListing(); });
    const bindSet = (wrap, set) => $(wrap).addEventListener("change", (e) => {
      if (e.target.checked) set.add(e.target.value); else set.delete(e.target.value);
      renderListing();
    });
    bindSet("#fFuel", filters.fuel);
    bindSet("#fTrans", filters.trans);
    bindSet("#fOwner", filters.owner);
    $("#fSeats").addEventListener("change", (e) => { filters.seats = Number(e.target.value); renderListing(); });
    $("#fPrice").addEventListener("input", (e) => {
      filters.maxPrice = Number(e.target.value);
      $("#fPriceOut").textContent = rupees(filters.maxPrice);
      renderListing();
    });
    $("#fDriver").addEventListener("change", (e) => { filters.driver = e.target.checked; renderListing(); });
    $("#fAvail").addEventListener("change", (e) => { filters.onlyFree = e.target.checked; renderListing(); });
    $("#sortBy").addEventListener("change", (e) => { filters.sort = e.target.value; renderListing(); });
    $("#clearFilters").addEventListener("click", resetFilters);
  }

  function dateProblem(p, d) {
    if (!p || !d) return "Choose both a pickup and a return time.";
    if (p < new Date(Date.now() - 5 * 60 * 1000)) return "Pickup time has already passed. Choose a later time.";
    if (d <= p) return "Return time must be after pickup time.";
    if (rentalDays(p, d) > 30) return "Trips can be up to 30 days long. Shorten your dates.";
    return "";
  }

  function resetFilters() {
    Object.assign(filters, { text: "", seats: 0, maxPrice: PRICE_MAX, driver: false, onlyFree: true, sort: "recommended" });
    filters.fuel.clear(); filters.trans.clear(); filters.owner.clear();
    $("#fText").value = "";
    $$(".filters .chip input[type=checkbox]").forEach((c) => (c.checked = false));
    $('#fSeats input[value="0"]').checked = true;
    $("#fPrice").value = PRICE_MAX;
    $("#fPriceOut").textContent = rupees(PRICE_MAX);
    $("#fDriver").checked = false;
    $("#fAvail").checked = true;
    $("#sortBy").value = "recommended";
    renderListing();
  }

  function filteredVehicles() {
    const list = DW_VEHICLES.filter((v) => {
      const o = ownerOf(v);
      if (v.listed === false) return false; // live: only admin-verified vehicles can be booked
      if (search.type !== "all" && v.type !== search.type) return false;
      if (search.location !== "all" && v.locationId !== search.location) return false;
      if (filters.text && !`${vName(v)} ${o.name}`.toLowerCase().includes(filters.text)) return false;
      if (filters.fuel.size && !filters.fuel.has(v.fuel)) return false;
      if (filters.trans.size && !filters.trans.has(v.transmission)) return false;
      if (filters.owner.size && !filters.owner.has(o.type)) return false;
      if (v.seats < filters.seats) return false;
      if (unitPrice(v) > filters.maxPrice) return false;
      if (filters.driver && v.type !== "car") return false;
      if (filters.onlyFree && !isFree(v, search.pickup, search.dropoff)) return false;
      return true;
    });
    const busy = (v) => (isFree(v, search.pickup, search.dropoff) ? 0 : 1);
    const rating = (v) => ownerOf(v).rating || 0;
    const sorters = {
      recommended: (a, b) => busy(a) - busy(b) || rating(b) - rating(a) || unitPrice(a) - unitPrice(b),
      priceAsc: (a, b) => unitPrice(a) - unitPrice(b),
      priceDesc: (a, b) => unitPrice(b) - unitPrice(a),
      rating: (a, b) => rating(b) - rating(a)
    };
    return list.sort(sorters[filters.sort]);
  }

  // "★ 4.6 (2,140 trips)" in demo mode; real review average in live mode
  function ownerRatingText(o) {
    if (o.rating === null || o.rating === undefined) return "New on DriveWise";
    return LIVE
      ? `<span class="star" aria-hidden="true">★</span> ${Number(o.rating).toFixed(1)} (${plural(o.trips, "review")})`
      : `<span class="star" aria-hidden="true">★</span> ${o.rating.toFixed(1)} (${o.trips.toLocaleString("en-IN")} trips)`;
  }

  function specsHTML(v) {
    return [
      `<li>${esc(v.fuel)}</li>`,
      v.transmission ? `<li>${esc(v.transmission)}</li>` : "",
      `<li>${v.seats} seats</li>`,
      v.kmLimit ? `<li>${v.kmLimit} km/day free</li>` : "",
      LIVE && v.gps ? `<li>GPS tracked</li>` : ""
    ].join("");
  }

  function rowHTML(v) {
    const o = ownerOf(v);
    const loc = locationOf(v.locationId);
    const free = isFree(v, search.pickup, search.dropoff);
    const q = quote(v, search.pickup, search.dropoff, []);
    const saved = store.saved.includes(v.id);
    const statusText = free ? "Free for your dates"
      : v.available === false ? "Not available right now"
      : "Already booked for some of your dates";

    return `
      <li class="row${free ? "" : " is-busy"}">
        <div class="row-photo">${photoHTML(v)}<span class="plate plate-sm row-plate">${esc(v.plate)}</span></div>
        <div class="row-main">
          <div class="row-title">
            <h3>${esc(vName(v))}</h3>
            <span class="year">${v.year}</span>
          </div>
          <div class="row-owner">
            <span class="tag ${o.type === "company" ? "tag-co" : "tag-owner"}">${o.type === "company" ? "Rental company" : "Local owner"}</span>
            <strong>${esc(o.name)}</strong>
            <span>${ownerRatingText(o)}</span>
          </div>
          <ul class="specs">
            ${specsHTML(v)}
            ${!LIVE && v.type === "car" ? `<li class="spec-hi">Driver available</li>` : ""}
          </ul>
          <p class="row-loc">${pinIcon}<span>${esc(loc.name)}, ${esc(loc.city)}${LIVE ? "" : `. Doorstep delivery for ${rupees(DW_PRICING.deliveryFee[v.type])}`}</span></p>
          <p class="row-status ${free ? "ok" : "no"}">${statusText}</p>
        </div>
        <div class="row-side">
          <div class="price">
            <strong>${rupees(unitPrice(v))}</strong>
            <span>${unitLabel()}</span>
            <span>${rupees(q.rentalCost)} for ${LIVE ? fmtHours(q.hours) : plural(q.days, "day")}</span>
          </div>
          <div class="row-actions">
            <button class="iconbtn heart" type="button" data-save="${v.id}" aria-pressed="${saved}" aria-label="${saved ? "Remove from saved" : "Save"} ${esc(vName(v))}">${heartIcon(saved)}</button>
            <button class="btn btn-primary" type="button" data-open="${v.id}">View and book</button>
          </div>
        </div>
      </li>`;
  }

  function renderListing() {
    const list = filteredVehicles();
    const days = rentalDays(search.pickup, search.dropoff);
    const length = LIVE ? fmtHours(rentalHours(search.pickup, search.dropoff)) : plural(days, "day");
    $("#resultsSummary").textContent =
      `${plural(list.length, "vehicle")} for ${fmtDateTime(search.pickup)} to ${fmtDateTime(search.dropoff)} (${length})`;
    $("#listing").innerHTML = list.length
      ? list.map(rowHTML).join("")
      : `<li class="empty">
          <h3>Nothing matches these filters</h3>
          <p>Try another pickup point, raise the price limit, or include vehicles that are booked for part of your dates.</p>
          <button class="btn btn-primary" type="button" data-action="reset-filters">Reset filters</button>
        </li>`;
  }

  /* ==================================================================
     Saved
  ================================================================== */
  function toggleSaved(id) {
    const i = store.saved.indexOf(id);
    const v = vehicleOf(id);
    if (i >= 0) { store.saved.splice(i, 1); toast(`Removed ${vName(v)} from saved`); }
    else { store.saved.push(id); toast(`Saved ${vName(v)}`); }
    saveState();
    renderListing(); renderSaved(); renderProfile(); updateCounts();
  }

  function renderSaved() {
    const vs = store.saved.map(vehicleOf).filter((v) => v && v.listed !== false);
    $("#savedList").innerHTML = vs.length
      ? vs.map(rowHTML).join("")
      : `<li class="empty"><h3>No saved vehicles yet</h3><p>Tap the heart on any vehicle to keep it here while you decide.</p><a class="btn btn-primary" href="#browse">Find a ride</a></li>`;
  }

  /* ==================================================================
     Side sheet: vehicle details + booking form
  ================================================================== */
  const sheet = $("#sheet");
  let sheetVehicle = null;

  function openSheet(html) {
    $("#sheetBody").innerHTML = html;
    if (!sheet.open) sheet.showModal();
    sheet.scrollTop = 0;
  }

  function sheetHeader(v, extra = "") {
    return `
      <div class="sheet-photo">
        ${photoHTML(v, 960)}
        <button class="iconbtn sheet-close" type="button" data-action="close-sheet" aria-label="Close">${closeIcon}</button>
        <span class="plate plate-lg sheet-plate">${esc(v.plate)}</span>
        ${extra}
      </div>`;
  }

  function addressOptions(selectedId) {
    return store.customer.addresses.map((a) =>
      `<option value="${a.id}" ${a.id === selectedId ? "selected" : ""}>${esc(a.label)}: ${esc(a.line)}</option>`).join("") +
      `<option value="new">Somewhere else…</option>`;
  }

  function openVehicle(id) {
    const v = vehicleOf(id);
    if (!v) return;
    sheetVehicle = v;
    const o = ownerOf(v);
    const loc = locationOf(v.locationId);
    const addons = DW_ADDONS.filter((a) => a.appliesTo.includes(v.type));
    const minNow = toInputValue(new Date());
    const isCar = v.type === "car";
    const fee = DW_PRICING.deliveryFee[v.type];

    openSheet(`
      ${sheetHeader(v)}
      <div class="sheet-section">
        <h2 id="sheetTitle">${esc(vName(v))} <span class="title-year">${v.year}</span></h2>
        <div class="person">
          <span class="avatar" aria-hidden="true">${esc(initials(o.name))}</span>
          <div>
            <strong>${esc(o.name)}</strong>
            <div class="muted small">${o.type === "company" ? "Rental company" : "Local owner"}${o.since ? ` on DriveWise since ${o.since}` : ""}. ${o.rating !== null && o.rating !== undefined
              ? `<span class="star" aria-hidden="true">★</span> ${Number(o.rating).toFixed(1)} from ${LIVE ? plural(o.trips, "review") : o.trips.toLocaleString("en-IN") + " trips"}`
              : "No reviews yet"}</div>
          </div>
        </div>
        <ul class="specs">${specsHTML(v)}</ul>
        <ul class="feature-list">${v.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      </div>

      <form id="bookForm" novalidate>
        <div class="sheet-section">
          <h3>When</h3>
          <div class="two-col">
            <label class="field"><span class="field-label">Pickup</span><input type="datetime-local" id="bPickup" min="${minNow}" value="${toInputValue(search.pickup)}" required></label>
            <label class="field"><span class="field-label">Return</span><input type="datetime-local" id="bDropoff" min="${minNow}" value="${toInputValue(search.dropoff)}" required></label>
          </div>
          <p class="row-status" id="bAvail" role="status"></p>
        </div>

        ${LIVE ? `
        <div class="sheet-section">
          <h3>Pickup point</h3>
          <div class="info-card">${pinIcon}<div><strong>${esc(loc.name)}, ${esc(loc.city)}</strong><span class="muted small">Return it to the same place.</span></div></div>
        </div>` : `
        <fieldset class="sheet-section">
          <legend class="sheet-legend">How you'll get it</legend>
          <div class="choices">
            <label class="choice">
              <input type="radio" name="handover" value="hub" checked>
              <span class="choice-body"><strong>Pick up at ${esc(loc.name)}</strong><small>${esc(loc.city)}. Return it to the same place.</small></span>
              <span class="choice-price">Free</span>
            </label>
            <label class="choice">
              <input type="radio" name="handover" value="door">
              <span class="choice-body"><strong>Drop it at my address</strong><small>We deliver at pickup time and collect it from the same address at the end.</small></span>
              <span class="choice-price">${rupees(fee)}</span>
            </label>
          </div>
          <div class="door-fields" id="doorFields" hidden>
            <label class="field"><span class="field-label">Delivery address</span>
              <select id="bAddress">${addressOptions(store.customer.addresses[0]?.id)}</select>
            </label>
            <label class="field" id="bNewAddrWrap" hidden><span class="field-label">Type the full address</span>
              <input id="bNewAddr" placeholder="House no., street, area, PIN code">
            </label>
          </div>
        </fieldset>

        ${isCar ? `
        <fieldset class="sheet-section">
          <legend class="sheet-legend">Who drives</legend>
          <div class="choices">
            <label class="choice">
              <input type="radio" name="drive" value="self" checked>
              <span class="choice-body"><strong>I'll drive</strong><small>Needs a verified driving licence.</small></span>
              <span class="choice-price">Included</span>
            </label>
            <label class="choice">
              <input type="radio" name="drive" value="driver">
              <span class="choice-body"><strong>Book with a driver</strong><small>A verified driver, up to 12 hours a day. You'll see their name and number once booked.</small></span>
              <span class="choice-price">${rupees(DW_PRICING.driverPerDay)}/day</span>
            </label>
          </div>
          <p class="muted small" id="bDriverNote"></p>
        </fieldset>` : ""}

        <div class="sheet-section">
          <h3>Extras</h3>
          <div class="choices">
            ${addons.map((a) => `
              <label class="choice choice-check">
                <input type="checkbox" value="${a.id}" name="addon">
                <span class="choice-body"><strong>${esc(a.name)}</strong><small>${esc(a.desc)}</small></span>
                <span class="choice-price">${rupees(a.price)}/day</span>
              </label>`).join("")}
          </div>
        </div>`}

        <div class="sheet-section">
          <h3>Price</h3>
          <dl class="bill" id="bBill"></dl>
          <p class="form-error" id="bError" role="alert" hidden></p>
        </div>

        <div class="sheet-footer">
          <div><strong class="footer-total" id="bTotal"></strong><div class="muted small">Pay at pickup</div></div>
          <button class="btn btn-go" type="submit" id="bSubmit">${LIVE && !session() ? "Log in to book" : "Confirm booking"}</button>
        </div>
      </form>`);

    const form = $("#bookForm");
    form.addEventListener("input", updateBookingSummary);
    form.addEventListener("change", updateBookingSummary);
    form.addEventListener("submit", submitBooking);
    updateBookingSummary();
  }

  function readBookingForm() {
    const f = $("#bookForm");
    const pickup = parseInput($("#bPickup").value);
    const dropoff = parseInput($("#bDropoff").value);
    const addonIds = $$('input[name="addon"]:checked', f).map((i) => i.value);
    // Live mode has no handover/driver/address fields
    const door = Boolean(f.elements.handover) && f.elements.handover.value === "door";
    const driver = Boolean(f.elements.drive) && f.elements.drive.value === "driver";
    const addrId = $("#bAddress") ? $("#bAddress").value : "";
    const newAddr = $("#bNewAddr") ? $("#bNewAddr").value.trim() : "";
    return { pickup, dropoff, addonIds, door, driver, addrId, newAddr };
  }

  function bookingProblem(v, s) {
    const dp = dateProblem(s.pickup, s.dropoff);
    if (dp) return dp;
    if (v.available === false) return "This vehicle isn't available for booking right now.";
    if (!isFree(v, s.pickup, s.dropoff)) return "This vehicle is already booked for part of these dates. Try different dates.";
    if (LIVE) {
      if (!session()) return ""; // the button sends them to log in
      if (!isCustomer()) return "Only customer accounts can book. Log in with a customer account to book.";
      if (!store.customer.licenseNo) return "Add your driving licence number in Profile before booking.";
      return "";
    }
    if (s.door && s.addrId === "new" && s.newAddr.length < 10) return "Type the full delivery address, including area and PIN code.";
    if (s.driver && !findDriver(v, s.pickup, s.dropoff)) return "No drivers are free for these dates. Drive yourself or pick other dates.";
    if (!s.driver && !store.customer.licenseVerified) return "Verify your driving licence in Profile, or book with a driver.";
    return "";
  }

  function updateBookingSummary() {
    const v = sheetVehicle;
    const s = readBookingForm();
    if ($("#doorFields")) $("#doorFields").hidden = !s.door;
    if ($("#bNewAddrWrap")) $("#bNewAddrWrap").hidden = !(s.door && s.addrId === "new");

    const validDates = Boolean(s.pickup && s.dropoff && s.dropoff > s.pickup);
    const avail = $("#bAvail");
    if (validDates) {
      const free = isFree(v, s.pickup, s.dropoff);
      const length = LIVE ? fmtHours(rentalHours(s.pickup, s.dropoff)) : plural(rentalDays(s.pickup, s.dropoff), "day");
      avail.className = "row-status " + (free ? "ok" : "no");
      avail.textContent = free
        ? `Free for these dates (${length})${LIVE && !SLOTS_KNOWN ? ". We'll double-check when you confirm." : ""}`
        : v.available === false ? "Not available right now" : "Already booked for some of these dates";
    } else avail.textContent = "";

    const note = $("#bDriverNote");
    if (note) {
      if (s.driver && s.pickup && s.dropoff && s.dropoff > s.pickup) {
        const d = findDriver(v, s.pickup, s.dropoff);
        note.textContent = d ? `${d.name} (${d.years} years driving, ★ ${d.rating}) is free for these dates.` : "";
      } else note.textContent = "";
    }

    if (validDates && LIVE) {
      const q = quote(v, s.pickup, s.dropoff, [], {});
      $("#bBill").innerHTML =
        `<div><dt>${rupees(v.pricePerHour)} per hour × ${fmtHours(q.hours)}</dt><dd>${rupees(q.rentalCost)}</dd></div>` +
        `<div class="bill-total"><dt>Trip total</dt><dd>${rupees(q.total)}</dd></div>`;
      $("#bTotal").textContent = rupees(q.total);
    } else if (validDates) {
      const q = quote(v, s.pickup, s.dropoff, s.addonIds, s);
      const lines = [[`${rupees(v.pricePerDay)} × ${plural(q.days, "day")}`, q.rentalCost]];
      if (q.driverCost) lines.push([`Driver, ${rupees(DW_PRICING.driverPerDay)} × ${plural(q.days, "day")}`, q.driverCost]);
      if (q.deliveryCost) lines.push(["Doorstep delivery and collection", q.deliveryCost]);
      s.addonIds.forEach((id) => { const a = byId(DW_ADDONS, id); lines.push([a.name, a.price * q.days]); });
      lines.push(["GST (18%)", q.tax]);
      $("#bBill").innerHTML =
        lines.map(([k, val]) => `<div><dt>${esc(k)}</dt><dd>${rupees(val)}</dd></div>`).join("") +
        `<div class="bill-total"><dt>Trip total</dt><dd>${rupees(q.total)}</dd></div>` +
        `<div class="bill-note"><dt>Refundable deposit, paid at pickup</dt><dd>${rupees(q.deposit)}</dd></div>`;
      $("#bTotal").textContent = rupees(q.total);
    } else {
      $("#bBill").innerHTML = `<div><dt>Set valid dates to see the price</dt><dd></dd></div>`;
      $("#bTotal").textContent = "—";
    }

    const problem = bookingProblem(v, s);
    const err = $("#bError");
    err.hidden = !problem;
    err.textContent = problem;
    $("#bSubmit").disabled = Boolean(problem);
  }

  function newBookingId() {
    let id;
    do { id = "BK2026-" + String(Math.floor(1300 + Math.random() * 8600)); }
    while (store.bookings.some((b) => b.id === id));
    return id;
  }

  // Rough coordinates for a typed address: near the vehicle's hub
  function guessCoords(v, text) {
    const loc = locationOf(v.locationId);
    const h = hash(text);
    return { lat: loc.lat + ((h % 100) - 50) / 2500, lng: loc.lng + (((h >> 8) % 100) - 50) / 2500 };
  }

  // Live: POST /api/bookings. The backend checks availability again inside a
  // transaction and calculates the total with the stored procedure.
  async function submitLiveBooking(v, s) {
    if (!session()) { location.href = loginUrl("browse"); return; }
    const btn = $("#bSubmit");
    const err = $("#bError");
    btn.disabled = true;
    btn.textContent = "Booking…";
    try {
      const res = await DW_API.createBooking(v.dbId, s.pickup, s.dropoff);
      const created = res.booking;
      try { await refreshLive(); } catch (e) { /* the booking worked; a refresh failure isn't fatal */ }
      const b = store.bookings.find((x) => x.dbId === created.Booking_ID) || mapBooking(created);
      if (!store.bookings.includes(b)) store.bookings.unshift(b);
      showTicket(b);
      renderListing(); renderTrips(); renderProfile(); updateCounts();
    } catch (e) {
      if (e.status === 401) { location.href = loginUrl("browse"); return; }
      err.hidden = false;
      err.textContent = e.message;
      btn.disabled = false;
      btn.textContent = "Confirm booking";
      if (e.status === 409) { // someone else booked it meanwhile: refresh slots
        refreshLive().then(() => { renderListing(); }).catch(() => {});
      }
    }
  }

  function submitBooking(e) {
    e.preventDefault();
    const v = sheetVehicle;
    const s = readBookingForm();
    if (bookingProblem(v, s)) { updateBookingSummary(); return; }
    if (LIVE) { submitLiveBooking(v, s); return; }

    let delivery = { mode: "hub" };
    if (s.door) {
      if (s.addrId === "new") delivery = { mode: "door", label: "Other address", line: s.newAddr, ...guessCoords(v, s.newAddr) };
      else {
        const a = byId(store.customer.addresses, s.addrId);
        delivery = { mode: "door", label: a.label, line: a.line, lat: a.lat, lng: a.lng };
      }
    }
    const driver = s.driver ? findDriver(v, s.pickup, s.dropoff) : null;
    const q = quote(v, s.pickup, s.dropoff, s.addonIds, s);
    const booking = {
      id: newBookingId(), vehicleId: v.id, locationId: v.locationId,
      pickup: toInputValue(s.pickup), dropoff: toInputValue(s.dropoff),
      addons: s.addonIds, driverId: driver ? driver.id : null, delivery,
      ...q, status: "confirmed", createdAt: toInputValue(new Date()), cancelledAt: null
    };
    store.bookings.unshift(booking);
    saveState();
    showTicket(booking);
    renderListing(); renderTrips(); renderProfile(); updateCounts();
  }

  function showTicket(b) {
    const v = vehicleOf(b.vehicleId);
    const d = driverOf(b.driverId);
    openSheet(`
      <div class="ticket">
        <div class="ticket-photo">${photoHTML(v, 640)}</div>
        <span class="plate plate-lg">${esc(v.plate)}</span>
        ${b.status === "pending" ? `
        <h2 id="sheetTitle" tabindex="-1">Booking requested</h2>
        <p>${esc(vName(v))} is held for you for ${fmtHours(b.hours)}, total ${rupees(b.total)}. ${esc(ownerOf(v).name)} will confirm it. Show booking ID <strong>${esc(b.id)}</strong> and your driving licence at pickup.</p>` : `
        <h2 id="sheetTitle" tabindex="-1">Booking confirmed</h2>
        <p>${esc(vName(v))} is yours for ${LIVE ? fmtHours(b.hours) : plural(b.days, "day")}. Show booking ID <strong>${esc(b.id)}</strong> ${d ? "to your driver" : "and your driving licence"} at pickup.</p>`}
        ${handoverHTML(b)}
        ${d ? driverCardHTML(d) : ""}
        <div class="ticket-actions">
          <button class="btn btn-primary" type="button" data-trip="${b.id}">See trip details</button>
          <button class="btn btn-ghost" type="button" data-action="close-sheet">Keep browsing</button>
        </div>
      </div>`);
    $("#sheetTitle").focus();
  }

  function handoverHTML(b) {
    const loc = locationOf(b.locationId);
    return b.delivery.mode === "door"
      ? `<div class="info-card">${pinIcon}<div><strong>Doorstep delivery to ${esc(b.delivery.label)}</strong><span>${esc(b.delivery.line)}</span><span class="muted small">Collected from the same address at ${fmtDateTime(b.dropoff)}</span></div></div>`
      : `<div class="info-card">${pinIcon}<div><strong>Pick up at ${esc(loc.name)}, ${esc(loc.city)}</strong><span class="muted small">Return to the same place by ${fmtDateTime(b.dropoff)}</span></div></div>`;
  }

  function driverCardHTML(d) {
    return `
      <div class="driver-card">
        <span class="avatar avatar-lg" aria-hidden="true">${esc(initials(d.name))}</span>
        <div>
          <span class="muted small">Your driver</span>
          <strong>${esc(d.name)}</strong>
          <span class="small">★ ${d.rating}, ${d.years} years driving. Speaks ${esc(d.languages.join(", "))}</span>
        </div>
        <a class="btn btn-ghost btn-sm" href="tel:+91${d.phone.replace(/\s/g, "")}">Call ${esc(d.phone)}</a>
      </div>`;
  }

  /* ==================================================================
     Trips
  ================================================================== */
  function tripStatus(b) {
    const t = Date.now();
    if (b.status === "cancelled") return "cancelled";
    if (b.status === "completed" || new Date(b.dropoff) < t) return "past";
    if (new Date(b.pickup) <= t) return "active";
    return "upcoming";
  }

  const STATUS_BADGE = {
    upcoming: `<span class="badge badge-ok">Confirmed</span>`,
    active: `<span class="badge badge-live"><span class="pulse" aria-hidden="true"></span>On trip now</span>`,
    past: `<span class="badge badge-done">Completed</span>`,
    cancelled: `<span class="badge badge-off">Cancelled</span>`
  };

  // Pending bookings (waiting for the owner) get their own badge
  function badgeFor(b, s) {
    if (b.status === "pending" && s === "upcoming") return `<span class="badge badge-wait">Awaiting confirmation</span>`;
    return STATUS_BADGE[s];
  }

  function renderTrips() {
    $$(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === tripTab)));
    if (LIVE && !isCustomer()) {
      $("#tripList").innerHTML = session()
        ? `<li class="empty"><h3>Trips are for customer accounts</h3><p>You're logged in as ${esc(session().userRole.toLowerCase())}. Log in with a customer account to see trips.</p><button class="btn btn-primary" type="button" data-action="logout">Log out</button></li>`
        : `<li class="empty"><h3>Log in to see your trips</h3><p>Your bookings are saved to your DriveWise account.</p><a class="btn btn-primary" href="${loginUrl("trips")}">Log in</a></li>`;
      return;
    }
    const groups = { upcoming: [], past: [], cancelled: [] };
    store.bookings.forEach((b) => {
      const s = tripStatus(b);
      (s === "active" ? groups.upcoming : groups[s]).push(b);
    });
    groups.upcoming.sort((a, b) => new Date(a.pickup) - new Date(b.pickup));
    groups.past.sort((a, b) => new Date(b.pickup) - new Date(a.pickup));
    groups.cancelled.sort((a, b) => new Date(b.pickup) - new Date(a.pickup));

    $$(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === tripTab)));
    const list = groups[tripTab];
    const emptyCopy = {
      upcoming: ["No upcoming trips", "Book a car, bike or scooter and it will show up here."],
      past: ["No past trips yet", "Trips you've finished will show up here."],
      cancelled: ["No cancelled trips", "Trips you cancel will show up here."]
    }[tripTab];

    $("#tripList").innerHTML = list.length
      ? list.map(tripHTML).join("")
      : `<li class="empty"><h3>${emptyCopy[0]}</h3><p>${emptyCopy[1]}</p>${tripTab === "upcoming" ? `<a class="btn btn-primary" href="#browse">Find a ride</a>` : ""}</li>`;
  }

  function tripHTML(b) {
    const v = vehicleOf(b.vehicleId);
    const s = tripStatus(b);
    const d = driverOf(b.driverId);
    const where = b.delivery.mode === "door" ? `${s === "upcoming" ? "Delivery to" : "Delivered to"} ${b.delivery.label}` : `${locationOf(b.locationId).name}`;

    const actions = [`<button class="btn btn-ghost btn-sm" type="button" data-trip="${b.id}">Details</button>`];
    if (s === "active" || s === "upcoming") actions.unshift(`<button class="btn btn-primary btn-sm" type="button" data-track="${b.id}">Track</button>`);
    if ((s === "past" || s === "cancelled") && v.listed !== false) actions.unshift(`<button class="btn btn-primary btn-sm" type="button" data-open="${v.id}">Book again</button>`);

    return `
      <li class="trip${s === "active" ? " is-live" : ""}">
        <button class="trip-photo" type="button" data-trip="${b.id}" aria-label="Open details for ${esc(vName(v))}, booking ${esc(b.id)}">${photoHTML(v, 480)}</button>
        <div class="trip-main">
          <div class="trip-top">
            <h3>${esc(vName(v))}</h3>
            <span class="plate plate-sm">${esc(v.plate)}</span>
            ${badgeFor(b, s)}
          </div>
          <div class="trip-route">
            <div class="leg"><small>Pickup</small><strong>${fmtDateTime(b.pickup)}</strong></div>
            <span class="road" aria-hidden="true"></span>
            <div class="leg"><small>Return</small><strong>${fmtDateTime(b.dropoff)}</strong></div>
          </div>
          <p class="trip-meta">
            <span>${esc(where)}</span>
            <span>${d ? "Driver: " + esc(d.name) : "Self-drive"}</span>
            <span>Booking ${esc(b.id)}</span>
          </p>
        </div>
        <div class="trip-side">
          <div class="price"><strong>${rupees(b.total)}</strong><span>${LIVE ? fmtHours(b.hours) : plural(b.days, "day") + ", incl. GST"}</span></div>
          <div class="trip-actions">${actions.join("")}</div>
        </div>
      </li>`;
  }

  function openTrip(id) {
    const b = byId(store.bookings, id);
    if (!b) return;
    const v = vehicleOf(b.vehicleId);
    const o = ownerOf(v);
    const d = driverOf(b.driverId);
    const s = tripStatus(b);
    const now = Date.now();

    // Live bookings have no "created at" time in the database, so that step is skipped
    const steps = (s === "cancelled"
      ? [["Booked", b.createdAt, true], ["Cancelled", b.cancelledAt || b.createdAt, true]]
      : [
          ["Booked", b.createdAt, true],
          [b.delivery.mode === "door" ? `Delivered to ${b.delivery.label}` : "Picked up", b.pickup, now >= new Date(b.pickup)],
          [b.delivery.mode === "door" ? "Collected" : "Returned", b.dropoff, now >= new Date(b.dropoff) || s === "past"]
        ]).filter(([, when]) => Boolean(when));
    if (LIVE && s === "cancelled") steps.push(["Cancelled", null, true]);

    const lines = LIVE
      ? [[`${rupees(b.rate)} per hour × ${fmtHours(b.hours)}`, b.rentalCost]]
      : [[`${rupees(v.pricePerDay)} × ${plural(b.days, "day")}`, b.rentalCost]];
    if (b.driverCost) lines.push(["Driver", b.driverCost]);
    if (b.deliveryCost) lines.push(["Doorstep delivery and collection", b.deliveryCost]);
    b.addons.forEach((aid) => { const a = byId(DW_ADDONS, aid); if (a) lines.push([a.name, a.price * b.days]); });
    if (!LIVE) lines.push(["GST (18%)", b.tax]);

    const payment = LIVE ? {
      past: `Trip total ${rupees(b.total)}.`,
      active: `Trip total ${rupees(b.total)}, paid at pickup.`,
      upcoming: b.status === "pending"
        ? `Waiting for ${o.name} to confirm. Pay ${rupees(b.total)} at pickup.`
        : `Pay ${rupees(b.total)} at pickup.`,
      cancelled: "Cancelled. Nothing was charged."
    }[s] : {
      past: `Paid ${rupees(b.total)} by UPI at pickup. Deposit of ${rupees(b.deposit)} refunded.`,
      active: `Paid ${rupees(b.total)} by UPI at pickup. Deposit of ${rupees(b.deposit)} is held until return.`,
      upcoming: `Pay ${rupees(b.total)} plus a refundable ${rupees(b.deposit)} deposit at pickup.`,
      cancelled: "Cancelled before pickup. Nothing was charged."
    }[s];

    const actions = [];
    if (s === "active" || s === "upcoming") actions.push(`<button class="btn btn-go" type="button" data-track="${b.id}">Track vehicle</button>`);
    if (s === "upcoming") actions.push(`<button class="btn btn-ghost" type="button" data-cancel="${b.id}">Cancel trip</button>`);
    if ((s === "past" || s === "cancelled") && v.listed !== false) actions.push(`<button class="btn btn-primary" type="button" data-open="${v.id}">Book again</button>`);
    actions.push(`<button class="btn btn-ghost" type="button" data-action="print">Print</button>`);

    openSheet(`
      ${sheetHeader(v)}
      <div class="sheet-section">
        <div class="trip-top">${badgeFor(b, s)}<span class="muted small">Booking ${esc(b.id)}</span></div>
        <h2 id="sheetTitle">${esc(vName(v))} <span class="title-year">${v.year}</span></h2>
        <ol class="timeline">
          ${steps.map(([label, when, done]) => `<li class="${done ? "done" : ""}"><strong>${esc(label)}</strong><span>${when ? fmtDateTime(when) : ""}</span></li>`).join("")}
        </ol>
      </div>

      <div class="sheet-section">
        <h3>Handover</h3>
        ${handoverHTML(b)}
      </div>

      ${d ? `<div class="sheet-section"><h3>Driver</h3>${driverCardHTML(d)}</div>` : `
      <div class="sheet-section"><h3>Driver</h3><p class="muted">Self-drive. Licence ${esc(store.customer.licenseNo)}.</p></div>`}

      <div class="sheet-section">
        <h3>Listed by</h3>
        <div class="person">
          <span class="avatar" aria-hidden="true">${esc(initials(o.name))}</span>
          <div><strong>${esc(o.name)}</strong><div class="muted small">${o.type === "company" ? "Rental company" : "Local owner"}${o.phone ? `. Phone ${esc(o.phone)}` : ""}</div></div>
        </div>
      </div>

      <div class="sheet-section">
        <h3>Price</h3>
        <dl class="bill">
          ${lines.map(([k, val]) => `<div><dt>${esc(k)}</dt><dd>${rupees(val)}</dd></div>`).join("")}
          <div class="bill-total"><dt>Trip total</dt><dd>${rupees(b.total)}</dd></div>
        </dl>
        <p class="muted small">${payment}</p>
      </div>

      <div class="sheet-section sheet-actions">${actions.join("")}</div>`);
  }

  // Live: PATCH /api/bookings/:id/cancel, then reload trips and booked slots
  async function cancelLive(b) {
    toast("Cancelling…");
    try {
      await DW_API.cancelBooking(b.dbId);
      try { await refreshLive(); } catch (e) { b.status = "cancelled"; }
      if (sheet.open) openTrip(b.id);
      renderTrips(); renderListing(); renderProfile(); updateCounts();
      toast(`Trip cancelled. Booking ${b.id} won't be charged.`);
    } catch (e) {
      if (e.status === 401) { location.href = loginUrl("trips"); return; }
      toast(`Couldn't cancel: ${e.message}`);
    }
  }

  const confirmDialog = $("#confirmDialog");
  function askCancel(id) {
    const b = byId(store.bookings, id);
    const v = vehicleOf(b.vehicleId);
    $("#confirmText").textContent =
      `${vName(v)}, ${fmtDateTime(b.pickup)} to ${fmtDateTime(b.dropoff)}. You won't be charged${b.driverId ? ", your driver will be told," : ""} and the vehicle becomes available to others.`;
    confirmDialog.returnValue = "";
    confirmDialog.showModal();
    confirmDialog.addEventListener("close", function onClose() {
      confirmDialog.removeEventListener("close", onClose);
      if (confirmDialog.returnValue !== "yes") return;
      if (LIVE) { cancelLive(b); return; }
      b.status = "cancelled";
      b.cancelledAt = toInputValue(new Date());
      saveState();
      if (sheet.open) openTrip(b.id);
      renderTrips(); renderListing(); renderProfile(); updateCounts();
      toast(`Trip cancelled. Booking ${b.id} won't be charged.`);
    });
  }

  /* ==================================================================
     GPS tracking (simulated)
  ================================================================== */
  const tracker = $("#tracker");
  let track = null; // { map, marker, trail, timer, ... }

  const kmBetween = (a, b) => {
    const R = 6371, toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  // Simulated route: start -> three landmarks -> back, split into small GPS steps
  function buildRoute(b) {
    const start = b.delivery.mode === "door" ? { lat: b.delivery.lat, lng: b.delivery.lng } : locationOf(b.locationId);
    const h = hash(b.id);
    const picks = [0, 1, 2].map((i) => DW_LANDMARKS[(h + i * 3) % DW_LANDMARKS.length]);
    const stops = [start, ...picks, start];
    const pts = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], c = stops[i + 1];
      const n = Math.max(8, Math.round(kmBetween(a, c) / 0.25));
      // bend each leg slightly so it looks like a road, not a ruler line
      const bend = ((h >> i) % 2 ? 1 : -1) * 0.006;
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const curve = Math.sin(t * Math.PI) * bend;
        pts.push({ lat: a.lat + (c.lat - a.lat) * t + curve, lng: a.lng + (c.lng - a.lng) * t - curve });
      }
    }
    pts.push(stops[stops.length - 1]);
    return { start, pts, picks };
  }

  function openTracker(id) {
    const b = byId(store.bookings, id);
    if (!b) return;
    const v = vehicleOf(b.vehicleId);
    const d = driverOf(b.driverId);
    const s = tripStatus(b);
    const route = buildRoute(b);
    const live = s === "active";

    $("#trackTitle").textContent = `${vName(v)}, ${v.plate}`;
    $("#trackSub").textContent = live
      ? `On trip until ${fmtDateTime(b.dropoff)}. Location updates every few seconds.`
      : `Trip starts ${fmtDateTime(b.pickup)}. Live tracking switches on at pickup.`;
    // The backend has no live GPS feed yet, so movement on the map is simulated
    if (LIVE) $("#trackSub").textContent += " (Demo: the route shown is simulated.)";

    if (sheet.open) sheet.close();
    tracker.showModal();

    // Where the vehicle is right now along the route
    const total = new Date(b.dropoff) - new Date(b.pickup);
    const frac = live ? Math.min(0.95, Math.max(0.05, (Date.now() - new Date(b.pickup)) / total)) : 0;
    let idx = Math.floor(frac * (route.pts.length - 1));
    let travelled = 0;
    for (let i = 1; i <= idx; i++) travelled += kmBetween(route.pts[i - 1], route.pts[i]);
    let lastUpdate = Date.now();
    const fuelStart = 96;

    track = { b, v, d, route, live, idx, travelled, renderer: null, timer: null };
    track.renderer = window.L ? leafletRenderer(route, v) : svgRenderer(route, v);
    track.renderer.update(idx);
    renderTrackInfo();

    if (live) {
      track.timer = setInterval(() => {
        const prev = route.pts[track.idx];
        track.idx = (track.idx + 1) % route.pts.length;
        if (track.idx === 0) track.travelled = 0;
        else track.travelled += kmBetween(prev, route.pts[track.idx]);
        lastUpdate = Date.now();
        track.renderer.update(track.idx);
        renderTrackInfo();
      }, 1500);
      track.ticker = setInterval(renderTrackInfo, 1000);
    }

    function renderTrackInfo() {
      const pos = route.pts[track.idx];
      const nearest = [...DW_LANDMARKS].sort((a, c) => kmBetween(pos, a) - kmBetween(pos, c))[0];
      const allowance = v.kmLimit * b.days;
      const level = Math.max(8, Math.round(fuelStart - track.travelled * (v.fuel === "Electric" ? 0.35 : 0.25)));
      const secs = Math.round((Date.now() - lastUpdate) / 1000);
      const speed = live ? 18 + (hash(String(track.idx)) % 27) : 0;
      const home = route.start;
      $("#trackInfo").innerHTML = `
        <div class="track-status ${live ? "is-live" : ""}">
          ${live ? `<span class="pulse" aria-hidden="true"></span><strong>Moving</strong>` : `<strong>Parked at ${esc(locationOf(b.locationId).name)}</strong>`}
          <span class="muted small">${live ? (secs < 2 ? "Updated just now" : `Updated ${secs}s ago`) : "Waiting for pickup"}</span>
        </div>
        <dl class="track-stats">
          <div><dt>Near</dt><dd>${esc(live ? nearest.name : locationOf(b.locationId).name)}</dd></div>
          <div><dt>Speed</dt><dd>${speed} km/h</dd></div>
          <div><dt>${v.fuel === "Electric" ? "Charge" : "Fuel"}</dt><dd>${live ? level : 100}%</dd></div>
          <div><dt>Driven this trip</dt><dd>${track.travelled.toFixed(1)} km</dd></div>
          ${v.kmLimit ? `<div><dt>Free km left</dt><dd>${Math.max(0, Math.round(allowance - track.travelled))} km</dd></div>` : ""}
          <div><dt>${b.delivery.mode === "door" ? "From " + esc(b.delivery.label) : "From pickup point"}</dt><dd>${kmBetween(pos, home).toFixed(1)} km</dd></div>
        </dl>
        ${track.d ? driverCardHTML(track.d) : `<p class="muted small">Self-drive trip. The owner sees the same location to keep the vehicle safe.</p>`}
        <button class="btn btn-ghost" type="button" data-action="recenter">Centre on vehicle</button>`;
    }
  }

  function closeTracker() {
    if (!track) return;
    clearInterval(track.timer);
    clearInterval(track.ticker);
    track.renderer.destroy();
    track = null;
  }

  // Real map (OpenStreetMap tiles via Leaflet)
  function leafletRenderer(route, v) {
    const el = $("#map");
    el.innerHTML = "";
    const map = L.map(el, { zoomControl: true, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    const latlngs = route.pts.map((p) => [p.lat, p.lng]);
    L.polyline(latlngs, { color: "#7A6FB0", weight: 4, dashArray: "6 8", opacity: 0.7 }).addTo(map);
    const trail = L.polyline([], { color: "#5B3FD9", weight: 6 }).addTo(map);
    L.marker([route.start.lat, route.start.lng], {
      icon: L.divIcon({ className: "map-pin-home", html: "<span>Start</span>", iconSize: null })
    }).addTo(map);
    const marker = L.marker(latlngs[0], {
      icon: L.divIcon({ className: "map-pin-car", html: `<span class="plate plate-sm">${esc(v.plate)}</span><i></i>`, iconSize: null, iconAnchor: [0, 0] }),
      zIndexOffset: 1000
    }).addTo(map);
    map.fitBounds(L.latLngBounds(latlngs).pad(0.15));
    let removed = false;
    // invalidateSize after the dialog has closed throws inside Leaflet, so skip it then
    setTimeout(() => { if (!removed) map.invalidateSize(); }, 60);

    return {
      update(i) {
        marker.setLatLng(latlngs[i]);
        trail.setLatLngs(latlngs.slice(0, i + 1));
      },
      recenter() { map.setView(marker.getLatLng(), 15); },
      destroy() { removed = true; map.stop(); map.remove(); }
    };
  }

  // Fallback when Leaflet isn't available: a schematic map drawn in SVG
  function svgRenderer(route, v) {
    const el = $("#map");
    const W = 640, H = 420, pad = 40;
    const lats = route.pts.map((p) => p.lat), lngs = route.pts.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const sx = (W - pad * 2) / (maxLng - minLng || 1), sy = (H - pad * 2) / (maxLat - minLat || 1);
    const s = Math.min(sx, sy);
    const X = (lng) => pad + (lng - minLng) * s + ((W - pad * 2) - (maxLng - minLng) * s) / 2;
    const Y = (lat) => H - pad - (lat - minLat) * s - ((H - pad * 2) - (maxLat - minLat) * s) / 2;
    const path = route.pts.map((p) => `${X(p.lng).toFixed(1)},${Y(p.lat).toFixed(1)}`);
    el.innerHTML = `
      <svg class="map-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#E2DEF0" stroke-width="1"/></pattern></defs>
        <rect width="${W}" height="${H}" fill="#F7F5FD"/><rect width="${W}" height="${H}" fill="url(#grid)"/>
        <polyline points="${path.join(" ")}" fill="none" stroke="#B3AAD6" stroke-width="4" stroke-dasharray="6 8" stroke-linecap="round"/>
        <polyline id="svgTrail" points="" fill="none" stroke="#5B3FD9" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        ${route.picks.map((p) => `<g><circle cx="${X(p.lng)}" cy="${Y(p.lat)}" r="4" fill="#1A1433"/><text x="${X(p.lng) + 8}" y="${Y(p.lat) - 8}" font-size="13" fill="#1A1433">${esc(p.name)}</text></g>`).join("")}
        <circle cx="${X(route.start.lng)}" cy="${Y(route.start.lat)}" r="7" fill="#00A35C" stroke="#fff" stroke-width="2"/>
        <g id="svgCar"><circle r="14" fill="#5B3FD9" opacity=".2"/><circle r="8" fill="#5B3FD9" stroke="#fff" stroke-width="3"/></g>
      </svg>
      <p class="map-note">Map tiles couldn't load, so this is a simplified view.</p>`;
    return {
      update(i) {
        $("#svgTrail").setAttribute("points", path.slice(0, i + 1).join(" "));
        const [x, y] = path[i].split(",");
        $("#svgCar").setAttribute("transform", `translate(${x} ${y})`);
      },
      recenter() {},
      destroy() { el.innerHTML = ""; }
    };
  }

  tracker.addEventListener("close", closeTracker);

  /* ==================================================================
     Profile
  ================================================================== */
  // Live mode: what the profile page shows when nobody (or a non-customer) is logged in
  function renderProfileGate() {
    let gate = $("#profileGate");
    if (!gate) {
      gate = document.createElement("div");
      gate.id = "profileGate";
      $(".profile-grid").before(gate);
    }
    const u = session();
    gate.innerHTML = u
      ? `<div class="empty"><h3>Logged in as ${esc(u.name)}</h3><p>This is a ${esc(String(u.userRole).toLowerCase())} account. The customer profile is for customer accounts.</p><button class="btn btn-primary" type="button" data-action="logout">Log out</button></div>`
      : `<div class="empty"><h3>Log in to see your profile</h3><p>Log in or create an account to book vehicles and keep track of your trips.</p><a class="btn btn-primary" href="${loginUrl("profile")}">Log in</a><a class="linkbtn" href="login.html?mode=signup&amp;next=${encodeURIComponent("customer-portal.html#profile")}">Create an account</a></div>`;
    $("#navAvatar").textContent = u ? initials(u.name) : "?";
    $("#navName").textContent = u ? (String(u.name).split(" ")[0] || "Profile") : "Log in";
  }

  // Live mode: set up the profile page for real accounts (once)
  function prepareLiveProfile() {
    const form = $("#profileForm");
    if (form.dataset.live) return;
    form.dataset.live = "1";
    form.elements.email.readOnly = true;
    form.elements.email.closest(".field").querySelector(".field-label").textContent = "Email (used to log in, can't be changed)";
    setShown(form.elements.city.closest(".field"), false); // not stored in the database
    $("#profileError").insertAdjacentHTML("beforebegin",
      `<label class="field"><span class="field-label">Driving licence number</span><input name="licence" maxlength="50" placeholder="e.g. DL-0420210012345"></label>`);
    setShown($("#addressForm").closest(".panel"), false); // addresses are only for doorstep delivery (demo)
    const btn = $("#resetDemo");
    btn.textContent = "Log out";
    btn.id = "logoutBtn";
    btn.dataset.action = "logout";
    $(".licence-card").nextElementSibling.textContent = "Bring the original licence at pickup. You need a licence number on your account to book.";
  }

  function renderProfile() {
    if (LIVE) {
      const ok = isCustomer();
      setShown($(".profile-grid"), ok);
      if (!ok) { renderProfileGate(); return; }
      if ($("#profileGate")) $("#profileGate").remove();
      prepareLiveProfile();
      $("#profileForm").elements.licence.value = store.customer.licenseNo || "";
    }
    const c = store.customer;
    const form = $("#profileForm");
    ["name", "email", "phone", "city"].forEach((k) => (form.elements[k].value = c[k] || ""));
    $("#licenceNo").textContent = c.licenseNo || (LIVE ? "No licence added yet" : "");
    const st = $("#licenceStatus");
    st.textContent = LIVE ? (c.licenseNo ? "On file" : "Missing") : (c.licenseVerified ? "Verified" : "Not verified");
    st.className = "badge " + (c.licenseVerified ? "badge-ok" : "badge-off");

    const taken = store.bookings.filter((b) => b.status !== "cancelled").length;
    const upcoming = store.bookings.filter((b) => ["upcoming", "active"].includes(tripStatus(b))).length;
    $("#profileStats").innerHTML = `
      <div><dt>Trips booked</dt><dd>${taken}</dd></div>
      <div><dt>Coming up</dt><dd>${upcoming}</dd></div>
      <div><dt>Saved</dt><dd>${store.saved.length}</dd></div>`;

    $("#addressList").innerHTML = c.addresses.map((a) => `
      <li><div><strong>${esc(a.label)}</strong><span>${esc(a.line)}</span></div>
      <button class="linkbtn" type="button" data-remove-address="${a.id}" aria-label="Remove ${esc(a.label)} address">Remove</button></li>`).join("")
      || `<li class="muted">No saved addresses yet.</li>`;

    $("#navAvatar").textContent = initials(c.name);
    $("#navName").textContent = c.name.split(" ")[0] || "Profile";
  }

  // Live: PUT /api/users/:id with name, phone and driving licence
  async function saveLiveProfile(form, body) {
    const btn = form.querySelector('button[type="submit"]');
    const err = $("#profileError");
    btn.disabled = true;
    try {
      await DW_API.updateProfile(body);
      Object.assign(store.customer, {
        name: body.name, phone: body.phone,
        licenseNo: body.drivingLicense || "", licenseVerified: Boolean(body.drivingLicense)
      });
      renderProfile();
      toast("Changes saved");
    } catch (e) {
      if (e.status === 401) { location.href = loginUrl("profile"); return; }
      err.hidden = false;
      err.textContent = e.message;
    } finally {
      btn.disabled = false;
    }
  }

  function setupProfile() {
    $("#profileForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target.elements;
      const name = f.name.value.trim();
      const email = f.email.value.trim();
      const phone = f.phone.value.replace(/[\s-]/g, "");
      let msg = "";
      if (name.length < 2) msg = "Enter your full name.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) msg = "Enter an email address like name@example.com.";
      else if (!/^(\+91)?[6-9]\d{9}$/.test(phone)) msg = "Enter a 10-digit Indian mobile number.";
      const err = $("#profileError");
      err.hidden = !msg;
      err.textContent = msg;
      if (msg) return;
      if (LIVE) { saveLiveProfile(e.target, { name, phone, drivingLicense: f.licence.value.trim() || null }); return; }
      Object.assign(store.customer, { name, email, phone: f.phone.value.trim(), city: f.city.value });
      saveState();
      renderProfile();
      toast("Changes saved");
    });

    $("#addressForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target.elements;
      const label = f.label.value.trim();
      const line = f.line.value.trim();
      let msg = "";
      if (!label) msg = "Give the address a short label, like Hostel.";
      else if (line.length < 10) msg = "Type the full address, including area and PIN code.";
      const err = $("#addressError");
      err.hidden = !msg;
      err.textContent = msg;
      if (msg) return;
      const h = hash(line);
      store.customer.addresses.push({
        id: "ADR" + Date.now(), label, line,
        lat: 28.6139 + ((h % 200) - 100) / 1500, lng: 77.209 + (((h >> 8) % 200) - 100) / 1500
      });
      saveState();
      e.target.reset();
      renderProfile();
      toast(`Added ${label} address`);
    });

    $("#resetDemo").addEventListener("click", () => {
      if (LIVE) return; // in live mode this button becomes "Log out" (handled by data-action)
      store = freshState();
      saveState();
      renderAll();
      toast("Demo data reset");
    });
  }

  /* ==================================================================
     Shared UI
  ================================================================== */
  function updateCounts() {
    const up = store.bookings.filter((b) => ["upcoming", "active"].includes(tripStatus(b))).length;
    const tc = $("#tripsCount");
    tc.hidden = up === 0;
    tc.textContent = up;
    const sc = $("#savedCount");
    sc.hidden = store.saved.length === 0;
    sc.textContent = store.saved.length;
  }

  let toastTimer;
  function toast(text) {
    const t = $("#toast");
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 3200);
  }

  function showCredits() {
    $("#creditsList").innerHTML = DW_VEHICLES.filter(hasPhoto).map((v) =>
      `<li><a href="${photoPage(v)}" target="_blank" rel="noopener">${esc(vName(v))}</a></li>`).join("");
    $("#creditsDialog").showModal();
  }

  const VIEWS = ["browse", "trips", "saved", "profile"];
  function route() {
    const name = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "browse";
    VIEWS.forEach((v) => ($("#view-" + v).hidden = v !== name));
    $$(".mainnav a").forEach((a) => (a.dataset.nav === name ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    if (name === "trips") renderTrips();
    if (name === "saved") renderSaved();
    if (name === "profile") renderProfile();
    window.scrollTo(0, 0);
  }

  function renderAll() {
    renderListing(); renderTrips(); renderSaved(); renderProfile(); updateCounts();
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open],[data-save],[data-cancel],[data-trip],[data-track],[data-remove-address],[data-action],.tab");
    if (!t) return;
    const a = t.dataset.action;
    if (t.dataset.open) openVehicle(t.dataset.open);
    else if (t.dataset.save) toggleSaved(t.dataset.save);
    else if (t.dataset.cancel) askCancel(t.dataset.cancel);
    else if (t.dataset.trip) openTrip(t.dataset.trip);
    else if (t.dataset.track) openTracker(t.dataset.track);
    else if (t.dataset.removeAddress) {
      store.customer.addresses = store.customer.addresses.filter((x) => x.id !== t.dataset.removeAddress);
      saveState(); renderProfile(); toast("Address removed");
    }
    else if (a === "close-sheet") sheet.close();
    else if (a === "close-tracker") tracker.close();
    else if (a === "recenter" && track) track.renderer.recenter();
    else if (a === "reset-filters") resetFilters();
    else if (a === "credits") showCredits();
    else if (a === "logout") { DW_API.logout(); location.href = "customer-portal.html#browse"; location.reload(); }
    else if (a === "retry-live") location.reload();
    else if (a === "print") window.print();
    else if (t.classList.contains("tab")) { tripTab = t.dataset.tab; renderTrips(); }
  });

  // Clicking the dimmed backdrop closes the sheet / tracker
  [sheet, tracker].forEach((dlg) => dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }));

  /* ==================================================================
     Start
  ================================================================== */
  async function start() {
    const slow = showLoading();
    try {
      await startLive();
    } catch (e) {
      LIVE = false;
      liveProblem = e.message;
      store = loadState();
    } finally {
      clearTimeout(slow);
    }
    if (!LIVE) {
      showBanner(`Showing demo data: ${liveProblem || "the DriveWise server couldn't be reached."} Bookings you make now are only saved in this browser.`, true, true);
    }
    setupBrowse();
    setupProfile();
    renderAll();
    window.addEventListener("hashchange", route);
    route();
  }

  start();
})();
