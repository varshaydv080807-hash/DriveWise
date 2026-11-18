-- DriveWise: Profitability Analytics Views
-- Uses existing tables only. No schema changes.
-- Execute while connected to the hosted database: main.

-- 1. Booking-level financial summary
CREATE OR REPLACE VIEW profitability_booking_summary_view AS
SELECT
    b.Booking_ID,
    b.Booking_Status,
    b.User_ID,
    v.Provider_ID,
    b.Vehicle_ID,
    b.Total_Amount AS Booking_Amount,

    COALESCE(pay.Successful_Payments, 0) AS Successful_Payments,
    COALESCE(pay.Successful_Refunds, 0) AS Successful_Refunds,
    COALESCE(pay.Net_Collected, 0) AS Net_Collected,

    COALESCE(c.Recorded_Commission, 0) AS Recorded_Commission,

    COALESCE(po.Completed_Payout, 0) AS Completed_Payout,
    COALESCE(po.Pending_Payout, 0) AS Pending_Payout

FROM booking b
JOIN vehicle v
    ON b.Vehicle_ID = v.Vehicle_ID

LEFT JOIN (
    SELECT
        Booking_ID,
        SUM(CASE
            WHEN Payment_Status = 'Completed'
             AND Payment_Type IN ('Advance', 'Final')
            THEN Amount ELSE 0
        END) AS Successful_Payments,
        SUM(CASE
            WHEN Payment_Status = 'Completed'
             AND Payment_Type = 'Refund'
            THEN Amount ELSE 0
        END) AS Successful_Refunds,
        SUM(CASE
            WHEN Payment_Status = 'Completed'
             AND Payment_Type IN ('Advance', 'Final')
            THEN Amount
            WHEN Payment_Status = 'Completed'
             AND Payment_Type = 'Refund'
            THEN -Amount
            ELSE 0
        END) AS Net_Collected
    FROM payment
    GROUP BY Booking_ID
) pay
    ON b.Booking_ID = pay.Booking_ID

LEFT JOIN (
    SELECT
        Booking_ID,
        SUM(Commission_Amount) AS Recorded_Commission
    FROM commission
    GROUP BY Booking_ID
) c
    ON b.Booking_ID = c.Booking_ID

LEFT JOIN (
    SELECT
        c.Booking_ID,
        SUM(CASE
            WHEN pp.Payout_Status = 'Completed'
            THEN pp.Payout_Amount ELSE 0
        END) AS Completed_Payout,
        SUM(CASE
            WHEN pp.Payout_Status = 'Pending'
            THEN pp.Payout_Amount ELSE 0
        END) AS Pending_Payout
    FROM commission c
    JOIN provider_payout pp
        ON c.Commission_ID = pp.Commission_ID
    GROUP BY c.Booking_ID
) po
    ON b.Booking_ID = po.Booking_ID;


-- 2. Provider-level financial summary
CREATE OR REPLACE VIEW profitability_provider_summary_view AS
SELECT
    p.Provider_ID,
    p.Display_Name,
    p.Provider_Type,

    COALESCE(bk.Total_Bookings, 0) AS Total_Bookings,
    COALESCE(bk.Confirmed_Bookings, 0) AS Confirmed_Bookings,
    COALESCE(bk.Pending_Bookings, 0) AS Pending_Bookings,
    COALESCE(bk.Cancelled_Bookings, 0) AS Cancelled_Bookings,

    COALESCE(bk.Confirmed_Or_Completed_Booking_Value, 0)
        AS Confirmed_Or_Completed_Booking_Value,

    COALESCE(pay.Net_Collected, 0) AS Net_Collected,
    COALESCE(com.Recorded_Commission, 0) AS Recorded_Commission,
    COALESCE(po.Completed_Payout, 0) AS Completed_Payout,
    COALESCE(po.Pending_Payout, 0) AS Pending_Payout,
    COALESCE(maint.Maintenance_Expense, 0) AS Maintenance_Expense

