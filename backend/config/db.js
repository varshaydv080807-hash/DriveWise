const mysql = require("mysql2/promise");
require("dotenv").config();

function getConnectionConfig() {
    const connectionString = process.env.DATABASE_URL;

    if (connectionString) {
        const url = new URL(connectionString);
        if (url.protocol !== "mysql:") {
            throw new Error("DATABASE_URL must use the mysql:// protocol");
        }

        return {
            host: url.hostname,
            port: Number(url.port || 3306),
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            database: decodeURIComponent(url.pathname.slice(1)),
            // Enzonic requires TLS. ssl-mode is intentionally not passed as
            // a mysql2 option; TLS is enabled through this supported option.
            ssl: { minVersion: "TLSv1.2" }
        };
    }

    const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) {
        throw new Error(`Missing database environment variables: ${missing.join(", ")}`);
    }

    return {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT || 3306),
        ssl: process.env.DB_SSL === "false" ? undefined : { minVersion: "TLSv1.2" }
    };
}

const pool = mysql.createPool({
    ...getConnectionConfig(),
    // Return DATE/DATETIME columns as plain "YYYY-MM-DD HH:mm:ss" strings so
    // booking times are not shifted by the server's timezone (Render runs in UTC).
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

module.exports = pool;
