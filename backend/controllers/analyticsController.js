// Profitability analytics (Feature 4), extending the admin endpoints in adminController.js.
// Uses the database view profitability_provider_summary_view (database/profitability_views.sql)
// plus plain queries on BOOKING, PAYMENT, COMMISSION, PROVIDER_PAYOUT and MAINTENANCE.
//
// Net earnings = provider payouts (completed + pending) − maintenance costs.
// This is a simplified profitability measure: costs that aren't in the database
// (fuel, insurance premiums, staff) aren't included.
const pool = require("../config/db");

// Booking revenue minus completed maintenance, per vehicle (optionally for one provider)
async function vehiclePerformance(providerId) {
    const values = [];
    let where = "";
    if (providerId) {
        where = "WHERE V.Provider_ID = ?";
        values.push(providerId);
    }
    const [rows] = await pool.execute(
        `SELECT
            V.Vehicle_ID,
            V.Provider_ID,
            P.Display_Name AS Provider_Name,
            V.Brand,
            V.Model,
            V.Registration_No,
            VT.Vehicle_Category,
            VT.Type_Name,
            COALESCE(BK.Bookings, 0) AS Bookings,
            COALESCE(BK.Booking_Revenue, 0) AS Booking_Revenue,
            COALESCE(BK.Hours_Rented, 0) AS Hours_Rented,
            COALESCE(M.Maintenance_Cost, 0) AS Maintenance_Cost,
            COALESCE(BK.Booking_Revenue, 0) - COALESCE(M.Maintenance_Cost, 0) AS Net_Contribution
         FROM vehicle V
         LEFT JOIN vehicle_type VT ON VT.Type_ID = V.Type_ID
         LEFT JOIN provider P ON P.Provider_ID = V.Provider_ID
         LEFT JOIN (
            SELECT Vehicle_ID,
                   COUNT(*) AS Bookings,
                   SUM(Total_Amount) AS Booking_Revenue,
                   ROUND(SUM(TIMESTAMPDIFF(MINUTE, Start_DateTime, End_DateTime)) / 60, 1) AS Hours_Rented
            FROM booking
            WHERE Booking_Status IN ('Confirmed', 'Completed')
            GROUP BY Vehicle_ID
         ) BK ON BK.Vehicle_ID = V.Vehicle_ID
         LEFT JOIN (
            SELECT Vehicle_ID, SUM(Cost) AS Maintenance_Cost
            FROM maintenance
            WHERE Status = 'Completed'
            GROUP BY Vehicle_ID
         ) M ON M.Vehicle_ID = V.Vehicle_ID
         ${where}
         ORDER BY Booking_Revenue DESC, V.Vehicle_ID`,
        values
    );
    return rows.map((r) => ({
        ...r,
        Bookings: Number(r.Bookings),
        Booking_Revenue: Number(r.Booking_Revenue),
        Hours_Rented: Number(r.Hours_Rented),
        Maintenance_Cost: Number(r.Maintenance_Cost),
        Net_Contribution: Number(r.Net_Contribution)
    }));
}

function byCategory(vehicles) {
    const groups = new Map();
    for (const v of vehicles) {
        const key = v.Vehicle_Category || "Other";
        const g = groups.get(key) || {
            Vehicle_Category: key, Vehicles: 0, Bookings: 0, Booking_Revenue: 0, Maintenance_Cost: 0, Net_Contribution: 0
        };
        g.Vehicles += 1;
        g.Bookings += v.Bookings;
        g.Booking_Revenue += v.Booking_Revenue;
        g.Maintenance_Cost += v.Maintenance_Cost;
        g.Net_Contribution += v.Net_Contribution;
        groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) => b.Booking_Revenue - a.Booking_Revenue);
}

// GET /api/admin/profitability/vehicles  (Admin)
// Per-vehicle and per-category performance across all providers
exports.getVehicleProfitability = async (_req, res) => {
    try {
        const vehicles = await vehiclePerformance(null);
        return res.status(200).json({
            success: true,
            count: vehicles.length,
            vehicles,
            categories: byCategory(vehicles)
        });
    } catch (error) {
        console.error("Vehicle profitability error:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve vehicle profitability" });
    }
};

// GET /api/providers/me/analytics  (Provider: own records only)
exports.getMyProviderAnalytics = async (req, res) => {
    try {
        if (req.user.userRole !== "Provider") {
            return res.status(403).json({ success: false, message: "Only providers can view provider analytics" });
        }

        const [providers] = await pool.execute("SELECT Provider_ID FROM provider WHERE User_ID = ?", [req.user.userId]);
        if (providers.length === 0) {
            return res.status(404).json({ success: false, message: "Provider profile not found" });
        }
        const providerId = providers[0].Provider_ID;

        const [[summary]] = await pool.execute(
            "SELECT * FROM profitability_provider_summary_view WHERE Provider_ID = ?",
            [providerId]
        );

        // Per month: money collected for this provider's bookings, payouts earned
        // (by the month the trip ended) and completed maintenance costs
        const [monthly] = await pool.execute(
            `SELECT Month,
                    SUM(Collected) AS Net_Collected,
                    SUM(Payout) AS Payouts,
                    SUM(Maintenance) AS Maintenance
             FROM (
                SELECT DATE_FORMAT(PAY.Payment_Date, '%Y-%m') AS Month,
                       CASE WHEN PAY.Payment_Type = 'Refund' THEN -PAY.Amount ELSE PAY.Amount END AS Collected,
                       0 AS Payout, 0 AS Maintenance
                FROM payment PAY
                JOIN booking B ON B.Booking_ID = PAY.Booking_ID
                JOIN vehicle V ON V.Vehicle_ID = B.Vehicle_ID
                WHERE V.Provider_ID = ? AND PAY.Payment_Status = 'Completed' AND PAY.Payment_Date IS NOT NULL
                UNION ALL
                SELECT DATE_FORMAT(B.End_DateTime, '%Y-%m'), 0, PP.Payout_Amount, 0
                FROM provider_payout PP
                JOIN commission C ON C.Commission_ID = PP.Commission_ID
                JOIN booking B ON B.Booking_ID = C.Booking_ID
                WHERE PP.Provider_ID = ? AND PP.Payout_Status IN ('Completed', 'Pending')
                UNION ALL
                SELECT DATE_FORMAT(M.Service_Date, '%Y-%m'), 0, 0, M.Cost
                FROM maintenance M
                JOIN vehicle V ON V.Vehicle_ID = M.Vehicle_ID
                WHERE V.Provider_ID = ? AND M.Status = 'Completed'
             ) T
             WHERE Month IS NOT NULL
             GROUP BY Month
             ORDER BY Month`,
            [providerId, providerId, providerId]
        );

        const vehicles = await vehiclePerformance(providerId);

        const s = summary || {};
        const payoutsEarned = Number(s.Completed_Payout || 0) + Number(s.Pending_Payout || 0);
        const maintenance = Number(s.Maintenance_Expense || 0);

        return res.status(200).json({
            success: true,
            providerId,
            summary: {
                ...s,
                Payouts_Earned: payoutsEarned,
                Net_Earnings: payoutsEarned - maintenance
            },
            monthly: monthly.map((m) => ({
                Month: m.Month,
                Net_Collected: Number(m.Net_Collected),
                Payouts: Number(m.Payouts),
                Maintenance: Number(m.Maintenance)
            })),
            vehicles,
            categories: byCategory(vehicles)
        });
    } catch (error) {
        console.error("Provider analytics error:", error);
        return res.status(500).json({ success: false, message: "Failed to load provider analytics" });
    }
};
