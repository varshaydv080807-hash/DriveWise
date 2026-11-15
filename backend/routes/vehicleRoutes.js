
const express = require("express");
const router = express.Router();

const vehicleController = require("../controllers/vehicleController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/add", authMiddleware, vehicleController.addVehicle);
router.get("/", vehicleController.getAllVehicles);
router.put("/:id", authMiddleware, vehicleController.updateVehicle);
router.delete("/:id", authMiddleware, vehicleController.deleteVehicle);

module.exports = router;
