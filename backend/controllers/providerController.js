const pool = require("../config/db");

async function getOwnedProvider(userId) {
    const [rows] = await pool.execute(
        `SELECT Provider_ID, User_ID, Provider_Type, Display_Name, Commission_Rate
         FROM provider WHERE User_ID = ? LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
}

async function authorizeProvider(req, res) {
    if (req.user.userRole !== "Provider") {
        res.status(403).json({ success: false, message: "Only providers can access this resource" });
        return null;
    }
    const provider = await getOwnedProvider(req.user.userId);
    if (!provider) {
        res.status(404).json({ success: false, message: "Provider profile not found for this account" });
        return null;
    }
    if (req.params.id && Number(req.params.id) !== Number(provider.Provider_ID)) {
        res.status(403).json({ success: false, message: "You can only access your own provider account" });
        return null;
    }
    return provider;
}

exports.getProviderProfile = async (req, res, next) => {
    try {
        const provider = await authorizeProvider(req, res);
        if (!provider) return;
        const [rows] = await pool.execute(
            `SELECT P.Provider_ID, P.User_ID, P.Provider_Type, P.Display_Name,
                    P.Commission_Rate, U.Name, U.Email, U.Phone
             FROM provider P
             JOIN customer_user U ON U.User_ID = P.User_ID
             WHERE P.Provider_ID = ?`,
            [provider.Provider_ID]
        );
        return res.status(200).json({ success: true, message: "Provider profile fetched successfully", provider: rows[0] });
    } catch (error) { return next(error); }
};

exports.updateProviderProfile = async (req, res, next) => {
    try {
        const provider = await authorizeProvider(req, res);
        if (!provider) return;
        const displayName = req.body?.displayName;
        if (typeof displayName !== "string" || !displayName.trim()) {
            return res.status(400).json({ success: false, message: "Display name must be a non-empty string" });
        }
        if (displayName.trim().length > 100) {
            return res.status(400).json({ success: false, message: "Display name must not exceed 100 characters" });
        }
        await pool.execute(
            "UPDATE provider SET Display_Name = ? WHERE Provider_ID = ?",
            [displayName.trim(), provider.Provider_ID]
        );
        return res.status(200).json({ success: true, message: "Provider profile updated successfully" });
    } catch (error) { return next(error); }
};

exports.getCompanyDetails = async (req, res, next) => {
    try {
        const provider = await authorizeProvider(req, res);
        if (!provider) return;
        if (provider.Provider_Type !== "Company") {
            return res.status(409).json({ success: false, message: "This provider account is not a company" });
        }
        const [rows] = await pool.execute(
            `SELECT Provider_ID, Legal_Name, Registration_No, Verification_Status
             FROM company_details WHERE Provider_ID = ?`,
            [provider.Provider_ID]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: "Company details not found" });
        return res.status(200).json({ success: true, message: "Company details fetched successfully", company: rows[0] });
    } catch (error) { return next(error); }
};

exports.updateCompanyDetails = async (req, res, next) => {
    try {
        const provider = await authorizeProvider(req, res);
        if (!provider) return;
        if (provider.Provider_Type !== "Company") {
            return res.status(409).json({ success: false, message: "This provider account is not a company" });
        }

        const legalName = req.body?.legalName;
        const registrationNo = req.body?.registrationNo;
        const fields = [];
        const values = [];
        if (legalName !== undefined) {
            if (typeof legalName !== "string" || !legalName.trim()) {
                return res.status(400).json({ success: false, message: "Legal name must be a non-empty string" });
            }
            if (legalName.trim().length > 150) {
                return res.status(400).json({ success: false, message: "Legal name must not exceed 150 characters" });
            }
            fields.push("Legal_Name = ?");
            values.push(legalName.trim());
        }
        if (registrationNo !== undefined) {
            if (typeof registrationNo !== "string" || !registrationNo.trim()) {
                return res.status(400).json({ success: false, message: "Registration number must be a non-empty string" });
            }
            if (registrationNo.trim().length > 100) {
                return res.status(400).json({ success: false, message: "Registration number must not exceed 100 characters" });
            }
            fields.push("Registration_No = ?");
            values.push(registrationNo.trim());
        }
        if (!fields.length) {
            return res.status(400).json({ success: false, message: "Provide legalName and/or registrationNo to update" });
        }
        values.push(provider.Provider_ID);
        await pool.execute(
            `UPDATE company_details SET ${fields.join(", ")} WHERE Provider_ID = ?`,
            values
        );
        return res.status(200).json({ success: true, message: "Company details updated successfully. Verification status remains controlled by the administrator." });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "This company registration number is already registered" });
        }
        return next(error);
    }
};

exports.getIndividualDetails = async (req, res, next) => {
    try {
        const provider = await authorizeProvider(req, res);
        if (!provider) return;
        if (provider.Provider_Type !== "Individual") {
            return res.status(409).json({ success: false, message: "This provider account is not an individual" });
        }
        const [rows] = await pool.execute(
            `SELECT Provider_ID, Verification_Status
             FROM individual_details WHERE Provider_ID = ?`,
            [provider.Provider_ID]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: "Individual details not found" });
        return res.status(200).json({ success: true, message: "Individual details fetched successfully", individual: rows[0] });
    } catch (error) { return next(error); }
};


// ---- Provider booking management (Person 3) ----

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
