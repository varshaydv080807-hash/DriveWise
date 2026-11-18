# DriveWise: the four new features

This branch (`feature-frontend-and-person3`) contains:
1. Pull requests #1 (branch transfer), #2 (profitability analytics) and #3 (recommendations), merged as they are.
2. **Person 3:** the missing backend pieces, built on top of those pull requests and Priya's GPS work on `main`.
3. **Aditi (frontend):** the pages for all four features.

The teammates' routes, parameter names and response formats are kept. Where an endpoint was changed, it only gained fields or accepted more cases.

## 1. GPS tracking

**Backend (Person 3 additions to Priya's endpoints)**
- `GET /api/vehicles/:id/location`
  - Customers and guests can now see a vehicle's location; before, they got "access denied".
  - While a vehicle is **on a trip**, only the customer on that trip, the vehicle's provider and admins see it. Everyone else gets `403` with "This vehicle is on a trip, so its live location is private."
  - The responses for GPS off (`400`) and no position yet (`404`) are unchanged. They now also include `location.gpsEnabled`, `onTrip`, `pickupAddress` and `city`.
- `PUT /api/vehicles/:id/location`
  - `Location_Updated_At` is saved in India time instead of the database server's UTC clock.
  - The response now also returns the saved `location`.
- New: `GET /api/vehicles/:id` returns vehicle details with GPS status and branch names.

**Frontend**
- Vehicle cards show "GPS tracked".
- The vehicle details sheet has **View location**: a map, the last update, and a message if GPS is off.
- **Track** on a trip shows the real stored GPS position, refreshed every 15 seconds.
- **Provider dashboard → GPS Location** has three ways to set a position: type the coordinates or click the map, **use this device's location**, or **share this device's location live**. With live sharing, a phone travelling with the vehicle becomes its tracker.

## 2. Cross-branch transfer

**Backend**
- New: `GET /api/branches` lists all branches, or one provider's with `?providerId=3`. The transfer screens need it for the "Move to" list.
- New: `GET /api/vehicles/:id/branches` returns the vehicle's home and current branch.
- Changes to Khushi's `POST /api/vehicles/:id/transfer` (body `{ "destinationBranchId": 4 }`):
  - **Admins** can transfer too, not only the vehicle's provider.
  - The vehicle's **pickup address and city** change to the new branch's, so customers see where to collect it. For vehicles without GPS, the old coordinates are cleared.
  - The checks for bookings and maintenance in progress use India time.
  - The response also includes `currentBranch` (name, address, city).

**Frontend**
- **Provider dashboard → Branch Transfer:** choose a vehicle, see its current branch, choose where to move it, and get a success or error message.
- **Admin → Vehicles:** a **Transfer** button for vehicles whose provider has another branch.

## 3. Smart recommendations

**Backend:** Priya's `GET /api/vehicles/recommend` now **scores** vehicles instead of filtering them out. The parameters are the same: `city`, `maxPrice`, `category`, `minSeats`, `fuelType`, `minRating`.

| Match | Points |
|---|---|
| City | +25 |
| Price per hour ≤ `maxPrice` | +25 |
| Category | +20 |
| Seats ≥ `minSeats` | +15 |
| Fuel type | +10 |
| Provider rated ≥ `minRating` (default 4) | +5 |

- Optional `start` and `end` (e.g. `2026-11-20 10:00`) leave out vehicles that are booked then. Optional `limit` (default 6).
- Each result has `Score`, `Matched` (reasons) and `Missed`, plus all the original columns. The response also includes `maxScore` and `considered`.

**Frontend:** a **Recommended for you** section on the customer portal, with:
- inputs: city, budget per hour, type, seats and fuel
- results: match %, the reasons for each match, price, rating and **Book now**

## 4. Profitability analytics

**Backend:** Khushi's views (`database/profitability_views.sql`) and her three admin endpoints are used as they are.
- New: `GET /api/admin/profitability/vehicles` returns per-vehicle and per-category booking revenue, maintenance and net, for admins.
- New: `GET /api/providers/me/analytics` returns a provider's own data only: a summary from `profitability_provider_summary_view`, monthly collected / payouts / maintenance, and per-vehicle and per-category figures.
- Net earnings = payouts (completed + pending) − completed maintenance. This is a simplified measure; costs not recorded in DriveWise aren't included.

**Frontend**
- **Admin → Analytics** (new page):
  - revenue, commission, payouts and maintenance cards
  - a revenue-per-month chart with a month range
  - provider earnings, top vehicles and the per-category breakdown
- **Provider dashboard → Analytics:** payouts and maintenance per month, plus per-vehicle performance.

## New pages and files

| File | What it is |
|---|---|
| `provider.html`, `provider.js` | Provider dashboard. Providers land here after logging in. |
| `admin-analytics.html` | Admin analytics page; there's also an "Analytics" link in every admin sidebar. |
| `dw-charts.js` | Small bar-chart helper with hover tooltips and a "Show as table" view. |
| `backend/controllers/analyticsController.js`, `branchController.js`, `routes/branchRoutes.js` | New backend code. |
| `backend/middleware/optionalAuth.js` | Reads the login token if one is sent, but doesn't require it. |
| `backend/utils/localTime.js` | "Now" in India time. |
| `backend/scripts/set-password.js` | Sets a real password for an existing account. See below. |

## Before it works on the live site

1. **Merge into `main` and redeploy Render.** Only do this once the team has reviewed the branch.
2. **Run Khushi's views on the live database** if nobody has yet. From `/backend`, with `.env` pointing at Enzonic, run each statement of `database/profitability_views.sql`. Or paste the file into Enzonic's SQL console.
3. **Provider logins.** The seed provider accounts have placeholder passwords. To log in as one, e.g. Rohan Fleet Services, run this from `/backend`:
   `node scripts/set-password.js rohan@example.com`
4. **Data to know about (Person 1's area):**
   - Some vehicles are linked to another provider's branch: the original seed vehicles 4 and 5, and several from `seed_more_vehicles.sql`. They show as "(… 's branch)" on the provider page.
   - Rohan Fleet Services has only one branch, so it has nowhere to transfer to. Aarav Mobility and Ananya Rentals have two branches each, so an admin can demo transfers with their vehicles.
   - The live database has only 5 payments, all from November, so the revenue chart shows a single month until more bookings are paid.
   - GPS times saved before this change are in UTC and will look 5:30 hours early.
