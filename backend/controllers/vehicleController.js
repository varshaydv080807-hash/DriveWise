
const pool = require("../config/db");

// ADD VEHICLE

exports.addVehicle = async (req, res) => {
    try {
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
                V.Vehicle_ID,
                V.Provider_ID,
                V.Type_ID,
                V.Home_Branch_ID,
                V.Current_Branch_ID,
                V.Brand,
                V.Model,
                V.Manufacture_Year,
                V.Registration_No,
                V.Price_Per_Hour,
                V.Status,
                V.GPS_Enabled,
                V.Latitude,
                V.Longitude,
                V.Location_Updated_At,
                V.Pickup_Address,
                V.City,
                V.Vehicle_Verification_Status,
                V.Vehicle_Image_URL,
                VT.Type_Name,
                VT.Vehicle_Category,
                VT.Seating_Capacity,
                VT.Fuel_Type,
                P.Display_Name AS Provider_Name,
                P.Provider_Type,
                R.Avg_Rating AS Provider_Rating,
                COALESCE(R.Review_Count, 0) AS Provider_Review_Count
            FROM vehicle V
            LEFT JOIN vehicle_type VT
                ON V.Type_ID = VT.Type_ID
            LEFT JOIN provider P
                ON V.Provider_ID = P.Provider_ID
            LEFT JOIN (
                SELECT
                    Provider_ID,
                    ROUND(AVG(Rating), 1) AS Avg_Rating,
                    COUNT(*) AS Review_Count
                FROM review
                WHERE Review_Type = 'Customer_To_Provider'
                GROUP BY Provider_ID
            ) R ON V.Provider_ID = R.Provider_ID
            ORDER BY V.Vehicle_ID
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


// SMART VEHICLE RECOMMENDATION - FEATURE 3

exports.getRecommendedVehicles = async (req, res) => {
    try {
        const {
            city,
            maxPrice,
            category,
            minSeats,
            fuelType,
            minRating
        } = req.query;

        const conditions = [
            "V.Vehicle_Verification_Status = 'Verified'",
            "V.Status = 'Available'"
        ];

        const values = [];

        // Budget filter
        if (maxPrice !== undefined) {
            const price = Number(maxPrice);

            if (!Number.isFinite(price) || price < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid maximum price"
                });
            }

            conditions.push("V.Price_Per_Hour <= ?");
            values.push(price);
        }

        // City filter
        if (city) {
            conditions.push("V.City LIKE ?");
            values.push(`%${city.trim()}%`);
        }

        // Vehicle category filter
        if (category) {
            conditions.push("VT.Vehicle_Category = ?");
            values.push(category.trim());
        }

        // Minimum seating capacity
        if (minSeats !== undefined) {
            const seats = Number(minSeats);

            if (!Number.isInteger(seats) || seats < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid seating capacity"
                });
            }

            conditions.push("VT.Seating_Capacity >= ?");
            values.push(seats);
        }

        // Fuel type filter
        if (fuelType) {
            conditions.push("VT.Fuel_Type = ?");
            values.push(fuelType.trim());
        }

        // Minimum provider rating
        if (minRating !== undefined) {
            const rating = Number(minRating);

            if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    message: "Rating must be between 0 and 5"
                });
            }

            conditions.push("COALESCE(R.Avg_Rating, 0) >= ?");
            values.push(rating);
        }

        const sql = `
            SELECT
                V.Vehicle_ID,
                V.Provider_ID,
                V.Type_ID,
                V.Brand,
                V.Model,
                V.Manufacture_Year,
                V.Price_Per_Hour,
                V.Status,
                V.City,
                V.Pickup_Address,
                V.Vehicle_Image_URL,
                VT.Type_Name,
                VT.Vehicle_Category,
                VT.Seating_Capacity,
                VT.Fuel_Type,
                P.Display_Name AS Provider_Name,
                COALESCE(R.Avg_Rating, 0) AS Provider_Rating,
                COALESCE(R.Review_Count, 0) AS Provider_Review_Count
            FROM vehicle V
            LEFT JOIN vehicle_type VT
                ON V.Type_ID = VT.Type_ID
            LEFT JOIN provider P
                ON V.Provider_ID = P.Provider_ID
            LEFT JOIN (
                SELECT
                    Provider_ID,
                    ROUND(AVG(Rating), 1) AS Avg_Rating,
                    COUNT(*) AS Review_Count
                FROM review
                WHERE Review_Type = 'Customer_To_Provider'
                GROUP BY Provider_ID
            ) R ON V.Provider_ID = R.Provider_ID
            WHERE ${conditions.join(" AND ")}
            ORDER BY
                Provider_Rating DESC,
                Provider_Review_Count DESC,
                V.Price_Per_Hour ASC
        `;

        const [vehicles] = await pool.execute(sql, values);

        return res.status(200).json({
            success: true,
            message: "Vehicle recommendations fetched successfully",
            count: vehicles.length,
            filters: {
                city: city || null,
                maxPrice: maxPrice !== undefined ? Number(maxPrice) : null,
                category: category || null,
                minSeats: minSeats !== undefined ? Number(minSeats) : null,
                fuelType: fuelType || null,
                minRating: minRating !== undefined ? Number(minRating) : null
            },
            recommendations: vehicles
        });

    } catch (error) {
        console.error("Vehicle recommendation error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch vehicle recommendations"
        });
    }
};



