const express = require("express");
const router = express.Router();

const branchController = require("../controllers/branchController");

// Public: all branches, or ?providerId=3 for one provider's branches
router.get("/", branchController.getBranches);

module.exports = router;
