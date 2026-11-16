const pool = require("../config/db");

// Get user profile
exports.getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        if (Number(id) !== Number(req.user.userId)) {
    return res.status(403).json({
        message: "Access denied. You can only access your own profile."
    });
}

        const [rows] = await pool.execute(
            `SELECT User_ID, Name, Email, Phone, User_Role, Driving_License_No
             FROM customer_user
             WHERE User_ID = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "User profile fetched successfully!",
            user: rows[0]
        });

    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({
            message: "Failed to fetch user profile"
        });
    }
};
// Update user profile
exports.updateUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        if (Number(id) !== Number(req.user.userId)) {
    return res.status(403).json({
        message: "Access denied. You can only access your own profile."
    });
}
        const { name, phone, drivingLicense = null } = req.body || {};
        if (!name || !phone) {
    return res.status(400).json({
        message: "Name and phone are required"
    });
}
        const [result] = await pool.execute(
            `UPDATE customer_user
             SET Name = ?, Phone = ?, Driving_License_No = ?
             WHERE User_ID = ?`,
            [name, phone, drivingLicense, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "User not found or no changes made"
            });
        }

        res.status(200).json({
            message: "User profile updated successfully!"
        });

    } catch (error) {
        console.error("Update profile error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Driving license number already exists"
            });
        }

        res.status(500).json({
            message: "Failed to update user profile"
        });
    }
};