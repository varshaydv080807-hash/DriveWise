-- DriveWise: demo bookings for the test customers Riya Sharma and Arjun Mehta
-- Shows the new features with real data:
--   - My trips: completed (past), cancelled, upcoming, and trips happening now
--   - GPS tracking: two trips are in progress on GPS vehicles, with a recent position
--   - Analytics: payments, a refund, commissions, provider payouts, invoices and reviews
--
-- The two customer accounts must already exist (signed up on the website).
-- They're found by name, so any email works. If a name isn't found, its rows are skipped.
-- Vehicles are found by registration number (from seed.sql and seed_more_vehicles.sql).
-- Safe to run twice: nothing is inserted a second time.
--
-- The "now" trips run from 17 to 21/23 November 2026, so they show as "On trip now"
-- until then. Times are India time.

-- ---------------------------------------------------------------
-- 1. Bookings
-- Columns filled from the vehicle: price snapshot, pickup/return branch.
-- Total = hours x price per hour (same as calculate_booking_amount).
-- A booking is skipped if it would overlap an active booking on that vehicle.
-- ---------------------------------------------------------------
INSERT INTO booking (User_ID, Vehicle_ID, Pickup_Branch_ID, Return_Branch_ID, Driver_ID, Start_DateTime, End_DateTime, Price_Per_Hour_Snapshot, Total_Amount, Booking_Status, Transfer_Fee)
SELECT U.User_ID, V.Vehicle_ID, V.Current_Branch_ID, V.Current_Branch_ID, NULL, D.S, D.E, V.Price_Per_Hour,
       ROUND(V.Price_Per_Hour * TIMESTAMPDIFF(MINUTE, D.S, D.E) / 60, 2), D.Status, 0.00
FROM (
    -- Riya Sharma
              SELECT 'Riya Sharma' AS Name, 'DL3CAW4521' AS Reg, '2026-10-05 10:00:00' AS S, '2026-10-05 18:00:00' AS E, 'Completed' AS Status
    UNION ALL SELECT 'Riya Sharma', 'HR26EK9013', '2026-10-24 09:00:00', '2026-10-25 09:00:00', 'Completed'
    UNION ALL SELECT 'Riya Sharma', 'DL2CEV3302', '2026-11-08 10:00:00', '2026-11-08 16:00:00', 'Cancelled'
    UNION ALL SELECT 'Riya Sharma', 'DL5SCH3501', '2026-11-17 08:00:00', '2026-11-21 20:00:00', 'Confirmed'
    UNION ALL SELECT 'Riya Sharma', 'DL4CAF6610', '2026-11-27 09:00:00', '2026-11-27 18:00:00', 'Confirmed'
    UNION ALL SELECT 'Riya Sharma', 'DL1CCT7788', '2026-11-30 09:00:00', '2026-11-30 17:00:00', 'Cancelled'
    -- Arjun Mehta
    UNION ALL SELECT 'Arjun Mehta', 'HR26DQ4410', '2026-09-12 08:00:00', '2026-09-12 20:00:00', 'Completed'
    UNION ALL SELECT 'Arjun Mehta', 'DL7CFT2200', '2026-10-18 10:00:00', '2026-10-19 10:00:00', 'Cancelled'
    UNION ALL SELECT 'Arjun Mehta', 'DL3SDA6612', '2026-11-02 09:00:00', '2026-11-02 14:00:00', 'Completed'
    UNION ALL SELECT 'Arjun Mehta', 'DL10CK8840', '2026-11-17 09:00:00', '2026-11-23 21:00:00', 'Confirmed'
    UNION ALL SELECT 'Arjun Mehta', 'DL7SBP2004', '2026-11-29 10:00:00', '2026-11-29 16:00:00', 'Pending'
) D
JOIN vehicle V ON V.Registration_No = D.Reg
JOIN customer_user U ON U.User_ID = (
    SELECT MAX(C.User_ID) FROM customer_user C WHERE C.Name = D.Name AND C.User_Role = 'Customer'
)
WHERE NOT EXISTS (
        SELECT 1 FROM booking X WHERE X.Vehicle_ID = V.Vehicle_ID AND X.Start_DateTime = D.S
  )
  AND NOT EXISTS (
        SELECT 1 FROM booking X
        WHERE X.Vehicle_ID = V.Vehicle_ID AND X.Booking_Status IN ('Pending', 'Confirmed')
          AND X.Start_DateTime < D.E AND X.End_DateTime > D.S
  );

