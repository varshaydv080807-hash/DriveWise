
USE drivewise;

DELIMITER $$

-- Trigger 1: Prevent overlapping bookings when a new booking is inserted

CREATE TRIGGER prevent_double_booking_insert
BEFORE INSERT ON booking
FOR EACH ROW
BEGIN
    DECLARE booking_count INT DEFAULT 0;

    IF NEW.Booking_Status IN ('Pending', 'Confirmed') THEN

        SELECT COUNT(*)
        INTO booking_count
        FROM booking
        WHERE Vehicle_ID = NEW.Vehicle_ID
          AND Booking_Status IN ('Pending', 'Confirmed')
          AND NEW.Start_DateTime < End_DateTime
          AND NEW.End_DateTime > Start_DateTime;

        IF booking_count > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Vehicle is already booked for this time period';
        END IF;

    END IF;
END$$


-- Trigger 2: Prevent overlapping bookings when an existing booking is updated

CREATE TRIGGER prevent_double_booking_update
BEFORE UPDATE ON booking
FOR EACH ROW
BEGIN
    DECLARE booking_count INT DEFAULT 0;

    IF NEW.Booking_Status IN ('Pending', 'Confirmed') THEN

        SELECT COUNT(*)
        INTO booking_count
        FROM booking
        WHERE Vehicle_ID = NEW.Vehicle_ID
          AND Booking_ID <> NEW.Booking_ID
          AND Booking_Status IN ('Pending', 'Confirmed')
          AND NEW.Start_DateTime < End_DateTime
          AND NEW.End_DateTime > Start_DateTime;

        IF booking_count > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Vehicle is already booked for this time period';
        END IF;

    END IF;
END$$

DELIMITER ;

