
const express = require("express");
const router = express.Router();

const vehicleController = require("../controllers/vehicleController");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

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

// Get booked slots
router.get("/booked-slots", vehicleController.getBookedSlots);

// Update vehicle
router.put(
    "/:id",
    authMiddleware,
    authorizeRoles("Provider"),
    vehicleController.updateVehicle
);

// Delete vehicle
router.delete(
    "/:id",
    authMiddleware,
    authorizeRoles("Provider"),
    vehicleController.deleteVehicle
);

// Get vehicle GPS location
router.get(
    "/:id/location",
    authMiddleware,
    vehicleController.getVehicleLocation
);

// Update vehicle GPS location
router.put(
    "/:id/location",
    authMiddleware,
    authorizeRoles("Provider"),
    vehicleController.updateVehicleLocation
);

module.exports = router;
