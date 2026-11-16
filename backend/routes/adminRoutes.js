
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");
const adminController = require("../controllers/adminController");

// All Admin routes require authentication and Admin role
router.use(authMiddleware);
router.use(authorizeRoles("Admin"));

// Admin APIs
router.get("/test", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Admin access granted",
        user: req.user
    });
});

router.get("/users", adminController.getAllUsers);
router.get("/vehicles", adminController.getAllVehicles);
router.patch("/vehicles/:id/verification", adminController.updateVehicleVerification);
router.get("/bookings", adminController.getAllBookings);
router.get("/dashboard", adminController.getDashboardStats);

module.exports = router;
