const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({ success: false, message: "Authentication is not configured" });
    }

    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ success: false, message: "Access denied. Bearer token required." });
    }

    try {
        const decoded = jwt.verify(token, secret, {
            algorithms: ["HS256"],
            issuer: "drivewise-api"
        });
        const validRoles = ["Customer", "Provider", "Admin"];
        if (!decoded || !Number.isInteger(Number(decoded.userId)) || Number(decoded.userId) <= 0 || !validRoles.includes(decoded.userRole)) {
            return res.status(401).json({ success: false, message: "Invalid authentication token" });
        }
        req.user = { ...decoded, userId: Number(decoded.userId) };
        return next();
    } catch (_error) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};
