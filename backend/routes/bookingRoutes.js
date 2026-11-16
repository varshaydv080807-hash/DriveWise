
const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/bookingController");
const authMiddleware = require("../middleware/authMiddleware");

// All booking routes require a valid login token
router.use(authMiddleware);

// Create a booking
router.post("/", bookingController.createBooking);

// Get all bookings of the logged-in customer
router.get("/my", bookingController.getMyBookings);

// Get a particular booking
router.get("/:id", bookingController.getBookingById);

// Cancel a booking
router.patch("/:id/cancel", bookingController.cancelBooking);

module.exports = router;
