
const pool = require("../config/db");

// Get provider profile
exports.getProviderProfile = async (req, res) => {
    try {
        if (req.user.userRole !== "Provider") {
            return res.status(403).json({
                message: "Access denied. Only providers can access this resource."
            });
        }

        const { id } = req.params;

        const [providerRows] = await pool.execute(
            `SELECT Provider_ID
             FROM provider
             WHERE Provider_ID = ? AND User_ID = ?`,
            [id, req.user.userId]
        );

        if (providerRows.length === 0) {
            return res.status(403).json({
                message: "Access denied. You can only access your own provider account."
            });
        }

        const [rows] = await pool.execute(
            `SELECT
                P.Provider_ID,
                P.User_ID,
                P.Provider_Type,
                P.Display_Name,
                P.Commission_Rate,
                U.Name,
                U.Email,
                U.Phone
             FROM provider P
             JOIN customer_user U
             ON P.User_ID = U.User_ID
             WHERE P.Provider_ID = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Provider not found"
            });
        }

        res.status(200).json({
            message: "Provider profile fetched successfully!",
            provider: rows[0]
        });

    } catch (error) {
        console.error("Get provider profile error:", error);
        res.status(500).json({
            message: "Failed to fetch provider profile"
        });
    }
};


// Update provider profile
exports.updateProviderProfile = async (req, res) => {
    try {
        if (req.user.userRole !== "Provider") {
            return res.status(403).json({
                message: "Access denied. Only providers can access this resource."
            });
        }

        const { id } = req.params;

        const [providerRows] = await pool.execute(
            `SELECT Provider_ID
             FROM provider
             WHERE Provider_ID = ? AND User_ID = ?`,
            [id, req.user.userId]
        );

        if (providerRows.length === 0) {
            return res.status(403).json({
                message: "Access denied. You can only access your own provider account."
            });
        }

        const { displayName } = req.body;

        if (!displayName) {
            return res.status(400).json({
                message: "Display name is required"
            });
        }

        const [result] = await pool.execute(
            `UPDATE provider
             SET Display_Name = ?
             WHERE Provider_ID = ?`,
            [displayName, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Provider not found or no changes made"
            });
        }

        res.status(200).json({
            message: "Provider profile updated successfully!"
        });

    } catch (error) {
        console.error("Update provider profile error:", error);

        res.status(500).json({
            message: "Failed to update provider profile"
        });
    }
};


// Get company details
exports.getCompanyDetails = async (req, res) => {
    try {
        if (req.user.userRole !== "Provider") {
            return res.status(403).json({
                message: "Access denied. Only providers can access this resource."
            });
        }

        const { id } = req.params;

        const [providerRows] = await pool.execute(
            `SELECT Provider_ID
             FROM provider
             WHERE Provider_ID = ? AND User_ID = ?`,
            [id, req.user.userId]
        );

        if (providerRows.length === 0) {
            return res.status(403).json({
                message: "Access denied. You can only access your own provider account."
            });
        }

        const [rows] = await pool.execute(
            `SELECT *
             FROM company_details
             WHERE Provider_ID = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Company details not found"
            });
        }

        res.status(200).json({
            message: "Company details fetched successfully!",
            company: rows[0]
        });

    } catch (error) {
        console.error("Get company details error:", error);
        res.status(500).json({
            message: "Failed to fetch company details"
        });
    }
};


