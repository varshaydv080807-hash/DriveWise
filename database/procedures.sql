
USE drivewise;

DELIMITER $$

DROP PROCEDURE IF EXISTS calculate_booking_amount$$

CREATE PROCEDURE calculate_booking_amount(
    IN p_booking_id INT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM booking
        WHERE Booking_ID = p_booking_id
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Booking ID does not exist';

    ELSE

        UPDATE booking
        SET Total_Amount = ROUND(
            (TIMESTAMPDIFF(
                SECOND,
                Start_DateTime,
                End_DateTime
            ) / 3600) * Price_Per_Hour_Snapshot
            + COALESCE(Transfer_Fee, 0),
            2
        )
        WHERE Booking_ID = p_booking_id;

    END IF;
END$$

DELIMITER ;