// GET BOOKED TIME SLOTS

exports.getBookedSlots = async (req, res) => {
    try {
        const [slots] = await pool.execute(
            `SELECT Vehicle_ID, Start_DateTime, End_DateTime
             FROM booking
             WHERE Booking_Status IN ('Pending', 'Confirmed')
               AND End_DateTime > NOW() - INTERVAL 1 DAY
             ORDER BY Vehicle_ID, Start_DateTime`
        );

        res.status(200).json({
            success: true,
            count: slots.length,
            slots
        });

    } catch (error) {
        console.error("Get booked slots error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve booked slots"
        });
    }
};


// DELETE VEHICLE

exports.deleteVehicle = async (req, res) => {
    try {
        if (req.user.userRole !== "Provider") {
            return res.status(403).json({
                message: "Access denied. Only providers can delete vehicles."
            });
        }

        const { id } = req.params;

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


// GET VEHICLE GPS LOCATION

exports.getVehicleLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.userRole;

        if (!["Provider", "Admin"].includes(userRole)) {
            return res.status(403).json({
                message: "Access denied. You cannot view vehicle GPS locations."
            });
        }

        const [vehicles] = await pool.execute(
            `SELECT
                V.Vehicle_ID,
                V.Provider_ID,
                P.User_ID,
                V.GPS_Enabled,
                V.Latitude,
                V.Longitude,
                V.Location_Updated_At
             FROM vehicle V
             JOIN provider P ON V.Provider_ID = P.Provider_ID
             WHERE V.Vehicle_ID = ?`,
            [id]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                message: "Vehicle not found"
            });
        }

        const vehicle = vehicles[0];

        if (
            userRole === "Provider" &&
            Number(vehicle.User_ID) !== Number(userId)
        ) {
            return res.status(403).json({
                message: "Access denied. You can only view your own vehicles."
            });
        }

        if (!vehicle.GPS_Enabled) {
            return res.status(400).json({
                message: "GPS is disabled for this vehicle"
            });
        }

        if (
            vehicle.Latitude === null ||
            vehicle.Longitude === null
        ) {
            return res.status(404).json({
                message: "Vehicle location is not available"
            });
        }

        return res.status(200).json({
            message: "Vehicle location retrieved successfully",
            location: {
                vehicleId: vehicle.Vehicle_ID,
                latitude: vehicle.Latitude,
                longitude: vehicle.Longitude,
                lastUpdated: vehicle.Location_Updated_At
            }
        });

    } catch (error) {
        console.error("Get vehicle location error:", error);

        return res.status(500).json({
            message: "Failed to retrieve vehicle location"
        });
    }
};


// UPDATE VEHICLE GPS LOCATION