// Get individual provider details
exports.getIndividualDetails = async (req, res) => {
    try {
        if (req.user.userRole !== "Provider") {
            return res.status(403).json({
                message: "Access denied. Only providers can access this resource."
            });
        }

        const { id } = req.params;

        const [providerRows] = await pool.execute(
            `SELECT Provider_ID
             FROM provider
             WHERE Provider_ID = ? AND User_ID = ?`,
            [id, req.user.userId]
        );

        if (providerRows.length === 0) {
            return res.status(403).json({
                message: "Access denied. You can only access your own provider account."
            });
        }

        const [rows] = await pool.execute(
            `SELECT *
             FROM individual_details
             WHERE Provider_ID = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Individual details not found"
            });
        }

        res.status(200).json({
            message: "Individual details fetched successfully!",
            individual: rows[0]
        });

    } catch (error) {
        console.error("Get individual details error:", error);
        res.status(500).json({
            message: "Failed to fetch individual details"
        });
    }
};


// GET ALL BOOKINGS FOR THE LOGGED-IN PROVIDER
exports.getProviderBookings = async (req, res) => {
    try {
        if (req.user.userRole !== "Provider") {
            return res.status(403).json({
                success: false,
                message: "Only providers can view provider bookings"
            });
        }

        // Find provider account belonging to logged-in user
        const [providerRows] = await pool.execute(
            `SELECT Provider_ID
             FROM provider
             WHERE User_ID = ?`,
            [req.user.userId]
        );

        if (providerRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Provider account not found"
            });
        }

        const providerId = providerRows[0].Provider_ID;

        // Fetch bookings only for vehicles owned by this provider
        const [bookings] = await pool.execute(
            `SELECT
                B.*,
                V.Brand,
                V.Model,
                V.City,
                U.Name AS Customer_Name,
                U.Email AS Customer_Email,
                U.Phone AS Customer_Phone
             FROM booking B
             JOIN vehicle V
                ON B.Vehicle_ID = V.Vehicle_ID
             JOIN customer_user U
                ON B.User_ID = U.User_ID
             WHERE V.Provider_ID = ?
             ORDER BY B.Booking_ID DESC`,
            [providerId]
        );

        return res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });

    } catch (error) {
        console.error("Get provider bookings error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve provider bookings"
        });
    }
};


// CONFIRM OR CANCEL A PENDING BOOKING
exports.updateProviderBookingStatus = async (req, res) => {
    try {
        if (req.user.userRole !== "Provider") {
            return res.status(403).json({
                success: false,
                message: "Only providers can manage provider bookings"
            });
        }

        const { id } = req.params;
        const { status } = req.body;

        // Validate booking ID
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID"
            });
        }

        // Provider can confirm or reject a pending booking
        if (!["Confirmed", "Cancelled"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be Confirmed or Cancelled"
            });
        }

        // Find the logged-in provider
        const [providerRows] = await pool.execute(
            `SELECT Provider_ID
             FROM provider
             WHERE User_ID = ?`,
            [req.user.userId]
        );

        if (providerRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Provider account not found"
            });
        }

        const providerId = providerRows[0].Provider_ID;

        // Update only a Pending booking belonging to this provider
        const [result] = await pool.execute(
            `UPDATE booking B
             JOIN vehicle V
                ON B.Vehicle_ID = V.Vehicle_ID
             SET B.Booking_Status = ?
             WHERE B.Booking_ID = ?
               AND V.Provider_ID = ?
               AND B.Booking_Status = 'Pending'`,
            [status, id, providerId]
        );

        if (result.affectedRows === 0) {

            // Check whether this booking belongs to this provider
            const [bookings] = await pool.execute(
                `SELECT B.Booking_Status
                 FROM booking B
                 JOIN vehicle V
                    ON B.Vehicle_ID = V.Vehicle_ID
                 WHERE B.Booking_ID = ?
                   AND V.Provider_ID = ?`,
                [id, providerId]
            );

            if (bookings.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found for this provider"
                });
            }

            return res.status(400).json({
                success: false,
                message: "Only pending bookings can be updated"
            });
        }

        return res.status(200).json({
            success: true,
            message: status === "Confirmed"
                ? "Booking confirmed successfully"
                : "Booking cancelled successfully",
            bookingId: Number(id),
            bookingStatus: status
        });

    } catch (error) {
        console.error("Update provider booking status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update booking status"
        });
    }
};
