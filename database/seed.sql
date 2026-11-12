USE `drivewise`;
SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO `booking` VALUES (1,1,1,1,1,1,'2026-11-01 10:00:00','2026-11-01 14:00:00',250.00,1000.00,'Confirmed',0.00),(2,2,2,2,2,2,'2026-11-02 09:00:00','2026-11-02 13:00:00',450.00,1800.00,'Confirmed',0.00),(3,3,3,3,3,3,'2026-11-03 11:00:00','2026-11-03 16:00:00',200.00,1000.00,'Confirmed',0.00),(4,4,4,4,4,4,'2026-11-04 10:00:00','2026-11-04 13:00:00',80.00,240.00,'Pending',0.00),(5,5,5,5,5,5,'2026-11-05 08:00:00','2026-11-05 12:00:00',600.00,2400.00,'Confirmed',0.00);

INSERT INTO `branch` VALUES (1,1,'Connaught Place Branch','Block A, Connaught Place','New Delhi'),(2,2,'Dwarka Branch','Sector 12, Dwarka','New Delhi'),(3,3,'Gurugram Central Branch','MG Road','Gurugram'),(4,1,'Noida Branch','Sector 18','Noida'),(5,2,'Faridabad Branch','Sector 15','Faridabad');

INSERT INTO `commission` VALUES (1,1,1,1000.00,10.00,100.00),(2,2,2,1800.00,12.00,216.00),(3,3,3,1000.00,10.00,100.00),(4,4,4,240.00,8.00,19.20),(5,5,5,2400.00,7.50,180.00);

INSERT INTO `company_details` VALUES (1,'Aarav Mobility Private Limited','REG-DW-1001','Verified'),(2,'Ananya Rentals Limited','REG-DW-1002','Verified'),(3,'Rohan Fleet Services Limited','REG-DW-1003','Pending');

INSERT INTO `customer_user` VALUES (1,'Aarav Sharma','aarav@example.com','9876543210','demo_hash_001','Customer','DL-DEL-1001'),(2,'Ananya Verma','ananya@example.com','9876543211','demo_hash_002','Customer','DL-DEL-1002'),(3,'Rohan Mehta','rohan@example.com','9876543212','demo_hash_003','Provider',NULL),(4,'Priya Kapoor','priya@example.com','9876543213','demo_hash_004','Provider','DL-DEL-1004'),(5,'Kabir Singh','kabir@example.com','9876543214','demo_hash_005','Customer','DL-DEL-1005');

INSERT INTO `driver` VALUES (1,1,'Amit Kumar','DL-DRV-1001','9899100001','Available'),(2,2,'Sahil Yadav','DL-DRV-1002','9899100002','Available'),(3,3,'Manish Rao','DL-DRV-1003','9899100003','Available'),(4,1,'Deepak Singh','DL-DRV-1004','9899100004','Available'),(5,2,'Karan Malhotra','DL-DRV-1005','9899100005','Available');

INSERT INTO `employee` VALUES (1,1,1,'Vikram Sharma','Manager'),(2,2,2,'Neha Verma','Coordinator'),(3,3,3,'Arjun Mehta','Manager'),(4,1,4,'Simran Kaur','Support'),(5,2,5,'Rahul Gupta','Coordinator');

INSERT INTO `individual_details` VALUES (4,'Verified'),(5,'Pending');

INSERT INTO `insurance` VALUES (1,1,'HDFC ERGO','POL-DW-1001','2027-11-30','Verified'),(2,2,'ICICI Lombard','POL-DW-1002','2027-12-31','Verified'),(3,3,'Tata AIG','POL-DW-1003','2027-10-31','Verified'),(4,4,'Bajaj Allianz','POL-DW-1004','2027-09-30','Pending'),(5,5,'New India Assurance','POL-DW-1005','2028-01-31','Verified');

INSERT INTO `invoice` VALUES (1,1,'2026-11-01',180.00,0.00,50.00,1230.00,'Generated',0.00),(2,2,'2026-11-02',324.00,50.00,75.00,2149.00,'Generated',0.00),(3,3,'2026-11-03',180.00,0.00,40.00,1220.00,'Generated',0.00),(4,4,'2026-11-04',43.20,0.00,20.00,303.20,'Generated',0.00),(5,5,'2026-11-05',432.00,100.00,100.00,2832.00,'Generated',0.00);