FROM provider p

LEFT JOIN (
    SELECT
        v.Provider_ID,
        COUNT(*) AS Total_Bookings,
        SUM(b.Booking_Status = 'Confirmed') AS Confirmed_Bookings,
        SUM(b.Booking_Status = 'Pending') AS Pending_Bookings,
        SUM(b.Booking_Status = 'Cancelled') AS Cancelled_Bookings,
        SUM(CASE
            WHEN b.Booking_Status IN ('Confirmed', 'Completed')
            THEN b.Total_Amount ELSE 0
        END) AS Confirmed_Or_Completed_Booking_Value
    FROM booking b
    JOIN vehicle v ON b.Vehicle_ID = v.Vehicle_ID
    GROUP BY v.Provider_ID
) bk
    ON p.Provider_ID = bk.Provider_ID

LEFT JOIN (
    SELECT
        v.Provider_ID,
        SUM(CASE
            WHEN pay.Payment_Status = 'Completed'
             AND pay.Payment_Type IN ('Advance', 'Final')
            THEN pay.Amount
            WHEN pay.Payment_Status = 'Completed'
             AND pay.Payment_Type = 'Refund'
            THEN -pay.Amount
            ELSE 0
        END) AS Net_Collected
    FROM payment pay
    JOIN booking b ON pay.Booking_ID = b.Booking_ID
    JOIN vehicle v ON b.Vehicle_ID = v.Vehicle_ID
    GROUP BY v.Provider_ID
) pay
    ON p.Provider_ID = pay.Provider_ID

LEFT JOIN (
    SELECT
        v.Provider_ID,
        SUM(c.Commission_Amount) AS Recorded_Commission
    FROM commission c
    JOIN booking b ON c.Booking_ID = b.Booking_ID
    JOIN vehicle v ON b.Vehicle_ID = v.Vehicle_ID
    GROUP BY v.Provider_ID
) com
    ON p.Provider_ID = com.Provider_ID

LEFT JOIN (
    SELECT
        Provider_ID,
        SUM(CASE
            WHEN Payout_Status = 'Completed'
            THEN Payout_Amount ELSE 0
        END) AS Completed_Payout,
        SUM(CASE
            WHEN Payout_Status = 'Pending'
            THEN Payout_Amount ELSE 0
        END) AS Pending_Payout
    FROM provider_payout
    GROUP BY Provider_ID
) po
    ON p.Provider_ID = po.Provider_ID

LEFT JOIN (
    SELECT
        v.Provider_ID,
        SUM(m.Cost) AS Maintenance_Expense
    FROM maintenance m
    JOIN vehicle v ON m.Vehicle_ID = v.Vehicle_ID
    WHERE m.Status = 'Completed'
    GROUP BY v.Provider_ID
) maint
    ON p.Provider_ID = maint.Provider_ID;


-- 3. Monthly successful payment and refund summary
CREATE OR REPLACE VIEW profitability_monthly_payment_view AS
SELECT
    DATE_FORMAT(Payment_Date, '%Y-%m') AS Payment_Month,

    SUM(CASE
        WHEN Payment_Status = 'Completed'
         AND Payment_Type IN ('Advance', 'Final')
        THEN Amount ELSE 0
    END) AS Successful_Payments,

    SUM(CASE
        WHEN Payment_Status = 'Completed'
         AND Payment_Type = 'Refund'
        THEN Amount ELSE 0
    END) AS Successful_Refunds,

    SUM(CASE
        WHEN Payment_Status = 'Completed'
         AND Payment_Type IN ('Advance', 'Final')
        THEN Amount
        WHEN Payment_Status = 'Completed'
         AND Payment_Type = 'Refund'
        THEN -Amount
        ELSE 0
    END) AS Net_Collected

FROM payment
GROUP BY DATE_FORMAT(Payment_Date, '%Y-%m');
