
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

router.get("/test", authMiddleware, authorizeRoles("Admin"), (req, res) => {
    res.status(200).json({
        success: true,
        message: "Admin access granted",
        user: req.user
    });
});

module.exports = router;