-- ---------------------------------------------------------------
-- 2. Payments
-- Completed trips: paid in full (Amount NULL below = the booking total).
-- Trips happening now: an advance.
-- One cancelled trip: an advance that was refunded.
-- ---------------------------------------------------------------
INSERT INTO payment (Booking_ID, Amount, Payment_Type, Payment_Method, Payment_Status, Payment_Date)
SELECT B.Booking_ID, COALESCE(D.Amount, B.Total_Amount), D.Type, D.Method, 'Completed', D.PaidAt
FROM (
              SELECT 'DL3CAW4521' AS Reg, '2026-10-05 10:00:00' AS S, NULL AS Amount, 'Final' AS Type, 'UPI' AS Method, '2026-10-05 18:10:00' AS PaidAt
    UNION ALL SELECT 'HR26EK9013', '2026-10-24 09:00:00', NULL, 'Final', 'Card', '2026-10-25 09:15:00'
    UNION ALL SELECT 'HR26DQ4410', '2026-09-12 08:00:00', NULL, 'Final', 'Net Banking', '2026-09-12 20:20:00'
    UNION ALL SELECT 'DL3SDA6612', '2026-11-02 09:00:00', NULL, 'Final', 'Cash', '2026-11-02 14:05:00'
    UNION ALL SELECT 'DL5SCH3501', '2026-11-17 08:00:00', 1000.00, 'Advance', 'UPI', '2026-11-16 19:30:00'
    UNION ALL SELECT 'DL10CK8840', '2026-11-17 09:00:00', 2000.00, 'Advance', 'Card', '2026-11-16 21:00:00'
    UNION ALL SELECT 'DL2CEV3302', '2026-11-08 10:00:00', 200.00, 'Advance', 'UPI', '2026-11-06 12:00:00'
    UNION ALL SELECT 'DL2CEV3302', '2026-11-08 10:00:00', 200.00, 'Refund', 'UPI', '2026-11-07 15:00:00'
) D
JOIN vehicle V ON V.Registration_No = D.Reg
JOIN booking B ON B.Vehicle_ID = V.Vehicle_ID AND B.Start_DateTime = D.S
JOIN customer_user U ON U.User_ID = B.User_ID AND U.Name IN ('Riya Sharma', 'Arjun Mehta')
WHERE NOT EXISTS (
    SELECT 1 FROM payment X WHERE X.Booking_ID = B.Booking_ID AND X.Payment_Type = D.Type
);

-- ---------------------------------------------------------------
-- 3. Commission, provider payout and invoice for the completed trips
-- ---------------------------------------------------------------
INSERT INTO commission (Booking_ID, Provider_ID, Gross_Amount, Commission_Rate_Snapshot, Commission_Amount)
SELECT B.Booking_ID, V.Provider_ID, B.Total_Amount, P.Commission_Rate, ROUND(B.Total_Amount * P.Commission_Rate / 100, 2)
FROM booking B
JOIN vehicle V ON V.Vehicle_ID = B.Vehicle_ID
JOIN provider P ON P.Provider_ID = V.Provider_ID
JOIN customer_user U ON U.User_ID = B.User_ID AND U.Name IN ('Riya Sharma', 'Arjun Mehta')
WHERE B.Booking_Status = 'Completed'
  AND NOT EXISTS (SELECT 1 FROM commission X WHERE X.Booking_ID = B.Booking_ID);

