CREATE DATABASE IF NOT EXISTS `drivewise`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `drivewise`;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `booking` (
  `Booking_ID` int NOT NULL AUTO_INCREMENT,
  `User_ID` int NOT NULL,
  `Vehicle_ID` int NOT NULL,
  `Pickup_Branch_ID` int DEFAULT NULL,
  `Return_Branch_ID` int DEFAULT NULL,
  `Driver_ID` int DEFAULT NULL,
  `Start_DateTime` datetime NOT NULL,
  `End_DateTime` datetime NOT NULL,
  `Price_Per_Hour_Snapshot` decimal(10,2) NOT NULL,
  `Total_Amount` decimal(10,2) NOT NULL,
  `Booking_Status` varchar(20) NOT NULL,
  `Transfer_Fee` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`Booking_ID`),
  KEY `fk_booking_customer` (`User_ID`),
  KEY `fk_booking_vehicle` (`Vehicle_ID`),
  KEY `fk_booking_pickup_branch` (`Pickup_Branch_ID`),
  KEY `fk_booking_return_branch` (`Return_Branch_ID`),
  KEY `fk_booking_driver` (`Driver_ID`),
  CONSTRAINT `fk_booking_customer` FOREIGN KEY (`User_ID`) REFERENCES `customer_user` (`User_ID`),
  CONSTRAINT `fk_booking_driver` FOREIGN KEY (`Driver_ID`) REFERENCES `driver` (`Driver_ID`),
  CONSTRAINT `fk_booking_pickup_branch` FOREIGN KEY (`Pickup_Branch_ID`) REFERENCES `branch` (`Branch_ID`),
  CONSTRAINT `fk_booking_return_branch` FOREIGN KEY (`Return_Branch_ID`) REFERENCES `branch` (`Branch_ID`),
  CONSTRAINT `fk_booking_vehicle` FOREIGN KEY (`Vehicle_ID`) REFERENCES `vehicle` (`Vehicle_ID`),
  CONSTRAINT `chk_booking_dates` CHECK ((`End_DateTime` > `Start_DateTime`)),
  CONSTRAINT `chk_booking_status` CHECK ((`Booking_Status` in ('Pending','Confirmed','Completed','Cancelled')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `branch` (
  `Branch_ID` int NOT NULL AUTO_INCREMENT,
  `Provider_ID` int NOT NULL,
  `Branch_Name` varchar(100) NOT NULL,
  `Address` varchar(255) NOT NULL,
  `City` varchar(100) NOT NULL,
  PRIMARY KEY (`Branch_ID`),
  KEY `fk_branch_provider` (`Provider_ID`),
  CONSTRAINT `fk_branch_provider` FOREIGN KEY (`Provider_ID`) REFERENCES `provider` (`Provider_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `commission` (
  `Commission_ID` int NOT NULL AUTO_INCREMENT,
  `Booking_ID` int NOT NULL,
  `Provider_ID` int NOT NULL,
  `Gross_Amount` decimal(10,2) NOT NULL,
  `Commission_Rate_Snapshot` decimal(5,2) NOT NULL,
  `Commission_Amount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`Commission_ID`),
  UNIQUE KEY `Booking_ID` (`Booking_ID`),
  KEY `fk_commission_provider` (`Provider_ID`),
  CONSTRAINT `fk_commission_booking` FOREIGN KEY (`Booking_ID`) REFERENCES `booking` (`Booking_ID`),
  CONSTRAINT `fk_commission_provider` FOREIGN KEY (`Provider_ID`) REFERENCES `provider` (`Provider_ID`),
  CONSTRAINT `chk_commission_rate` CHECK (((`Commission_Rate_Snapshot` >= 0) and (`Commission_Rate_Snapshot` <= 100)))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `company_details` (
  `Provider_ID` int NOT NULL,
  `Legal_Name` varchar(150) NOT NULL,
  `Registration_No` varchar(100) NOT NULL,
  `Verification_Status` varchar(20) NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`Provider_ID`),
  UNIQUE KEY `Registration_No` (`Registration_No`),
  CONSTRAINT `fk_company_provider` FOREIGN KEY (`Provider_ID`) REFERENCES `provider` (`Provider_ID`),
  CONSTRAINT `chk_company_verification` CHECK ((`Verification_Status` in ('Pending','Verified','Rejected')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `customer_user` (
  `User_ID` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `Email` varchar(255) NOT NULL,
  `Phone` varchar(20) DEFAULT NULL,
  `Password_Hash` varchar(255) NOT NULL,
  `User_Role` varchar(30) NOT NULL,
  `Driving_License_No` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`User_ID`),
  UNIQUE KEY `Email` (`Email`),
  UNIQUE KEY `Driving_License_No` (`Driving_License_No`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `driver` (
  `Driver_ID` int NOT NULL AUTO_INCREMENT,
  `Provider_ID` int NOT NULL,
  `Name` varchar(100) NOT NULL,
  `License_No` varchar(50) NOT NULL,
  `Phone` varchar(10) DEFAULT NULL,
  `Availability_Status` varchar(20) NOT NULL,
  PRIMARY KEY (`Driver_ID`),
  UNIQUE KEY `License_No` (`License_No`),
  KEY `fk_driver_provider` (`Provider_ID`),
  CONSTRAINT `fk_driver_provider` FOREIGN KEY (`Provider_ID`) REFERENCES `provider` (`Provider_ID`),
  CONSTRAINT `chk_driver_availability` CHECK ((`Availability_Status` in ('Available','Assigned','Unavailable')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `employee` (
  `Employee_ID` int NOT NULL AUTO_INCREMENT,
  `Provider_ID` int NOT NULL,
  `Branch_ID` int DEFAULT NULL,
  `Name` varchar(100) NOT NULL,
  `Role` varchar(50) NOT NULL,
  PRIMARY KEY (`Employee_ID`),
  KEY `Provider_ID` (`Provider_ID`),
  KEY `Branch_ID` (`Branch_ID`),
  CONSTRAINT `employee_ibfk_1` FOREIGN KEY (`Provider_ID`) REFERENCES `provider` (`Provider_ID`),
  CONSTRAINT `employee_ibfk_2` FOREIGN KEY (`Branch_ID`) REFERENCES `branch` (`Branch_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `individual_details` (
  `Provider_ID` int NOT NULL,
  `Verification_Status` varchar(20) NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`Provider_ID`),
  CONSTRAINT `fk_individual_provider` FOREIGN KEY (`Provider_ID`) REFERENCES `provider` (`Provider_ID`),
  CONSTRAINT `chk_individual_verification` CHECK ((`Verification_Status` in ('Pending','Verified','Rejected')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `insurance` (
  `Insurance_ID` int NOT NULL AUTO_INCREMENT,
  `Vehicle_ID` int NOT NULL,
  `Insurer_Name` varchar(100) NOT NULL,
  `Policy_No` varchar(100) NOT NULL,
  `Expiry_Date` date NOT NULL,
  `Verification_Status` varchar(20) NOT NULL,
  PRIMARY KEY (`Insurance_ID`),
  UNIQUE KEY `Policy_No` (`Policy_No`),
  KEY `fk_insurance_vehicle` (`Vehicle_ID`),
  CONSTRAINT `fk_insurance_vehicle` FOREIGN KEY (`Vehicle_ID`) REFERENCES `vehicle` (`Vehicle_ID`),
  CONSTRAINT `chk_insurance_verification` CHECK ((`Verification_Status` in ('Pending','Verified','Rejected')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `invoice` (
  `Invoice_ID` int NOT NULL AUTO_INCREMENT,
  `Booking_ID` int NOT NULL,
  `Invoice_Date` date NOT NULL,
  `Tax_Amount` decimal(10,2) NOT NULL,
  `Discount` decimal(10,2) NOT NULL,
  `Platform_Fee` decimal(10,2) NOT NULL,
  `Final_Amount` decimal(10,2) NOT NULL,
  `Invoice_Status` varchar(20) NOT NULL,
  `Transfer_Fee` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`Invoice_ID`),
  UNIQUE KEY `Booking_ID` (`Booking_ID`),
  CONSTRAINT `fk_invoice_booking` FOREIGN KEY (`Booking_ID`) REFERENCES `booking` (`Booking_ID`),
  CONSTRAINT `chk_invoice_status` CHECK ((`Invoice_Status` in ('Generated','Paid','Cancelled')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `maintenance` (
  `Maintenance_ID` int NOT NULL AUTO_INCREMENT,
  `Vehicle_ID` int NOT NULL,
  `Service_Date` date NOT NULL,
  `Description` varchar(500) NOT NULL,
  `Cost` decimal(10,2) NOT NULL,
  `Downtime_Start` datetime DEFAULT NULL,
  `Downtime_End` datetime DEFAULT NULL,
  `Status` varchar(30) NOT NULL,
  PRIMARY KEY (`Maintenance_ID`),
  KEY `fk_maintenance_vehicle` (`Vehicle_ID`),
  CONSTRAINT `fk_maintenance_vehicle` FOREIGN KEY (`Vehicle_ID`) REFERENCES `vehicle` (`Vehicle_ID`),
  CONSTRAINT `chk_maintenance_downtime` CHECK ((`Downtime_End` > `Downtime_Start`))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `payment` (
  `Payment_ID` int NOT NULL AUTO_INCREMENT,
  `Booking_ID` int NOT NULL,
  `Amount` decimal(10,2) NOT NULL,
  `Payment_Type` varchar(30) NOT NULL,
  `Payment_Method` varchar(30) NOT NULL,
  `Payment_Status` varchar(20) NOT NULL,
  `Payment_Date` datetime DEFAULT NULL,
  PRIMARY KEY (`Payment_ID`),
  KEY `fk_payment_booking` (`Booking_ID`),
  CONSTRAINT `fk_payment_booking` FOREIGN KEY (`Booking_ID`) REFERENCES `booking` (`Booking_ID`),
  CONSTRAINT `chk_payment_method` CHECK ((`Payment_Method` in ('UPI','Card','Net Banking','Cash','Wallet'))),
  CONSTRAINT `chk_payment_status` CHECK ((`Payment_Status` in ('Pending','Completed','Failed','Refunded'))),
  CONSTRAINT `chk_payment_type` CHECK ((`Payment_Type` in ('Advance','Final','Refund')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `provider` (
  `Provider_ID` int NOT NULL AUTO_INCREMENT,
  `User_ID` int NOT NULL,
  `Provider_Type` varchar(20) NOT NULL,
  `Display_Name` varchar(100) NOT NULL,
  `Commission_Rate` decimal(5,2) NOT NULL,
  PRIMARY KEY (`Provider_ID`),
  UNIQUE KEY `User_ID` (`User_ID`),
  CONSTRAINT `fk_provider_user` FOREIGN KEY (`User_ID`) REFERENCES `customer_user` (`User_ID`),
  CONSTRAINT `chk_provider_commission` CHECK (((`Commission_Rate` >= 0) and (`Commission_Rate` <= 100))),
  CONSTRAINT `chk_provider_type` CHECK ((`Provider_Type` in ('Company','Individual')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `provider_payout` (
  `Payout_ID` int NOT NULL AUTO_INCREMENT,
  `Provider_ID` int NOT NULL,
  `Commission_ID` int NOT NULL,
  `Payout_Amount` decimal(10,2) NOT NULL,
  `Payout_Status` varchar(20) NOT NULL,
  `Payout_Date` datetime DEFAULT NULL,
  PRIMARY KEY (`Payout_ID`),
  KEY `fk_payout_provider` (`Provider_ID`),
  KEY `fk_payout_commission` (`Commission_ID`),
  CONSTRAINT `fk_payout_commission` FOREIGN KEY (`Commission_ID`) REFERENCES `commission` (`Commission_ID`),
  CONSTRAINT `fk_payout_provider` FOREIGN KEY (`Provider_ID`) REFERENCES `provider` (`Provider_ID`),
  CONSTRAINT `chk_payout_status` CHECK ((`Payout_Status` in ('Pending','Completed','Failed')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `review` (
  `Review_ID` int NOT NULL AUTO_INCREMENT,
  `Booking_ID` int NOT NULL,
  `Reviewer_User_ID` int NOT NULL,
  `Provider_ID` int NOT NULL,
  `Rating` int NOT NULL,
  `Comments` varchar(500) DEFAULT NULL,
  `Review_Date` date NOT NULL,
  `Review_Type` varchar(30) NOT NULL,
  PRIMARY KEY (`Review_ID`),
  UNIQUE KEY `uq_review_booking_type` (`Booking_ID`,`Review_Type`),
  KEY `fk_review_user` (`Reviewer_User_ID`),
  KEY `fk_review_provider` (`Provider_ID`),
  CONSTRAINT `fk_review_booking` FOREIGN KEY (`Booking_ID`) REFERENCES `booking` (`Booking_ID`),
  CONSTRAINT `fk_review_provider` FOREIGN KEY (`Provider_ID`) REFERENCES `provider` (`Provider_ID`),
  CONSTRAINT `fk_review_user` FOREIGN KEY (`Reviewer_User_ID`) REFERENCES `customer_user` (`User_ID`),
  CONSTRAINT `chk_review_rating` CHECK ((`Rating` between 1 and 5)),
  CONSTRAINT `chk_review_type` CHECK ((`Review_Type` in ('Customer_To_Provider','Provider_To_Customer')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `vehicle` (
  `Vehicle_ID` int NOT NULL AUTO_INCREMENT,
  `Provider_ID` int NOT NULL,
  `Type_ID` int NOT NULL,
  `Home_Branch_ID` int DEFAULT NULL,
  `Current_Branch_ID` int DEFAULT NULL,
  `Brand` varchar(100) DEFAULT NULL,
  `Model` varchar(100) DEFAULT NULL,
  `Manufacture_Year` int DEFAULT NULL,
  `Registration_No` varchar(50) DEFAULT NULL,
  `Price_Per_Hour` decimal(10,2) NOT NULL,
  `Status` varchar(30) NOT NULL,
  `GPS_Enabled` tinyint(1) NOT NULL,
  `Latitude` decimal(10,7) DEFAULT NULL,
  `Longitude` decimal(10,7) DEFAULT NULL,
  `Location_Updated_At` datetime DEFAULT NULL,
  `Pickup_Address` varchar(255) DEFAULT NULL,
  `City` varchar(100) DEFAULT NULL,
  `Vehicle_Verification_Status` varchar(20) NOT NULL DEFAULT 'Pending',
  `Vehicle_Image_URL` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`Vehicle_ID`),
  UNIQUE KEY `Registration_No` (`Registration_No`),
  KEY `fk_vehicle_provider` (`Provider_ID`),
  KEY `fk_vehicle_type` (`Type_ID`),
  KEY `fk_vehicle_home_branch` (`Home_Branch_ID`),
  KEY `fk_vehicle_current_branch` (`Current_Branch_ID`),
  CONSTRAINT `fk_vehicle_current_branch` FOREIGN KEY (`Current_Branch_ID`) REFERENCES `branch` (`Branch_ID`),
  CONSTRAINT `fk_vehicle_home_branch` FOREIGN KEY (`Home_Branch_ID`) REFERENCES `branch` (`Branch_ID`),
  CONSTRAINT `fk_vehicle_provider` FOREIGN KEY (`Provider_ID`) REFERENCES `provider` (`Provider_ID`),
  CONSTRAINT `fk_vehicle_type` FOREIGN KEY (`Type_ID`) REFERENCES `vehicle_type` (`Type_ID`),
  CONSTRAINT `chk_vehicle_gps` CHECK ((`GPS_Enabled` in (0,1))),
  CONSTRAINT `chk_vehicle_verification` CHECK ((`Vehicle_Verification_Status` in ('Pending','Verified','Rejected')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `vehicle_available` (
  `Availability_ID` int NOT NULL AUTO_INCREMENT,
  `Vehicle_ID` int NOT NULL,
  `Start_DateTime` datetime NOT NULL,
  `End_DateTime` datetime NOT NULL,
  `Availability_Status` varchar(20) NOT NULL,
  PRIMARY KEY (`Availability_ID`),
  KEY `fk_availability_vehicle` (`Vehicle_ID`),
  CONSTRAINT `fk_availability_vehicle` FOREIGN KEY (`Vehicle_ID`) REFERENCES `vehicle` (`Vehicle_ID`),
  CONSTRAINT `chk_availability_status` CHECK ((`Availability_Status` in ('Available','Booked','Unavailable')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `vehicle_type` (
  `Type_ID` int NOT NULL AUTO_INCREMENT,
  `Type_Name` varchar(50) NOT NULL,
  `Vehicle_Category` varchar(30) NOT NULL,
  `Seating_Capacity` int DEFAULT NULL,
  `Fuel_Type` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`Type_ID`),
  UNIQUE KEY `Type_Name` (`Type_Name`,`Vehicle_Category`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;

