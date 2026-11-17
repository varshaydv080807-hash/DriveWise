const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken(user) {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
    return jwt.sign(
        { userId: Number(user.User_ID), userRole: user.User_Role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1d", issuer: "drivewise-api" }
    );
}

exports.signup = async (req, res, next) => {
    let connection;
    try {
        const body = req.body || {};
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const phone = typeof body.phone === "string" ? body.phone.trim() : "";
        const password = typeof body.password === "string" ? body.password : "";
        const role = body.userRole || "Customer";
        const providerType = body.providerType;
        const legalName = typeof body.legalName === "string" ? body.legalName.trim() : "";
        const registrationNo = typeof body.registrationNo === "string" ? body.registrationNo.trim() : "";

        if (!name || !email || !phone || !password) {
            return res.status(400).json({ success: false, message: "Name, email, phone and password are required" });
        }
        if (name.length > 100 || email.length > 255 || phone.length > 20) {
            return res.status(400).json({ success: false, message: "Name, email or phone exceeds the allowed length" });
        }
        if (typeof body.drivingLicense === "string" && body.drivingLicense.trim().length > 50) {
            return res.status(400).json({ success: false, message: "Driving license number must not exceed 50 characters" });
        }
        if (!EMAIL_RE.test(email)) {
            return res.status(400).json({ success: false, message: "Please provide a valid email address" });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must contain at least 8 characters" });
        }
        if (!["Customer", "Provider"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid user role" });
        }
        if (role === "Provider") {
            if (!["Company", "Individual"].includes(providerType)) {
                return res.status(400).json({ success: false, message: "Provider type must be Company or Individual" });
            }
            if (providerType === "Company" && (!legalName || !registrationNo)) {
                return res.status(400).json({ success: false, message: "Legal name and registration number are required for Company providers" });
            }
            if (providerType === "Company" && (legalName.length > 150 || registrationNo.length > 100)) {
                return res.status(400).json({ success: false, message: "Company legal name or registration number exceeds the allowed length" });
            }
        }
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ success: false, message: "Authentication is not configured" });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [userResult] = await connection.execute(
            `INSERT INTO customer_user
             (Name, Email, Phone, Password_Hash, User_Role, Driving_License_No)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, email, phone, passwordHash, role, (typeof body.drivingLicense === "string" ? body.drivingLicense.trim() : null) || null]
        );
        const userId = userResult.insertId;

        if (role === "Provider") {
            const [providerResult] = await connection.execute(
                `INSERT INTO provider (User_ID, Provider_Type, Display_Name, Commission_Rate)
                 VALUES (?, ?, ?, ?)`,
                [userId, providerType, name, 10.00]
            );
            const providerId = providerResult.insertId;

            if (providerType === "Company") {
                await connection.execute(
                    `INSERT INTO company_details (Provider_ID, Legal_Name, Registration_No, Verification_Status)
                     VALUES (?, ?, ?, 'Pending')`,
                    [providerId, legalName, registrationNo]
                );
            } else {
                await connection.execute(
                    `INSERT INTO individual_details (Provider_ID, Verification_Status)
                     VALUES (?, 'Pending')`,
                    [providerId]
                );
            }
        }

        // Create the token before committing so a missing/invalid JWT configuration
        // cannot leave behind a successfully registered account with a failed response.
        const token = createToken({ User_ID: userId, User_Role: role });
        await connection.commit();
        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: { userId, name, email, userRole: role }
        });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (_) {}
        }
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "Email, driving license or company registration number is already registered" });
        }
        return next(error);
    } finally {
        if (connection) connection.release();
    }
};

exports.login = async (req, res, next) => {
    try {
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const password = typeof req.body?.password === "string" ? req.body.password : "";
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const [users] = await pool.execute(
            `SELECT User_ID, Name, Email, Password_Hash, User_Role
             FROM customer_user WHERE Email = ? LIMIT 1`,
            [email]
        );
        if (!users.length) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const user = users[0];
        const valid = await bcrypt.compare(password, user.Password_Hash);
        if (!valid) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token: createToken(user),
            user: {
                userId: Number(user.User_ID),
                name: user.Name,
                email: user.Email,
                userRole: user.User_Role
            }
        });
    } catch (error) {
        return next(error);
    }
};
