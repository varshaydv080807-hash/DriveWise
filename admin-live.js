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

  const escapeHtml = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
    const [, all, branchRes] = await Promise.all([DW_API.admin.vehicles(), DW_API.getVehicles(), DW_API.getBranches()]);
    let vehicles = all.vehicles;
    const branches = branchRes.branches;
    const branchById = (id) => branches.find((x) => x.Branch_ID === id);

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
      if (branches.some((x) => x.Provider_ID === v.Provider_ID && x.Branch_ID !== v.Current_Branch_ID)) {
        cell.append(el("button", { type: "button", className: "action-btn", dataset: { transfer: v.Vehicle_ID } }, "Transfer"));
      }
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
            el("td", {}, v.Current_Branch_ID && branchById(v.Current_Branch_ID)
              ? `${branchById(v.Current_Branch_ID).Branch_Name}, ${branchById(v.Current_Branch_ID).City}`
              : ([v.Pickup_Address, v.City].filter(Boolean).join(", ") || "—")),
            el("td", {}, rupees(v.Price_Per_Hour)),
            el("td", {}, v.Fuel_Type || "—"),
            el("td", {}, badge(st, st === "Available" ? "available-status" : st === "Booked" ? "booked-status" : "maintenance-status")),
            actionsCell(v)));
        });
      // admin.js helpers: keep search, filters and the summary cards working
      if (typeof filterVehicles === "function") filterVehicles();
    }

    // Transfer dialog: PUT /api/vehicles/:id/transfer (admins may move any vehicle
    // between its own provider's branches)
    const dialog = el("dialog", { className: "transfer-dialog", "aria-labelledby": "transferTitle" });
    document.body.append(dialog);
    function openTransfer(v) {
      const options = branches.filter((x) => x.Provider_ID === v.Provider_ID && x.Branch_ID !== v.Current_Branch_ID);
      const current = v.Current_Branch_ID && branchById(v.Current_Branch_ID);
      dialog.innerHTML = `
        <form method="dialog" class="transfer-form">
          <h2 id="transferTitle">Transfer ${escapeHtml(v.Brand)} ${escapeHtml(v.Model)}</h2>
          <p class="note">${escapeHtml(v.Provider_Name || "")} · now at ${escapeHtml(current ? `${current.Branch_Name}, ${current.City}` : "no branch")}</p>
          <div class="form-field">
            <label for="transferTo">Move to</label>
            <select id="transferTo">${options.map((x) => `<option value="${x.Branch_ID}">${escapeHtml(x.Branch_Name)}, ${escapeHtml(x.City)}</option>`).join("")}</select>
          </div>
          <p class="form-msg err" id="transferErr" role="alert"></p>
          <div class="form-actions">
            <button class="action-btn" value="cancel" type="submit">Cancel</button>
            <button class="add-vehicle-btn" type="button" id="transferGo">Transfer</button>
          </div>
        </form>`;
      dialog.showModal();
      dialog.querySelector("#transferGo").addEventListener("click", async () => {
        const go = dialog.querySelector("#transferGo");
        go.disabled = true;
        go.textContent = "Transferring…";
        try {
          await DW_API.transferVehicle(v.Vehicle_ID, Number(dialog.querySelector("#transferTo").value));
          vehicles = (await DW_API.getVehicles()).vehicles;
          dialog.close();
          render();
        } catch (err) {
          dialog.querySelector("#transferErr").textContent = err.message;
          go.disabled = false;
          go.textContent = "Transfer";
        }
      });
    }

    // Capture phase so admin.js's own edit/delete handler never sees these clicks
    tbody.addEventListener("click", async (e) => {
      const tbtn = e.target.closest("button[data-transfer]");
      if (tbtn) {
        e.stopPropagation();
        openTransfer(vehicles.find((x) => String(x.Vehicle_ID) === tbtn.dataset.transfer));
        return;
      }
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

  /* ---------------- Analytics (admin-analytics.html) ---------------- */
  const REVENUE_COLOR = "#5B3FD9"; // single series: brand violet (validated with the dataviz checker)
  // Analytics shows whole rupees
  const rupees0 = (n) => "₹" + Math.round(Number(n || 0)).toLocaleString("en-IN");
  const money = (n) => `<span class="${Number(n) < 0 ? "money-neg" : ""}">${Number(n) < 0 ? "−" : ""}${rupees0(Math.abs(Number(n)))}</span>`;

  // Uses GET /api/admin/profitability/{monthly,providers,vehicles}
  async function loadAnalytics() {
    const [monthlyRes, providerRes, vehicleRes] = await Promise.all([
      DW_API.admin.profitability.monthly(),
      DW_API.admin.profitability.providers(),
      DW_API.admin.profitability.vehicles()
    ]);
    const num = (x) => Number(x) || 0;
    const monthly = monthlyRes.monthlyData
      .filter((m) => m.Payment_Month)
      .map((m) => ({ Month: m.Payment_Month, Net: num(m.Net_Collected), Refunds: num(m.Successful_Refunds) }));
    const providers = providerRes.providers.map((p) => {
      const payouts = num(p.Completed_Payout) + num(p.Pending_Payout);
      return { ...p, Payouts: payouts, Net_Earnings: payouts - num(p.Maintenance_Expense) };
    });
    const sum = (rows, key) => rows.reduce((t, r) => t + num(r[key]), 0);

    // Summary cards
    const cards = $$("#analyticsStats .stat-card");
    const setCard = (i, value, note) => { $("h3", cards[i]).textContent = value; if (note) $(".stat-note", cards[i]).textContent = note; };
    const completed = sum(providers, "Completed_Payout"), pending = sum(providers, "Pending_Payout");
    setCard(0, rupees0(sum(monthly, "Net")), "Completed payments minus refunds");
    setCard(1, rupees0(sum(providers, "Recorded_Commission")), "DriveWise's share of bookings");
    setCard(2, rupees0(completed + pending), `${rupees0(completed)} paid, ${rupees0(pending)} pending`);
    setCard(3, rupees0(sum(providers, "Maintenance_Expense")), "Completed maintenance, paid by providers");

    // Revenue chart with a month range (filtered in the browser)
    const fromSel = $("#revFrom"), toSel = $("#revTo");
    const opts = monthly.map((m) => `<option value="${m.Month}">${DWCharts.monthLabel(m.Month)}</option>`).join("");
    fromSel.innerHTML = opts; toSel.innerHTML = opts;
    if (monthly.length) { fromSel.value = monthly[0].Month; toSel.value = monthly[monthly.length - 1].Month; }

    function drawRevenue() {
      const from = fromSel.value, to = toSel.value;
      if (from && to && from > to) { $("#revenueSub").textContent = "Choose a start month before the end month."; return; }
      const rows = monthly.filter((m) => (!from || m.Month >= from) && (!to || m.Month <= to));
      $("#revenueSub").textContent = `${rupees0(sum(rows, "Net"))} from completed payments, minus refunds`;
      DWCharts.bars($("#revenueChart"), {
        label: "Revenue per month",
        categoryLabel: "Month",
        categories: rows.map((m) => DWCharts.monthLabel(m.Month)),
        series: [{ name: "Revenue", color: REVENUE_COLOR, values: rows.map((m) => m.Net) }],
        format: rupees0
      });
      const refunds = sum(rows, "Refunds");
      $("#revenueMethods").textContent = refunds ? `Refunds in this period: ${rupees0(refunds)}` : "";
    }
    fromSel.addEventListener("change", drawRevenue);
    toSel.addEventListener("change", drawRevenue);
    drawRevenue();

    // Provider earnings
    const maxValue = Math.max(1, ...providers.map((p) => num(p.Confirmed_Or_Completed_Booking_Value)));
    $("#providerEarnings").innerHTML = providers
      .sort((a, b) => num(b.Confirmed_Or_Completed_Booking_Value) - num(a.Confirmed_Or_Completed_Booking_Value))
      .map((p) => `<tr>
        <td>${escapeHtml(p.Display_Name)}</td>
        <td>${escapeHtml(p.Provider_Type)}</td>
        <td>${num(p.Total_Bookings)}</td>
        <td><div class="databar"><i style="width:${Math.round((num(p.Confirmed_Or_Completed_Booking_Value) / maxValue) * 90)}px"></i><span>${rupees0(p.Confirmed_Or_Completed_Booking_Value)}</span></div></td>
        <td>${rupees0(p.Recorded_Commission)}</td>
        <td>${rupees0(p.Payouts)}</td>
        <td>${rupees0(p.Maintenance_Expense)}</td>
        <td>${money(p.Net_Earnings)}</td>
      </tr>`).join("") || `<tr><td colspan="8" class="live-loading">No providers yet.</td></tr>`;

    // Vehicle and category performance
    const top = vehicleRes.vehicles.filter((v) => v.Bookings > 0).slice(0, 8);
    $("#topVehicles").innerHTML = top.map((v) => `<tr>
        <td>${escapeHtml(v.Brand)} ${escapeHtml(v.Model)}</td>
        <td>${escapeHtml(v.Type_Name)}</td>
        <td>${v.Bookings}</td>
        <td>${rupees0(v.Booking_Revenue)}</td>
        <td>${money(v.Net_Contribution)}</td>
      </tr>`).join("") || `<tr><td colspan="5" class="live-loading">No bookings yet.</td></tr>`;

    $("#categoryPerf").innerHTML = vehicleRes.categories.map((c) => `<tr>
        <td>${escapeHtml(c.Vehicle_Category)}</td><td>${c.Vehicles}</td><td>${c.Bookings}</td><td>${rupees0(c.Booking_Revenue)}</td>
      </tr>`).join("");
  }

  const LOADERS = {
    index: loadDashboard,
    admin_vehicles: loadVehicles,
    "admin-bookings": loadBookings,
    "admin-customer": loadCustomers,
    "admin-reports": loadReports,
    "admin-analytics": loadAnalytics
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
