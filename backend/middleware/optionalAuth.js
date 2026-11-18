const jwt = require("jsonwebtoken");

// Like authMiddleware, but never rejects: if a valid Bearer token is sent,
// req.user is set; otherwise the request continues as a guest (req.user = null).
// Used by public routes that show more to the people involved (e.g. a vehicle's
// live location during a trip).
module.exports = function optionalAuth(req, _res, next) {
    req.user = null;
    const secret = process.env.JWT_SECRET;
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (!secret || scheme !== "Bearer" || !token) return next();
    try {
        const decoded = jwt.verify(token, secret, { algorithms: ["HS256"], issuer: "drivewise-api" });
        if (decoded && Number(decoded.userId) > 0 && ["Customer", "Provider", "Admin"].includes(decoded.userRole)) {
            req.user = { ...decoded, userId: Number(decoded.userId) };
        }
    } catch (_error) {
        // Invalid or expired token: treat as a guest
    }
    return next();
};
