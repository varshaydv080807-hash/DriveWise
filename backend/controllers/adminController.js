
const pool = require("../config/db");

// GET ALL USERS
exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT
                User_ID,
                Name,
                Email,
                Phone,
                User_Role,
                Driving_License_No
            FROM customer_user
            ORDER BY User_ID DESC
        `);

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });

    } catch (error) {
        console.error("Get all users error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve users"
        });
    }
};


// GET ALL VEHICLES
exports.getAllVehicles = async (req, res) => {
    try {
        const [vehicles] = await pool.execute(`
            SELECT *
            FROM vehicle
            ORDER BY Vehicle_ID DESC
        `);

        res.status(200).json({
            success: true,
            count: vehicles.length,
            vehicles
        });

    } catch (error) {
        console.error("Admin get vehicles error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve vehicles"
        });
    }
};


// APPROVE OR REJECT VEHICLE
exports.updateVehicleVerification = async (req, res) => {
    try {
        const { id } = req.params;
        const { verificationStatus } = req.body;

        if (!["Verified", "Rejected"].includes(verificationStatus)) {
            return res.status(400).json({
                success: false,
                message: "Verification status must be Verified or Rejected"
            });
        }

        const [result] = await pool.execute(
            `UPDATE vehicle
             SET Vehicle_Verification_Status = ?
             WHERE Vehicle_ID = ?`,
            [verificationStatus, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        res.status(200).json({
            success: true,
            message: `Vehicle ${verificationStatus.toLowerCase()} successfully`
        });

    } catch (error) {
        console.error("Vehicle verification error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update vehicle verification"
        });
    }
};


// GET ALL BOOKINGS
exports.getAllBookings = async (req, res) => {
    try {
        const [bookings] = await pool.execute(`
            SELECT
                B.*,
                U.Name AS Customer_Name,
                U.Email AS Customer_Email,
                V.Brand,
                V.Model,
                V.City
            FROM booking B
            JOIN customer_user U ON B.User_ID = U.User_ID
            JOIN vehicle V ON B.Vehicle_ID = V.Vehicle_ID
            ORDER BY B.Booking_ID DESC
        `);

        res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });

    } catch (error) {
        console.error("Admin get bookings error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve bookings"
        });
    }
};


// GET DASHBOARD STATISTICS
exports.getDashboardStats = async (req, res) => {
    try {
        const [[userStats]] = await pool.execute(`
            SELECT COUNT(*) AS totalUsers
            FROM customer_user
        `);

        const [[vehicleStats]] = await pool.execute(`
            SELECT
                COUNT(*) AS totalVehicles,
                SUM(Vehicle_Verification_Status = 'Pending') AS pendingVehicles,
                SUM(Vehicle_Verification_Status = 'Verified') AS verifiedVehicles,
                SUM(Vehicle_Verification_Status = 'Rejected') AS rejectedVehicles
            FROM vehicle
        `);

        const [[bookingStats]] = await pool.execute(`
            SELECT
                COUNT(*) AS totalBookings,
                SUM(Booking_Status = 'Pending') AS pendingBookings,
                SUM(Booking_Status = 'Confirmed') AS confirmedBookings,
                SUM(Booking_Status = 'Completed') AS completedBookings,
                SUM(Booking_Status = 'Cancelled') AS cancelledBookings
            FROM booking
        `);

        res.status(200).json({
            success: true,
            stats: {
                users: userStats,
                vehicles: vehicleStats,
                bookings: bookingStats
            }
        });

    } catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve dashboard statistics"
        });
    }
};
