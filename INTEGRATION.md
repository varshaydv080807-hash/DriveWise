# DriveWise: frontend ↔ backend integration (Aditi)

The customer portal and admin pages now use the real backend
(`https://drivewise-backend-5egg.onrender.com`) instead of mock data.
The frontend never talks to MySQL; every request goes through the API.

## New files

| File | What it does |
|---|---|
| `config.js` | API base URL. Uses Render on the deployed site, and `http://localhost:5001` when the page is opened from your own computer. |
| `api.js` | The API service layer. All `fetch` calls, the JWT token (stored in `localStorage`), error messages, and date conversion. |
| `login.html`, `login.js` | Log in and customer sign-up. Customers go to the portal and admins to the dashboard. |
| `admin-live.js` | Loads live data into the admin pages when an admin is logged in. |
| `database/seed_more_vehicles.sql` | 22 more verified vehicles with photos and coordinates. |

## Changed files

**Customer portal** (`customer-portal.js/.html/.css`)
- Vehicles come from `GET /api/vehicles`. Only admin-verified vehicles are listed.
- "Free for your dates" uses `GET /api/vehicles/booked-slots`.
- Booking calls `POST /api/bookings`. The total is hours × price per hour, the same formula as the `calculate_booking_amount` procedure.
- My trips uses `GET /api/bookings/my`, and cancelling calls `PATCH /api/bookings/:id/cancel`.
- The profile page reads and saves through `GET`/`PUT /api/users/:id`.
- Things the backend doesn't have yet are hidden when using live data: drivers, add-ons, doorstep delivery and saved addresses. GPS tracking is labelled as simulated.
- If the server can't be reached, the page falls back to the old demo data and shows a banner saying so.

**Admin pages** (`index.html`, `admin_vehicles.html`, `admin-bookings.html`, `admin-customer.html`, `admin-reports.html`, `admin-settings.html`, `style.css`)
- These pages now load `config.js`, `api.js` and `admin-live.js`.
- Logged in as an admin, they show real data from `/api/admin/*`, and admins can approve or reject vehicles.
- The admin API can't add, edit or delete records, so those buttons are hidden while live data is shown.
- When nobody is logged in, the sample data stays and a "Log in as admin" banner appears.

**Backend**: one merged `backend/` folder, ready to deploy on Render
The `main` branch had the booking and admin routes (Person 3) but Person 2's *older* auth code. Person 2's newer handover build had never been pushed. This folder combines both:
- **From Person 2's handover kit:**
  - `server.js` and `config/db.js` (supports `DATABASE_URL` or `DB_*`)
  - the auth and user controllers, the middleware, and the auth, user and provider routes
  - `tests/`, `scripts/`, `README.md`, `SECURITY_REVIEW.md`, `PERSON2_HANDOVER.md`, `.env.example`
- **Kept from `main` (Person 3):** bookings, admin, the vehicle controller, and the provider booking routes (`GET /api/providers/bookings`, `PATCH /api/providers/bookings/:id/status`), added to the provider routes and controller.
- **My 3 changes:**
  1. `dateStrings: true` in `config/db.js`. Without it, booking times shift by 5:30 hours between the database and the browser, because Render runs in UTC.
  2. `GET /api/vehicles` now also returns the vehicle type, seats, fuel, provider name and average rating.
  3. New public `GET /api/vehicles/booked-slots`, which returns only vehicle ID plus start and end times of upcoming bookings, with no customer details.

`npm test` passes (6/6). Every route was checked against MySQL 8.

Note: Person 2's JWT now includes an issuer check, so anyone logged in before this deploy must log in again. The frontend handles that by sending them to the login page.

## To do before it works on the live site

1. **Push this `backend/` folder to `main`.** Render deploys `backend/` from `main` of this repo. Check that Render's environment has `NODE_ENV=production`, `JWT_SECRET`, `FRONTEND_ORIGIN=https://drivewise-flame.vercel.app`, and either `DATABASE_URL` or `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`.
2. **Run `database/seed_more_vehicles.sql` on the Enzonic database (`main`)** once, after `schema.sql` and `seed.sql`. Make sure `procedures.sql`, `triggers.sql` and `views.sql` are also loaded. Booking calls `calculate_booking_amount`.
3. **Create an admin account** with `node create-admin.js`. The seed users have fake password hashes, so nobody can log in as them.
4. **Push the frontend** so `https://drivewise-flame.vercel.app` redeploys. CORS on Render already allows that origin.
5. **Test on the live site:**
   - sign up as a customer and add a licence number
   - book a vehicle, then see it in My trips and cancel it
   - log in as admin and check the dashboard, vehicles (approve one), bookings and customers

## Testing locally

```bash
# database (MySQL 8)
mysql -u root < database/schema.sql
mysql -u root < database/seed.sql
mysql -u root < database/procedures.sql
mysql -u root < database/triggers.sql
mysql -u root < database/views.sql
mysql -u root drivewise < database/seed_more_vehicles.sql

# backend: set DB_* and JWT_SECRET in backend/.env, DB_SSL=false, NODE_ENV=development
cd backend && npm install && npm run dev

# frontend: serve the folder (opening the file directly also works)
python -m http.server 5500   # then open http://localhost:5500/customer-portal.html
```

All of the above was tested against MySQL 8 and the backend running locally: signup, login, wrong password, booking, the double-booking guard (409), cancelling, profile save, all five admin pages, vehicle approval, and the fallback when the server is down.
