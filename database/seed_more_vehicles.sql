-- DriveWise: extra vehicles for the customer portal
-- Adds 22 verified, available vehicles (cars, bikes, scooters) across the
-- 5 existing providers, plus photos for 2 of the original seed vehicles.
--
-- Run AFTER schema.sql and seed.sql, while connected to your database
-- (locally `drivewise`, on Enzonic `main`). There is no USE line on purpose.
-- Safe to run once; running it twice fails on the unique Registration_No.
--
-- Photos are freely licensed files on Wikimedia Commons.

-- ---------------------------------------------------------------
-- 1. Extra vehicle types (skipped if they already exist)
-- ---------------------------------------------------------------
INSERT IGNORE INTO vehicle_type (Type_Name, Vehicle_Category, Seating_Capacity, Fuel_Type) VALUES
  ('Scooter',          'Scooter', 2, 'Petrol'),
  ('Electric Scooter', 'Scooter', 2, 'Electric'),
  ('Electric SUV',     'Car',     5, 'Electric'),
  ('MUV',              'Car',     7, 'Diesel'),
  ('CNG Hatchback',    'Car',     5, 'CNG'),
  ('Petrol SUV',       'Car',     5, 'Petrol'),
  ('Petrol Sedan',     'Car',     5, 'Petrol'),
  ('CNG MUV',          'Car',     7, 'CNG'),
  ('Off-roader',       'Car',     4, 'Diesel'),
  ('Diesel SUV 7',     'Car',     7, 'Diesel');

-- Helper: look up a type ID by name + category
-- (used inline below as a subquery)

-- ---------------------------------------------------------------
-- 2. Vehicles
-- Columns: Provider_ID, Type_ID, Home_Branch_ID, Current_Branch_ID, Brand, Model,
-- Manufacture_Year, Registration_No, Price_Per_Hour, Status, GPS_Enabled,
-- Latitude, Longitude, Location_Updated_At, Pickup_Address, City,
-- Vehicle_Verification_Status, Vehicle_Image_URL
-- ---------------------------------------------------------------
INSERT INTO vehicle (Provider_ID, Type_ID, Home_Branch_ID, Current_Branch_ID, Brand, Model,
  Manufacture_Year, Registration_No, Price_Per_Hour, Status, GPS_Enabled, Latitude, Longitude,
  Location_Updated_At, Pickup_Address, City, Vehicle_Verification_Status, Vehicle_Image_URL)
