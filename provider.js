// DriveWise provider dashboard
// Uses: GET /api/providers/me, GET /api/vehicles, GET /api/branches?providerId=,
//       POST /api/vehicles/:id/transfer, GET|PUT /api/vehicles/:id/location,
//       GET /api/providers/me/analytics
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rupees = (n) => (Number(n) < 0 ? "−" : "") + "₹" + Math.abs(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const money = (n) => `<span class="${Number(n) < 0 ? "money-neg" : ""}">${rupees(n)}</span>`;
  const fmtDateTime = (v) => {
    const d = DW_API.parseSqlDateTime(v);
    return d ? d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "never";
  };
  const COLORS = { payouts: "#5B3FD9", maintenance: "#E8590C" }; // validated pair (dataviz validator: all checks pass)

  // branches: this provider's own (transfer destinations); allBranches: for showing names
  const state = { provider: null, vehicles: [], branches: [], allBranches: [], map: null, marker: null, watchId: null, lastSent: 0 };
  const vehicleById = (id) => state.vehicles.find((v) => String(v.Vehicle_ID) === String(id));
  const branchById = (id) => state.allBranches.find((b) => b.Branch_ID === Number(id));
  const vName = (v) => `${v.Brand} ${v.Model}`;

  function gate(html) {
    $("#providerGate").innerHTML = `<div class="live-banner">${html}</div>`;
    $("#providerApp").hidden = true;
  }

  /* ---------------- Load ---------------- */
  async function loadVehicles() {
    const [vRes, bRes] = await Promise.all([
      DW_API.getVehicles(),
      DW_API.getBranches()
    ]);
    state.vehicles = vRes.vehicles.filter((v) => v.Provider_ID === state.provider.Provider_ID);
    state.allBranches = bRes.branches;
    state.branches = bRes.branches.filter((b) => b.Provider_ID === state.provider.Provider_ID);
  }

  async function start() {
    const user = DW_API.getUser();
    const login = `<a class="live-banner-btn" href="login.html?next=provider.html">Log in as a provider</a>`;
    if (!user) return gate(`Log in with a provider account to manage your vehicles. ${login}`);
    if (user.userRole !== "Provider") {
      return gate(`You're logged in as ${esc(user.name)} (${esc(user.userRole)}). This page is for providers. ${login}`);
    }
    gate(`Loading your dashboard… the server can take up to a minute to wake up.`);
    $(".live-banner").classList.remove("is-error");
    try {
      const me = await DW_API.provider.me();
      state.provider = me.provider;
      await loadVehicles();
    } catch (e) {
      if (e.status === 401) return gate(`Your session has ended. ${login}`);
      return gate(`Couldn't load your dashboard: ${esc(e.message)} <button class="live-banner-btn" type="button" onclick="location.reload()">Try again</button>`);
    }
    $("#providerGate").innerHTML = "";
    $("#providerApp").hidden = false;
    const p = state.provider;
    $("#providerName").textContent = p.Display_Name;
    $("#providerType").textContent = p.Provider_Type === "Company" ? "Rental company" : "Individual owner";
    $("#providerAvatar").textContent = String(p.Display_Name).charAt(0).toUpperCase();
    $("#providerWelcome").textContent = `Welcome back, ${String(p.Name || p.Display_Name).split(" ")[0]}!`;

    renderVehicles();
    setupTransfer();
    setupGps();
    loadAnalytics();
    setupLogout();
  }

  function setupLogout() {
    const footer = $(".sidebar-footer");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "customer-link session-btn";
    btn.textContent = "Log out";
    btn.addEventListener("click", () => { DW_API.logout(); location.href = "login.html"; });
    footer.append(btn);
  }

  /* ---------------- Vehicles ---------------- */
  function branchName(id) {
    const b = branchById(id);
    if (!b) return "—";
    const other = b.Provider_ID !== state.provider.Provider_ID ? ` (${b.Provider_Name}'s branch)` : "";
    return `${b.Branch_Name}, ${b.City}${other}`;
  }

  function renderVehicles() {
    const rows = $("#vehicleRows");
    if (!state.vehicles.length) {
      rows.innerHTML = `<tr><td colspan="8" class="live-loading">You haven't listed any vehicles yet.</td></tr>`;
      return;
    }
    rows.innerHTML = state.vehicles.map((v) => {
      const gps = Number(v.GPS_Enabled) === 1;
      const ver = v.Vehicle_Verification_Status;
      return `<tr>
        <td>${esc(vName(v))}</td>
        <td>${esc(v.Registration_No)}</td>
        <td>${esc(v.Type_Name || v.Vehicle_Category || "")}</td>
        <td>${v.Current_Branch_ID ? esc(branchName(v.Current_Branch_ID)) : `<span class="muted-cell">${esc([v.Pickup_Address, v.City].filter(Boolean).join(", ") || "No branch")}</span>`}</td>
        <td>${esc(branchName(v.Home_Branch_ID))}</td>
        <td>${gps ? `<span class="gps-badge">On · ${esc(fmtDateTime(v.Location_Updated_At))}</span>` : `<span class="gps-badge off">Off</span>`}</td>
        <td>${rupees(v.Price_Per_Hour)}</td>
        <td><span class="status ${ver === "Verified" ? "confirmed" : ver === "Rejected" ? "cancelled" : "pending"}">${esc(ver === "Pending" ? "Awaiting review" : ver)}</span></td>
      </tr>`;
    }).join("");

    const stats = [
      ["Vehicles", state.vehicles.length, `${state.vehicles.filter((v) => Number(v.GPS_Enabled) === 1).length} with GPS`],
      ["Branches", state.branches.length, state.branches.length ? state.branches.map((b) => b.City).filter((c, i, a) => a.indexOf(c) === i).join(", ") : "No branches yet"]
    ];
    $("#providerStats").innerHTML = stats.map(([label, value, note]) =>
      `<article class="stat-card"><p>${esc(label)}</p><h3>${esc(value)}</h3><span class="stat-note">${esc(note)}</span></article>`).join("") +
      `<article class="stat-card" id="statEarned"><p>Payouts earned</p><h3>…</h3><span class="stat-note">Loading</span></article>
       <article class="stat-card" id="statNet"><p>Net earnings</p><h3>…</h3><span class="stat-note">Loading</span></article>`;
    if (state.summary) renderEarningCards();
  }

  function renderEarningCards() {
    const s = state.summary;
    const setCard = (id, value, note, negative) => {
      const c = $(id); if (!c) return;
      const h = $("h3", c);
      h.textContent = value;
      h.classList.toggle("money-neg", Boolean(negative));
      $(".stat-note", c).textContent = note;
    };
    setCard("#statEarned", rupees(s.Payouts_Earned), `${rupees(s.Completed_Payout)} paid, ${rupees(s.Pending_Payout)} pending`);
    setCard("#statNet", rupees(s.Net_Earnings), `After ${rupees(s.Maintenance_Expense)} of maintenance`, Number(s.Net_Earnings) < 0);
  }

  /* ---------------- Branch transfer ---------------- */
  function setupTransfer() {
    const vSel = $("#transferVehicle"), toSel = $("#transferTo"), msg = $("#transferMsg");
    if (!state.branches.length) {
      $("#transferForm").style.display = "none";
      msg.className = "form-msg";
      msg.textContent = "You don't have any branches, so there's nowhere to transfer vehicles to. Branches are for rental companies with more than one location.";
      return;
    }
    const fillVehicles = (keep) => {
      vSel.innerHTML = state.vehicles.map((v) =>
        `<option value="${v.Vehicle_ID}">${esc(vName(v))} · ${esc(v.Registration_No)}</option>`).join("");
      if (keep) vSel.value = keep;
    };
    const fillBranches = () => {
      const v = vehicleById(vSel.value);
      if (!v) return;
      $("#transferCurrent").value = v.Current_Branch_ID ? branchName(v.Current_Branch_ID) : "No branch";
      const options = state.branches.filter((b) => b.Branch_ID !== v.Current_Branch_ID);
      toSel.innerHTML = options.length
        ? options.map((b) => `<option value="${b.Branch_ID}">${esc(b.Branch_Name)}, ${esc(b.City)}</option>`).join("")
        : `<option value="">No other branch</option>`;
      $("#transferBtn").disabled = !options.length;
    };
    fillVehicles();
    fillBranches();
    vSel.addEventListener("change", () => { msg.textContent = ""; fillBranches(); });

    $("#transferForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = vehicleById(vSel.value);
      if (!v || !toSel.value) return;
      const btn = $("#transferBtn");
      btn.disabled = true;
      btn.textContent = "Transferring…";
      msg.className = "form-msg";
      msg.textContent = "";
      try {
        const res = await DW_API.transferVehicle(v.Vehicle_ID, Number(toSel.value));
        await loadVehicles();
        renderVehicles();
        fillVehicles(v.Vehicle_ID);
        fillBranches();
        loadAnalytics();
        const to = res.currentBranch || {};
        msg.className = "form-msg ok";
        msg.textContent = `${vName(v)} moved to ${to.name}. Customers now see ${to.address}, ${to.city} as its pickup point.`;
      } catch (err) {
        msg.className = "form-msg err";
        msg.textContent = err.message;
      } finally {
        btn.textContent = "Transfer vehicle";
        btn.disabled = false;
      }
    });
  }

  /* ---------------- GPS ---------------- */
  function setupGps() {
    const sel = $("#gpsVehicle"), msg = $("#gpsMsg");
    const gpsVehicles = state.vehicles.filter((v) => Number(v.GPS_Enabled) === 1);
    if (!gpsVehicles.length) {
      ["#gpsForm", ".track-row", "#gpsMap"].forEach((sel) => { $(sel).style.display = "none"; });
      msg.className = "form-msg";
      msg.textContent = "None of your vehicles has GPS turned on.";
      return;
    }
    sel.innerHTML = gpsVehicles.map((v) => `<option value="${v.Vehicle_ID}">${esc(vName(v))} · ${esc(v.Registration_No)}</option>`).join("");

    if (window.L) {
      state.map = L.map("gpsMap", { zoomControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(state.map);
      state.map.setView([28.6139, 77.2090], 11);
      // Click the map to pick a position
      state.map.on("click", (e) => {
        $("#gpsLat").value = e.latlng.lat.toFixed(6);
        $("#gpsLng").value = e.latlng.lng.toFixed(6);
        showPin(e.latlng.lat, e.latlng.lng);
      });
    }

    const showVehicle = async () => {
      const v = vehicleById(sel.value);
      msg.textContent = "";
      $("#gpsLast").textContent = "Loading position…";
      try {
        const res = await DW_API.getVehicleLocation(v.Vehicle_ID);
        const L0 = res.location;
        if (res.ok && L0 && L0.latitude !== null) {
          $("#gpsLat").value = L0.latitude;
          $("#gpsLng").value = L0.longitude;
          showPin(L0.latitude, L0.longitude);
          $("#gpsLast").textContent = `Last reported ${fmtDateTime(L0.lastUpdated)}.`;
        } else {
          $("#gpsLat").value = ""; $("#gpsLng").value = "";
          $("#gpsLast").textContent = "No position reported yet.";
        }
      } catch (e) {
        $("#gpsLast").textContent = `Couldn't load the position: ${e.message}`;
      }
    };
    sel.addEventListener("change", () => { stopSharing(); showVehicle(); });
    showVehicle();

    $("#gpsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const lat = $("#gpsLat").value.trim(), lng = $("#gpsLng").value.trim();
      if (lat === "" || lng === "") {
        msg.className = "form-msg err";
        msg.textContent = "Enter a latitude and longitude, click the map, or use this device's location.";
        return;
      }
      sendLocation(Number(lat), Number(lng), true);
    });

    $("#gpsHere").addEventListener("click", () => {
      if (!navigator.geolocation) { msg.className = "form-msg err"; msg.textContent = "This browser can't share its location."; return; }
      msg.className = "form-msg"; msg.textContent = "Getting this device's location…";
      navigator.geolocation.getCurrentPosition(
        (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude, true),
        (err) => { msg.className = "form-msg err"; msg.textContent = geoError(err); },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });

    $("#gpsShare").addEventListener("click", () => (state.watchId === null ? startSharing() : stopSharing()));
  }

  function geoError(err) {
    return err.code === 1 ? "Location permission was denied. Allow location for this site in the browser settings."
      : "Couldn't get this device's location. Try again outdoors or with Wi-Fi on.";
  }

  function showPin(lat, lng) {
    if (!state.map) return;
    if (!state.marker) {
      // divIcon: the bundled Leaflet copy has no marker images
      state.marker = L.marker([lat, lng], {
        icon: L.divIcon({ className: "dw-pin", html: "<i></i>", iconSize: [22, 22], iconAnchor: [11, 11] })
      }).addTo(state.map);
    }
    else state.marker.setLatLng([lat, lng]);
    state.map.setView([lat, lng], Math.max(state.map.getZoom(), 14));
  }

  async function sendLocation(lat, lng, announce) {
    const v = vehicleById($("#gpsVehicle").value);
    const msg = $("#gpsMsg");
    try {
      const res = await DW_API.updateVehicleLocation(v.Vehicle_ID, lat, lng);
      const L0 = res.location;
      $("#gpsLat").value = L0.latitude;
      $("#gpsLng").value = L0.longitude;
      showPin(L0.latitude, L0.longitude);
      v.Location_Updated_At = L0.lastUpdated;
      $("#gpsLast").textContent = `Last reported ${fmtDateTime(L0.lastUpdated)}.`;
      if (announce) { msg.className = "form-msg ok"; msg.textContent = `Location saved for ${vName(v)}.`; }
      renderVehicles();
    } catch (e) {
      msg.className = "form-msg err";
      msg.textContent = e.message;
      if (e.status === 401 || e.status === 403) stopSharing();
    }
  }

  // Live sharing: send this device's position at most every 15 seconds
  function startSharing() {
    if (!navigator.geolocation) return;
    const msg = $("#gpsMsg");
    const btn = $("#gpsShare");
    state.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (Date.now() - state.lastSent < 15000) return;
        state.lastSent = Date.now();
        sendLocation(pos.coords.latitude, pos.coords.longitude, false);
      },
      (err) => { msg.className = "form-msg err"; msg.textContent = geoError(err); stopSharing(); },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    btn.textContent = "Stop sharing";
    btn.setAttribute("aria-pressed", "true");
    msg.className = "form-msg ok";
    msg.textContent = "Sharing this device's location live. Keep this page open.";
  }

  function stopSharing() {
    if (state.watchId === null) return;
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
    state.lastSent = 0;
    const btn = $("#gpsShare");
    btn.textContent = "Share this device's location live";
    btn.setAttribute("aria-pressed", "false");
    $("#gpsMsg").textContent = "Stopped sharing.";
  }

  /* ---------------- Analytics ---------------- */
  async function loadAnalytics() {
    let res;
    try {
      res = await DW_API.provider.analytics();
    } catch (e) {
      $("#providerMonthly").innerHTML = `<p class="form-msg err">Couldn't load analytics: ${esc(e.message)}</p>`;
      return;
    }
    state.summary = res.summary || {};
    renderEarningCards();

    DWCharts.bars($("#providerMonthly"), {
      label: "Payouts and maintenance costs per month",
      categoryLabel: "Month",
      categories: res.monthly.map((m) => DWCharts.monthLabel(m.Month)),
      series: [
        { name: "Payouts", color: COLORS.payouts, values: res.monthly.map((m) => m.Payouts) },
        { name: "Maintenance", color: COLORS.maintenance, values: res.monthly.map((m) => m.Maintenance) }
      ],
      format: rupees
    });

    const maxRev = Math.max(1, ...res.vehicles.map((v) => v.Booking_Revenue));
    $("#providerVehiclePerf").innerHTML = res.vehicles.length ? res.vehicles.map((v) => `<tr>
        <td>${esc(v.Brand)} ${esc(v.Model)}</td>
        <td>${v.Bookings}</td>
        <td>${v.Hours_Rented}</td>
        <td><div class="databar"><i style="width:${Math.round((v.Booking_Revenue / maxRev) * 80)}px"></i><span>${rupees(v.Booking_Revenue)}</span></div></td>
        <td>${rupees(v.Maintenance_Cost)}</td>
        <td>${money(v.Net_Contribution)}</td>
      </tr>`).join("") : `<tr><td colspan="6" class="live-loading">No vehicles yet.</td></tr>`;

    $("#providerCategories").innerHTML = res.categories.length ? res.categories.map((c) => `<tr>
        <td>${esc(c.Vehicle_Category)}</td><td>${c.Bookings}</td><td>${rupees(c.Booking_Revenue)}</td></tr>`).join("")
      : `<tr><td colspan="3" class="live-loading">No bookings yet.</td></tr>`;
  }

  // Sidebar: highlight the section in view
  document.querySelectorAll(".sidebar-nav .nav-link").forEach((a) => a.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-nav .nav-link").forEach((x) => x.classList.toggle("active", x === a));
  }));

  start();
})();
