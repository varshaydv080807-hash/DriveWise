// Production-safe smoke checks: no credentials or database writes required.
// Usage: API_BASE_URL=https://your-render-service.onrender.com node scripts/production-smoke.js
const baseUrl = (process.env.API_BASE_URL || "http://localhost:5001").replace(/\/$/, "");
const checks = [
    {
        name: "Health endpoint and database connection",
        path: "/api/health",
        expectedStatus: 200,
        validate: (body) => body.success === true && body.status === "healthy" && typeof body.database === "string"
    },
    {
        name: "Customer profile is protected",
        path: "/api/users/me",
        expectedStatus: 401,
        validate: (body) => body.success === false
    },
    {
        name: "Provider profile is protected",
        path: "/api/providers/me",
        expectedStatus: 401,
        validate: (body) => body.success === false
    },
    {
        name: "Admin test route is protected",
        path: "/api/admin/test",
        expectedStatus: 401,
        validate: (body) => body.success === false
    }
];

(async () => {
    let failed = 0;
    console.log(`DriveWise production smoke test: ${baseUrl}`);
    for (const check of checks) {
        try {
            const response = await fetch(`${baseUrl}${check.path}`, {
                headers: { Accept: "application/json" }
            });
            const body = await response.json().catch(() => ({}));
            const passed = response.status === check.expectedStatus && check.validate(body);
            console.log(`${passed ? "PASS" : "FAIL"} ${check.name} (HTTP ${response.status})`);
            if (!passed) failed += 1;
        } catch (error) {
            failed += 1;
            console.log(`FAIL ${check.name} (${error.message})`);
        }
    }
    console.log(`\nResult: ${checks.length - failed}/${checks.length} checks passed.`);
    if (failed) process.exitCode = 1;
})();
