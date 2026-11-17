// DriveWise frontend configuration
// The frontend never talks to MySQL directly; every request goes to the backend API.
//
// - On the deployed site (Vercel) it uses the Render backend.
// - When you open the site from your own computer (localhost / 127.0.0.1) it uses
//   a backend running locally on port 5001 (`npm run dev` in /backend).
//   Note: the Render backend only accepts requests from https://drivewise-flame.vercel.app
//   (CORS), so local pages must talk to a local backend.

(function () {
  "use strict";

  var PRODUCTION_API = "https://drivewise-backend-5egg.onrender.com";
  var LOCAL_API = "http://localhost:5001";

  var host = window.location.hostname;
  var isLocal = host === "localhost" || host === "127.0.0.1" || host === "";

  window.DW_CONFIG = {
    API_BASE_URL: isLocal ? LOCAL_API : PRODUCTION_API
  };
})();
