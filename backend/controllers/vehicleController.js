
const pool = require("../config/db");
const { nowLocalSql } = require("../utils/localTime");

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
// Rule-based scoring (no machine learning). Every available, verified vehicle
// gets points for each preference it matches, and the best matches come first:
//   City matches                       +25
//   Price per hour within maxPrice     +25
//   Vehicle category matches           +20
//   At least minSeats seats            +15
//   Fuel type matches                  +10
//   Provider rating >= minRating (4)    +5
// Query: city, maxPrice, category, minSeats, fuelType, minRating (all optional),
//        start & end ("2026-11-20 10:00") to only include vehicles free then, limit.

const RECOMMENDATION_POINTS = { city: 25, budget: 25, category: 20, seats: 15, fuel: 10, rating: 5 };
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;
const sameText = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

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

        // Budget
        let price = null;
        if (maxPrice !== undefined && maxPrice !== "") {
            price = Number(maxPrice);

            if (!Number.isFinite(price) || price < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid maximum price"
                });
            }
        }

        // Minimum seating capacity
        let seats = null;
        if (minSeats !== undefined && minSeats !== "") {
            seats = Number(minSeats);

            if (!Number.isInteger(seats) || seats < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid seating capacity"
                });
            }
        }

        // Rating that earns the "well rated" bonus (default 4.0)
        let ratingFloor = 4;
        if (minRating !== undefined && minRating !== "") {
            ratingFloor = Number(minRating);

            if (!Number.isFinite(ratingFloor) || ratingFloor < 0 || ratingFloor > 5) {
                return res.status(400).json({
                    success: false,
                    message: "Rating must be between 0 and 5"
                });
            }
        }

        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 6, 1), 30);

        // Optional trip dates: only vehicles free for the whole period
        const conditions = [
            "V.Vehicle_Verification_Status = 'Verified'",
            "V.Status = 'Available'"
        ];
        const values = [];
        let period = null;

        if (req.query.start || req.query.end) {
            const start = String(req.query.start || "").trim().replace("T", " ");
            const end = String(req.query.end || "").trim().replace("T", " ");

            if (!DATETIME_PATTERN.test(start) || !DATETIME_PATTERN.test(end) || end <= start) {
                return res.status(400).json({
                    success: false,
                    message: "Start and end must look like 2026-11-20 10:00, with end after start"
                });
            }

            period = { start, end };
            conditions.push(`NOT EXISTS (
                SELECT 1 FROM booking B
                WHERE B.Vehicle_ID = V.Vehicle_ID
                  AND B.Booking_Status IN ('Pending', 'Confirmed')
                  AND B.Start_DateTime < ? AND B.End_DateTime > ?)`);
            values.push(end, start);
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
                V.GPS_Enabled,
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
        `;

        const [vehicles] = await pool.execute(sql, values);

        // Score each vehicle and say why
        const points = RECOMMENDATION_POINTS;
        const scored = vehicles.map((v) => {
            const vPrice = Number(v.Price_Per_Hour);
            const rating = Number(v.Provider_Rating);
            const reviews = Number(v.Provider_Review_Count);
            const matched = [];
            const missed = [];
            let score = 0;

            const rule = (asked, ok, key, yes, no) => {
                if (!asked) return;
                if (ok) {
                    score += points[key];
                    matched.push(yes);
                } else {
                    missed.push(no);
                }
            };

            rule(Boolean(city), v.City && String(v.City).toLowerCase().includes(String(city).trim().toLowerCase()),
                "city", `In ${v.City}`, `In ${v.City || "another city"}`);
            rule(price !== null, vPrice <= price,
                "budget", `₹${vPrice}/hour is within your budget`, `₹${vPrice}/hour is over your budget`);
            rule(Boolean(category), sameText(v.Vehicle_Category, category) || sameText(v.Type_Name, category),
                "category", `${v.Vehicle_Category}, as you wanted`, `It's a ${String(v.Vehicle_Category || "vehicle").toLowerCase()}`);
            rule(seats !== null, Number(v.Seating_Capacity) >= seats,
                "seats", `${v.Seating_Capacity} seats`, `Only ${v.Seating_Capacity} seats`);
            rule(Boolean(fuelType), sameText(v.Fuel_Type, fuelType),
                "fuel", `Runs on ${String(v.Fuel_Type).toLowerCase()}`, `Runs on ${String(v.Fuel_Type).toLowerCase()}`);

            if (reviews > 0 && rating >= ratingFloor) {
                score += points.rating;
                matched.push(`Owner rated ${rating.toFixed(1)}★`);
            }

            return { ...v, Score: score, Matched: matched, Missed: missed };
        });

        scored.sort((a, b) =>
            b.Score - a.Score ||
            Number(b.Provider_Rating) - Number(a.Provider_Rating) ||
            Number(a.Price_Per_Hour) - Number(b.Price_Per_Hour)
        );

        const maxScore =
            (city ? points.city : 0) +
            (price !== null ? points.budget : 0) +
            (category ? points.category : 0) +
            (seats !== null ? points.seats : 0) +
            (fuelType ? points.fuel : 0) +
            points.rating;

        const recommendations = scored.slice(0, limit);

        return res.status(200).json({
            success: true,
            message: "Vehicle recommendations fetched successfully",
            count: recommendations.length,
            considered: scored.length,
            maxScore,
            filters: {
                city: city || null,
                maxPrice: price,
                category: category || null,
                minSeats: seats,
                fuelType: fuelType || null,
                minRating: ratingFloor,
                start: period ? period.start : null,
                end: period ? period.end : null
            },
            recommendations
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
// Public route with optional login (optionalAuth):
// - Admins, and providers for their own vehicles, always see the position.
// - Anyone else sees a parked vehicle's position, but while the vehicle is on a
//   trip only the customer on that trip can see it.

exports.getVehicleLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user || null;
        const userRole = user ? user.userRole : null;

        const [vehicles] = await pool.execute(
            `SELECT
                V.Vehicle_ID,
                V.Provider_ID,
                P.User_ID,
                V.GPS_Enabled,
                V.Latitude,
                V.Longitude,
                V.Location_Updated_At,
                V.Pickup_Address,
                V.City
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
        const isOwner = userRole === "Provider" && Number(vehicle.User_ID) === Number(user.userId);

        // Providers can only view their own vehicles
        if (userRole === "Provider" && !isOwner) {
            return res.status(403).json({
                message: "Access denied. You can only view your own vehicles."
            });
        }

        // Is the vehicle on a trip right now? (booking times are India time)
        const now = nowLocalSql();
        const [trips] = await pool.execute(
            `SELECT User_ID FROM booking
             WHERE Vehicle_ID = ?
               AND Booking_Status IN ('Pending', 'Confirmed')
               AND Start_DateTime <= ? AND End_DateTime > ?
             LIMIT 1`,
            [id, now, now]
        );
        const onTrip = trips.length > 0;
        const isTripCustomer = onTrip && user && Number(trips[0].User_ID) === Number(user.userId);

        if (onTrip && !(userRole === "Admin" || isOwner || isTripCustomer)) {
            return res.status(403).json({
                message: "This vehicle is on a trip, so its live location is private.",
                onTrip: true
            });
        }

        const details = {
            vehicleId: vehicle.Vehicle_ID,
            gpsEnabled: Boolean(vehicle.GPS_Enabled),
            onTrip,
            pickupAddress: vehicle.Pickup_Address,
            city: vehicle.City
        };

        if (!vehicle.GPS_Enabled) {
            return res.status(400).json({
                message: "GPS is disabled for this vehicle",
                location: { ...details, latitude: null, longitude: null, lastUpdated: null }
            });
        }

        if (
            vehicle.Latitude === null ||
            vehicle.Longitude === null
        ) {
            return res.status(404).json({
                message: "Vehicle location is not available",
                location: { ...details, latitude: null, longitude: null, lastUpdated: null }
            });
        }

        return res.status(200).json({
            message: "Vehicle location retrieved successfully",
            location: {
                ...details,
                latitude: Number(vehicle.Latitude),
                longitude: Number(vehicle.Longitude),
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

        // India time, like booking times (Render's clock runs in UTC)
        const updatedAt = nowLocalSql();

        await pool.execute(
            `UPDATE vehicle
             SET Latitude = ?,
                 Longitude = ?,
                 Location_Updated_At = ?
             WHERE Vehicle_ID = ?`,
            [Number(latitude), Number(longitude), updatedAt, id]
        );

        res.status(200).json({
            message: "Vehicle GPS location updated successfully!",
            location: {
                vehicleId: Number(id),
                latitude: Number(latitude),
                longitude: Number(longitude),
                lastUpdated: updatedAt
            }
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
                    Status, Vehicle_Verification_Status, GPS_Enabled
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

        // Identify logged-in provider (admins may transfer any vehicle)
        const [providers] = await connection.execute(
            `SELECT Provider_ID FROM provider WHERE User_ID = ?`,
            [req.user.userId]
        );

        if (
            req.user.userRole !== "Admin" &&
            (providers.length === 0 ||
            Number(providers[0].Provider_ID) !== Number(vehicle.Provider_ID))
        ) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: "You can only transfer your own vehicles"
            });
        }

        // Check destination branch belongs to same provider
        const [branches] = await connection.execute(
            `SELECT Branch_ID, Branch_Name, Address, City
             FROM branch
             WHERE Branch_ID = ? AND Provider_ID = ?
             FOR UPDATE`,
            [destinationBranchId, vehicle.Provider_ID]
        );

        if (branches.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Destination branch does not belong to this vehicle's provider"
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

        // Booking and maintenance times are India time; Render's clock runs in UTC
        const now = nowLocalSql();

        // Check pending or confirmed future/ongoing bookings
        const [bookings] = await connection.execute(
            `SELECT Booking_ID
             FROM booking
             WHERE Vehicle_ID = ?
               AND Booking_Status IN ('Pending', 'Confirmed')
               AND End_DateTime > ?
             LIMIT 1`,
            [vehicleId, now]
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
               AND (Downtime_Start IS NULL OR Downtime_Start <= ?)
               AND (Downtime_End IS NULL OR Downtime_End >= ?)
             LIMIT 1`,
            [vehicleId, now, now]
        );

        if (maintenance.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: "Vehicle is currently under maintenance"
            });
        }

        // Update current branch (home branch remains unchanged) and the pickup
        // address customers see. Without GPS, the stored coordinates were the old
        // pickup spot, so clear them; GPS vehicles report their new position themselves.
        const branch = branches[0];
        const clearCoords = !vehicle.GPS_Enabled;
        await connection.execute(
            `UPDATE vehicle
             SET Current_Branch_ID = ?,
                 Pickup_Address = ?,
                 City = ?
                 ${clearCoords ? ", Latitude = NULL, Longitude = NULL, Location_Updated_At = NULL" : ""}
             WHERE Vehicle_ID = ?`,
            [destinationBranchId, branch.Address, branch.City, vehicleId]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Vehicle transferred successfully",
            vehicleId,
            previousBranchId: vehicle.Current_Branch_ID,
            currentBranchId: destinationBranchId,
            currentBranch: {
                id: destinationBranchId,
                name: branch.Branch_Name,
                address: branch.Address,
                city: branch.City
            }
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


// GET VEHICLE DETAILS (public)
// Includes GPS status and the home/current branch names.
const VEHICLE_DETAILS_SQL = `
    SELECT
        V.Vehicle_ID, V.Provider_ID, V.Type_ID, V.Brand, V.Model, V.Manufacture_Year,
        V.Registration_No, V.Price_Per_Hour, V.Status, V.GPS_Enabled, V.Location_Updated_At,
        V.Pickup_Address, V.City, V.Vehicle_Verification_Status, V.Vehicle_Image_URL,
        VT.Type_Name, VT.Vehicle_Category, VT.Seating_Capacity, VT.Fuel_Type,
        P.Display_Name AS Provider_Name, P.Provider_Type,
        V.Home_Branch_ID, HB.Branch_Name AS Home_Branch_Name, HB.City AS Home_Branch_City,
        V.Current_Branch_ID, CB.Branch_Name AS Current_Branch_Name,
        CB.Address AS Current_Branch_Address, CB.City AS Current_Branch_City
    FROM vehicle V
    LEFT JOIN vehicle_type VT ON VT.Type_ID = V.Type_ID
    LEFT JOIN provider P ON P.Provider_ID = V.Provider_ID
    LEFT JOIN branch HB ON HB.Branch_ID = V.Home_Branch_ID
    LEFT JOIN branch CB ON CB.Branch_ID = V.Current_Branch_ID
    WHERE V.Vehicle_ID = ?
`;

exports.getVehicleById = async (req, res) => {
    try {
        const vehicleId = Number(req.params.id);

        if (!Number.isSafeInteger(vehicleId) || vehicleId <= 0) {
            return res.status(400).json({ success: false, message: "Invalid vehicle ID" });
        }

        const [rows] = await pool.execute(VEHICLE_DETAILS_SQL, [vehicleId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Vehicle not found" });
        }

        return res.status(200).json({ success: true, vehicle: rows[0] });

    } catch (error) {
        console.error("Get vehicle details error:", error);

        return res.status(500).json({ success: false, message: "Failed to retrieve vehicle" });
    }
};


// GET A VEHICLE'S HOME AND CURRENT BRANCH (public)
exports.getVehicleBranches = async (req, res) => {
    try {
        const vehicleId = Number(req.params.id);

        if (!Number.isSafeInteger(vehicleId) || vehicleId <= 0) {
            return res.status(400).json({ success: false, message: "Invalid vehicle ID" });
        }

        const [rows] = await pool.execute(VEHICLE_DETAILS_SQL, [vehicleId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Vehicle not found" });
        }

        const v = rows[0];

        return res.status(200).json({
            success: true,
            vehicleId,
            providerId: v.Provider_ID,
            homeBranch: v.Home_Branch_ID
                ? { id: v.Home_Branch_ID, name: v.Home_Branch_Name, city: v.Home_Branch_City }
                : null,
            currentBranch: v.Current_Branch_ID
                ? { id: v.Current_Branch_ID, name: v.Current_Branch_Name, address: v.Current_Branch_Address, city: v.Current_Branch_City }
                : null
        });

    } catch (error) {
        console.error("Get vehicle branches error:", error);

        return res.status(500).json({ success: false, message: "Failed to retrieve vehicle branches" });
    }
};