exports.updateVehicleLocation = async (req, res) => {
    try {
        if (req.user.userRole !== "Provider") {
            return res.status(403).json({
                message: "Access denied. Only providers can update GPS location."
            });
        }

        const { id } = req.params;
        const { latitude, longitude } = req.body;

        if (
            latitude === undefined ||
            longitude === undefined ||
            !Number.isFinite(Number(latitude)) ||
            !Number.isFinite(Number(longitude)) ||
            Number(latitude) < -90 ||
            Number(latitude) > 90 ||
            Number(longitude) < -180 ||
            Number(longitude) > 180
        ) {
            return res.status(400).json({
                message: "Valid latitude and longitude are required"
            });
        }

        const [vehicles] = await pool.execute(
            `SELECT V.Vehicle_ID, V.GPS_Enabled
             FROM vehicle V
             JOIN provider P ON V.Provider_ID = P.Provider_ID
             WHERE V.Vehicle_ID = ?
               AND P.User_ID = ?`,
            [id, req.user.userId]
        );

        if (vehicles.length === 0) {
            return res.status(403).json({
                message: "Access denied. You can only update your own vehicles."
            });
        }

        if (!vehicles[0].GPS_Enabled) {
            return res.status(400).json({
                message: "GPS is disabled for this vehicle"
            });
        }

        await pool.execute(
            `UPDATE vehicle
             SET Latitude = ?,
                 Longitude = ?,
                 Location_Updated_At = CURRENT_TIMESTAMP
             WHERE Vehicle_ID = ?`,
            [Number(latitude), Number(longitude), id]
        );

        res.status(200).json({
            message: "Vehicle GPS location updated successfully!"
        });

    } catch (error) {
        console.error("Update vehicle location error:", error);

        res.status(500).json({
            message: "Failed to update vehicle location"
        });
    }
};


// UPDATE VEHICLE

exports.updateVehicle = async (req, res) => {
    try {
        if (req.user.userRole !== "Provider") {
            return res.status(403).json({
                message: "Access denied. Only providers can update vehicles."
            });
        }

        const { id } = req.params;

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
// TRANSFER VEHICLE TO ANOTHER BRANCH
exports.transferVehicle = async (req, res) => {
    let connection;

    try {
        const vehicleId = Number(req.params.id);
        const destinationBranchId = Number(req.body.destinationBranchId);

        if (
            !Number.isSafeInteger(vehicleId) || vehicleId <= 0 ||
            !Number.isSafeInteger(destinationBranchId) || destinationBranchId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid vehicle ID and destination branch ID are required"
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Lock vehicle row
        const [vehicles] = await connection.execute(
            `SELECT Vehicle_ID, Provider_ID, Current_Branch_ID,
                    Status, Vehicle_Verification_Status
             FROM vehicle
             WHERE Vehicle_ID = ?
             FOR UPDATE`,
            [vehicleId]
        );

        if (vehicles.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        const vehicle = vehicles[0];

        // Identify logged-in provider
        const [providers] = await connection.execute(
            `SELECT Provider_ID FROM provider WHERE User_ID = ?`,
            [req.user.userId]
        );

        if (
            providers.length === 0 ||
            Number(providers[0].Provider_ID) !== Number(vehicle.Provider_ID)
        ) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: "You can only transfer your own vehicles"
            });
        }

        // Check destination branch belongs to same provider
        const [branches] = await connection.execute(
            `SELECT Branch_ID
             FROM branch
             WHERE Branch_ID = ? AND Provider_ID = ?
             FOR UPDATE`,
            [destinationBranchId, vehicle.Provider_ID]
        );

        if (branches.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Destination branch does not belong to your provider"
            });
        }

        if (Number(vehicle.Current_Branch_ID) === destinationBranchId) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Vehicle is already at this branch"
            });
        }

        if (vehicle.Status !== "Available") {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Only available vehicles can be transferred"
            });
        }

        if (vehicle.Vehicle_Verification_Status !== "Verified") {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Only verified vehicles can be transferred"
            });
        }

        // Check pending or confirmed future/ongoing bookings
        const [bookings] = await connection.execute(
            `SELECT Booking_ID
             FROM booking
             WHERE Vehicle_ID = ?
               AND Booking_Status IN ('Pending', 'Confirmed')
               AND End_DateTime > NOW()
             LIMIT 1`,
            [vehicleId]
        );

        if (bookings.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: "Vehicle has a pending or confirmed booking"
            });
        }

        // Check ongoing maintenance
        const [maintenance] = await connection.execute(
            `SELECT Maintenance_ID
             FROM maintenance
             WHERE Vehicle_ID = ?
               AND Status <> 'Completed'
               AND (Downtime_Start IS NULL OR Downtime_Start <= NOW())
               AND (Downtime_End IS NULL OR Downtime_End >= NOW())
             LIMIT 1`,
            [vehicleId]
        );

        if (maintenance.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: "Vehicle is currently under maintenance"
            });
        }

        // Update only current branch; home branch remains unchanged
        await connection.execute(
            `UPDATE vehicle
             SET Current_Branch_ID = ?
             WHERE Vehicle_ID = ?`,
            [destinationBranchId, vehicleId]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Vehicle transferred successfully",
            vehicleId,
            previousBranchId: vehicle.Current_Branch_ID,
            currentBranchId: destinationBranchId
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Vehicle transfer error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to transfer vehicle"
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};