
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


// SIGNUP API
exports.signup = async (req, res) => {
    let connection;

    try {
        const {
            name,
            email,
            phone,
            password,
            userRole,
            drivingLicense,
            providerType,
            legalName,
            registrationNo
        } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                message: "Name, email, phone and password are required"
            });
        }

        // Validate user role
        const role = userRole || "Customer";

        if (!["Customer", "Provider"].includes(role)) {
            return res.status(400).json({
                message: "Invalid user role"
            });
        }

        // Validate Provider details
        if (role === "Provider") {
            if (!["Company", "Individual"].includes(providerType)) {
                return res.status(400).json({
                    message: "Provider type must be Company or Individual"
                });
            }

            if (
                providerType === "Company" &&
                (!legalName || !registrationNo)
            ) {
                return res.status(400).json({
                    message: "Legal name and registration number are required for Company providers"
                });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Start database transaction
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Insert user
        const [userResult] = await connection.execute(
            `INSERT INTO customer_user
            (Name, Email, Phone, Password_Hash, User_Role, Driving_License_No)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                name,
                email.trim().toLowerCase(),
                phone,
                hashedPassword,
                role,
                drivingLicense || null
            ]
        );

        const userId = userResult.insertId;

        // Create Provider records if user is a Provider
        if (role === "Provider") {

            const [providerResult] = await connection.execute(
                `INSERT INTO provider
                (User_ID, Provider_Type, Display_Name, Commission_Rate)
                VALUES (?, ?, ?, ?)`,
                [userId, providerType, name, 10.00]
            );

            const providerId = providerResult.insertId;

            // Create Company Details
            if (providerType === "Company") {
                await connection.execute(
                    `INSERT INTO company_details
                    (Provider_ID, Legal_Name, Registration_No, Verification_Status)
                    VALUES (?, ?, ?, ?)`,
                    [
                        providerId,
                        legalName,
                        registrationNo,
                        "Pending"
                    ]
                );
            }

            // Create Individual Details
            else if (providerType === "Individual") {
                await connection.execute(
                    `INSERT INTO individual_details
                    (Provider_ID, Verification_Status)
                    VALUES (?, ?)`,
                    [providerId, "Pending"]
                );
            }
        }

        // Commit transaction
        await connection.commit();

        // Generate JWT
        const token = jwt.sign(
            {
                userId: userId,
                userRole: role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(201).json({
            message: "User registered successfully!",
            token: token,
            user: {
                userId,
                name,
                email: email.trim().toLowerCase(),
                userRole: role
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Signup error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Email or driving license or registration number already registered"
            });
        }

        res.status(500).json({
            message: "Registration failed"
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// LOGIN API
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const sql = `
            SELECT User_ID, Name, Email, Password_Hash, User_Role
            FROM customer_user
            WHERE Email = ?
        `;

        const [users] = await pool.execute(sql, [
            email.trim().toLowerCase()
        ]);

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(
            password,
            user.Password_Hash
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }
        const token = jwt.sign(
    {
        userId: user.User_ID,
        userRole: user.User_Role
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
);
        res.status(200).json({
            message: "Login successful!",
            token: token,
            user: {
                userId: user.User_ID,
                name: user.Name,
                email: user.Email,
                userRole: user.User_Role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Login failed"
        });
    }
};