
const pool = require("../config/db");

// VALIDATE DATE/TIME WITHOUT DEPENDING ON SERVER TIMEZONE
function parseDateTime(value) {
    const pattern =
        /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

    const match = value.match(pattern);

    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6]);

    // MySQL DATE/DATETIME supported calendar year range
    if (year < 1000 || year > 9999) {
        return null;
    }

    const timestamp = Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        second
    );

    const date = new Date(timestamp);

    // Check that JavaScript has not normalized an invalid date
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day ||
        date.getUTCHours() !== hour ||
        date.getUTCMinutes() !== minute ||
        date.getUTCSeconds() !== second
    ) {
        return null;
    }

    return timestamp;
}


// CREATE A NEW BOOKING
exports.createBooking = async (req, res) => {
    let connection;

    try {
        // Only customers can book vehicles
        if (req.user.userRole !== "Customer") {
            return res.status(403).json({
                success: false,
                message: "Only customers can create bookings"
            });
        }

        const { vehicleId, startDateTime, endDateTime } = req.body;

        // Validate required fields
        if (!vehicleId || !startDateTime || !endDateTime) {
            return res.status(400).json({
                success: false,
                message: "Vehicle ID, start date/time and end date/time are required"
            });
        }

        // Validate vehicle ID
        if (
            !Number.isInteger(Number(vehicleId)) ||
            Number(vehicleId) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid vehicle ID"
            });
        }

        // Validate actual calendar dates and times
        const startTimestamp = parseDateTime(startDateTime);
        const endTimestamp = parseDateTime(endDateTime);

        if (startTimestamp === null || endTimestamp === null) {
            return res.status(400).json({
                success: false,
                message: "Invalid date/time. Use YYYY-MM-DD HH:mm:ss with valid calendar dates"
            });
        }

        if (endTimestamp <= startTimestamp) {
            return res.status(400).json({
                success: false,
                message: "End date/time must be later than start date/time"
            });
        }

        connection = await pool.getConnection();

        await connection.beginTransaction();

        // Lock the vehicle row to prevent simultaneous booking conflicts
        const [vehicles] = await connection.execute(
            `SELECT
                Vehicle_ID,
                Price_Per_Hour,
                Status,
                Vehicle_Verification_Status
             FROM vehicle
             WHERE Vehicle_ID = ?
             FOR UPDATE`,
            [vehicleId]
        );

        // Check whether vehicle exists
        if (vehicles.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        const vehicle = vehicles[0];

        // Vehicle must be available
        if (vehicle.Status !== "Available") {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Vehicle is currently not available"
            });
        }

        // Vehicle must be verified
        if (vehicle.Vehicle_Verification_Status !== "Verified") {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Vehicle is not verified and cannot be booked"
            });
        }

        // Check for overlapping Pending or Confirmed bookings
        const [existingBookings] = await connection.execute(
            `SELECT Booking_ID
             FROM booking
             WHERE Vehicle_ID = ?
               AND Booking_Status IN ('Pending', 'Confirmed')
               AND ? < End_DateTime
               AND ? > Start_DateTime
             LIMIT 1`,
            [vehicleId, startDateTime, endDateTime]
        );

        if (existingBookings.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "Vehicle is already booked for this time period"
            });
        }

        // Insert the new booking
        // User_ID is taken from the verified JWT
        const [result] = await connection.execute(
            `INSERT INTO booking (
                User_ID,
                Vehicle_ID,
                Pickup_Branch_ID,
                Return_Branch_ID,
                Driver_ID,
                Start_DateTime,
                End_DateTime,
                Price_Per_Hour_Snapshot,
                Total_Amount,
                Booking_Status,
                Transfer_Fee
            )
            VALUES (?, ?, NULL, NULL, NULL, ?, ?, ?, 0, 'Pending', 0)`,
            [
                req.user.userId,
                vehicleId,
                startDateTime,
                endDateTime,
                vehicle.Price_Per_Hour
            ]
        );

        const bookingId = result.insertId;

        // Calculate booking amount using the stored procedure
        await connection.query(
            "CALL calculate_booking_amount(?)",
            [bookingId]
        );

        // Retrieve the newly created booking
        const [bookings] = await connection.execute(
            `SELECT *
             FROM booking
             WHERE Booking_ID = ?`,
            [bookingId]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking: bookings[0]
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Rollback error:", rollbackError);
            }
        }

        console.error("Create booking error:", error);

        // Handle database trigger errors
        if (
            error.code === "ER_SIGNAL_EXCEPTION" ||
            error.sqlState === "45000"
        ) {
            return res.status(409).json({
                success: false,
                message: "Vehicle is already booked for this time period"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create booking"
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};


// GET ALL BOOKINGS OF THE LOGGED-IN CUSTOMER
exports.getMyBookings = async (req, res) => {
    try {
        if (req.user.userRole !== "Customer") {
            return res.status(403).json({
                success: false,
                message: "Only customers can view customer bookings"
            });
        }

        const [bookings] = await pool.execute(
            `SELECT
                B.*,
                V.Brand,
                V.Model,
                V.City
             FROM booking B
             JOIN vehicle V ON B.Vehicle_ID = V.Vehicle_ID
             WHERE B.User_ID = ?
             ORDER BY B.Booking_ID DESC`,
            [req.user.userId]
        );

        return res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });

    } catch (error) {
        console.error("Get bookings error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve bookings"
        });
    }
};


// GET ONE BOOKING OF THE LOGGED-IN CUSTOMER
exports.getBookingById = async (req, res) => {
    try {
        if (req.user.userRole !== "Customer") {
            return res.status(403).json({
                success: false,
                message: "Only customers can view customer bookings"
            });
        }

        const { id } = req.params;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID"
            });
        }

        const [bookings] = await pool.execute(
            `SELECT
                B.*,
                V.Brand,
                V.Model,
                V.City
             FROM booking B
             JOIN vehicle V ON B.Vehicle_ID = V.Vehicle_ID
             WHERE B.Booking_ID = ?
               AND B.User_ID = ?`,
            [id, req.user.userId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        return res.status(200).json({
            success: true,
            booking: bookings[0]
        });

    } catch (error) {
        console.error("Get booking error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve booking"
        });
    }
};


// CANCEL A CUSTOMER'S BOOKING
exports.cancelBooking = async (req, res) => {
    try {
        if (req.user.userRole !== "Customer") {
            return res.status(403).json({
                success: false,
                message: "Only customers can cancel customer bookings"
            });
        }

        const { id } = req.params;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID"
            });
        }

        // Update only if the booking belongs to this customer
        // and is still Pending or Confirmed
        const [result] = await pool.execute(
            `UPDATE booking
             SET Booking_Status = 'Cancelled'
             WHERE Booking_ID = ?
               AND User_ID = ?
               AND Booking_Status IN ('Pending', 'Confirmed')`,
            [id, req.user.userId]
        );

        if (result.affectedRows === 0) {
            // Find out whether the booking exists for this customer
            const [bookings] = await pool.execute(
                `SELECT Booking_ID, Booking_Status
                 FROM booking
                 WHERE Booking_ID = ?
                   AND User_ID = ?`,
                [id, req.user.userId]
            );

            if (bookings.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found"
                });
            }

            return res.status(400).json({
                success: false,
                message: "This booking cannot be cancelled"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully"
        });

    } catch (error) {
        console.error("Cancel booking error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to cancel booking"
        });
    }
};
