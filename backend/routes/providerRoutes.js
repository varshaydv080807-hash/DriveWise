const express = require("express");
const router = express.Router();

const providerController = require("../controllers/providerController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/company/:id", authMiddleware, providerController.getCompanyDetails);
router.get("/individual/:id", authMiddleware, providerController.getIndividualDetails);
router.get("/:id", authMiddleware, providerController.getProviderProfile);
router.put("/:id", authMiddleware, providerController.updateProviderProfile);

module.exports = router;