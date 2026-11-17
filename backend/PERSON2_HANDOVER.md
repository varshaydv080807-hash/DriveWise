# DriveWise — Person 2 Backend Handover

## Deployment

- Production API: `https://drivewise-backend-5egg.onrender.com`
- Health endpoint: `GET /api/health`
- Hosting: Render
- Database: hosted MySQL database `main`
- Latest verified deployment commit in the deployment screenshot: `7b04eb6`

The health endpoint was manually opened after deployment and returned:

```json
{"success":true,"status":"healthy","database":"main"}
```

This confirms that the deployed server responds and can query the configured database. It does not by itself prove every authenticated route or frontend CORS integration works.

## Person 2 scope

- Express server setup and operational health endpoint
- Customer/provider signup and login with JWT authentication
- JWT middleware and role-based authorization
- Customer profile read/update endpoints
- Provider profile and company/individual details endpoints
- Render deployment configuration and MySQL connection

Vehicle CRUD, booking/availability, payments, reviews, maintenance, and frontend integration remain with their assigned teammates. No DB schema change is part of this handover.

## API endpoint summary

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Server + database health |
| POST | `/api/auth/signup` | Public | Customer/provider registration |
| POST | `/api/auth/login` | Public | Login and JWT issuance |
| GET | `/api/users/me` | Customer JWT | Current customer profile |
| PUT | `/api/users/me` | Customer JWT | Update customer profile |
| GET | `/api/providers/me` | Provider JWT | Current provider profile |
| PUT | `/api/providers/me` | Provider JWT | Update provider display name |
| GET | `/api/providers/me/company` | Provider JWT | Company details |
| PUT | `/api/providers/me/company` | Provider JWT | Update company legal name/registration number |
| GET | `/api/providers/me/individual` | Provider JWT | Individual verification details |
| GET | `/api/admin/test` | Admin JWT | Verify admin authorization |

Send authenticated requests with `Authorization: Bearer <token>`.

## Automated checks

From the backend directory:

```bash
npm test
```

A production-safe smoke test is included. It performs only GET requests and makes no data changes:

```powershell
$env:API_BASE_URL="https://drivewise-backend-5egg.onrender.com"
node scripts/production-smoke.js
```

It checks the health/database endpoint and verifies that customer, provider, and admin protected routes reject requests without a token.

## Render environment checklist

Configure secrets only in Render's Environment settings (never in GitHub):

- `NODE_ENV=production`
- `JWT_SECRET` — long, random secret
- `DATABASE_URL` — hosted MySQL connection string, or the documented `DB_*` variables
- `FRONTEND_ORIGIN` — exact deployed frontend origin(s), comma-separated

Render supplies `PORT` automatically. Do not commit `.env`.

After rotating the database password or JWT secret, update Render environment variables, redeploy, and repeat the smoke tests. Rotating `JWT_SECRET` invalidates previously issued JWTs, so coordinate that with frontend integration.

## Handover boundary

Person 2's server deployment and database health check are complete. Before declaring the entire backend integration fully verified, test real customer/provider logins, protected profile GET/PUT operations, admin role access, and CORS from the deployed frontend origin. Do not treat a successful health check as proof of those separate flows.
