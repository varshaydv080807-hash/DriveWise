const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.get("/me", userController.getUserProfile);
router.put("/me", userController.updateUserProfile);
// Backward-compatible routes; controller enforces that the ID belongs to the token.
router.get("/:id", userController.getUserProfile);
router.put("/:id", userController.updateUserProfile);

module.exports = router;
