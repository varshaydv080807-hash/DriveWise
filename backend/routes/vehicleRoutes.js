
const express = require("express");
const router = express.Router();

const vehicleController = require("../controllers/vehicleController");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

router.post(
    "/add",
    authMiddleware,
    authorizeRoles("Provider"),
    vehicleController.addVehicle
);

router.get("/", vehicleController.getAllVehicles);
router.get("/booked-slots", vehicleController.getBookedSlots);

router.put(
    "/:id",
    authMiddleware,
    authorizeRoles("Provider"),
    vehicleController.updateVehicle
);

router.delete(
    "/:id",
    authMiddleware,
    authorizeRoles("Provider"),
    vehicleController.deleteVehicle
);

module.exports = router;
