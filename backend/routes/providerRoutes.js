
const express = require("express");
const router = express.Router();

const providerController = require("../controllers/providerController");
const authMiddleware = require("../middleware/authMiddleware");

// All provider routes require authentication
router.use(authMiddleware);

// Provider booking management
router.get("/bookings", providerController.getProviderBookings);
router.patch(
    "/bookings/:id/status",
    providerController.updateProviderBookingStatus
);

// Company and individual details
router.get("/company/:id", providerController.getCompanyDetails);
router.get("/individual/:id", providerController.getIndividualDetails);

// Provider profile
router.get("/:id", providerController.getProviderProfile);
router.put("/:id", providerController.updateProviderProfile);

module.exports = router;
