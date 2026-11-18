// DriveWise — log in / create account
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const loginForm = $("#loginForm");
  const signupForm = $("#signupForm");
  const status = $("#authStatus");

  // Only allow redirects to our own pages, e.g. "customer-portal.html#trips"
  function nextPage(fallback) {
    const next = new URLSearchParams(location.search).get("next") || "";
    return /^[\w-]+\.html(#[\w-]*)?$/.test(next) ? next : fallback;
  }

  function homeFor(user) {
    if (user.userRole === "Admin") {
      const next = nextPage("index.html");
      return /^(index|admin)/.test(next) ? next : "index.html";
    }
    if (user.userRole === "Customer") return nextPage("customer-portal.html");
    if (user.userRole === "Provider") {
      const next = nextPage("provider.html");
      return next.startsWith("provider") ? next : "provider.html";
    }
    return null;
  }

  function goHome(user) {
    const page = homeFor(user);
    if (page) { location.href = page; return; }
    status.innerHTML = `Logged in as <strong>${escapeHtml(user.name)}</strong>. This account type doesn't have a dashboard here. <button type="button" class="linkbtn" id="logoutBtn">Log out</button>`;
    $("#logoutBtn").addEventListener("click", () => { DW_API.logout(); location.reload(); });
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function setMode(mode) {
    const signup = mode === "signup";
    loginForm.hidden = signup;
    signupForm.hidden = !signup;
    $("#tabLogin").setAttribute("aria-selected", String(!signup));
    $("#tabSignup").setAttribute("aria-selected", String(signup));
    $("#authTitle").textContent = signup ? "Create your account" : "Welcome back";
    $("#authIntro").textContent = signup
      ? "It takes a minute. You'll be able to book straight away."
      : "Log in to book vehicles and see your trips.";
    (signup ? signupForm : loginForm).querySelector("input").focus();
  }

  document.querySelectorAll(".auth-tabs .tab").forEach((t) => t.addEventListener("click", () => setMode(t.dataset.mode)));

  function showError(form, msg) {
    const err = form.querySelector(".form-error");
    err.hidden = !msg;
    err.textContent = msg || "";
  }

  async function withBusy(form, label, task) {
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = label;
    // Render's free server can take a while to wake up
    const slow = setTimeout(() => { status.textContent = "Waking up the server, this can take up to a minute the first time…"; }, 4000);
    try {
      await task();
    } catch (e) {
      showError(form, e.message);
    } finally {
      clearTimeout(slow);
      status.textContent = "";
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = loginForm.elements;
    const email = f.email.value.trim();
    const password = f.password.value;
    if (!email || !password) return showError(loginForm, "Enter your email and password.");
    showError(loginForm, "");
    withBusy(loginForm, "Logging in…", async () => {
      const user = await DW_API.login(email, password);
      goHome(user);
    });
  });

  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = signupForm.elements;
    const body = {
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      phone: f.phone.value.replace(/[\s-]/g, ""),
      password: f.password.value,
      userRole: "Customer",
      drivingLicense: f.drivingLicense.value.trim() || undefined
    };
    let msg = "";
    if (body.name.length < 2) msg = "Enter your full name.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) msg = "Enter an email address like name@example.com.";
    else if (!/^(\+91)?[6-9]\d{9}$/.test(body.phone)) msg = "Enter a 10-digit Indian mobile number.";
    else if (body.password.length < 8) msg = "Use a password with at least 8 characters.";
    showError(signupForm, msg);
    if (msg) return;
    withBusy(signupForm, "Creating account…", async () => {
      const user = await DW_API.signup(body);
      goHome(user);
    });
  });

  // Already logged in?
  const user = DW_API.getUser();
  if (user) {
    status.innerHTML = `You're logged in as <strong>${escapeHtml(user.name)}</strong>. <button type="button" class="linkbtn" id="continueBtn">Continue</button> or <button type="button" class="linkbtn" id="switchBtn">log in as someone else</button>.`;
    $("#continueBtn").addEventListener("click", () => goHome(user));
    $("#switchBtn").addEventListener("click", () => { DW_API.logout(); location.reload(); });
  }

  if (new URLSearchParams(location.search).get("mode") === "signup") setMode("signup");
})();
