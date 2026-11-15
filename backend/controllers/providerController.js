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