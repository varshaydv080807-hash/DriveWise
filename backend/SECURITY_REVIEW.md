# DriveWise Person 2 — Security and Implementation Review

This review is limited to Person 2 scope: server foundation, authentication, authorization, customer/provider profiles, and operational configuration. It does not redesign vehicle, booking, payment, or other Person 3 business logic, and it does not change the database schema.

## Changes in this review build

- JWT verification now pins the HS256 algorithm and requires the `drivewise-api` issuer used by the login/signup token issuer.
- JWT claims must contain a positive user ID and one of the supported roles: Customer, Provider, or Admin.
- Signup checks the JWT secret before starting registration and creates the token before committing the transaction, avoiding a committed account followed by a configuration-related 500 response.
- Signup/profile updates validate field lengths against the existing agreed schema columns.
- Production CORS is fail-closed when `NODE_ENV=production`; configure exact frontend origins through `FRONTEND_ORIGIN`.
- Oversized JSON requests receive HTTP 413 rather than a generic internal-server response.
- Automated middleware tests include issuer and unsupported-role rejection.

## Verified by the user against local backend + hosted MySQL

- `/api/health` reports healthy and database `main`.
- Customer login and customer profile GET/PUT persistence.
- Provider login and provider profile GET/PUT persistence.
- Individual provider details GET.
- Company provider signup and company details GET/PUT endpoints returned success.
- The user previously ran the middleware suite successfully with 4/4 tests before this review build. The review build adds two tests; run `npm test` after installing this build to confirm 6/6.

## Still required before Person 2 can be called fully complete

- Run the updated automated test suite on the user's Windows environment.
- Deploy this exact reviewed source to the existing Render service.
- Set `NODE_ENV=production`, `JWT_SECRET`, database connection variables, and the exact `FRONTEND_ORIGIN` in Render.
- Verify production health, login, protected customer/provider profile routes, and CORS from the deployed frontend origin.
- Rotate the database credential and JWT secret after the deployment is stable, update local and Render environment variables, redeploy, and repeat smoke tests.
- Review dependency advisories with network-enabled `npm audit`; this environment could not complete an online audit/install, so no claim is made that dependency vulnerabilities have been cleared.

## Important boundary

No database DDL, schema attributes, seed records, vehicle CRUD, booking logic, payment logic, or frontend files were changed as part of this review.
