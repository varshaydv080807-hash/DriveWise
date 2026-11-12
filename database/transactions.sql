USE drivewise;

START TRANSACTION;

-- Create a new booking
INSERT INTO booking
(
    User_ID,
    Vehicle_ID,
    Pickup_Branch_ID,
    Return_Branch_ID,
    Driver_ID,
    Start_DateTime,
    End_DateTime,
    Price_Per_Hour_Snapshot,
    Total_Amount,
    Booking_Status,
    Transfer_Fee
)
VALUES
(
    1,
    1,
    1,
    1,
    1,
    '2026-11-20 10:00:00',
    '2026-11-20 14:00:00',
    250.00,
    1000.00,
    'Confirmed',
    0.00
);

-- Store the newly generated booking ID
SET @new_booking_id = LAST_INSERT_ID();

-- Update vehicle status
UPDATE vehicle
SET Status = 'Booked'
WHERE Vehicle_ID = 1
AND Status = 'Available';

-- Verify the changes
SELECT * FROM booking
WHERE Booking_ID = @new_booking_id;

SELECT Vehicle_ID, Status
FROM vehicle
WHERE Vehicle_ID = 1;

-- Commit both operations
COMMIT;

-- Final verification
SELECT * FROM booking
WHERE Booking_ID = @new_booking_id;
