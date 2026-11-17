// DriveWise admin — live data from the backend
// Load on every admin page AFTER config.js, api.js and the page's own script.
//
// Logged in as Admin  -> the page's sample rows are replaced with data from the
//                        database (through /api/admin/* and /api/vehicles).
// Not logged in / server down -> the sample data stays, with a banner saying so.
//
// The backend's admin API can read users, vehicles and bookings and approve or
// reject vehicles. It can't add, edit or delete them, so those buttons are
// hidden while live data is shown.

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const page = (location.pathname.split("/").pop() || "index.html").replace(".html", "") || "index";
  const rupees = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const toDate = (v) => DW_API.parseSqlDateTime(v);
  const fmtDate = (v) => { const d = toDate(v); return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"; };
  const fmtDateTime = (v) => { const d = toDate(v); return d ? d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"; };
  const isoDay = (v) => String(v || "").slice(0, 10);

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "className") node.className = v;
      else if (k === "dataset") Object.assign(node.dataset, v);
      else node.setAttribute(k, v);
    });
    children.flat().forEach((c) => node.append(c instanceof Node ? c : document.createTextNode(String(c ?? ""))));
    return node;
  }

  const badge = (text, cls) => el("span", { className: `status ${cls}` }, text);
  const bookingClass = (s) => ({ Pending: "pending", Confirmed: "confirmed", Completed: "completed", Cancelled: "cancelled" }[s] || "pending");

  // Same grouping the customer portal uses, matching the filter options on the Vehicles page
  function categoryOf(v) {
    const cat = String(v.Vehicle_Category || "").toLowerCase();
    const t = String(v.Type_Name || "").toLowerCase();
    if (cat === "scooter") return "Scooter";
    if (cat === "bike") return /activa|jupiter|access|scooter/i.test(`${v.Model} ${t}`) ? "Scooter" : "Bike";
    if (cat === "van" || t.includes("traveller")) return "Van";
    if (t.includes("hatch")) return "Hatchback";
    if (t.includes("muv")) return "MUV";
    if (t.includes("suv") || t.includes("off")) return "SUV";
    if (t.includes("sedan")) return "Sedan";
    return v.Vehicle_Category || "Car";
  }

  /* ---------------- Banner + header ---------------- */
  function banner(content, isError) {
    let b = $("#liveBanner");
    if (!b) {
      b = el("div", { id: "liveBanner", role: "status" });
      const host = $(".dashboard-content") || $(".main-content");
      host.prepend(b);
    }
    b.className = "live-banner" + (isError ? " is-error" : "");
    b.replaceChildren(...(Array.isArray(content) ? content : [content]));
  }

  const loginLink = () => el("a", { className: "live-banner-btn", href: `login.html?next=${encodeURIComponent(page + ".html")}` }, "Log in as admin");

  function setupHeader(user) {
    const footer = $(".sidebar-footer");
    if (footer && !$("#adminSessionBtn")) {
      const btn = user
        ? el("button", { type: "button", id: "adminSessionBtn", className: "customer-link session-btn" }, "Log out")
        : el("a", { id: "adminSessionBtn", className: "customer-link", href: `login.html?next=${encodeURIComponent(page + ".html")}` }, "Log in");
      if (user) btn.addEventListener("click", () => { DW_API.logout(); location.reload(); });
      footer.append(btn);
    }
    const profile = $(".admin-profile");
    if (profile && user) {
      $(".profile-avatar", profile).textContent = String(user.name || "A").trim().charAt(0).toUpperCase();
      $("strong", profile).textContent = user.name || "Administrator";
      $("small", profile).textContent = user.userRole;
    }
    const welcome = $(".topbar p");
    if (welcome && user && /welcome back/i.test(welcome.textContent)) welcome.textContent = `Welcome back, ${String(user.name).split(" ")[0]}!`;
  }

  function hideButton(id) { const b = document.getElementById(id); if (b) b.style.display = "none"; }

  // Remember the sample rows so they can be put back if loading fails
  const snapshots = new Map();
  function restoreSamples() { snapshots.forEach((rows, tbody) => tbody.replaceChildren(...rows)); }

  function loadingRow(tbody, cols) {
    if (!snapshots.has(tbody)) snapshots.set(tbody, Array.from(tbody.childNodes));
    tbody.replaceChildren(el("tr", {}, el("td", { colspan: String(cols), className: "live-loading" }, "Loading from the database… (the server can take up to a minute to wake up)")));
  }

  function emptyRow(tbody, cols, text) {
    tbody.append(el("tr", {}, el("td", { colspan: String(cols), className: "live-loading" }, text)));
  }

  /* ---------------- Dashboard (index.html) ---------------- */
  async function loadDashboard() {
    const tbody = $(".bookings-panel tbody");
    loadingRow(tbody, 5);
    const [dash, users, vehicles, bookings] = await Promise.all([
      DW_API.admin.dashboard(), DW_API.admin.users(), DW_API.admin.vehicles(), DW_API.admin.bookings()
    ]);
    const s = dash.stats;
    const now = new Date();
    const active = (b) => b.Booking_Status === "Pending" || b.Booking_Status === "Confirmed";
    const revenueRows = bookings.bookings.filter((b) => b.Booking_Status === "Confirmed" || b.Booking_Status === "Completed");
    const revenue = revenueRows.reduce((sum, b) => sum + Number(b.Total_Amount || 0), 0);
    const customers = users.users.filter((u) => u.User_Role === "Customer").length;

    const cards = $$(".stats-grid .stat-card");
    const setCard = (i, value, note) => { if (!cards[i]) return; $("h3", cards[i]).textContent = value; $(".stat-note", cards[i]).textContent = note; };
    setCard(0, s.vehicles.totalVehicles, `${Number(s.vehicles.pendingVehicles || 0)} waiting for verification`);
    setCard(1, Number(s.bookings.pendingBookings || 0) + Number(s.bookings.confirmedBookings || 0), "Pending or confirmed");
    setCard(2, customers, `${s.users.totalUsers} accounts in total`);
    setCard(3, rupees(revenue), "Confirmed and completed bookings");

    tbody.replaceChildren();
    bookings.bookings.slice(0, 6).forEach((b) => {
      tbody.append(el("tr", {},
        el("td", {}, `#${b.Booking_ID}`),
        el("td", {}, b.Customer_Name),
        el("td", {}, `${b.Brand || ""} ${b.Model || ""}`.trim()),
        el("td", {}, fmtDate(b.Start_DateTime)),
        el("td", {}, badge(b.Booking_Status, bookingClass(b.Booking_Status)))));
    });
    if (!bookings.bookings.length) emptyRow(tbody, 5, "No bookings yet.");

    // Fleet availability right now
    const busyNow = new Set(bookings.bookings
      .filter((b) => active(b) && toDate(b.Start_DateTime) <= now && toDate(b.End_DateTime) > now)
      .map((b) => b.Vehicle_ID));
    let available = 0, booked = 0, maintenance = 0;
    vehicles.vehicles.forEach((v) => {
      if (/maint|service|unavailable/i.test(v.Status || "")) maintenance++;
      else if (busyNow.has(v.Vehicle_ID) || /booked|rented/i.test(v.Status || "")) booked++;
      else available++;
    });
    const nums = $$(".availability-item h3");
    if (nums.length === 3) { nums[0].textContent = available; nums[1].textContent = booked; nums[2].textContent = maintenance; }
    const sub = $(".availability-panel .panel-heading p");
    if (sub) sub.textContent = "Right now, from the database";
  }

  /* ---------------- Vehicles (admin_vehicles.html) ---------------- */
  async function loadVehicles() {
    const tbody = $("#vehicleTableBody");
    hideButton("openVehicleForm"); // providers add vehicles; the admin API can only verify them
    loadingRow(tbody, 9);
    // /api/vehicles includes type and provider names; /api/admin/vehicles proves admin access
    const [, all] = await Promise.all([DW_API.admin.vehicles(), DW_API.getVehicles()]);
    const vehicles = all.vehicles;

    const catSelect = $("#categoryFilter");
    const existing = new Set($$("option", catSelect).map((o) => o.value || o.textContent));
    [...new Set(vehicles.map(categoryOf))].forEach((c) => { if (!existing.has(c)) catSelect.append(el("option", {}, c)); });

    function statusText(v) {
      if (/maint|service/i.test(v.Status || "")) return "Maintenance";
      if (/booked|rented/i.test(v.Status || "")) return "Booked";
      return "Available";
    }

    function actionsCell(v) {
      const cell = el("td", { className: "live-actions" });
      const ver = v.Vehicle_Verification_Status;
      const cls = ver === "Verified" ? "confirmed" : ver === "Rejected" ? "cancelled" : "pending";
      cell.append(badge(ver === "Pending" ? "Needs review" : ver, cls));
      if (ver !== "Verified") cell.append(el("button", { type: "button", className: "action-btn", dataset: { verify: "Verified", id: v.Vehicle_ID } }, "Approve"));
      if (ver !== "Rejected") cell.append(el("button", { type: "button", className: "action-btn delete-btn", dataset: { verify: "Rejected", id: v.Vehicle_ID } }, "Reject"));
      return cell;
    }

    function render() {
      tbody.replaceChildren();
      vehicles
        .slice()
        .sort((a, b) => (a.Vehicle_Verification_Status === "Pending" ? -1 : 0) - (b.Vehicle_Verification_Status === "Pending" ? -1 : 0) || a.Vehicle_ID - b.Vehicle_ID)
        .forEach((v) => {
          const st = statusText(v);
          tbody.append(el("tr", { dataset: { vehicleId: v.Vehicle_ID } },
            el("td", {}, `${v.Brand || ""} ${v.Model || ""}`.trim()),
            el("td", {}, v.Registration_No || "—"),
            el("td", {}, categoryOf(v)),
            el("td", {}, v.Provider_Name || `Provider ${v.Provider_ID}`),
            el("td", {}, [v.Pickup_Address, v.City].filter(Boolean).join(", ") || "—"),
            el("td", {}, rupees(v.Price_Per_Hour)),
            el("td", {}, v.Fuel_Type || "—"),
            el("td", {}, badge(st, st === "Available" ? "available-status" : st === "Booked" ? "booked-status" : "maintenance-status")),
            actionsCell(v)));
        });
      // admin.js helpers: keep search, filters and the summary cards working
      if (typeof filterVehicles === "function") filterVehicles();
    }

    // Capture phase so admin.js's own edit/delete handler never sees these clicks
    tbody.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-verify]");
      if (!btn) return;
      e.stopPropagation();
      const v = vehicles.find((x) => String(x.Vehicle_ID) === btn.dataset.id);
      const status = btn.dataset.verify;
      if (status === "Rejected" && !confirm(`Reject ${v.Brand} ${v.Model}? Customers won't be able to book it.`)) return;
      btn.disabled = true;
      try {
        await DW_API.admin.setVehicleVerification(v.Vehicle_ID, status);
        v.Vehicle_Verification_Status = status;
        render();
      } catch (err) {
        btn.disabled = false;
        alert(`Couldn't update the vehicle: ${err.message}`);
      }
    }, true);

    render();
  }

  /* ---------------- Bookings (admin-bookings.html) ---------------- */
  async function loadBookings() {
    const tbody = $("#bookingTableBody");
    hideButton("openBookingForm"); // bookings are made by customers in the portal
    loadingRow(tbody, 10);
    const res = await DW_API.admin.bookings();
    tbody.replaceChildren();
    res.bookings.forEach((b) => {
      tbody.append(el("tr", {},
        el("td", {}, `#${b.Booking_ID}`),
        el("td", {}, b.Customer_Name),
        el("td", {}, `${b.Brand || ""} ${b.Model || ""}`.trim()),
        el("td", {}, b.City || "—"),
        el("td", {}, b.City || "—"),
        el("td", {}, fmtDateTime(b.Start_DateTime)),
        el("td", {}, fmtDateTime(b.End_DateTime)),
        el("td", {}, rupees(b.Total_Amount)),
        el("td", {}, badge(b.Booking_Status, bookingClass(b.Booking_Status))),
        el("td", { className: "muted-cell" }, b.Customer_Email || "")));
    });
    const head = $$("thead th", tbody.closest("table"));
    if (head.length === 10) { head[3].textContent = "Pickup City"; head[4].textContent = "Return City"; head[9].textContent = "Customer Email"; }
    if (!res.bookings.length) emptyRow(tbody, 10, "No bookings yet.");
    // bookings.js helpers: search, status filter and the summary cards
    if (typeof filterBookings === "function") filterBookings();
  }

  /* ---------------- Customers (admin-customer.html) ---------------- */
  async function loadCustomers() {
    const tbody = $("#customerTableBody");
    hideButton("openCustomerForm"); // customers sign up themselves
    loadingRow(tbody, 8);
    const res = await DW_API.admin.users();
    const users = res.users;

    // Columns that exist in the database: no "email verified" or "active" flags,
    // so those columns show whether a licence is on file and the account role.
    const head = $$("thead th", tbody.closest("table"));
    if (head.length >= 8) { head[0].textContent = "User ID"; head[1].textContent = "Name"; head[5].textContent = "Licence on File"; head[6].textContent = "Role"; head[7].textContent = ""; }
    const labels = $$(".stats-grid .stat-card");
    const setCard = (i, label, value, note) => {
      if (!labels[i]) return;
      $("p", labels[i]).textContent = label;
      $("h3", labels[i]).textContent = value;
      const n = $(".stat-note", labels[i]); if (n) n.textContent = note;
    };
    const count = (role) => users.filter((u) => u.User_Role === role).length;
    setCard(0, "Total Accounts", users.length, "All roles");
    setCard(1, "Customers", count("Customer"), "Can book vehicles");
    setCard(2, "Providers", count("Provider"), "Companies and owners");
    setCard(3, "Licence on File", users.filter((u) => u.User_Role === "Customer" && u.Driving_License_No).length, "Customers ready to self-drive");

    const filter = $("#customerStatusFilter");
    if (filter) {
      filter.replaceChildren(el("option", { value: "" }, "All roles"), ...["Customer", "Provider", "Admin"].map((r) => el("option", { value: r }, r)));
      filter.setAttribute("aria-label", "Filter by role");
    }

    tbody.replaceChildren();
    users.forEach((u) => {
      tbody.append(el("tr", {},
        el("td", {}, u.User_ID),
        el("td", {}, u.Name),
        el("td", {}, u.Email),
        el("td", {}, u.Phone || "—"),
        el("td", {}, u.Driving_License_No || "—"),
        el("td", {}, badge(u.Driving_License_No ? "Yes" : "No", u.Driving_License_No ? "customer-active" : "pending")),
        el("td", {}, u.User_Role),
        el("td", {})));
    });
    // customer.js listens to the search box and filter and hides non-matching rows
    $("#customerSearch").dispatchEvent(new Event("input"));
  }

  /* ---------------- Reports (admin-reports.html) ---------------- */
  async function loadReports() {
    const [res, all] = await Promise.all([DW_API.admin.bookings(), DW_API.getVehicles()]);
    const byId = new Map(all.vehicles.map((v) => [v.Vehicle_ID, v]));
    const rows = res.bookings.map((b) => ({
      id: String(b.Booking_ID),
      date: isoDay(b.Start_DateTime),
      vehicle: `${b.Brand || ""} ${b.Model || ""}`.trim(),
      category: byId.has(b.Vehicle_ID) ? categoryOf(byId.get(b.Vehicle_ID)) : "Car",
      status: b.Booking_Status,
      amount: Number(b.Total_Amount) || 0
    }));
    // reports.js keeps its data in these globals; point them at the database rows
    window.loadBookings = () => rows.map((r) => ({ ...r }));
    bookings = window.loadBookings();          // eslint-disable-line no-undef
    filteredBookings = [...bookings];           // eslint-disable-line no-undef
    renderReport(filteredBookings);             // eslint-disable-line no-undef
    filterMessage.textContent = `Showing all ${rows.length} booking(s). Data source: DriveWise database.`; // eslint-disable-line no-undef
  }

  const LOADERS = {
    index: loadDashboard,
    admin_vehicles: loadVehicles,
    "admin-bookings": loadBookings,
    "admin-customer": loadCustomers,
    "admin-reports": loadReports
  };

  /* ---------------- Start ---------------- */
  async function start() {
    if (!window.DW_API) return;
    const user = DW_API.getUser();
    const isAdmin = Boolean(user && user.userRole === "Admin");
    setupHeader(user);

    const loader = LOADERS[page];
    if (!loader) {
      if (page === "admin-settings") banner("Settings are not stored in the database yet. Changes on this page are for the demo only.");
      return;
    }

    if (!isAdmin) {
      banner(user
        ? [`You're logged in as ${user.name} (${user.userRole}). Showing sample data. `, loginLink()]
        : ["Showing sample data. Log in as an admin to see live data from the database. ", loginLink()]);
      return;
    }

    try {
      await loader();
      const b = $("#liveBanner"); if (b) b.remove();
    } catch (e) {
      restoreSamples();
      if (e.status === 401 || e.status === 403) {
        banner([`${e.message} `, loginLink()], true);
      } else {
        banner(`Couldn't load live data, so this page shows sample data. ${e.message}`, true);
      }
    }
  }

  start();
})();
