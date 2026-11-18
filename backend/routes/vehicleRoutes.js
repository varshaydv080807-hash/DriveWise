
const express = require("express");
const router = express.Router();

const vehicleController = require("../controllers/vehicleController");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");
const optionalAuth = require("../middleware/optionalAuth");

// Add a new vehicle
router.post(
    "/add",
    authMiddleware,
    authorizeRoles("Provider"),
    vehicleController.addVehicle
);

// Get all vehicles
router.get("/", vehicleController.getAllVehicles);

// Smart Vehicle Recommendation (Feature 3)
router.get(
    "/recommend",
    vehicleController.getRecommendedVehicles
);

// Vehicle types for the add-vehicle form (public)
router.get("/types", vehicleController.getVehicleTypes);

// Get booked slots
router.get("/booked-slots", vehicleController.getBookedSlots);

// Update vehicle
router.put(
    "/:id",
    authMiddleware,
    authorizeRoles("Provider"),
    vehicleController.updateVehicle
);
router.post(
    "/:id/transfer",
    authMiddleware,
    authorizeRoles("Provider", "Admin"),
    vehicleController.transferVehicle
);

// Delete vehicle
router.delete(
    "/:id",
    authMiddleware,
    authorizeRoles("Provider"),
    vehicleController.deleteVehicle
);

// Get vehicle GPS location (public; logging in shows more, e.g. during your own trip)
router.get(
    "/:id/location",
    optionalAuth,
    vehicleController.getVehicleLocation
);

// Update vehicle GPS location
router.put(
    "/:id/location",
    authMiddleware,
    authorizeRoles("Provider"),
    vehicleController.updateVehicleLocation
);

// Vehicle details and branches (public). Kept after the fixed paths above
// ("/recommend", "/booked-slots") so those aren't read as an ID.
router.get("/:id", vehicleController.getVehicleById);
router.get("/:id/branches", vehicleController.getVehicleBranches);

module.exports = router;
