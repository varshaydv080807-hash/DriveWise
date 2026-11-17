const pool = require("../config/db");

function ownsUser(req, res) {
    const requestedId = req.params.id;
    if (requestedId && Number(requestedId) !== Number(req.user.userId)) {
        res.status(403).json({ success: false, message: "You can only access your own profile" });
        return false;
    }
    return true;
}

exports.getUserProfile = async (req, res, next) => {
    try {
        if (!ownsUser(req, res)) return;
        const [rows] = await pool.execute(
            `SELECT User_ID, Name, Email, Phone, User_Role, Driving_License_No
             FROM customer_user WHERE User_ID = ? LIMIT 1`,
            [req.user.userId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: "User not found" });
        return res.status(200).json({ success: true, message: "User profile fetched successfully", user: rows[0] });
    } catch (error) {
        return next(error);
    }
};

exports.updateUserProfile = async (req, res, next) => {
    try {
        if (!ownsUser(req, res)) return;
        const body = req.body || {};
        const fields = [];
        const values = [];

        if (Object.prototype.hasOwnProperty.call(body, "name")) {
            if (typeof body.name !== "string" || !body.name.trim()) {
                return res.status(400).json({ success: false, message: "Name must be a non-empty string" });
            }
            if (body.name.trim().length > 100) {
                return res.status(400).json({ success: false, message: "Name must not exceed 100 characters" });
            }
            fields.push("Name = ?");
            values.push(body.name.trim());
        }
        if (Object.prototype.hasOwnProperty.call(body, "phone")) {
            if (typeof body.phone !== "string" || !body.phone.trim()) {
                return res.status(400).json({ success: false, message: "Phone must be a non-empty string" });
            }
            if (body.phone.trim().length > 20) {
                return res.status(400).json({ success: false, message: "Phone must not exceed 20 characters" });
            }
            fields.push("Phone = ?");
            values.push(body.phone.trim());
        }
        if (Object.prototype.hasOwnProperty.call(body, "drivingLicense")) {
            if (body.drivingLicense !== null && typeof body.drivingLicense !== "string") {
                return res.status(400).json({ success: false, message: "Driving license must be a string or null" });
            }
            if (typeof body.drivingLicense === "string" && body.drivingLicense.trim().length > 50) {
                return res.status(400).json({ success: false, message: "Driving license number must not exceed 50 characters" });
            }
            fields.push("Driving_License_No = ?");
            values.push(body.drivingLicense?.trim() || null);
        }
        if (!fields.length) {
            return res.status(400).json({ success: false, message: "Provide at least one supported field to update" });
        }

        values.push(req.user.userId);
        const [result] = await pool.execute(
            `UPDATE customer_user SET ${fields.join(", ")} WHERE User_ID = ?`,
            values
        );
        if (!result.affectedRows && !result.changedRows) {
            const [exists] = await pool.execute("SELECT User_ID FROM customer_user WHERE User_ID = ?", [req.user.userId]);
            if (!exists.length) return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(200).json({ success: true, message: "User profile updated successfully" });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "Driving license number is already registered" });
        }
        return next(error);
    }
};