VALUES
  -- ---------------- Cars ----------------
  (1, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Hatchback' AND Vehicle_Category='Car'), 2, 2,
   'Maruti Suzuki', 'Swift', 2024, 'DL3CAW4521', 70.00, 'Available', 1, 28.5523000, 77.0583000, NOW(),
   'Sector 21 Metro Station, Dwarka', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Suzuki_Swift_(2024)_hybrid_IMG_8820.jpg'),

  (1, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Petrol SUV' AND Vehicle_Category='Car'), 3, 3,
   'Kia', 'Seltos', 2023, 'HR26EK9013', 150.00, 'Available', 1, 28.4950000, 77.0890000, NOW(),
   'DLF Cyber City', 'Gurugram', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Kia_Seltos_car_Htx_model_(cropped).jpg'),

  (2, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Electric SUV' AND Vehicle_Category='Car'), 5, 5,
   'Tata', 'Nexon EV', 2024, 'DL2CEV3302', 120.00, 'Available', 1, 28.5708000, 77.3261000, NOW(),
   'Sector 18 Market', 'Noida', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/2020_Tata_Nexon_EV_(India)_front_view.png'),

  (2, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='MUV' AND Vehicle_Category='Car'), 2, 2,
   'Toyota', 'Innova Crysta', 2022, 'HR26DQ4410', 180.00, 'Available', 1, 28.5562000, 77.0870000, NOW(),
   'IGI Airport Terminal 3', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Toyota_Innova_Crysta_2.4_Z_front_right.jpg'),

  (2, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Diesel SUV 7' AND Vehicle_Category='Car'), 1, 1,
   'Toyota', 'Fortuner', 2022, 'DL7CFT2200', 250.00, 'Available', 1, 28.6315000, 77.2167000, NOW(),
   'Block A, Connaught Place', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/2016_Toyota_Fortuner_(frontview).jpg'),

  (1, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Petrol Sedan' AND Vehicle_Category='Car'), 1, 1,
   'Honda', 'City', 2022, 'DL4CAF6610', 105.00, 'Available', 1, 28.6315000, 77.2167000, NOW(),
   'Block A, Connaught Place', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/2020_Honda_City_1.0_SV_VTEC_Turbo_(05-07-2020)_01.jpg'),

  (4, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Off-roader' AND Vehicle_Category='Car'), NULL, NULL,
   'Mahindra', 'Thar', 2023, 'DL1CCT7788', 165.00, 'Available', 1, 28.5245000, 77.2066000, NOW(),
   'Select Citywalk, Saket', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Mahindra_Thar_Photoshoot_At_Perupalem_Beach_(West_Godavari_District,AP,India_)_Djdavid.jpg'),

  (4, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Electric SUV' AND Vehicle_Category='Car'), NULL, NULL,
   'MG', 'ZS EV', 2023, 'DL9CEV5521', 135.00, 'Available', 1, 28.5245000, 77.2066000, NOW(),
   'Saket District Centre', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/MG_ZS_EV_Facelift_IMG_5514.jpg'),

  (5, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='CNG Hatchback' AND Vehicle_Category='Car'), NULL, NULL,
   'Maruti Suzuki', 'Baleno', 2024, 'UP16CZ2087', 70.00, 'Available', 0, 28.5708000, 77.3261000, NOW(),
   'Sector 18, near Atta Market', 'Noida', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/2022_Maruti_Suzuki_Baleno_Alpha_(India)_front_view.jpg'),

  (5, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='CNG MUV' AND Vehicle_Category='Car'), NULL, NULL,
   'Maruti Suzuki', 'Ertiga', 2023, 'UP16DE3390', 95.00, 'Available', 0, 28.5708000, 77.3261000, NOW(),
   'Sector 18, near Atta Market', 'Noida', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/2022_Suzuki_Ertiga_GL.jpg'),

  (3, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Hatchback' AND Vehicle_Category='Car'), 3, 3,
   'Hyundai', 'i20', 2023, 'DL10CK8840', 75.00, 'Available', 1, 28.5677000, 77.2433000, NOW(),
   'Central Market, Lajpat Nagar', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Hyundai_i20_(BC3)_IMG_3911.jpg'),

  (3, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Diesel SUV 7' AND Vehicle_Category='Car'), 3, 3,
   'Mahindra', 'XUV700', 2023, 'HR26FB7007', 190.00, 'Available', 1, 28.4950000, 77.0890000, NOW(),
   'MG Road', 'Gurugram', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/2021_Mahindra_XUV700_2.2_AX7_(India)_front_view.png'),

  (1, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Petrol Sedan' AND Vehicle_Category='Car'), 4, 4,
   'Hyundai', 'Verna', 2024, 'DL8CVR5150', 115.00, 'Available', 1, 28.5708000, 77.3261000, NOW(),
   'Sector 18', 'Noida', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Hyundai_Verna_SX_Turbo_03.jpg'),

  (2, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Electric SUV' AND Vehicle_Category='Car'), 2, 2,
   'Tata', 'Punch EV', 2024, 'DL12CEV1104', 85.00, 'Available', 1, 28.5523000, 77.0583000, NOW(),
   'Sector 12, Dwarka', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Tata_punch.ev.jpg'),

  -- ---------------- Bikes ----------------
  (3, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Bike' AND Vehicle_Category='Bike'), 3, 3,
   'Royal Enfield', 'Classic 350', 2023, 'DL5SCH3501', 45.00, 'Available', 1, 28.6492000, 77.1226000, NOW(),
   'Rajouri Garden Main Market', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Royal_Enfield_Classic_350_(2017_Model_Year).jpg'),

  (3, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Bike' AND Vehicle_Category='Bike'), 3, 3,
   'Bajaj', 'Pulsar NS200', 2022, 'DL7SBP2004', 32.00, 'Available', 0, 28.5523000, 77.0583000, NOW(),
   'Sector 21, Dwarka', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Bajaj_Pulsar_200_ns_grey_and_red.jpg'),

  (4, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Bike' AND Vehicle_Category='Bike'), NULL, NULL,
   'KTM', 'Duke 200', 2023, 'HR26FA2501', 48.00, 'Available', 1, 28.4950000, 77.0890000, NOW(),
   'Cyber Hub entrance', 'Gurugram', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/KTM_DUKE_200.jpg'),

  (5, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Bike' AND Vehicle_Category='Bike'), NULL, NULL,
   'Yamaha', 'R15', 2023, 'DL9SYR1515', 50.00, 'Available', 0, 28.5245000, 77.2066000, NOW(),
   'Saket Metro Station', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/2019_Yamaha_YZF-R15.jpg'),

  -- ---------------- Scooters ----------------
  (3, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Scooter' AND Vehicle_Category='Scooter'), 1, 1,
   'Honda', 'Activa 6G', 2024, 'DL3SDA6612', 18.00, 'Available', 0, 28.6315000, 77.2167000, NOW(),
   'Connaught Place Outer Circle', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Honda_Activa_6G.jpg'),

  (3, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Electric Scooter' AND Vehicle_Category='Scooter'), 2, 2,
   'Ola', 'S1 Pro', 2023, 'DL6SEV0101', 24.00, 'Available', 1, 28.5523000, 77.0583000, NOW(),
   'Sector 21 Metro Station, Dwarka', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/OLA_S1_Pro_Gen_1_Electric_Scooter.jpg'),

  (5, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Scooter' AND Vehicle_Category='Scooter'), NULL, NULL,
   'TVS', 'Jupiter', 2023, 'UP16DS7712', 16.00, 'Available', 0, 28.5708000, 77.3261000, NOW(),
   'Sector 18', 'Noida', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/TVS_Jupiter.jpg'),

  (4, (SELECT Type_ID FROM vehicle_type WHERE Type_Name='Scooter' AND Vehicle_Category='Scooter'), NULL, NULL,
   'Suzuki', 'Access 125', 2023, 'DL4SCS1250', 17.00, 'Available', 0, 28.5677000, 77.2433000, NOW(),
   'Lajpat Nagar II', 'New Delhi', 'Verified',
   'https://commons.wikimedia.org/wiki/Special:FilePath/Suzuki_Access_125,_2023.jpg');

-- ---------------------------------------------------------------
-- 3. Photos and coordinates for the original 5 seed vehicles
-- ---------------------------------------------------------------
UPDATE vehicle SET Latitude = 28.6315000, Longitude = 77.2167000 WHERE Registration_No = 'DL01AB1001';
UPDATE vehicle SET Latitude = 28.5921000, Longitude = 77.0460000,
  Vehicle_Image_URL = 'https://commons.wikimedia.org/wiki/Special:FilePath/Hyundai_Creta_SU2id_PE_Creamy_White_Pearl_(3).jpg'
  WHERE Registration_No = 'DL02CD1002';
UPDATE vehicle SET Latitude = 28.4796000, Longitude = 77.0800000 WHERE Registration_No = 'HR26EF1003';
UPDATE vehicle SET Latitude = 28.5708000, Longitude = 77.3261000 WHERE Registration_No = 'UP16GH1004';
UPDATE vehicle SET Latitude = 28.4089000, Longitude = 77.3178000 WHERE Registration_No = 'HR29JK1005';

-- ---------------------------------------------------------------
-- 4. Availability windows for the new vehicles (matches vehicle_available)
-- ---------------------------------------------------------------
INSERT INTO vehicle_available (Vehicle_ID, Start_DateTime, End_DateTime, Availability_Status)
SELECT Vehicle_ID, '2026-11-01 00:00:00', '2027-03-31 23:59:59', 'Available'
FROM vehicle
WHERE Vehicle_ID NOT IN (SELECT Vehicle_ID FROM vehicle_available);
