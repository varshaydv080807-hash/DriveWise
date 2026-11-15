# DriveWise Backend — Person 2

Express + MySQL backend for the DriveWise Vehicle Rental Management System.

## Scope

This package covers the backend foundation, authentication, authorization, user/provider profiles, and operational health checks. Vehicle CRUD routes are retained for compatibility with the existing project; vehicle/booking business logic remains the responsibility of the relevant project teammate.

## Requirements

- Node.js 18 or newer
- MySQL 8.x database
- Enzonic-hosted MySQL requires TLS

## Setup

1. Extract this folder.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Configure either `DATABASE_URL` **or** the separate `DB_*` variables.
5. Set a strong random `JWT_SECRET`.
6. Keep `NODE_ENV=development` locally. Set `NODE_ENV=production` in Render.
7. Run `npm run dev` for local development (uses Node.js built-in `--watch`; no nodemon dependency) or `npm start` for production.

Never commit `.env`, database passwords, JWT secrets, or access tokens.

### Enzonic connection

Use the complete `mysql://...` connection string in `DATABASE_URL`. The application parses the URL into supported `mysql2` options and enables TLS. It deliberately does not pass the Enzonic `ssl-mode=REQUIRED` URL parameter through as a `mysql2` option.

For local databases, set `DB_SSL=false` only if the local MySQL server does not use TLS.

## API base URL

Local: `http://localhost:5001`

Production: set `API_BASE_URL` to your deployed Render service URL.

## Endpoints

### Health

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/` | No | Basic server status |
| GET | `/api/health` | No | Server and database health |

### Authentication

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Register Customer or Provider |
| POST | `/api/auth/login` | No | Login and receive JWT |

Customer signup body:
```json
{
  "name": "Sample Customer",
  "email": "customer@example.com",
  "phone": "9876543210",
  "password": "AtLeast8Characters",
  "userRole": "Customer",
  "drivingLicense": "DL-EXAMPLE"
}
```

Individual provider signup body:
```json
{
  "name": "Sample Provider",
  "email": "provider@example.com",
  "phone": "9876543211",
  "password": "AtLeast8Characters",
  "userRole": "Provider",
  "providerType": "Individual"
}
```

Company provider signup body:
```json
{
  "name": "Sample Company Contact",
  "email": "company@example.com",
  "phone": "9876543212",
  "password": "AtLeast8Characters",
  "userRole": "Provider",
  "providerType": "Company",
  "legalName": "Example Mobility Pvt Ltd",
  "registrationNo": "EXAMPLE-REG-001"
}
```

Signup does not permit public creation of Admin accounts. Admins must be provisioned separately.

### Customer/user profile

All profile endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/users/me` | Get authenticated user's profile |
| PUT | `/api/users/me` | Update name, phone and/or drivingLicense |
| GET | `/api/users/:id` | Backward-compatible self-only profile route |
| PUT | `/api/users/:id` | Backward-compatible self-only update route |

Example update:
```json
{
  "name": "Updated Name",
  "phone": "9876543210",
  "drivingLicense": "DL-EXAMPLE"
}
```

Email, role, and password are not editable through this profile endpoint.

### Provider profile

All provider endpoints require a Provider JWT. The API derives the provider record from the authenticated `User_ID`; clients do not need to discover or supply a `Provider_ID`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/providers/me` | Get provider profile |
| PUT | `/api/providers/me` | Update `displayName` |
| GET | `/api/providers/me/company` | Get company details |
| PUT | `/api/providers/me/company` | Update `legalName` and/or `registrationNo` |
| GET | `/api/providers/me/individual` | Get individual provider verification details |

Company update example:
```json
{
  "legalName": "Updated Legal Name",
  "registrationNo": "NEW-REGISTRATION-NUMBER"
}
```

Verification status is intentionally not editable by the provider. It remains an administrative verification field.

Backward-compatible routes `/api/providers/:id`, `/api/providers/company/:id`, and `/api/providers/individual/:id` remain available and enforce ownership against the JWT.

The Individual Details table in the agreed schema contains only `Provider_ID` and `Verification_Status`; therefore there are no individual-specific editable profile fields in this schema.

### Admin

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/admin/test` | Admin | Verify admin authentication/authorization |

### Vehicle routes retained from the existing project

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/vehicles` | No | List vehicles |
| POST | `/api/vehicles/add` | Provider | Add vehicle |
| PUT | `/api/vehicles/:id` | Provider | Update owned vehicle |
| DELETE | `/api/vehicles/:id` | Provider | Delete owned vehicle |

These routes are retained rather than redesigned as part of Person 2.

## Authorization and security notes

- Passwords are hashed with bcrypt.
- JWTs expire after `JWT_EXPIRES_IN` (default `1d`) and are verified with the expected issuer and HS256 algorithm.
- Use a long, random `JWT_SECRET`.
- In production, set `NODE_ENV=production` and configure `FRONTEND_ORIGIN` with the exact deployed frontend origin(s). Production browser requests are denied when no origin is configured; local development can use an empty origin list.
- Customer and provider profile operations are scoped to the authenticated account.
- Company verification status is not provider-editable.
- CORS can be restricted using comma-separated exact origins in `FRONTEND_ORIGIN`.
- The health endpoint returns database name/status only; it does not expose credentials.

## Tests

Run:
```bash
npm test
```

The included automated tests cover authentication middleware (including issuer and role validation) and role authorization. These are unit tests, not a substitute for live MySQL/API integration testing.

Manual API tests should be run against both local and deployed environments after configuring their environment variables.

## Render deployment

- Build command: `npm install`
- Start command: `npm start`
- Configure the production environment variables in Render's Environment page.
- Set `PORT` only if required by the host; Render supplies it automatically.
- Set `DATABASE_URL` (or the `DB_*` values), `JWT_SECRET`, and `FRONTEND_ORIGIN`.
- After changing credentials, redeploy and verify `GET /api/health`, login, and protected profile routes.

## Known external verification still required

This code package cannot prove that a Render deployment has been updated or that every endpoint works with live production data. Complete the integration/deployment checklist using the actual Render service and hosted database before marking Person 2 fully complete.