-- Paid out for September/October trips; still pending for November
INSERT INTO provider_payout (Provider_ID, Commission_ID, Payout_Amount, Payout_Status, Payout_Date)
SELECT C.Provider_ID, C.Commission_ID, C.Gross_Amount - C.Commission_Amount,
       IF(B.End_DateTime < '2026-11-01', 'Completed', 'Pending'),
       IF(B.End_DateTime < '2026-11-01', DATE_ADD(B.End_DateTime, INTERVAL 2 DAY), NULL)
FROM commission C
JOIN booking B ON B.Booking_ID = C.Booking_ID
JOIN customer_user U ON U.User_ID = B.User_ID AND U.Name IN ('Riya Sharma', 'Arjun Mehta')
WHERE NOT EXISTS (SELECT 1 FROM provider_payout X WHERE X.Commission_ID = C.Commission_ID);

INSERT INTO invoice (Booking_ID, Invoice_Date, Tax_Amount, Discount, Platform_Fee, Final_Amount, Invoice_Status, Transfer_Fee)
SELECT B.Booking_ID, DATE(B.End_DateTime), ROUND(B.Total_Amount * 0.18, 2), 0.00, 50.00,
       ROUND(B.Total_Amount * 1.18 + 50, 2), 'Paid', 0.00
FROM booking B
JOIN customer_user U ON U.User_ID = B.User_ID AND U.Name IN ('Riya Sharma', 'Arjun Mehta')
WHERE B.Booking_Status = 'Completed'
  AND NOT EXISTS (SELECT 1 FROM invoice X WHERE X.Booking_ID = B.Booking_ID);

-- ---------------------------------------------------------------
-- 4. Reviews for the completed trips (customer rates the provider)
-- ---------------------------------------------------------------
INSERT INTO review (Booking_ID, Reviewer_User_ID, Provider_ID, Rating, Comments, Review_Date, Review_Type)
SELECT B.Booking_ID, B.User_ID, V.Provider_ID, D.Rating, D.Comments, DATE(DATE_ADD(B.End_DateTime, INTERVAL 1 DAY)), 'Customer_To_Provider'
FROM (
              SELECT 'DL3CAW4521' AS Reg, 5 AS Rating, 'Clean car and a quick pickup.' AS Comments
    UNION ALL SELECT 'HR26EK9013', 4, 'Great SUV, pickup took a little while.'
    UNION ALL SELECT 'HR26DQ4410', 5, 'Perfect for a family trip.'
    UNION ALL SELECT 'DL3SDA6612', 4, 'Easy scooter for a short ride.'
) D
JOIN vehicle V ON V.Registration_No = D.Reg
JOIN booking B ON B.Vehicle_ID = V.Vehicle_ID AND B.Booking_Status = 'Completed'
JOIN customer_user U ON U.User_ID = B.User_ID AND U.Name IN ('Riya Sharma', 'Arjun Mehta')
WHERE NOT EXISTS (SELECT 1 FROM review X WHERE X.Booking_ID = B.Booking_ID AND X.Review_Type = 'Customer_To_Provider');

-- ---------------------------------------------------------------
-- 5. GPS: a recent position for the two vehicles that are on a trip now
-- (both have GPS). Time is "now" in India time.
-- ---------------------------------------------------------------

-- Arjun's Hyundai i20, near India Gate
UPDATE vehicle
SET GPS_Enabled = 1, Latitude = 28.6129000, Longitude = 77.2295000,
    Location_Updated_At = CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30')
WHERE Registration_No = 'DL10CK8840';

-- Riya's Royal Enfield, at Connaught Place
UPDATE vehicle
SET GPS_Enabled = 1, Latitude = 28.6315000, Longitude = 77.2167000,
    Location_Updated_At = CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30')
WHERE Registration_No = 'DL5SCH3501';