INSERT INTO `maintenance` VALUES (1,1,'2026-10-10','Routine servicing and oil change',2500.00,'2026-10-10 09:00:00','2026-10-10 15:00:00','Completed'),(2,2,'2026-10-12','Brake inspection and servicing',4000.00,'2026-10-12 10:00:00','2026-10-12 17:00:00','Completed'),(3,3,'2026-10-14','Tyre inspection',1500.00,'2026-10-14 11:00:00','2026-10-14 13:00:00','Completed'),(4,4,'2026-10-16','General scooter servicing',800.00,'2026-10-16 09:00:00','2026-10-16 12:00:00','Completed'),(5,5,'2026-10-18','Engine and vehicle inspection',5000.00,'2026-10-18 09:00:00','2026-10-18 18:00:00','Completed');

INSERT INTO `payment` VALUES (1,1,1000.00,'Final','UPI','Completed','2026-11-01 14:05:00'),(2,2,1800.00,'Final','Card','Completed','2026-11-02 13:05:00'),(3,3,1000.00,'Advance','UPI','Completed','2026-11-03 11:05:00'),(4,4,240.00,'Advance','Cash','Pending','2026-11-04 10:05:00'),(5,5,2400.00,'Final','Net Banking','Completed','2026-11-05 12:05:00');

INSERT INTO `provider` VALUES (1,1,'Company','Aarav Mobility Pvt Ltd',10.00),(2,2,'Company','Ananya Rentals Ltd',12.00),(3,3,'Company','Rohan Fleet Services',10.00),(4,4,'Individual','Priya Kapoor',8.00),(5,5,'Individual','Kabir Singh',7.50);

INSERT INTO `provider_payout` VALUES (1,1,1,900.00,'Completed','2026-11-02 10:00:00'),(2,2,2,1584.00,'Completed','2026-11-03 10:00:00'),(3,3,3,900.00,'Pending','2026-11-04 10:00:00'),(4,4,4,220.80,'Pending','2026-11-05 10:00:00'),(5,5,5,2220.00,'Completed','2026-11-06 10:00:00');

INSERT INTO `review` VALUES (1,1,1,1,5,'Excellent vehicle and smooth experience.','2026-11-01','Customer_To_Provider'),(2,2,2,2,4,'Comfortable vehicle and good service.','2026-11-02','Customer_To_Provider'),(3,3,3,3,5,'Very good experience.','2026-11-03','Customer_To_Provider'),(4,4,4,4,4,'Vehicle was convenient for local travel.','2026-11-04','Customer_To_Provider'),(5,5,5,5,5,'Spacious vehicle and helpful service.','2026-11-05','Customer_To_Provider');

INSERT INTO `vehicle` VALUES (1,1,1,1,1,'Maruti Suzuki','Dzire',2023,'DL01AB1001',250.00,'Available',1,NULL,NULL,NULL,'Connaught Place','New Delhi','Verified',NULL),(2,2,2,2,2,'Hyundai','Creta',2024,'DL02CD1002',450.00,'Available',1,NULL,NULL,NULL,'Sector 12, Dwarka','New Delhi','Verified',NULL),(3,3,3,3,3,'Tata','Tiago',2022,'HR26EF1003',200.00,'Available',0,NULL,NULL,NULL,'MG Road','Gurugram','Verified',NULL),(4,4,4,4,4,'Honda','Activa',2023,'UP16GH1004',80.00,'Available',0,NULL,NULL,NULL,'Sector 18','Noida','Pending',NULL),(5,5,5,5,5,'Force','Traveller',2024,'HR29JK1005',600.00,'Available',1,NULL,NULL,NULL,'Sector 15','Faridabad','Verified',NULL);

INSERT INTO `vehicle_available` VALUES (1,1,'2026-11-01 00:00:00','2026-12-31 23:59:59','Available'),(2,2,'2026-11-01 00:00:00','2026-12-31 23:59:59','Available'),(3,3,'2026-11-01 00:00:00','2026-12-31 23:59:59','Available'),(4,4,'2026-11-01 00:00:00','2026-12-31 23:59:59','Available'),(5,5,'2026-11-01 00:00:00','2026-12-31 23:59:59','Available');

INSERT INTO `vehicle_type` VALUES (1,'Sedan','Car',5,'Petrol'),(2,'SUV','Car',7,'Diesel'),(3,'Hatchback','Car',5,'Petrol'),(4,'Bike','Bike',2,'Petrol'),(5,'Tempo Traveller','Van',12,'Diesel');

SET FOREIGN_KEY_CHECKS = 1;

