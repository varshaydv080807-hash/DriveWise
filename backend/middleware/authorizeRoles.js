
module.exports = (...allowedRoles) => (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.userRole)) {
        return res.status(403).json({
            success: false,
            message: "Access denied. You do not have permission to access this resource."
        });
    }
    return next();
};
