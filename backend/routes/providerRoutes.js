const express = require("express");
const router = express.Router();
const providerController = require("../controllers/providerController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// Preferred routes: derive Provider_ID from the authenticated User_ID.
router.get("/me", providerController.getProviderProfile);
router.put("/me", providerController.updateProviderProfile);
router.get("/me/company", providerController.getCompanyDetails);
router.put("/me/company", providerController.updateCompanyDetails);
router.get("/me/individual", providerController.getIndividualDetails);

// Provider booking management (must come before the "/:id" routes)
router.get("/bookings", providerController.getProviderBookings);
router.patch("/bookings/:id/status", providerController.updateProviderBookingStatus);

// Backward-compatible ID routes. Ownership is still checked against the JWT.
router.get("/company/:id", providerController.getCompanyDetails);
router.get("/individual/:id", providerController.getIndividualDetails);
router.get("/:id", providerController.getProviderProfile);
router.put("/:id", providerController.updateProviderProfile);

module.exports = router;
