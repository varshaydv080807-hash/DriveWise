const pool = require("../config/db");

// GET BRANCHES (public)
// All branches, or one provider's with ?providerId=3. Used by the transfer screens.
exports.getBranches = async (req, res) => {
    try {
        const values = [];
        let where = "";

        if (req.query.providerId !== undefined) {
            const providerId = Number(req.query.providerId);

            if (!Number.isSafeInteger(providerId) || providerId <= 0) {
                return res.status(400).json({ success: false, message: "Invalid provider ID" });
            }

            where = "WHERE B.Provider_ID = ?";
            values.push(providerId);
        }

        const [branches] = await pool.execute(
            `SELECT
                B.Branch_ID,
                B.Provider_ID,
                P.Display_Name AS Provider_Name,
                B.Branch_Name,
                B.Address,
                B.City,
                (SELECT COUNT(*) FROM vehicle V WHERE V.Current_Branch_ID = B.Branch_ID) AS Vehicles_Here
             FROM branch B
             JOIN provider P ON P.Provider_ID = B.Provider_ID
             ${where}
             ORDER BY P.Display_Name, B.City, B.Branch_Name`,
            values
        );

        return res.status(200).json({ success: true, count: branches.length, branches });

    } catch (error) {
        console.error("Get branches error:", error);

        return res.status(500).json({ success: false, message: "Failed to retrieve branches" });
    }
};
