// DriveWise API service layer
// Every call to the backend goes through this file, for both the customer portal
// and the admin pages. Load config.js before this file.
//
// Usage:  const { vehicles } = await DW_API.getVehicles();
// Errors: every function throws DW_API.ApiError with a readable .message and the HTTP .status
//         (status 0 means the server could not be reached at all).

(function () {
  "use strict";

  var BASE = String((window.DW_CONFIG && window.DW_CONFIG.API_BASE_URL) || "").replace(/\/+$/, "");
  var TOKEN_KEY = "dw_token";
  var USER_KEY = "dw_user";
  // Render's free plan sleeps when idle; the first request can take ~50 seconds.
  var TIMEOUT_MS = 75000;

  /* ---------------- Errors ---------------- */
  function ApiError(message, status, data) {
    this.name = "ApiError";
    this.message = message;
    this.status = status;
    this.data = data;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  /* ---------------- Session (JWT + user) ---------------- */
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage blocked */ }
  }
  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* storage blocked */ }
  }

  // Read the expiry time inside the JWT (no verification; the server does that)
  function tokenExpired(token) {
    try {
      var payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
    } catch (e) {
      return true;
    }
  }

  function getToken() {
    var token = safeGet(TOKEN_KEY);
    if (!token) return null;
    if (tokenExpired(token)) { clearSession(); return null; }
    return token;
  }

  function getUser() {
    if (!getToken()) return null;
    try { return JSON.parse(safeGet(USER_KEY)); } catch (e) { return null; }
  }

  function setSession(token, user) {
    safeSet(TOKEN_KEY, token);
    safeSet(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    safeRemove(TOKEN_KEY);
    safeRemove(USER_KEY);
  }

  /* ---------------- Core request ---------------- */
  async function request(path, options) {
    options = options || {};
    var method = options.method || "GET";
    var headers = { Accept: "application/json" };

    if (options.body !== undefined) headers["Content-Type"] = "application/json";

    if (options.auth) {
      var token = getToken();
      if (!token) throw new ApiError("Please log in to continue.", 401);
      headers.Authorization = "Bearer " + token;
    } else if (options.authOptional && getToken()) {
      // Public route that shows more to logged-in users (e.g. live location during your trip)
      headers.Authorization = "Bearer " + getToken();
    }

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    var res;
    try {
      res = await fetch(BASE + path, {
        method: method,
        headers: headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });
    } catch (err) {
      throw new ApiError(
        err.name === "AbortError"
          ? "The DriveWise server took too long to answer. Try again in a minute."
          : "Can't reach the DriveWise server. Check your internet connection, or try again in a minute while it wakes up.",
        0
      );
    } finally {
      clearTimeout(timer);
    }

    var data = null;
    try { data = await res.json(); } catch (e) { /* empty or non-JSON body */ }

    if (!res.ok) {
      if (res.status === 401 && options.auth) clearSession();
      var message = (data && data.message) ||
        (res.status === 401 ? "Your session has ended. Please log in again." :
         res.status === 403 ? "You don't have permission to do that." :
         "Something went wrong (error " + res.status + "). Please try again.");
      throw new ApiError(message, res.status, data);
    }

    return data;
  }

  /* ---------------- Date helpers ----------------
     The backend stores and expects local wall-clock times as "YYYY-MM-DD HH:mm:ss". */
  function pad(n) { return String(n).padStart(2, "0"); }

  function toSqlDateTime(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) +
      " " + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":00";
  }

  // Accepts "2026-11-20 10:00:00" or "2026-11-20T10:00:00.000Z" and reads the
  // date and clock time as written (no timezone shifting).
  function parseSqlDateTime(value) {
    if (!value) return null;
    var m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return new Date(value);
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  }

  /* ---------------- Endpoints ---------------- */
  var api = {
    BASE_URL: BASE,
    ApiError: ApiError,
    toSqlDateTime: toSqlDateTime,
    parseSqlDateTime: parseSqlDateTime,

    // Session
    getUser: getUser,
    getToken: getToken,
    isLoggedIn: function () { return Boolean(getToken()); },
    logout: clearSession,

    health: function () { return request("/api/health"); },

    // Auth
    login: async function (email, password) {
      var data = await request("/api/auth/login", { method: "POST", body: { email: email, password: password } });
      setSession(data.token, data.user);
      return data.user;
    },
    // body: { name, email, phone, password, userRole: "Customer", drivingLicense }
    signup: async function (body) {
      var data = await request("/api/auth/signup", { method: "POST", body: body });
      setSession(data.token, data.user);
      return data.user;
    },

    // Customer profile (uses /api/users/:id, which works on every backend version)
    getProfile: function () {
      var user = getUser();
      if (!user) return Promise.reject(new ApiError("Please log in to continue.", 401));
      return request("/api/users/" + encodeURIComponent(user.userId), { auth: true });
    },
    // body: { name, phone, drivingLicense }
    updateProfile: async function (body) {
      var user = getUser();
      if (!user) throw new ApiError("Please log in to continue.", 401);
      var data = await request("/api/users/" + encodeURIComponent(user.userId), { method: "PUT", body: body, auth: true });
      setSession(getToken(), Object.assign({}, user, { name: body.name }));
      return data;
    },

    // Vehicles (public)
    getVehicles: function () { return request("/api/vehicles"); },
    getBookedSlots: function () { return request("/api/vehicles/booked-slots"); },

    getVehicle: function (vehicleId) { return request("/api/vehicles/" + encodeURIComponent(vehicleId)); },

    // GPS location
    // GET /api/vehicles/:id/location. The backend answers 400 when GPS is off, 404 when no
    // position has been reported and 403 when the location is private; those come back as
    // { ok: false, status, message, location } instead of throwing, so pages can explain them.
    getVehicleLocation: async function (vehicleId) {
      try {
        var data = await request("/api/vehicles/" + encodeURIComponent(vehicleId) + "/location", { authOptional: true });
        return { ok: true, status: 200, message: data.message, location: data.location };
      } catch (e) {
        if (e.status === 400 || e.status === 403 || e.status === 404) {
          var body = e.data || {};
          return { ok: false, status: e.status, message: body.message || e.message, location: body.location || null, onTrip: Boolean(body.onTrip) };
        }
        throw e;
      }
    },
    updateVehicleLocation: function (vehicleId, latitude, longitude) {
      return request("/api/vehicles/" + encodeURIComponent(vehicleId) + "/location", {
        method: "PUT", auth: true, body: { latitude: latitude, longitude: longitude }
      });
    },

    // Branches and transfer
    getBranches: function (providerId) {
      return request("/api/branches" + (providerId ? "?providerId=" + encodeURIComponent(providerId) : ""));
    },
    getVehicleBranches: function (vehicleId) {
      return request("/api/vehicles/" + encodeURIComponent(vehicleId) + "/branches");
    },
    // POST /api/vehicles/:id/transfer (provider who owns it, or admin)
    transferVehicle: function (vehicleId, destinationBranchId) {
      return request("/api/vehicles/" + encodeURIComponent(vehicleId) + "/transfer", {
        method: "POST", auth: true, body: { destinationBranchId: destinationBranchId }
      });
    },

    // GET /api/vehicles/recommend. prefs (all optional): { city, maxPrice, category, minSeats,
    // fuelType, minRating, start, end, limit }; start/end as Date objects
    getRecommendations: function (prefs) {
      var params = new URLSearchParams();
      Object.keys(prefs || {}).forEach(function (key) {
        var value = prefs[key];
        if (value === undefined || value === null || value === "") return;
        params.set(key, value instanceof Date ? toSqlDateTime(value).slice(0, 16) : String(value));
      });
      var query = params.toString();
      return request("/api/vehicles/recommend" + (query ? "?" + query : ""));
    },

    // Add / edit vehicles (provider). GET /api/vehicles/types lists the types for the form.
    getVehicleTypes: function () { return request("/api/vehicles/types"); },
    addVehicle: function (body) {
      return request("/api/vehicles/add", { method: "POST", auth: true, body: body });
    },
    updateVehicle: function (vehicleId, body) {
      return request("/api/vehicles/" + encodeURIComponent(vehicleId), { method: "PUT", auth: true, body: body });
    },

    // Provider (logged in as a provider)
    provider: {
      me: function () { return request("/api/providers/me", { auth: true }); },
      bookings: function () { return request("/api/providers/bookings", { auth: true }); },
      analytics: function () { return request("/api/providers/me/analytics", { auth: true }); }
    },

    // Bookings (customer)
    createBooking: function (vehicleId, start, end) {
      return request("/api/bookings", {
        method: "POST",
        auth: true,
        body: { vehicleId: vehicleId, startDateTime: toSqlDateTime(start), endDateTime: toSqlDateTime(end) }
      });
    },
    getMyBookings: function () { return request("/api/bookings/my", { auth: true }); },
    cancelBooking: function (bookingId) {
      return request("/api/bookings/" + encodeURIComponent(bookingId) + "/cancel", { method: "PATCH", auth: true });
    },

    // Admin
    admin: {
      test: function () { return request("/api/admin/test", { auth: true }); },
      dashboard: function () { return request("/api/admin/dashboard", { auth: true }); },
      // Profitability analytics (Feature 4)
      profitability: {
        bookings: function () { return request("/api/admin/profitability/bookings", { auth: true }); },
        providers: function () { return request("/api/admin/profitability/providers", { auth: true }); },
        monthly: function () { return request("/api/admin/profitability/monthly", { auth: true }); },
        vehicles: function () { return request("/api/admin/profitability/vehicles", { auth: true }); }
      },
      users: function () { return request("/api/admin/users", { auth: true }); },
      vehicles: function () { return request("/api/admin/vehicles", { auth: true }); },
      bookings: function () { return request("/api/admin/bookings", { auth: true }); },
      // status: "Verified" | "Rejected"
      setVehicleVerification: function (vehicleId, status) {
        return request("/api/admin/vehicles/" + encodeURIComponent(vehicleId) + "/verification", {
          method: "PATCH", auth: true, body: { verificationStatus: status }
        });
      }
    }
  };

  window.DW_API = api;
})();
