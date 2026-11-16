
const pool = require("../config/db");

// ADD VEHICLE
exports.addVehicle = async (req, res) => {
    try {
        // Only Providers can add vehicles
        if (req.user.userRole !== "Provider") {
            return res.status(403).json({
                message: "Access denied. Only providers can add vehicles."
            });
        }

        const {
            typeId,
            homeBranchId,
            currentBranchId,
            brand,
            model,
            manufactureYear,
            registrationNo,
            pricePerHour,
            status,
            gpsEnabled,
            latitude,
            longitude,
            locationUpdatedAt,
            pickupAddress,
            city
        } = req.body;

        // Required field validation
        if (
            !typeId ||
            pricePerHour === undefined ||
            !status ||
            gpsEnabled === undefined
        ) {
            return res.status(400).json({
                message: "Vehicle type, price, status and GPS status are required"
            });
        }

        // Automatically identify the logged-in Provider
        const [providerRows] = await pool.execute(
            `SELECT Provider_ID
             FROM provider
             WHERE User_ID = ?`,
            [req.user.userId]
        );

        if (providerRows.length === 0) {
            return res.status(403).json({
                message: "Provider profile not found"
            });
        }

        const ownProviderId = providerRows[0].Provider_ID;

        // Insert vehicle
        const sql = `
            INSERT INTO vehicle (
                Provider_ID,
                Type_ID,
                Home_Branch_ID,
                Current_Branch_ID,
                Brand,
                Model,
                Manufacture_Year,
                Registration_No,
                Price_Per_Hour,
                Status,
                GPS_Enabled,
                Latitude,
                Longitude,
                Location_Updated_At,
                Pickup_Address,
                City,
                Vehicle_Verification_Status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            ownProviderId,
            typeId,
            homeBranchId || null,
            currentBranchId || null,
            brand || null,
            model || null,
            manufactureYear || null,
            registrationNo || null,
            pricePerHour,
            status,
            gpsEnabled,
            latitude ?? null,
            longitude ?? null,
            locationUpdatedAt || null,
            pickupAddress || null,
            city || null,
            "Pending"
        ];

        const [result] = await pool.execute(sql, values);

        res.status(201).json({
            message: "Vehicle added successfully!",
            vehicleId: result.insertId
        });

    } catch (error) {
        console.error("Add vehicle error:", error);

        res.status(500).json({
            message: "Failed to add vehicle"
        });
    }
};


// GET ALL VEHICLES
exports.getAllVehicles = async (req, res) => {
    try {
        const sql = `
            SELECT
                Vehicle_ID,
                Provider_ID,
                Type_ID,
                Home_Branch_ID,
                Current_Branch_ID,
                Brand,
                Model,
                Manufacture_Year,
                Registration_No,
                Price_Per_Hour,
                Status,
                GPS_Enabled,
                Latitude,
                Longitude,
                Location_Updated_At,
                Pickup_Address,
                City,
                Vehicle_Verification_Status
            FROM vehicle
        `;

        const [vehicles] = await pool.execute(sql);

        res.status(200).json({
            message: "Vehicles retrieved successfully!",
            count: vehicles.length,
            vehicles
        });

    } catch (error) {
        console.error("Get vehicles error:", error);

        res.status(500).json({
            message: "Failed to retrieve vehicles"
        });
    }
};


// DELETE VEHICLE
exports.deleteVehicle = async (req, res) => {
    try {
        // Only Providers can delete vehicles
        if (req.user.userRole !== "Provider") {
            return res.status(403).json({
                message: "Access denied. Only providers can delete vehicles."
            });
        }

        const { id } = req.params;

        // Check vehicle ownership
        const [vehicleRows] = await pool.execute(
            `SELECT V.Vehicle_ID
             FROM vehicle V
             JOIN provider P ON V.Provider_ID = P.Provider_ID
             WHERE V.Vehicle_ID = ? AND P.User_ID = ?`,
            [id, req.user.userId]
        );

        if (vehicleRows.length === 0) {
            return res.status(403).json({
                message: "Access denied. You can only delete your own vehicles."
            });
        }

        const [result] = await pool.execute(
            "DELETE FROM vehicle WHERE Vehicle_ID = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Vehicle not found"
            });
        }

        res.status(200).json({
            message: "Vehicle deleted successfully!"
        });

    } catch (error) {
        console.error("Delete vehicle error:", error);

        res.status(500).json({
            message: "Failed to delete vehicle"
        });
    }
};


// UPDATE VEHICLE
exports.updateVehicle = async (req, res) => {
    try {
        // Only Providers can update vehicles
        if (req.user.userRole !== "Provider") {
            return res.status(403).json({
                message: "Access denied. Only providers can update vehicles."
            });
        }

        const { id } = req.params;

        // Check vehicle ownership
        const [vehicleRows] = await pool.execute(
            `SELECT V.Vehicle_ID
             FROM vehicle V
             JOIN provider P ON V.Provider_ID = P.Provider_ID
             WHERE V.Vehicle_ID = ? AND P.User_ID = ?`,
            [id, req.user.userId]
        );

        if (vehicleRows.length === 0) {
            return res.status(403).json({
                message: "Access denied. You can only update your own vehicles."
            });
        }

        const {
            brand,
            model,
            manufactureYear,
            pricePerHour,
            status,
            gpsEnabled,
            pickupAddress,
            city
        } = req.body;

        const sql = `
            UPDATE vehicle
            SET
                Brand = ?,
                Model = ?,
                Manufacture_Year = ?,
                Price_Per_Hour = ?,
                Status = ?,
                GPS_Enabled = ?,
                Pickup_Address = ?,
                City = ?
            WHERE Vehicle_ID = ?
        `;

        const values = [
            brand,
            model,
            manufactureYear,
            pricePerHour,
            status,
            gpsEnabled,
            pickupAddress,
            city,
            id
        ];

        const [result] = await pool.execute(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Vehicle not found"
            });
        }

        res.status(200).json({
            message: "Vehicle updated successfully!"
        });

    } catch (error) {
        console.error("Update vehicle error:", error);

        res.status(500).json({
            message: "Failed to update vehicle"
        });
    }
};
