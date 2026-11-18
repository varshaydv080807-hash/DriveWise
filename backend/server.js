require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const app = express();
app.disable("x-powered-by");

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Requests without an Origin header include curl, Postman and server-to-server calls.
        const isDevelopment = process.env.NODE_ENV !== "production";
        if (!origin || allowedOrigins.includes(origin) || (isDevelopment && allowedOrigins.length === 0)) {
            return callback(null, true);
        }
        return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to DriveWise Backend",
        status: "Server is running"
    });
});

app.get("/api/health", async (_req, res) => {
    try {
        const [rows] = await pool.query("SELECT DATABASE() AS databaseName");
        return res.status(200).json({
            success: true,
            status: "healthy",
            database: rows[0].databaseName
        });
    } catch (_error) {
        return res.status(503).json({
            success: false,
            status: "degraded",
            database: "unavailable"
        });
    }
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/providers", require("./routes/providerRoutes"));
app.use("/api/vehicles", require("./routes/vehicleRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/branches", require("./routes/branchRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.use((_req, res) => {
    res.status(404).json({ success: false, message: "API route not found" });
});

app.use((error, _req, res, _next) => {
    if (error.message === "Origin is not allowed by CORS") {
        return res.status(403).json({ success: false, message: "Origin is not allowed" });
    }
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ success: false, message: "Invalid JSON request body" });
    }
    if (error.type === "entity.too.large") {
        return res.status(413).json({ success: false, message: "Request body is too large" });
    }
    console.error("Unhandled API error:", error);
    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

let server;
if (require.main === module) {
    const port = Number(process.env.PORT || 5001);
    server = app.listen(port, () => {
        console.log(`DriveWise backend running on port ${port}`);
    });

    const shutdown = (signal) => {
        console.log(`${signal} received. Closing DriveWise backend...`);
        if (!server) process.exit(0);
        server.close(async () => {
            try { await pool.end(); } catch (error) { console.error("Database pool shutdown error:", error.message); }
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = app;
