
USE drivewise;

CREATE OR REPLACE VIEW booking_details_view AS
SELECT
    B.Booking_ID,
    CU.Name AS Customer_Name,
    CU.Email AS Customer_Email,
    V.Vehicle_ID,
    V.Brand,
    V.Model,
    VT.Type_Name,
    VT.Vehicle_Category,
    P.Display_Name AS Provider_Name,
    B.Start_DateTime,
    B.End_DateTime,
    B.Total_Amount,
    B.Booking_Status
FROM booking B
JOIN customer_user CU
    ON B.User_ID = CU.User_ID
JOIN vehicle V
    ON B.Vehicle_ID = V.Vehicle_ID
JOIN vehicle_type VT
    ON V.Type_ID = VT.Type_ID
JOIN provider P
    ON V.Provider_ID = P.Provider_ID;

