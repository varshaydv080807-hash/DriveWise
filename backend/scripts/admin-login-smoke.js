// Optional manual smoke test. Configure ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD
// in your local shell; never put credentials in this file.
const email = process.env.ADMIN_TEST_EMAIL;
const password = process.env.ADMIN_TEST_PASSWORD;
const baseUrl = process.env.API_BASE_URL || "http://localhost:5001";

if (!email || !password) {
    console.error("Set ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD in your shell first.");
    process.exit(1);
}

(async () => {
    try {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        console.log("HTTP Status:", response.status);
        console.log("Message:", data.message);
        console.log("User:", data.user || null);
        console.log("Token received:", Boolean(data.token));
        if (!response.ok) process.exitCode = 1;
    } catch (error) {
        console.error("Login test failed:", error.message);
        process.exitCode = 1;
    }
})();
